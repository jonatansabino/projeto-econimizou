<?php

namespace App\Models;

class CategoryModel extends UserOwnedModel
{
    protected $table = 'categories';
    protected $allowedFields = ['name', 'type'];
    protected $validationRules = [
        'name' => 'required|max_length[100]',
        'type' => 'required|in_list[income,expense]',
    ];
}
