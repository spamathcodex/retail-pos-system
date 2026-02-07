import { useState, useEffect } from 'react'
import axios from 'axios'
import './assets/receipt.css'

function App() {
  // --- STATE AUTHENTICATION ---
  const [user, setUser] = useState(null) // null = belum login
  const [pinInput, setPinInput] = useState('')

  // --- STATE POS ---
  const [skuInput, setSkuInput] = useState('')
  const [cart, setCart] = useState([])
  const [status, setStatus] = useState('Menunggu Login')
  const [logs, setLogs] = useState([])

  // --- STATE SHIFT ---
  const [activeShift, setActiveShift] = useState(null)
  const [modalAwal, setModalAwal] = useState('')

  // --- STATE TOKEN ---
  const [token, setToken] = useState(localStorage.getItem('api_token') || '')

  // --- STATE MODAL TUTUP SHIFT ---
  const [showClosingModal, setShowClosingModal] = useState(false)
  const [shiftSummary, setShiftSummary] = useState({ total_sales: 0, count: 0 })
  const [actualCash, setActualCash] = useState('')

  // --- STATE PEMBAYARAN & STRUK ---
  const [showPayModal, setShowPayModal] = useState(false) // Kontrol modal input uang
  const [payInput, setPayInput] = useState('') // Menyimpan input uang kasir
  const [change, setChange] = useState(0) // Menyimpan kembalian
  const [showSuccessModal, setShowSuccessModal] = useState(false) // Kontrol modal sukses
  const [lastTrx, setLastTrx] = useState(null) // Data struk untuk dicetak

  // --- LOGIC AUTH ---

  const handleLogin = async (e) => {
    if (e) e.preventDefault()

    // 1. Cek Lokal (Agar tetap bisa masuk saat offline)
    const result = await window.api.loginUser(pinInput)

    if (result.success) {
      setUser(result.user)

      // 2. Coba ambil token dari Server (Background)
      try {
        const res = await axios.post('http://127.0.0.1:8000/api/login-api', { pin: pinInput })
        localStorage.setItem('api_token', res.data.token)
        setToken(res.data.token)
      } catch (err) {
        console.log('Mode Offline: Menggunakan token lama atau tanpa token.')
      }

      setStatus(`Halo, ${result.user.name}`)
      checkShift(result.user.id)
    } else {
      alert('PIN Salah!')
    }
  }

  // Tombol Sync Khusus di Halaman Login (Untuk setup awal)
  const initialSync = async () => {
    setStatus('Mengambil Data Karyawan...')
    try {
      // 1. Ambil User
      const resUser = await axios.get('http://127.0.0.1:8000/api/users')
      await window.api.syncUsers(resUser.data)

      // 2. Ambil Produk (Sekalian)
      const resProd = await axios.get('http://127.0.0.1:8000/api/products')
      await window.api.syncProducts(resProd.data)

      alert(`Sukses! ${resUser.data.length} Karyawan & ${resProd.data.length} Produk terupdate.`)
      setStatus('Data Siap. Silakan Login.')
    } catch (err) {
      alert('Gagal Sync: ' + err.message)
      setStatus('Gagal Koneksi Server')
    }
  }

  const handleLogout = () => {
    setUser(null)
    setPinInput('')
    setCart([])
    setStatus('Logout')
  }

  // --- LOGIC POS (YANG LAMA) ---

  const handleScan = async (e) => {
    e.preventDefault()
    if (!activeShift) {
      alert('⚠️ HARAP BUKA SHIFT TERLEBIH DAHULU!')
      return
    }
    const product = await window.api.scanProduct(skuInput)

    if (product) {
      const inCart = cart.filter((item) => item.sku === product.sku).length
      if (product.stock - inCart <= 0) {
        setLogs((prev) => [`⛔ Stok Habis: ${product.name}`, ...prev])
      } else {
        setCart((prev) => [...prev, product])
        setLogs((prev) => [`🔎 Scan: ${product.name}`, ...prev])
      }
      setSkuInput('')
    } else {
      setLogs((prev) => [`⚠️ Tidak ditemukan: ${skuInput}`, ...prev])
    }
  }

  const grandTotal = cart.reduce((sum, item) => sum + item.price, 0)

  // const handleBayar = async () => {
  //   if (cart.length === 0) return

  //   if (!activeShift || !activeShift.id) {
  //     alert('⚠️ Error: Shift belum aktif. Silakan logout dan login ulang.')
  //     return
  //   }

  //   const receiptId = 'TRX-' + Date.now()

  //   // Simpan data untuk struk SEBELUM cart dikosongkan
  //   const currentTrx = {
  //     receiptId,
  //     date: new Date().toLocaleString(),
  //     cashier: user.name,
  //     items: [...cart], // Copy array cart
  //     total: grandTotal,
  //     payment: parseInt(prompt('Masukkan Uang Pembayaran:', grandTotal) || grandTotal) // Simulasi input uang
  //   }

  //   // Hitung Kembalian
  //   const change = currentTrx.payment - currentTrx.total
  //   if (change < 0) {
  //     alert('Uang kurang!')
  //     return
  //   }

  //   // Simpan ke DB
  //   const result = await window.api.saveTransaction({
  //     receiptId: receiptId,
  //     amount: grandTotal,
  //     items: cart,
  //     shiftId: activeShift.id,
  //     cashierId: user.id
  //   })

  //   if (result.success) {
  //     // 1. Set Data Struk
  //     setLastTrx({ ...currentTrx, change })

  //     // 2. Reset Cart & Kirim ke Server (seperti biasa)
  //     setLogs((prev) => [`✅ Transaksi ${receiptId} oleh ${user.name}`, ...prev])
  //     setCart([])
  //     runSync()

  //     // 3. Tawarkan Cetak
  //     if (confirm(`Transaksi Sukses!\nKembalian: Rp ${change.toLocaleString()}\n\nCetak Struk?`)) {
  //       setTimeout(() => window.print(), 500) // Tunggu render sebentar lalu cetak
  //     }
  //   }
  // }

  const openPaymentModal = () => {
    if (cart.length === 0) return
    // Cek Shift dulu
    if (!activeShift || !activeShift.id) {
      alert('⚠️ HARAP BUKA SHIFT DULU!')
      return
    }

    setPayInput('') // Reset input
    setShowPayModal(true) // Munculkan Modal
  }

  const processTransaction = async (e) => {
    if (e) e.preventDefault()

    const bayar = parseInt(payInput)

    // 1. Validasi Uang
    if (!bayar || bayar < grandTotal) {
      alert(`Uang Kurang! Total: Rp ${grandTotal.toLocaleString()}`)
      return
    }

    const kembalian = bayar - grandTotal
    const receiptId = 'TRX-' + Date.now()

    // 2. Simpan ke Database
    const result = await window.api.saveTransaction({
      receiptId: receiptId,
      amount: grandTotal,
      items: cart,
      shiftId: activeShift.id,
      cashierId: user.id
    })

    if (result.success) {
      // 3. Siapkan Data Struk
      const trxData = {
        receiptId,
        date: new Date().toLocaleString(),
        cashier: user.name,
        items: [...cart],
        total: grandTotal,
        payment: bayar,
        change: kembalian
      }

      setLastTrx(trxData) // Simpan data struk
      setChange(kembalian) // Simpan kembalian untuk ditampilkan

      // 4. Reset & Pindah ke Modal Sukses
      setCart([]) // Kosongkan keranjang
      setLogs((prev) => [`✅ Lunas: ${receiptId}`, ...prev])
      runSync() // Sync ke server

      setShowPayModal(false) // Tutup modal bayar
      setShowSuccessModal(true) // Buka modal sukses
    }
  }

  const handlePrintAndClose = () => {
    // Cetak
    window.print()
    // Setelah print dialog tertutup (atau user klik cancel), tutup modal
    // setTimeout agar tidak bentrok dengan dialog print
    // setTimeout(() => setShowSuccessModal(false), 1000);
    // Opsional: Kalau mau langsung tutup modal setelah klik print, biarkan saja user menutup manual
  }

  const runSync = async () => {
    const pendingData = await window.api.getUnsynced()
    if (pendingData.length === 0) return

    for (const trx of pendingData) {
      try {
        const cartItems = JSON.parse(trx.items_json)
        await axios.post(
          'http://127.0.0.1:8000/api/sync-transactions',
          {
            receipt_id: trx.receipt_id,
            branch_code: 'JKT-01',
            total_amount: trx.total_amount,
            transacted_at: trx.created_at,
            items: cartItems
            // cashier_id: ... (Nanti kita kirim juga ke server)
          },
          {
            headers: {
              Authorization: `Bearer ${token}` // <--- INI KUNCI PENGAMANNJA
            }
          }
        )
        await window.api.markSynced(trx.receipt_id)
        setLogs((prev) => [`🚀 Uploaded: ${trx.receipt_id}`, ...prev])
      } catch (error) {
        if (error.code !== 'ERR_NETWORK') console.error(error)
      }
    }
  }

  // --- Fungsi Cek Shift Setelah Login ---
  const checkShift = async (userId) => {
    const shift = await window.api.getActiveShift(userId)
    if (shift) {
      setActiveShift(shift)
    }
  }

  const handleOpenShift = async () => {
    // Validasi input dulu
    if (!modalAwal || parseInt(modalAwal) < 0) {
      alert('Masukkan jumlah modal yang valid!')
      return
    }

    try {
      const result = await window.api.openShift({
        userId: user.id,
        cash: parseInt(modalAwal)
      })

      // PERBAIKAN DI SINI:
      // Cek apakah result memiliki ID (artinya sukses insert)
      if (result && result.id) {
        setLogs((prev) => [
          `🕒 Shift Dibuka. Modal: Rp ${parseInt(modalAwal).toLocaleString()}`,
          ...prev
        ])

        // Paksa set Active Shift dengan data baru TANPA nunggu checkShift database
        setActiveShift({
          id: result.id,
          user_id: user.id,
          starting_cash: parseInt(modalAwal),
          status: 'open',
          start_time: new Date().toISOString()
        })
      } else {
        alert('Gagal membuka shift di database lokal.')
      }
    } catch (err) {
      console.error(err)
      alert('Error: ' + err.message)
    }
  }

  // const handleCloseShift = async () => {
  //   if (window.confirm('Yakin ingin tutup shift? Pastikan semua data sudah ter-sync!')) {
  //     await window.api.closeShift(activeShift.id)
  //     setActiveShift(null)
  //     setUser(null) // Otomatis logout setelah tutup shift
  //     setLogs((prev) => [`🏁 Shift Ditutup. Silakan setorkan uang.`, ...prev])
  //   }
  // }

  const prepareCloseShift = async () => {
    // 1. Ambil Ringkasan Penjualan dari Database Lokal
    const summary = await window.api.getShiftSummary(activeShift.id)
    setShiftSummary({
      total_sales: summary.total_sales || 0,
      count: summary.count || 0
    })

    // 2. Munculkan Modal Laporan
    setShowClosingModal(true)
  }

  const confirmCloseShift = async () => {
    try {
      // 1. Validasi
      if (!activeShift || !activeShift.id) {
        alert('Error: Data Shift tidak valid.')
        return
      }

      // 2. Eksekusi Tutup Shift di Database LOKAL
      await window.api.closeShift(activeShift.id)

      // --- STEP BARU: KIRIM LAPORAN KE LARAVEL ---
      try {
        // Siapkan data laporan
        const reportData = {
          user_id: user.id, // Pastikan user tidak null
          starting_cash: activeShift.starting_cash || 0,
          total_sales: shiftSummary.total_sales || 0, // Kalau null, jadikan 0
          actual_cash: actualCash ? parseInt(actualCash) : 0, // Kalau kosong, kirim 0 (JANGAN NaN)
          start_time: activeShift.start_time,
          end_time: new Date().toISOString()
        }

        console.log('Mengirim Laporan Shift...', reportData)

        // Kirim via Axios (Jangan lupa Token!)
        await axios.post('http://127.0.0.1:8000/api/shifts', reportData, {
          headers: { Authorization: `Bearer ${token}` }
        })

        alert('✅ Laporan Shift Berhasil Terkirim ke Pusat!')
      } catch (networkError) {
        console.error('Gagal lapor ke server:', networkError)
        alert(
          '⚠️ Shift ditutup LOKAL, tapi gagal lapor ke Server (Cek Internet). Data aman di laptop.'
        )
        // Di sistem production yang canggih, kita bisa simpan laporan ini ke "Pending Upload"
        // Tapi untuk sekarang, peringatan saja cukup.
      }
      // ---------------------------------------------

      // 3. Reset State (Logout)
      setShowClosingModal(false)
      setActiveShift(null)
      setUser(null)
      setActualCash('')
      setToken('') // Hapus token biar aman
      localStorage.removeItem('api_token') // Opsional: paksa login ulang
    } catch (error) {
      console.error('Critical Error:', error)
      alert('Gagal menutup shift: ' + error.message)
    }
  }

  // --- TAMPILAN JIKA BELUM LOGIN ---
  if (!user) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h2 style={{ color: '#89b4fa' }}>🔒 Security Access</h2>
          <p style={{ color: '#a6adc8', marginBottom: 20 }}>{status}</p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Masukkan PIN (111111)"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={styles.loginInput}
              autoFocus
            />
            <button type="submit" style={styles.loginBtn}>
              MASUK
            </button>
          </form>

          <button onClick={initialSync} style={styles.setupBtn}>
            ⚙️ Initial Setup / Sync Users
          </button>
        </div>
      </div>
    )
  }

  // 2. Jika SUDAH Login tapi BELUM Buka Shift -> Tampilkan Form Modal Awal
  if (user && !activeShift) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h2 style={{ color: '#a6e3a1' }}>💰 Buka Shift</h2>
          <p style={{ color: '#a6adc8' }}>Masukkan Modal Awal di Laci</p>
          <input
            type="number"
            placeholder="Contoh: 100000"
            value={modalAwal}
            onChange={(e) => setModalAwal(e.target.value)}
            style={styles.loginInput}
            autoFocus
          />
          <button onClick={handleOpenShift} style={styles.payButton}>
            BUKA KASIR
          </button>
        </div>
      </div>
    )
  }

  // --- TAMPILAN UTAMA (POS) ---
  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#89b4fa' }}>RetailPOS</h1>
          <p style={{ margin: 0, color: '#a6adc8', fontSize: '0.9rem' }}>
            Kasir: <strong style={{ color: '#a6e3a1' }}>{user.name}</strong> ({user.role})
          </p>
        </div>
        <button onClick={prepareCloseShift} style={styles.logoutBtn}>
          Tutup Shift & Keluar
        </button>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Keluar
        </button>
      </div>

      {/* SEARCH BAR */}
      <form onSubmit={handleScan} style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <input
          value={skuInput}
          onChange={(e) => setSkuInput(e.target.value)}
          placeholder="Scan Barcode..."
          style={styles.input}
          autoFocus
        />
        <button type="submit" style={styles.primaryButton}>
          CARI
        </button>
      </form>

      {/* BODY */}
      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 180px)' }}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>🛒 Keranjang</h3>
          <ul style={{ flex: 1, overflowY: 'auto', listStyle: 'none', padding: 0 }}>
            {cart.map((item, i) => (
              <li key={i} style={styles.cartItem}>
                {item.name} <span style={{ color: '#fab387' }}>Rp {item.price}</span>
              </li>
            ))}
          </ul>
          <div style={{ borderTop: '1px dashed #666', paddingTop: 10 }}>
            <h2>Total: Rp {grandTotal.toLocaleString()}</h2>
            <button onClick={openPaymentModal} style={styles.payButton}>
              BAYAR
            </button>
          </div>
        </div>

        <div style={styles.terminalCard}>
          {logs.map((l, i) => (
            <div key={i} style={{ marginBottom: 5 }}>
              ➜ {l}
            </div>
          ))}
        </div>
      </div>

      {/* --- MODAL CLOSING SHIFT --- */}
      {showClosingModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h2 style={{ borderBottom: '1px solid #444', paddingBottom: 10 }}>
              🏁 Laporan Penutupan Shift
            </h2>

            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <small>Modal Awal</small>
                <strong>Rp {activeShift.starting_cash.toLocaleString()}</strong>
              </div>
              <div style={styles.summaryItem}>
                <small>Total Penjualan ({shiftSummary.count} struk)</small>
                <strong style={{ color: '#a6e3a1' }}>
                  + Rp {shiftSummary.total_sales.toLocaleString()}
                </strong>
              </div>
              <div style={styles.summaryItemTotal}>
                <small>Total Uang di Sistem</small>
                <strong style={{ fontSize: 24 }}>
                  Rp {(activeShift.starting_cash + shiftSummary.total_sales).toLocaleString()}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: 5, color: '#fab387' }}>
                Uang Fisik di Laci (Hitung Manual):
              </label>
              <input
                type="number"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="0"
                style={styles.bigInput}
                autoFocus
              />
            </div>

            {/* Kalkulator Selisih Real-time */}
            {actualCash && (
              <div style={{ marginTop: 15, padding: 10, background: '#11111b', borderRadius: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Selisih:</span>
                  <strong
                    style={{
                      color:
                        parseInt(actualCash) -
                          (activeShift.starting_cash + shiftSummary.total_sales) >=
                        0
                          ? '#a6e3a1'
                          : '#f38ba8'
                    }}
                  >
                    Rp{' '}
                    {(
                      parseInt(actualCash) -
                      (activeShift.starting_cash + shiftSummary.total_sales)
                    ).toLocaleString()}
                  </strong>
                </div>
              </div>
            )}

            <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
              <button onClick={() => setShowClosingModal(false)} style={styles.cancelBtn}>
                Batal
              </button>
              <button onClick={confirmCloseShift} style={styles.confirmBtn}>
                TUTUP SHIFT & LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AREA STRUK (Hanya muncul saat di-print) --- */}
      <div id="receipt-area">
        <div className="text-center">
          <h3 style={{ margin: 0 }}>TOKO MAJU JAYA</h3>
          <p style={{ margin: 0, fontSize: 10 }}>Jl. Teknologi No. 1, Jakarta</p>
          <p style={{ margin: 0, fontSize: 10 }}>Telp: 0812-3456-7890</p>
        </div>

        <div className="dashed-line"></div>

        <div>
          No: {lastTrx?.receiptId}
          <br />
          Tgl: {lastTrx?.date}
          <br />
          Kasir: {lastTrx?.cashier}
        </div>

        <div className="dashed-line"></div>

        <table style={{ width: '100%', fontSize: 12 }}>
          <tbody>
            {lastTrx?.items.map((item, i) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td className="text-right">{item.price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="dashed-line"></div>

        <table style={{ width: '100%', fontWeight: 'bold' }}>
          <tbody>
            <tr>
              <td>Total</td>
              <td className="text-right">Rp {lastTrx?.total.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Bayar</td>
              <td className="text-right">Rp {lastTrx?.payment.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Kembali</td>
              <td className="text-right">Rp {lastTrx?.change.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="dashed-line"></div>
        <div className="text-center" style={{ marginTop: 10 }}>
          Terima Kasih!
          <br />
          Barang yang sudah dibeli
          <br />
          tidak dapat ditukar.
        </div>
      </div>
      {/* --- AKHIR AREA STRUK --- */}

      {/* --- MODAL 1: INPUT PEMBAYARAN --- */}
      {showPayModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h2 style={{ borderBottom: '1px solid #444', paddingBottom: 10 }}>💳 Pembayaran</h2>

            <div style={{ fontSize: 40, fontWeight: 'bold', margin: '20px 0', color: '#89b4fa' }}>
              Rp {grandTotal.toLocaleString()}
            </div>

            <form onSubmit={processTransaction}>
              <label style={{ display: 'block', textAlign: 'left', marginBottom: 5 }}>
                Uang Diterima:
              </label>
              <input
                type="number"
                value={payInput}
                onChange={(e) => setPayInput(e.target.value)}
                placeholder="Masukkan nominal..."
                style={styles.bigInput}
                autoFocus
              />

              {/* Tombol Cepat (Opsional) */}
              <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setPayInput(grandTotal)}
                  style={styles.quickBtn}
                >
                  Uang Pas
                </button>
                <button type="button" onClick={() => setPayInput(50000)} style={styles.quickBtn}>
                  50.000
                </button>
                <button type="button" onClick={() => setPayInput(100000)} style={styles.quickBtn}>
                  100.000
                </button>
              </div>

              <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  style={styles.cancelBtn}
                >
                  Batal
                </button>
                <button type="submit" style={styles.confirmBtn}>
                  PROSES BAYAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SUKSES & KEMBALIAN --- */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ fontSize: 50 }}>✅</div>
            <h2>Transaksi Berhasil!</h2>

            <div style={{ background: '#313244', padding: 15, borderRadius: 10, margin: '20px 0' }}>
              <small>Kembalian</small>
              <div style={{ fontSize: 36, color: '#a6e3a1', fontWeight: 'bold' }}>
                Rp {change.toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowSuccessModal(false)} style={styles.cancelBtn}>
                Tutup
              </button>
              <button onClick={handlePrintAndClose} style={styles.confirmBtn}>
                🖨️ CETAK STRUK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- CSS IN JS (GABUNGAN) ---
const styles = {
  container: {
    padding: 20,
    background: '#1e1e2e',
    color: '#cdd6f4',
    minHeight: '100vh',
    fontFamily: 'sans-serif'
  },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: 20 },
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: '#11111b'
  },
  loginBox: {
    background: '#1e1e2e',
    padding: 40,
    borderRadius: 10,
    textAlign: 'center',
    width: 300,
    border: '1px solid #313244'
  },
  loginInput: {
    padding: 15,
    fontSize: 20,
    borderRadius: 5,
    border: 'none',
    background: '#313244',
    color: 'white',
    width: '100%',
    marginBottom: 15,
    textAlign: 'center'
  },
  loginBtn: {
    width: '100%',
    padding: 15,
    background: '#89b4fa',
    border: 'none',
    borderRadius: 5,
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  setupBtn: {
    marginTop: 20,
    background: 'none',
    border: 'none',
    color: '#6c7086',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  logoutBtn: {
    background: '#f38ba8',
    border: 'none',
    padding: '5px 15px',
    borderRadius: 5,
    cursor: 'pointer'
  },
  input: {
    flex: 1,
    padding: 15,
    background: '#313244',
    border: 'none',
    color: 'white',
    borderRadius: 5,
    fontSize: 18
  },
  primaryButton: {
    padding: '0 20px',
    background: '#89b4fa',
    border: 'none',
    borderRadius: 5,
    cursor: 'pointer'
  },
  card: {
    flex: 2,
    background: '#313244',
    padding: 20,
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column'
  },
  cartItem: {
    padding: 10,
    borderBottom: '1px solid #45475a',
    display: 'flex',
    justifyContent: 'space-between'
  },
  payButton: {
    width: '100%',
    padding: 15,
    background: '#a6e3a1',
    border: 'none',
    borderRadius: 5,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 18
  },
  terminalCard: {
    flex: 1,
    background: '#11111b',
    padding: 20,
    borderRadius: 10,
    fontFamily: 'monospace',
    overflowY: 'auto'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalBox: {
    background: '#1e1e2e',
    padding: 30,
    borderRadius: 15,
    width: 400,
    textAlign: 'center',
    border: '1px solid #45475a',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
  },
  summaryGrid: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px dashed #45475a',
    paddingBottom: 5
  },
  summaryItemTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '2px solid #fff',
    paddingTop: 10,
    marginTop: 5
  },
  bigInput: {
    width: '100%',
    padding: 15,
    fontSize: 24,
    background: '#313244',
    border: '2px solid #89b4fa',
    borderRadius: 8,
    color: '#fff',
    textAlign: 'right'
  },
  confirmBtn: {
    flex: 2,
    padding: 15,
    background: '#f38ba8',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 8,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 16
  },
  cancelBtn: {
    flex: 1,
    padding: 15,
    background: 'transparent',
    color: '#a6adc8',
    border: '1px solid #a6adc8',
    borderRadius: 8,
    cursor: 'pointer'
  },
  quickBtn: {
    flex: 1,
    padding: 10,
    background: '#45475a',
    border: '1px solid #585b70',
    color: '#fff',
    borderRadius: 5,
    cursor: 'pointer'
  }
  // Pastikan modalOverlay, modalBox, bigInput, confirmBtn, cancelBtn sudah ada dari tutorial sebelumnya.
  // Kalau belum, copas dari tutorial Shift Management tadi ya.
}

export default App
