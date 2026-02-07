<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = ['receipt_id', 'branch_code', 'total_amount', 'transacted_at'];
}
