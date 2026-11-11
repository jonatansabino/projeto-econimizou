<?php

namespace App\Models;

class ChatMessageModel extends UserOwnedModel
{
    protected $table = 'chat_messages';
    protected $allowedFields = ['role', 'text', 'proposal_type', 'proposal', 'request', 'status', 'transaction_id', 'goal_id'];
    protected $validationRules = [
        'role' => 'required|in_list[user,assistant]',
        'text' => 'required|max_length[65535]',
        'proposal_type' => 'permit_empty|in_list[transaction,goal]',
        'proposal' => 'permit_empty|json_object',
        'request' => 'permit_empty|json_object',
        'status' => 'permit_empty|in_list[pending,confirmed,cancelled]',
        'transaction_id' => 'permit_empty|is_natural_no_zero',
        'goal_id' => 'permit_empty|is_natural_no_zero',
    ];
}
