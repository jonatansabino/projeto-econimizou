<?php

namespace App\Models;

class SavingRecommendationModel extends UserOwnedModel
{
    protected $table = 'saving_recommendations';
    protected $allowedFields = ['title', 'description', 'status', 'goal_id'];
    protected $validationRules = [
        'title' => 'required|max_length[160]',
        'description' => 'required|max_length[65535]',
        'status' => 'if_exist|in_list[pending,accepted,ignored]',
        'goal_id' => 'permit_empty|is_natural_no_zero',
    ];
}
