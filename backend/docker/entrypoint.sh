#!/bin/sh
set -eu

if [ ! -f .env ]; then
    echo 'Arquivo .env ausente. Execute: cp .env.example .env' >&2
    exit 1
fi

# O volume de vendor continua válido após mudanças no composer.lock.
composer install --no-interaction --prefer-dist --no-progress
mkdir -p writable/cache writable/logs writable/session writable/uploads writable/debugbar
chown -R www-data:www-data writable

exec docker-php-entrypoint "$@"
