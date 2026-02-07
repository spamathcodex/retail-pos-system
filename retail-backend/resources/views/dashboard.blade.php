<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Dashboard - Retail System</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 40px;
            color: #1f2937;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 28px;
            font-weight: 800;
            color: #111827;
            margin: 0;
        }

        .badge {
            background: #dbeafe;
            color: #1e40af;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }

        /* Kartu Statistik */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .card h3 {
            margin: 0 0 10px 0;
            color: #6b7280;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .card .value {
            font-size: 36px;
            font-weight: 800;
            color: #111827;
        }

        .card.highlight {
            background: #1f2937;
            color: white;
        }

        /* Kartu Hitam */
        .card.highlight h3 {
            color: #9ca3af;
        }

        .card.highlight .value {
            color: #34d399;
        }

        /* Hijau Neon */

        /* Tabel & List */
        .section-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
        }

        .panel {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .panel-header {
            background: #f9fafb;
            padding: 15px 25px;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            text-align: left;
            padding: 15px 25px;
            border-bottom: 1px solid #f3f4f6;
        }

        th {
            font-size: 12px;
            text-transform: uppercase;
            color: #6b7280;
        }

        tr:last-child td {
            border-bottom: none;
        }

        /* Stok Alert */
        .alert-item {
            padding: 15px 25px;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .alert-item:last-child {
            border-bottom: none;
        }

        .stock-badge {
            background: #fee2e2;
            color: #991b1b;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
        }
    </style>
</head>

<body>

    <div class="container">
        <div class="header">
            <div>
                <h1>Dashboard Pusat</h1>
                <p style="margin: 5px 0 0; color: #6b7280;">Pantauan Real-time seluruh cabang</p>
            </div>
            <span class="badge">Live Connection</span>
        </div>

        <div class="stats-grid">
            <div class="card highlight">
                <h3>Omzet Hari Ini</h3>
                <div class="value">Rp {{ number_format($todaysRevenue, 0, ',', '.') }}</div>
            </div>

            <div class="card">
                <h3>Jumlah Transaksi</h3>
                <div class="value">{{ $todaysCount }} <span style="font-size: 16px; color: #9ca3af;">struk</span></div>
            </div>

            <div class="card">
                <h3>Cabang Aktif</h3>
                <div class="value">1 <span style="font-size: 16px; color: #9ca3af;">lokasi</span></div>
            </div>
        </div>

        <div class="section-grid">
            <div class="panel">
                <div class="panel-header">📥 Transaksi Baru Masuk</div>
                <table>
                    <thead>
                        <tr>
                            <th>Waktu</th>
                            <th>No. Struk</th>
                            <th>Cabang</th>
                            <th>Total</th>
                            <th>Kasir</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($recentTransactions as $trx)
                            <tr>
                                <td>{{ \Carbon\Carbon::parse($trx->transacted_at)->format('H:i') }}</td>
                                <td style="font-family: monospace;">{{ $trx->receipt_id }}</td>
                                <td>{{ $trx->branch_code }}</td>
                                <td style="font-weight: bold;">Rp {{ number_format($trx->total_amount, 0, ',', '.') }}</td>
                                <td>{{ $trx->user->name ?? 'System' }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="4" style="text-align: center; color: #9ca3af; padding: 30px;">Belum ada
                                    transaksi hari ini.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            <div class="panel">
                <div class="panel-header" style="color: #b91c1c;">⚠️ Stok Menipis (< 10)</div>
                        <div>
                            @forelse($lowStockProducts as $prod)
                                <div class="alert-item">
                                    <span>{{ $prod->name }}</span>
                                    <span class="stock-badge">Sisa {{ $prod->stock }}</span>
                                </div>
                            @empty
                                <div style="padding: 20px; text-align: center; color: #059669;">
                                    ✅ Semua stok aman
                                </div>
                            @endforelse
                        </div>
                </div>
            </div>

            <div class="panel" style="margin-top: 30px;">
                <div class="panel-header">📦 Manajemen Stok & Harga</div>
                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Nama Produk</th>
                            <th style="width: 150px;">Harga (Rp)</th>
                            <th style="width: 100px;">Stok</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach(\App\Models\Product::all() as $prod)
                            <tr>
                                <form action="{{ route('product.update') }}" method="POST">
                                    @csrf
                                    <input type="hidden" name="sku" value="{{ $prod->sku }}">

                                    <td style="font-family: monospace;">{{ $prod->sku }}</td>
                                    <td>{{ $prod->name }}</td>
                                    <td>
                                        <input type="number" name="price" value="{{ $prod->price }}"
                                            style="padding: 5px; width: 100%; border: 1px solid #d1d5db; border-radius: 4px;">
                                    </td>
                                    <td>
                                        <input type="number" name="stock" value="{{ $prod->stock }}"
                                            style="padding: 5px; width: 100%; border: 1px solid #d1d5db; border-radius: 4px;">
                                    </td>
                                    <td>
                                        <button type="submit"
                                            style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                            Simpan
                                        </button>
                                    </td>
                                </form>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            <div class="panel" style="margin-top: 30px;">
                <div class="panel-header" style="background: #eef2ff; color: #3730a3;">
                    🏁 Riwayat Tutup Shift (Setoran Kasir)
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Kasir</th>
                            <th>Waktu Kerja</th>
                            <th>Modal Awal</th>
                            <th>Total Jualan</th>
                            <th>Total Sistem</th>
                            <th>Uang Fisik</th>
                            <th>Selisih</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($recentShifts as $shift)
                            @php
                                // Hitung total uang yang harusnya ada (Sistem)
                                $expected = $shift->starting_cash + $shift->total_sales;
                                // Hitung selisih (Uang Fisik - Sistem)
                                $variance = $shift->actual_cash - $expected;
                            @endphp
                            <tr>
                                <td>
                                    <strong>{{ $shift->user->name ?? 'Unknown' }}</strong><br>
                                    <span style="font-size: 11px; color: #6b7280;">{{ $shift->user->role ?? '-' }}</span>
                                </td>
                                <td>
                                    <div style="font-size: 12px;">
                                        Masuk: {{ \Carbon\Carbon::parse($shift->start_time)->format('H:i') }}<br>
                                        Pulang: {{ \Carbon\Carbon::parse($shift->end_time)->format('H:i') }}
                                    </div>
                                </td>
                                <td>Rp {{ number_format($shift->starting_cash, 0, ',', '.') }}</td>
                                <td style="color: #059669;">+ Rp {{ number_format($shift->total_sales, 0, ',', '.') }}</td>
                                <td style="font-weight: bold;">Rp {{ number_format($expected, 0, ',', '.') }}</td>
                                <td style="background: #f9fafb;">Rp {{ number_format($shift->actual_cash, 0, ',', '.') }}
                                </td>
                                <td>
                                    @if($variance == 0)
                                        <span
                                            style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                                            OK (Pas)
                                        </span>
                                    @elseif($variance > 0)
                                        <span style="color: #059669; font-weight: bold;">
                                            + Rp {{ number_format($variance, 0, ',', '.') }}
                                        </span>
                                    @else
                                        <span
                                            style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                                            {{ number_format($variance, 0, ',', '.') }} (Kurang)
                                        </span>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

        </div>

        <script>
            setTimeout(function () {
                window.location.reload(1);
            }, 10000);
        </script>
</body>

</html>