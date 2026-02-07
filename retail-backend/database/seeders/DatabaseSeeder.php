<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        // Product::create(['sku' => '1001', 'name' => 'Kopi Susu Gula Aren', 'price' => 18000]);
        // Product::create(['sku' => '1002', 'name' => 'Roti Bakar Coklat', 'price' => 15000]);
        // Product::create(['sku' => '1003', 'name' => 'Mie Goreng Spesial', 'price' => 22000]);
        // Product::create(['sku' => '1004', 'name' => 'Es Teh Manis Jumbo', 'price' => 5000]);

        \App\Models\User::create([
            'name' => 'Boss Besar',
            'email' => 'boss@toko.com',
            'password' => bcrypt('password'),
            'pin' => '123456',
            'role' => 'admin'
        ]);

        \App\Models\User::create([
            'name' => 'Kasir Budi',
            'email' => 'budi@toko.com',
            'password' => bcrypt('password'),
            'pin' => '111111',
            'role' => 'cashier'
        ]);
    }
}
