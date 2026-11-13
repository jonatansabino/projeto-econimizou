<?php

namespace App\Models;

class UserPreferenceModel extends UserOwnedModel
{
    protected $table = 'user_preferences';
    protected $allowedFields = ['display_name', 'avatar', 'hide_amounts', 'notifications_enabled', 'animations_enabled', 'onboarding_completed', 'birth_date', 'financial_objective', 'monthly_income_cents', 'personalization_completed'];

    protected function prepare(array $row): array
    {
        $errors = \App\Libraries\ProfilePersonalization::errors($row);
        if ($errors !== []) {
            throw new \InvalidArgumentException(implode(' ', $errors));
        }
        if (isset($row['personalization_completed'])) $row['personalization_completed'] = (int) $row['personalization_completed'];
        return parent::prepare($row);
    }
    protected $validationRules = [
        'display_name' => 'permit_empty|max_length[60]',
        'avatar' => 'permit_empty|max_length[100]',
        'hide_amounts' => 'if_exist|in_list[0,1]',
        'notifications_enabled' => 'if_exist|in_list[0,1]',
        'animations_enabled' => 'if_exist|in_list[0,1]',
        'onboarding_completed' => 'if_exist|in_list[0,1]',
    ];
}
