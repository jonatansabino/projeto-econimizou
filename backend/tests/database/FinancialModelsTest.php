<?php

namespace Tests\Database;

use App\Models\CategoryBudgetModel;
use App\Models\CategoryModel;
use App\Models\ChatMessageModel;
use App\Models\GoalModel;
use App\Models\NotificationModel;
use App\Models\SavingRecommendationModel;
use App\Models\TransactionModel;
use App\Models\UserPreferenceModel;
use CodeIgniter\Database\Exceptions\DatabaseException;
use CodeIgniter\Shield\Entities\User;
use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use DomainException;
use LogicException;
use PHPUnit\Framework\Attributes\DataProvider;

class FinancialModelsTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use AuthenticationTesting;

    protected $namespace = null;
    protected $refresh = true;
    private User $alice;
    private User $bob;

    protected function setUp(): void
    {
        parent::setUp();
        $users = new UserModel();
        foreach (['alice', 'bob'] as $name) {
            $user = new User(['username' => $name . bin2hex(random_bytes(5)), 'active' => 1]);
            $this->assertTrue($users->save($user));
            $this->{$name} = $users->findById($users->getInsertID());
        }
        $this->asUser($this->alice);
    }

    private function asUser(User $user): void
    {
        auth()->logout();
        $this->actingAs($user);
    }

    public static function models(): array
    {
        return array_map(static fn ($class) => [$class], [
            CategoryModel::class, TransactionModel::class, GoalModel::class, CategoryBudgetModel::class,
            NotificationModel::class, UserPreferenceModel::class, ChatMessageModel::class, SavingRecommendationModel::class,
        ]);
    }

    private function payload(string $class): array
    {
        return match ($class) {
            CategoryModel::class => ['name' => 'Categoria teste', 'type' => 'expense'],
            TransactionModel::class => ['description' => 'Almoço', 'type' => 'expense', 'category_id' => $this->category(), 'amount_cents' => 4500, 'transaction_date' => '2026-11-11'],
            GoalModel::class => ['name' => 'Videogame', 'target_cents' => 300000, 'saved_cents' => 0],
            CategoryBudgetModel::class => ['category_id' => $this->category(), 'period_month' => '2026-11-01', 'limit_cents' => 50000],
            NotificationModel::class => ['title' => 'Aviso', 'body' => 'Teste', 'notification_date' => '2026-11-11', 'is_read' => false],
            UserPreferenceModel::class => ['display_name' => 'Jonatan', 'avatar' => 'dicebear:adventurer:2', 'hide_amounts' => true],
            ChatMessageModel::class => ['role' => 'user', 'text' => 'Almocei por R$ 45'],
            SavingRecommendationModel::class => ['title' => 'Economize', 'description' => 'Revise gastos', 'status' => 'pending'],
        };
    }

    private function category(string $type = 'expense'): int
    {
        return (int) (new CategoryModel())->insert(['name' => 'Categoria ' . bin2hex(random_bytes(3)), 'type' => $type]);
    }

    #[DataProvider('models')]
    public function testEveryModelScopesReadAndRejectsForeignWrites(string $class): void
    {
        $model = new $class();
        $row = $this->payload($class);
        $id = $model->insert($row + ['user_id' => $this->bob->id, 'created_at' => '1900-01-01 00:00:00']);
        $this->assertNotFalse($id, json_encode($model->errors()));
        $found = $model->find($id);
        $this->assertSame((int) $this->alice->id, (int) $found['user_id']);
        $this->assertNotSame('1900-01-01 00:00:00', $found['created_at']);
        $this->assertNotEmpty($found['updated_at']);
        $aliceCount = $model->countAllResults();
        $this->assertGreaterThanOrEqual(1, $aliceCount);

        $this->asUser($this->bob);
        $this->assertNull($model->find($id));
        $this->assertSame([], $model->findAll());
        $this->assertNull($model->first());
        $this->assertSame(0, $model->countAllResults());
        $this->assertSame([], $model->paginate(10));
        foreach (['update', 'delete'] as $operation) {
            try {
                $operation === 'update' ? $model->update($id, $row) : $model->delete($id);
                $this->fail('Operação em registro de outro usuário foi aceita.');
            } catch (DomainException) {
                $this->assertTrue(true);
            }
        }
        $bobId = $model->insert($this->payload($class));
        $this->assertNotFalse($bobId);
        $this->assertSame(1, $model->countAllResults());
        $this->asUser($this->alice);
        $this->assertNull($model->find($bobId));
        $this->assertSame($aliceCount, $model->countAllResults());
        $this->assertNotContains((string) $bobId, array_map('strval', $model->findColumn('id')));
        $this->assertTrue($model->update($id, $row + ['user_id' => $this->bob->id, 'created_at' => '1900-01-01 00:00:00']));
        $this->assertSame((int) $this->alice->id, (int) $model->find($id)['user_id']);
        $this->assertSame($found['created_at'], $model->find($id)['created_at']);
        $this->assertTrue($model->delete($id));
        $this->assertNull($model->find($id));
    }

    public function testUnauthenticatedAccessFailsClosed(): void
    {
        auth()->logout();
        $this->expectException(LogicException::class);
        (new GoalModel())->findAll();
    }

    public function testRawBuilderIsNotAnUnscopedEscapeHatch(): void
    {
        $this->expectException(LogicException::class);
        (new GoalModel())->builder()->get();
    }

    public function testSameCategoryNameCanBelongToDifferentUsersButNotBeDuplicated(): void
    {
        $model = new CategoryModel();
        $this->assertNotFalse($model->insert(['name' => 'Alimentação', 'type' => 'expense']));
        $this->asUser($this->bob);
        $this->assertNotFalse($model->insert(['name' => 'Alimentação', 'type' => 'expense']));
        $this->expectException(DatabaseException::class);
        $model->insert(['name' => '  ALIMENTAÇÃO  ', 'type' => 'expense']);
    }

    public function testMonthlyBudgetIsUniqueAndExpenseOnly(): void
    {
        $model = new CategoryBudgetModel();
        $payload = $this->payload(CategoryBudgetModel::class);
        $this->assertNotFalse($model->insert($payload));
        $this->assertNotFalse($model->insert(array_replace($payload, ['period_month' => '2026-12-01'])));
        $this->assertFalse($model->insert(array_replace($payload, ['period_month' => '2026-12-02'])));
        $this->expectException(DatabaseException::class);
        $model->insert($payload);
    }

    public function testForeignKeysRejectCategoryOfAnotherUserEvenThroughSql(): void
    {
        $category = $this->category();
        $this->expectException(DatabaseException::class);
        $this->db->table('transactions')->insert([
            'user_id' => $this->bob->id, 'category_id' => $category, 'type' => 'expense',
            'description' => 'Inválida', 'amount_cents' => 100, 'transaction_date' => '2026-11-11',
        ]);
    }

    public function testForeignKeysRejectIncomeInExpenseCategory(): void
    {
        $payload = $this->payload(TransactionModel::class);
        $this->expectException(DatabaseException::class);
        (new TransactionModel())->insert(array_replace($payload, ['type' => 'income']));
    }

    public function testBudgetCannotReferenceIncomeCategory(): void
    {
        $this->expectException(DatabaseException::class);
        (new CategoryBudgetModel())->insert(['category_id' => $this->category('income'), 'period_month' => '2026-11-01', 'limit_cents' => 5000]);
    }

    public function testMoneyAndCivilDatesAreValidatedWithoutFloatConversion(): void
    {
        $model = new TransactionModel();
        $row = $this->payload(TransactionModel::class);
        foreach ([0, -1, 10.5, true, '1e3', '9007199254740992'] as $invalid) {
            $this->assertFalse($model->insert(array_replace($row, ['amount_cents' => $invalid])));
        }
        $this->assertFalse($model->insert(array_replace($row, ['transaction_date' => '2026-02-31'])));
        $id = $model->insert(array_replace($row, ['amount_cents' => '9007199254740991']));
        $this->assertNotFalse($id);
        $this->assertSame('9007199254740991', (string) $model->find($id)['amount_cents']);
        $this->assertSame('2026-11-11', $model->find($id)['transaction_date']);
    }

    public function testDatabaseChecksRejectInvalidAmountsWhenModelIsBypassed(): void
    {
        $this->expectException(DatabaseException::class);
        $this->db->table('goals')->insert(['user_id' => $this->alice->id, 'name' => 'Zero', 'target_cents' => 0]);
    }

    public function testPreferencesAreOneToOneWithShieldUser(): void
    {
        $model = new UserPreferenceModel();
        $id = $model->insert(['display_name' => 'Jonatan']);
        $this->assertNotFalse($id);
        $this->assertSame(0, (int) $model->find($id)['hide_amounts']);
        $this->assertSame(1, (int) $model->find($id)['notifications_enabled']);
        $this->expectException(DatabaseException::class);
        $model->insert(['display_name' => 'Outro']);
    }

    public function testConfirmedChatAndRecommendationsCannotLinkAnotherUsersGoal(): void
    {
        $goal = (new GoalModel())->insert(['name' => 'Videogame', 'target_cents' => 300000]);
        $chat = new ChatMessageModel();
        $id = $chat->insert(['role' => 'assistant', 'text' => 'Meta criada', 'proposal_type' => 'goal', 'proposal' => '{"name":"Videogame","targetCents":300000,"savedCents":0}', 'status' => 'confirmed', 'goal_id' => $goal]);
        $this->assertNotFalse($id);
        $this->assertSame('confirmed', $chat->find($id)['status']);
        $this->asUser($this->bob);
        $this->expectException(DatabaseException::class);
        (new SavingRecommendationModel())->insert(['title' => 'Reserva', 'description' => 'Guarde', 'goal_id' => $goal]);
    }

    public function testChatRejectsConflictingProposalAndRequest(): void
    {
        $this->expectException(DatabaseException::class);
        (new ChatMessageModel())->insert(['role' => 'assistant', 'text' => 'Confusa', 'proposal_type' => 'goal', 'proposal' => '{"name":"Meta"}', 'status' => 'pending', 'request' => '{"kind":"goal"}']);
    }

    public function testUserAndUsedCategoryCannotBePhysicallyRemovedByAccident(): void
    {
        $model = new TransactionModel();
        $row = $this->payload(TransactionModel::class);
        $this->assertNotFalse($model->insert($row));
        $this->expectException(DatabaseException::class);
        $this->db->table('users')->where('id', $this->alice->id)->delete();
    }

    public function testUsedCategoryCannotBeDeleted(): void
    {
        $row = $this->payload(TransactionModel::class);
        $this->assertNotFalse((new TransactionModel())->insert($row));
        $this->expectException(DatabaseException::class);
        (new CategoryModel())->delete($row['category_id']);
    }

    public function testChatCannotLinkAnotherUsersConfirmedTransaction(): void
    {
        $row = $this->payload(TransactionModel::class);
        $transaction = (new TransactionModel())->insert($row);
        $this->asUser($this->bob);
        $this->expectException(DatabaseException::class);
        (new ChatMessageModel())->insert(['role' => 'assistant', 'text' => 'Confirmada', 'proposal_type' => 'transaction', 'proposal' => '{}', 'status' => 'confirmed', 'transaction_id' => $transaction]);
    }

    public function testOwnerForeignKeyRequiresExistingShieldUser(): void
    {
        $this->expectException(DatabaseException::class);
        $this->db->table('goals')->insert(['user_id' => 4000000000, 'name' => 'Inválida', 'target_cents' => 100]);
    }

    public function testMalformedChatJsonIsRejectedByModel(): void
    {
        $model = new ChatMessageModel();
        $this->assertFalse($model->insert(['role' => 'assistant', 'text' => 'Proposta', 'proposal_type' => 'goal', 'status' => 'pending', 'proposal' => '{invalido}']));
    }
}
