<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Transaction;

class SyncController extends Controller
{
    public function store(Request $request)
    {
        // Validasi simpel
        $request->validate([
            'receipt_id' => 'required',
            'total_amount' => 'required|numeric'
        ]);

        // Simpan data dari POS ke Database Pusat
        $transaction = Transaction::updateOrCreate(
            ['receipt_id' => $request->receipt_id], // Cek duplikat
            [
                'branch_code' => $request->branch_code,
                'total_amount' => $request->total_amount,
                'transacted_at' => $request->transacted_at,
                'user_id' => $request->cashier_id
            ]
        );

        return response()->json(['status' => 'success', 'data' => $transaction], 200);
    }
}
