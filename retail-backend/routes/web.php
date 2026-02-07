<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\DashboardController;

Route::get('/', [DashboardController::class, 'index']); // Halaman depan langsung Dashboard
Route::post('/update-product', [DashboardController::class, 'updateProduct'])->name('product.update');
