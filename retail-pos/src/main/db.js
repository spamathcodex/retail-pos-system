// src/main/db.js
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

// Simpan file DB di folder User Data komputer user
const dbPath = path.join(app.getPath('userData'), 'pos.db');
const db = new Database(dbPath);

export function initDB() {
  // Buat tabel jika belum ada
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id TEXT UNIQUE,
      total_amount INTEGER,
      items_json TEXT,
      shift_id INTEGER,
      is_synced INTEGER DEFAULT 0, -- 0: Belum Sync, 1: Sudah
      created_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS local_products (
      sku TEXT PRIMARY KEY,
      name TEXT,
      price INTEGER,
      stock INTEGER
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS local_users (
      id INTEGER PRIMARY KEY,
      name TEXT,
      pin TEXT,
      role TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS local_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      starting_cash INTEGER,
      start_time TEXT,
      status TEXT DEFAULT 'open'
    )
  `);
}

// Fungsi untuk insert transaksi
export function addTransaction(receipt_id, amount, items, shift_id) {
  const stmt = db.prepare('INSERT INTO local_transactions (receipt_id, total_amount, items_json, shift_id, created_at) VALUES (?, ?, ?, ?, ?)');
  return stmt.run(receipt_id, amount, JSON.stringify(items), shift_id, new Date().toISOString());
}

// FUNGSI BARU: Hitung Total Penjualan per Shift
export function getShiftSummary(shift_id) {
  // Hitung total uang masuk dari transaksi pada shift ini
  const result = db.prepare('SELECT SUM(total_amount) as total_sales, COUNT(*) as count FROM local_transactions WHERE shift_id = ?').get(shift_id);
  return result;
}

// Fungsi ambil data yang belum di-sync
export function getUnsynced() {
  return db.prepare('SELECT * FROM local_transactions WHERE is_synced = 0').all();
}

// Tandai sudah sync
export function markSynced(receipt_id) {
  const stmt = db.prepare('UPDATE local_transactions SET is_synced = 1 WHERE receipt_id = ?');
  stmt.run(receipt_id);
}

// BARU: Fungsi Bulk Insert Produk (Replace jika ada update)
export function saveProductsBulk(products) {
  const insert = db.prepare('INSERT OR REPLACE INTO local_products (sku, name, price, stock) VALUES (@sku, @name, @price, @stock)');
  const insertMany = db.transaction((items) => {
    for (const item of items) insert.run(item);
  });
  insertMany(products);
}

// BARU: Fungsi Cari Produk by SKU (Simulasi Scan Barcode)
export function getProductBySku(sku) {
  return db.prepare('SELECT * FROM local_products WHERE sku = ?').get(sku);
}

// BARU: Fungsi Login (Cek PIN)
export function loginUser(pin) {
  return db.prepare('SELECT * FROM local_users WHERE pin = ?').get(pin);
}

// BARU: Simpan User dari Pusat
export function saveUsersBulk(users) {
  const insert = db.prepare('INSERT OR REPLACE INTO local_users (id, name, pin, role) VALUES (@id, @name, @pin, @role)');
  const insertMany = db.transaction((items) => {
    for (const item of items) insert.run(item);
  });
  insertMany(users);
}

// Fungsi Buka Shift
export function openShift(user_id, cash) {
  const stmt = db.prepare('INSERT INTO local_shifts (user_id, starting_cash, start_time) VALUES (?, ?, ?)');
  const info = stmt.run(user_id, cash, new Date().toISOString());

  // Kita kembalikan ID shift baru agar React tahu shift mana yang aktif
  return {
    id: info.lastInsertRowid,
    changes: info.changes
  };
}

// Fungsi Ambil Shift Aktif
export function getActiveShift(user_id) {
  return db.prepare("SELECT * FROM local_shifts WHERE user_id = ? AND status = 'open'").get(user_id);
}

// Fungsi Tutup Shift
export function closeShift(shift_id) {
  return db.prepare("UPDATE local_shifts SET status = 'closed' WHERE id = ?").run(shift_id);
}
