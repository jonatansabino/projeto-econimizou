<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\CategoryModel;
use Throwable;

class CategoriesController extends BaseController
{
    private function failure(string $message, int $status = 422)
    {
        return $this->response->setStatusCode($status)->setJSON(['message' => $message]);
    }

    private function dto(array $row): array
    {
        return ['id' => (string) $row['id'], 'name' => $row['name'], 'type' => $row['type'],
            'client_key' => $row['client_key'] ?? null, 'archived' => ($row['deleted_at'] ?? null) !== null];
    }

    private function accountChanged()
    {
        $expected = $this->request->getHeaderLine('X-Account-ID');
        return $expected !== '' && $expected !== (string) auth()->id()
            ? $this->failure('A conta mudou. Atualize a página antes de continuar.', 409) : null;
    }

    public function index()
    {
        if ($changed = $this->accountChanged()) return $changed;
        try {
            // Inclui tombstones para preservar referências financeiras de outros aparelhos.
            $rows = (new CategoryModel())->withDeleted()->findAll();
            return $this->response->setJSON(['categories' => array_map($this->dto(...), $rows)]);
        } catch (Throwable) { return $this->failure('Não foi possível consultar as categorias.', 503); }
    }

    private function payload(bool $create): ?array
    {
        try { $data = $this->request->getJSON(true); } catch (Throwable) { return null; }
        if (! is_array($data) || array_is_list($data) || array_diff(array_keys($data), $create ? ['name', 'type', 'client_key'] : ['name', 'type'])) return null;
        if (! is_string($data['name'] ?? null) || ! is_string($data['type'] ?? null)) return null;
        $data['name'] = preg_replace('/\s+/u', ' ', trim($data['name']));
        if (! $data['name'] || mb_strlen($data['name']) > 100 || ! in_array($data['type'], ['income', 'expense'], true)) return null;
        if ($create && (! is_string($data['client_key'] ?? null) || ! preg_match('/^[a-zA-Z0-9:_-]{1,128}$/D', $data['client_key']))) return null;
        return $data;
    }

    private function mutate(callable $action)
    {
        if ($changed = $this->accountChanged()) return $changed;
        $db = db_connect(); $db->transBegin();
        try {
            $state = \App\Libraries\FinancialState::lock($db, (int) auth()->id());
            if ($this->request->getHeaderLine('X-Finance-Reset') !== $state['reset_key']) {
                $db->transRollback(); return $this->failure('Atualize os dados financeiros antes de continuar.', 409);
            }
            $response = $action();
            if ($response->getStatusCode() >= 400 || ! $db->transStatus()) $db->transRollback(); else $db->transCommit();
            return $response;
        } catch (Throwable) { $db->transRollback(); return $this->failure('Não foi possível salvar a categoria.', 503); }
    }
    public function create() { return $this->mutate(fn () => $this->createOwned()); }
    public function update(string $id) { return $this->mutate(fn () => $this->updateOwned($id)); }
    public function delete(string $id) { return $this->mutate(fn () => $this->deleteOwned($id)); }

    private function createOwned()
    {
        if ($changed = $this->accountChanged()) return $changed;
        $data = $this->payload(true);
        if ($data === null) return $this->failure('Informe nome, tipo e identificador válidos. Não envie dados de outro usuário.');
        try {
            $model = new CategoryModel();
            $key = $model->byClientKey($data['client_key']);
            if ($key) {
                if ($key['deleted_at'] !== null || $key['name'] !== $data['name'] || $key['type'] !== $data['type']) return $this->failure('Esta solicitação já foi utilizada. Atualize as categorias e tente novamente.', 409);
                return $this->response->setJSON(['category' => $this->dto($key)]);
            }
            $same = $model->byName($data['name'], $data['type']);
            if ($same) {
                if ($same['deleted_at'] !== null) $model->update($same['id'], ['deleted_at' => null]);
                return $this->response->setJSON(['category' => $this->dto($model->find($same['id']))]);
            }
            $id = $model->insert($data);
            if (! $id) return $this->failure('Não foi possível cadastrar a categoria.');
            return $this->response->setStatusCode(201)->setJSON(['category' => $this->dto($model->find($id))]);
        } catch (Throwable $error) {
            // Corrida entre duas solicitações: o índice impede duplicação.
            if ((int) $error->getCode() === 1062 || str_contains($error->getMessage(), 'Duplicate entry')) return $this->failure('A categoria já existe. Atualize a lista e tente novamente.', 409);
            return $this->failure('Não foi possível salvar a categoria.', 503);
        }
    }

    private function updateOwned(string $id)
    {
        if ($changed = $this->accountChanged()) return $changed;
        $data = $this->payload(false);
        if ($data === null) return $this->failure('Informe nome e tipo válidos.');
        try {
            $model = new CategoryModel(); $row = $model->find($id);
            if (! $row) return $this->failure('Categoria não encontrada.', 404);
            // Transações continuam locais em outros dispositivos: nunca quebrar seu tipo.
            if ($row['type'] !== $data['type']) return $this->failure('O tipo de uma categoria salva no banco é fixo. Crie outra categoria com o tipo desejado.');
            $same = $model->byName($data['name'], $data['type']);
            if ($same && (string) $same['id'] !== $id) return $this->failure('Já existe uma categoria com esse nome e tipo.', 409);
            if (! $model->update($id, $data)) return $this->failure('Não foi possível atualizar a categoria.');
            return $this->response->setJSON(['category' => $this->dto($model->find($id))]);
        } catch (Throwable) { return $this->failure('Não foi possível atualizar a categoria.', 409); }
    }

    private function deleteOwned(string $id)
    {
        if ($changed = $this->accountChanged()) return $changed;
        try {
            $model = new CategoryModel();
            $row = $model->withDeleted()->find($id);
            if (! $row) return $this->failure('Categoria não encontrada.', 404);
            if ($row['deleted_at'] === null && ! $model->delete($id)) return $this->failure('Não foi possível excluir a categoria.');
            return $this->response->setJSON(['deleted' => true]);
        } catch (\CodeIgniter\Database\Exceptions\DatabaseException) { return $this->failure('Categoria em uso. Preserve os registros vinculados.', 409); }
        catch (Throwable) { return $this->failure('Não foi possível excluir a categoria.', 503); }
    }
}
