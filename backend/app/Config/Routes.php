<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->setAutoRoute(false);
$routes->get('/', 'Health::index');
$routes->get('health', 'Health::index');
$routes->group('api/auth', ['namespace' => 'App\\Controllers\\Api'], static function ($routes) {
    $routes->options('(:any)', static fn () => response()->setStatusCode(204));
    $routes->get('csrf', 'AuthController::csrf');
    $routes->post('register', 'AuthController::register', ['filter' => 'auth-limit:register']);
    $routes->post('login', 'AuthController::login', ['filter' => 'auth-limit:login']);
    $routes->get('me', 'AuthController::me', ['filter' => 'api-token']);
    $routes->post('logout', 'AuthController::logout', ['filter' => 'api-token']);
    $routes->patch('profile', 'AuthController::profile', ['filter' => 'api-token']);
});

$routes->group('api/categories', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    $routes->options('(:any)', static fn () => response()->setStatusCode(204));
    $routes->options('', static fn () => response()->setStatusCode(204));
    $routes->get('', 'CategoriesController::index', ['filter' => 'api-token']);
    $routes->post('', 'CategoriesController::create', ['filter' => 'api-token']);
    $routes->patch('(:num)', 'CategoriesController::update/$1', ['filter' => 'api-token']);
    $routes->delete('(:num)', 'CategoriesController::delete/$1', ['filter' => 'api-token']);
});

$routes->group('api/finance', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    $routes->options('(:any)', static fn () => response()->setStatusCode(204));
    $routes->options('', static fn () => response()->setStatusCode(204));
    $routes->get('', 'FinanceController::index', ['filter' => 'api-token']);
    $routes->post('transactions', 'FinanceController::apply', ['filter' => 'api-token']);
});
