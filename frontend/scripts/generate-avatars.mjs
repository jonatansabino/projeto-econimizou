import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Avatar, Style } from '@dicebear/core';
const definition = JSON.parse(await readFile(createRequire(import.meta.url).resolve('@dicebear/styles/adventurer.json'), 'utf8'));

// Geração em Node durante desenvolvimento. O aplicativo recebe somente os SVGs locais.
const style = new Style(definition);
const names = ['Aurora', 'Brisa', 'Céu', 'Duna', 'Estrela', 'Floresta', 'Horizonte', 'Lagoa', 'Maré', 'Nuvem', 'Sol', 'Vale'];
const avatars = names.map((name, index) => ({
  id: `dicebear:adventurer:${index + 1}`,
  name,
  // SvgXml converte atributos XML com hífen para camelCase. ARIA é aplicado
  // pelo ProfileAvatar na plataforma correta, fora do parser de SVG.
  xml: new Avatar(style, { seed: `econimizou-adventurer-${index + 1}`, size: 128, idRandomization: false, backgroundColor: ['173c30', '183744', '303254'] }).toString().replace(/\saria-hidden="true"/g, ''),
}));
const attribution = '// Gerado por scripts/generate-avatars.mjs — não editar manualmente.\n// Adventurer por Lisa Wischofsky / DiceBear, CC BY 4.0.\n// https://www.dicebear.com/styles/adventurer/ | https://creativecommons.org/licenses/by/4.0/\n// Fundos adaptados para o tema do Econimizou.\n';
await writeFile(new URL('../src/data/avatar-catalog.ts', import.meta.url), `${attribution}export const avatarCatalog = ${JSON.stringify(avatars, null, 2)} as const;\n`);
console.log(`${avatars.length} avatares locais gerados.`);
