import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('..', import.meta.url));
const backend = fileURLToPath(new URL('../../backend', import.meta.url));
const api = 'http://127.0.0.1:8082';
function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!existsSync(`${backend}/.env`)) throw new Error('Prepare backend/.env a partir de backend/.env.example antes dos testes.');
run('docker', ['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.test.yml', 'up', '-d', '--build', '--wait', '--wait-timeout', '120', 'app', 'db-test', 'app-test'], backend);
run('docker', ['compose', 'exec', '-T', 'app', 'php', '-r', 'require "tests/bootstrap.php";'], backend);
const env = { ...process.env, EXPO_PUBLIC_API_URL: api, EXPO_PUBLIC_ALLOW_LOCAL_HTTP: 'true', TEST_API_URL: api };
run('npx', ['expo', 'export', '--platform', 'web', '--clear'], frontend, env);
run('npx', ['playwright', 'test', ...process.argv.slice(2)], frontend, env);
