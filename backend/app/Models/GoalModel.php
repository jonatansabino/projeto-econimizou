<?php

namespace App\Models;

class GoalModel extends UserOwnedModel
{
    protected $table = 'goals';
    protected $allowedFields = ['name', 'target_cents', 'saved_cents'];
    protected $validationRules = [
        'name' => 'required|max_length[100]',
        'target_cents' => 'required|positive_cents',
        'saved_cents' => 'if_exist|nonnegative_cents',
    ];
}
