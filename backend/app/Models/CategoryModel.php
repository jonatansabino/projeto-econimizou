<?php

namespace App\Models;

class CategoryModel extends UserOwnedModel
{
    protected $table = 'categories';
    protected $allowedFields = ['name', 'type', 'client_key', 'deleted_at'];
    protected $useSoftDeletes = true;
    public function byClientKey(string $key): ?array
    {
        return $this->owned(fn () => $this->withDeleted()->where('client_key', $key)->first());
    }

    public function byName(string $name, string $type): ?array
    {
        return $this->owned(fn () => $this->withDeleted()->where('name', $name)->where('type', $type)->first());
    }

    protected function doDelete($id = null, bool $purge = false)
    {
        $owner = $this->ownerId();
        foreach ((array) $id as $categoryId) {
            if (! is_scalar($categoryId) || ! $this->withDeleted()->find($categoryId)) continue;
            foreach (['transactions', 'category_budgets'] as $table) {
                if ($this->db->table($table)->where('user_id', $owner)->where('category_id', $categoryId)->countAllResults() > 0) {
                    throw new \CodeIgniter\Database\Exceptions\DatabaseException('Categoria em uso.');
                }
            }
        }
        return parent::doDelete($id, $purge);
    }

    protected $validationRules = [
        'name' => 'required|max_length[100]',
        'type' => 'required|in_list[income,expense]',
    ];
}
