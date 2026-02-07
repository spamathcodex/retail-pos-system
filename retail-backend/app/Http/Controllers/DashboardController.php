<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\Product;
use App\Models\Shift;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;

class DashboardController extends Controller
{
    public function index()
    {
        // 1. Ambil Tanggal Hari Ini
        $today = Carbon::today();

        // 2. Hitung Total Omzet Hari Ini
        $todaysRevenue = Transaction::whereDate('transacted_at', $today)->sum('total_amount');

        // 3. Hitung Jumlah Transaksi Hari Ini
        $todaysCount = Transaction::whereDate('transacted_at', $today)->count();

        // 4. Ambil 5 Transaksi Terakhir (Live Feed)
        $recentTransactions = Transaction::latest('transacted_at')->take(5)->get();

        // 5. Cek Stok Menipis (Alert System)
        $lowStockProducts = Product::where('stock', '<', 10)->get();

        // AMBIL DATA SHIFT TERBARU
        $recentShifts = Shift::with('user')->latest()->take(5)->get();

        return view('dashboard', compact('todaysRevenue', 'todaysCount', 'recentTransactions', 'lowStockProducts', 'recentShifts'));
    }

    public function updateProduct(Request $request)
    {
        $product = Product::where('sku', $request->sku)->firstOrFail();

        $product->update([
            'price' => $request->price,
            'stock' => $request->stock
        ]);

        return back()->with('success', 'Produk ' . $product->name . ' berhasil diupdate!');
    }
}
