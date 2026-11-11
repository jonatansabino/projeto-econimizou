<?php

namespace App\Models;

class UserPreferenceModel extends UserOwnedModel
{
    protected $table = 'user_preferences';
    protected $allowedFields = ['display_name', 'avatar', 'hide_amounts', 'notifications_enabled', 'animations_enabled', 'onboarding_completed'];
    protected $validationRules = [
        'display_name' => 'permit_empty|max_length[60]',
        'avatar' => 'permit_empty|max_length[100]',
        'hide_amounts' => 'if_exist|in_list[0,1]',
        'notifications_enabled' => 'if_exist|in_list[0,1]',
        'animations_enabled' => 'if_exist|in_list[0,1]',
        'onboarding_completed' => 'if_exist|in_list[0,1]',
    ];
}
