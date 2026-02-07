import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDB, addTransaction, getUnsynced, markSynced, openShift, getActiveShift, closeShift, getShiftSummary } from './db';
import { saveProductsBulk, getProductBySku } from './db';
import { loginUser, saveUsersBulk } from './db';

// Jalankan init DB saat aplikasi start
initDB();

// Jembatan 1: Terima request 'save-transaction' dari React
ipcMain.handle('save-transaction', async (event, data) => {
  try {
    // Tambahkan data.shiftId
    const result = addTransaction(data.receiptId, data.amount, data.items, data.shiftId);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-shift-summary', (event, shiftId) => getShiftSummary(shiftId));

// Jembatan 2: Request ambil data pending
ipcMain.handle('get-unsynced', async () => {
  return getUnsynced();
});

// Jembatan 3: Update status sync
ipcMain.handle('mark-synced', async (event, receiptId) => {
  markSynced(receiptId);
  return true;
});

// Jembatan 4: Simpan produk dari Cloud ke Lokal
ipcMain.handle('sync-products', async (event, products) => {
  try {
    saveProductsBulk(products);
    return { success: true, count: products.length };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

// Jembatan 5: Cari produk (Scan)
ipcMain.handle('scan-product', async (event, sku) => {
  return getProductBySku(sku);
});

// Daftarkan Handler IPC Baru
ipcMain.handle('print-receipt', (event, data) => {
  createReceiptWindow(data);
  return true;
});

// Handler Login
ipcMain.handle('login-user', (event, pin) => {
  const user = loginUser(pin);
  if (user) return { success: true, user: user };
  return { success: false, message: 'PIN Salah!' };
});

// Handler Sync User
ipcMain.handle('sync-users', (event, users) => {
  try {
    saveUsersBulk(users);
    return { success: true, count: users.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-shift', (event, data) => openShift(data.userId, data.cash));
ipcMain.handle('get-active-shift', (event, userId) => getActiveShift(userId));
ipcMain.handle('close-shift', (event, id) => closeShift(id));

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createReceiptWindow(data) {
  // 1. Buat Jendela Tersembunyi (User gak perlu lihat)
  let workerWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Biar gampang akses require di receipt.html
    }
  });

  // 2. Load file HTML struk tadi
  // Pastikan path-nya benar. Kalau pakai Vite, mungkin perlu trik sedikit.
  // Untuk Dev mode, kita inject HTML string langsung biar gampang (Hack Cepat)

  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head><style>
      body { font-family: monospace; width: 100%; margin: 0; font-size: 12px; }
      .line { display: flex; justify-content: space-between; }
      h2 { text-align: center; margin: 0 0 10px 0; }
      hr { border-top: 1px dashed black; }
    </style></head>
    <body>
      <h2>RETAIL POS</h2>
      <p>Date: ${new Date().toLocaleString()}</p>
      <hr/>
      ${data.items.map(item => `
        <div class="line">
          <span>${item.name}</span>
          <span>${item.price}</span>
        </div>
      `).join('')}
      <hr/>
      <div class="line" style="font-weight:bold; font-size:14px">
        <span>TOTAL</span>
        <span>Rp ${data.total}</span>
      </div>
      <hr/>
      <p style="text-align:center">TERIMA KASIH</p>
    </body>
    <script>
       const { ipcRenderer } = require('electron');
       ipcRenderer.send('ready-to-print');
    </script>
    </html>
  `;

  // Load HTML String langsung (Data URL)
  workerWindow.loadURL('data:text/html;charset=utf-8,' + encodeURI(receiptHTML));

  // 3. Tunggu sinyal 'ready-to-print' dari HTML
  ipcMain.once('ready-to-print', (event) => {
    workerWindow.webContents.print({
      silent: true,           // Jangan tanya user, langsung print
      printBackground: true,
      deviceName: ''          // Kosong = Printer Default Windows
    }, (success, errorType) => {
      if (!success) console.log("Gagal print:", errorType);
      workerWindow.close();   // Tutup jendela worker setelah selesai
    });
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
