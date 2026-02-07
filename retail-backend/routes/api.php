<?php

use App\Http\Controllers\Api\SyncController;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/sync-transactions', [SyncController::class, 'store']);
    Route::post('/shifts', [App\Http\Controllers\Api\ShiftController::class, 'store']);
});
Route::get('/products', function () {
    return response()->json(Product::all());
});
Route::get('/users', function () {
    // Hanya kirim nama, id, dan PIN (hashed idealnya, tapi raw dulu untuk belajar)
    return response()->json(User::select('id', 'name', 'pin', 'role')->get());
});

Route::post('/login-api', function (Request $request) {
    $user = User::where('pin', $request->pin)->first();

    if (!$user) {
        return response()->json(['message' => 'PIN Salah'], 401);
    }

    // Buat Token (Kunci Digital)
    $token = $user->createToken('pos-token')->plainTextToken;

    return response()->json([
        'token' => $token,
        'user' => $user
    ]);
});
