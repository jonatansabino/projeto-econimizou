<?php

namespace App\Models;

class TransactionModel extends UserOwnedModel
{
    protected $table = 'transactions';
    protected $allowedFields = ['category_id', 'type', 'description', 'amount_cents', 'transaction_date', 'client_key'];
    public function listForSnapshot(): array
    {
        return $this->owned(fn () => $this->orderBy('id', 'ASC')->findAll());
    }
    public function byClientKey(string $key): ?array
    {
        return $this->owned(fn () => $this->where('client_key', $key)->first());
    }
    protected $validationRules = [
        'category_id' => 'required|is_natural_no_zero',
        'type' => 'required|in_list[income,expense]',
        'description' => 'required|max_length[120]',
        'amount_cents' => 'required|positive_cents',
        'transaction_date' => 'required|civil_date',
    ];
}
