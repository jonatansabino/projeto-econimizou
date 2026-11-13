<?php

namespace App\Libraries;

use DateTimeImmutable;

/** Validação compartilhada pelo endpoint e Model, sem calcular idade. */
final class ProfilePersonalization
{
    public static function errors(array $data): array
    {
        $errors = [];
        if (array_key_exists('birth_date', $data) && $data['birth_date'] !== null) {
            $value = $data['birth_date'];
            try {
                $date = is_string($value) ? DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
            } catch (\ValueError) {
                $date = false;
            }
            if (! $date || $date->format('Y-m-d') !== $value || $value < '1900-01-01' || $value > date('Y-m-d')) {
                $errors['birth_date'] = 'Informe uma data válida, de 1900 até hoje.';
            }
        }
        if (array_key_exists('financial_objective', $data) && $data['financial_objective'] !== null && ! in_array($data['financial_objective'], ['organize', 'save', 'debt_free', 'achievement'], true)) {
            $errors['financial_objective'] = 'Escolha um objetivo válido.';
        }
        if (array_key_exists('monthly_income_cents', $data) && $data['monthly_income_cents'] !== null && (! is_int($data['monthly_income_cents']) || $data['monthly_income_cents'] < 0 || $data['monthly_income_cents'] > 9007199254740991)) {
            $errors['monthly_income_cents'] = 'Informe uma renda válida em centavos.';
        }
        if (array_key_exists('personalization_completed', $data) && ! in_array($data['personalization_completed'], [true, false, 0, 1], true)) {
            $errors['personalization_completed'] = 'Informe uma preferência válida.';
        }
        return $errors;
    }
}
