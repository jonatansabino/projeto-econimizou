import { avatarCatalog } from '../data/avatar-catalog.ts';

export const DEFAULT_AVATAR = avatarCatalog[0].id;
export { avatarCatalog };

// Perfis antigos continuam válidos. O emoji é convertido visualmente em uma opção
// determinística; só salvamos o novo identificador quando o usuário salva o perfil.
export function resolveAvatar(value: string) {
  const selected = avatarCatalog.find((avatar) => avatar.id === value);
  if (selected) return selected;
  let hash = 0;
  for (const character of value.trim()) hash = (Math.imul(hash, 31) + (character.codePointAt(0) ?? 0)) >>> 0;
  return avatarCatalog[hash % avatarCatalog.length];
}
