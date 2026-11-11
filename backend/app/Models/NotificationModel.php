<?php

namespace App\Models;

class NotificationModel extends UserOwnedModel
{
    protected $table = 'notifications';
    protected $allowedFields = ['title', 'body', 'notification_date', 'is_read'];
    protected $validationRules = [
        'title' => 'required|max_length[160]',
        'body' => 'required|max_length[65535]',
        'notification_date' => 'required|civil_date',
        'is_read' => 'if_exist|in_list[0,1]',
    ];
}
