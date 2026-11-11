<?php

namespace App\Validation;

use DateTimeImmutable;

class FinancialRules
{
    private function cents($value, int $minimum): bool
    {
        if ((! is_int($value) && ! is_string($value)) || ! preg_match('/^\d+$/D', (string) $value)) {
            return false;
        }
        $digits = ltrim((string) $value, '0') ?: '0';
        return strlen($digits) <= 16 && (int) $digits >= $minimum && (int) $digits <= 9007199254740991;
    }

    public function positive_cents($value): bool
    {
        return $this->cents($value, 1);
    }

    public function nonnegative_cents($value): bool
    {
        return $this->cents($value, 0);
    }

    public function civil_date($value): bool
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) {
            return false;
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        return $date !== false && $date->format('Y-m-d') === $value && $value >= '1900-01-01';
    }

    public function budget_month($value): bool
    {
        return $this->civil_date($value) && substr($value, -2) === '01';
    }

    public function json_object($value): bool
    {
        return is_string($value) && json_validate($value) && str_starts_with(ltrim($value), '{');
    }
}
