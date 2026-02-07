import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveTransaction: (data) => ipcRenderer.invoke('save-transaction', data),
  getUnsynced: () => ipcRenderer.invoke('get-unsynced'),
  markSynced: (id) => ipcRenderer.invoke('mark-synced', id),
  syncProducts: (products) => ipcRenderer.invoke('sync-products', products),
  scanProduct: (sku) => ipcRenderer.invoke('scan-product', sku),
  printReceipt: (data) => ipcRenderer.invoke('print-receipt', data),
  loginUser: (pin) => ipcRenderer.invoke('login-user', pin),
  syncUsers: (users) => ipcRenderer.invoke('sync-users', users),
  openShift: (data) => ipcRenderer.invoke('open-shift', data),
  getActiveShift: (userId) => ipcRenderer.invoke('get-active-shift', userId),
  closeShift: (id) => ipcRenderer.invoke('close-shift', id),
  getShiftSummary: (shiftId) => ipcRenderer.invoke('get-shift-summary', shiftId)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
