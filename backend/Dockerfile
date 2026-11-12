FROM composer:2 AS composer

FROM php:8.3-apache-bookworm

ENV TZ=America/Sao_Paulo \
    COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_HOME=/tmp/composer

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libicu-dev libonig-dev libzip-dev unzip \
    && docker-php-ext-install -j"$(nproc)" intl mbstring mysqli opcache zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer /usr/bin/composer /usr/local/bin/composer
COPY docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php/development.ini /usr/local/etc/php/conf.d/economizou.ini
COPY docker/entrypoint.sh /usr/local/bin/economizou-entrypoint
# Checkouts Windows podem trazer CRLF; normalize antes de executar o shebang.
RUN sed -i 's/\r$//' /usr/local/bin/economizou-entrypoint \
    && chmod 0755 /usr/local/bin/economizou-entrypoint \
    && test -x /bin/sh \
    && /bin/sh -n /usr/local/bin/economizou-entrypoint

WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-progress --no-scripts --no-autoloader
COPY --chown=www-data:www-data . .
RUN composer dump-autoload --optimize \
    && chown -R www-data:www-data writable

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/economizou-entrypoint"]
CMD ["apache2-foreground"]
