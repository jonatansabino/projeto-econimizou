import { spawn } from 'node:child_process';
import { constants, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const backend = join(root, 'backend');
const frontend = join(root, 'frontend');
const args = process.argv.slice(2);
let child;
let interrupted = false;

function run(command, commandArgs, cwd, quiet = false) {
  return new Promise((resolveRun, reject) => {
    if (interrupted) return reject(new Error('Inicialização interrompida.'));
    const processChild = spawn(command, commandArgs, {
      cwd,
      stdio: quiet ? ['inherit', 'ignore', 'inherit'] : 'inherit',
      shell: false,
    });
    child = processChild;
    processChild.once('error', (error) => {
      if (child === processChild) child = undefined;
      reject(new Error(error.code === 'ENOENT'
        ? `Comando não encontrado: ${command}. Confira a instalação e o PATH.`
        : `Não foi possível executar ${command}: ${error.message}`));
    });
    processChild.once('exit', (code, signal) => {
      if (child === processChild) child = undefined;
      if (code === 0) resolveRun();
      else reject(new Error(`${command} encerrou com ${signal ? `sinal ${signal}` : `código ${code}`}.`));
    });
  });
}

function createLocalEnv(example, destination) {
  if (existsSync(destination)) return;
  copyFileSync(example, destination, constants.COPYFILE_EXCL);
  console.log(`Criado ${destination} a partir do exemplo de desenvolvimento.`);
}

async function main() {
  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`Uso: npm start -- [opções do Expo]
     node start.mjs [opções do Expo]
     ./start [opções do Expo] (Linux/macOS)

Sobe API/banco, aguarda a saúde, aplica migrations pendentes e inicia o Expo.
Exemplo: npm start -- --clear
Ctrl+C encerra o Expo; os containers continuam em segundo plano.`);
    return;
  }

  const [major, minor] = process.versions.node.split('.').map(Number);
  if (!(major === 22 && minor >= 13 || major === 24 && minor >= 3 || major >= 26)) {
    throw new Error('Este Expo requer Node.js 22.13+, 24.3+ ou 26+. Ative uma versão compatível antes de iniciar.');
  }
  const expoPackagePath = join(frontend, 'node_modules', 'expo', 'package.json');
  if (!existsSync(expoPackagePath)) {
    throw new Error('Instale as dependências antes de iniciar: npm ci --prefix frontend');
  }
  const expoPackage = JSON.parse(readFileSync(expoPackagePath, 'utf8'));
  const expoCli = resolve(dirname(expoPackagePath), expoPackage.bin.expo);
  if (!existsSync(expoCli)) throw new Error('Expo incompleto. Execute npm ci --prefix frontend.');

  await run('docker', ['compose', 'version'], backend, true);
  await run('docker', ['info'], backend, true);
  createLocalEnv(join(backend, '.env.example'), join(backend, '.env'));
  createLocalEnv(join(frontend, '.env.example'), join(frontend, '.env.local'));

  console.log('\n[1/3] Subindo API e MariaDB e aguardando os serviços ficarem saudáveis...');
  await run('docker', ['compose', 'up', '-d', '--build', '--wait', 'app', 'db'], backend);
  console.log('\n[2/3] Aplicando migrations pendentes, incluindo Shield...');
  await run('docker', ['compose', 'exec', '-T', 'app', 'php', 'spark', 'migrate', '--all'], backend);
  console.log('\n[3/3] Iniciando Expo. API: http://localhost:8080 | Saúde: http://localhost:8080/health');
  console.log('Ctrl+C encerra o Expo; API e banco continuam ligados.\n');
  // Dispensa npx.cmd, Bash e shell quoting no Windows.
  await run(process.execPath, [expoCli, 'start', ...args], frontend);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted = true;
    // Ctrl+C já chega ao filho pelo console compartilhado no Windows.
    if (child && (process.platform !== 'win32' || signal === 'SIGTERM')) child.kill(signal);
  });
}

main().catch((error) => {
  if (!interrupted) console.error(`\nFalha na inicialização: ${error.message}`);
  process.exitCode = interrupted ? 130 : 1;
});
