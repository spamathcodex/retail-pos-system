<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Shift;

class ShiftController extends Controller
{
    public function store(Request $request)
    {
        // Validasi data yang dikirim dari Electron
        $request->validate([
            'user_id' => 'required',
            'starting_cash' => 'required|numeric',
            'total_sales' => 'required|numeric',
            'actual_cash' => 'required|numeric',
            'start_time' => 'required|date',
            'end_time' => 'required|date',
        ]);

        // Simpan Laporan Shift
        $shift = Shift::create([
            'user_id' => $request->user_id,
            'starting_cash' => $request->starting_cash,
            'total_sales' => $request->total_sales, // Omzet menurut sistem
            'actual_cash' => $request->actual_cash, // Uang fisik di laci
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'status' => 'closed'
        ]);

        return response()->json(['message' => 'Laporan Shift Diterima', 'id' => $shift->id]);
    }
}
