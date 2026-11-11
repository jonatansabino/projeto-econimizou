<?php

namespace App\Models;

use Closure;
use CodeIgniter\Model;
use DomainException;
use InvalidArgumentException;
use LogicException;

/**
 * Model financeiro fechado por padrão: o dono vem exclusivamente do Shield.
 * Leitura/escrita passam pelos métodos do Model; builder e operações em lote
 * não são uma API pública. SQL administrativo deve usar conexão separada.
 */
abstract class UserOwnedModel extends Model
{
    protected $returnType = 'array';
    protected $useTimestamps = true;
    private bool $insideOwnedOperation = false;

    final protected function ownerId(): int
    {
        $id = auth()->id();
        if ($id === null || ! auth()->loggedIn()) {
            throw new LogicException('É necessário autenticar o usuário com CodeIgniter Shield.');
        }
        return (int) $id;
    }

    final protected function owned(Closure $operation)
    {
        $owner = $this->ownerId();
        $previous = $this->insideOwnedOperation;
        $this->insideOwnedOperation = true;
        try {
            parent::builder()->where($this->table . '.user_id', $owner);
            return $operation();
        } finally {
            parent::builder()->resetQuery();
            $this->insideOwnedOperation = $previous;
        }
    }

    final public function builder(?string $table = null)
    {
        if (! $this->insideOwnedOperation || ($table !== null && $table !== $this->table)) {
            throw new LogicException('Query Builder direto não é permitido nos Models por usuário.');
        }
        return parent::builder($table);
    }

    final public function setTable(string $table)
    {
        throw new LogicException('A tabela deste Model não pode ser alterada.');
    }

    final public function set($key, $value = '', ?bool $escape = null)
    {
        throw new LogicException('Passe os campos diretamente para insert() ou update().');
    }

    protected function prepare(array $row): array
    {
        foreach ($row as $key => $value) {
            if (is_object($value)) {
                throw new InvalidArgumentException('Objetos e expressões SQL não são aceitos.');
            }
            if (is_string($value) && in_array($key, ['name', 'description', 'title', 'display_name', 'avatar'], true)) {
                $row[$key] = preg_replace('/\s+/u', ' ', trim($value));
            }
            if (is_bool($value) && in_array($key, ['is_read', 'hide_amounts', 'notifications_enabled', 'animations_enabled', 'onboarding_completed'], true)) {
                $row[$key] = (int) $value;
            }
        }
        unset($row['user_id'], $row['created_at'], $row['updated_at']);
        return $row;
    }

    final public function insert($row = null, bool $returnID = true)
    {
        $this->ownerId();
        if (! is_array($row)) {
            throw new InvalidArgumentException('Informe os dados como array.');
        }
        return parent::insert($this->prepare($row), $returnID);
    }

    final public function update($id = null, $row = null): bool
    {
        $this->assertOwnedIds($id);
        if (! is_array($row)) {
            throw new InvalidArgumentException('Informe os dados como array.');
        }
        return parent::update($id, $this->prepare($row));
    }

    private function assertOwnedIds($id): void
    {
        $owner = $this->ownerId();
        $ids = is_array($id) ? array_values(array_unique($id)) : [$id];
        foreach ($ids as $value) {
            if ((! is_int($value) && ! is_string($value)) || ! ctype_digit((string) $value) || (int) $value < 1) {
                throw new InvalidArgumentException('Informe identificadores válidos para a operação.');
            }
        }
        if ($ids === [] || $this->db->table($this->table)->where('user_id', $owner)->whereIn('id', $ids)->countAllResults() !== count($ids)) {
            throw new DomainException('Registro não encontrado para este usuário.');
        }
    }

    protected function doFind(bool $singleton, $id = null)
    {
        return $this->owned(fn () => parent::doFind($singleton, $id));
    }

    protected function doFindAll(?int $limit = null, int $offset = 0)
    {
        return $this->owned(fn () => parent::doFindAll($limit, $offset));
    }

    protected function doFirst()
    {
        return $this->owned(fn () => parent::doFirst());
    }

    protected function doFindColumn(string $columnName)
    {
        return $this->owned(fn () => parent::doFindColumn($columnName));
    }

    protected function doInsert(array $row)
    {
        $row['user_id'] = $this->ownerId();
        return $this->owned(fn () => parent::doInsert($row));
    }

    protected function doUpdate($id = null, $row = null): bool
    {
        $this->assertOwnedIds($id);
        unset($row['user_id'], $row['created_at']);
        return $this->owned(fn () => parent::doUpdate($id, $row));
    }

    protected function doDelete($id = null, bool $purge = false)
    {
        $this->assertOwnedIds($id);
        return $this->owned(fn () => parent::doDelete($id, $purge));
    }

    public function countAllResults(bool $reset = true, bool $test = false)
    {
        return $this->owned(fn () => parent::countAllResults(true, $test));
    }

    protected function doInsertBatch(?array $set = null, ?bool $escape = null, int $batchSize = 100, bool $testing = false)
    {
        throw new LogicException('Operações em lote não são permitidas neste estágio.');
    }

    protected function doUpdateBatch(?array $set = null, ?string $index = null, int $batchSize = 100, bool $returnSQL = false)
    {
        throw new LogicException('Operações em lote não são permitidas neste estágio.');
    }

    protected function doReplace(?array $row = null, bool $returnSQL = false)
    {
        throw new LogicException('replace() não é permitido para dados financeiros.');
    }
}
