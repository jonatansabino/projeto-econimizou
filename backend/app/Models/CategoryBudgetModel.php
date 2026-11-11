<?php

namespace App\Models;

class CategoryBudgetModel extends UserOwnedModel
{
    protected $table = 'category_budgets';
    protected $allowedFields = ['category_id', 'period_month', 'limit_cents'];
    protected $validationRules = [
        'category_id' => 'required|is_natural_no_zero',
        'period_month' => 'required|budget_month',
        'limit_cents' => 'required|positive_cents',
    ];
}
