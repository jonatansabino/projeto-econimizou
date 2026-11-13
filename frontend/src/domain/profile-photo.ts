export const PHOTO_INPUT_LIMIT = 10 * 1024 * 1024;
export const PHOTO_OUTPUT_LIMIT = 2 * 1024 * 1024;
export type StagedPhoto = { id: string; uri: string; scope: string };
export type PhotoLease = { uri: string; release(): void };
export interface PhotoRepository {
  scope: string;
  pick(signal?: AbortSignal): Promise<StagedPhoto | null>;
  recover(): Promise<StagedPhoto | null>;
  commit(photo: StagedPhoto): Promise<string>;
  discard(photo: StagedPhoto): Promise<void>;
  resolve(ref: string): Promise<PhotoLease | null>;
  remove(ref: string): Promise<void>;
}
export class PhotoError extends Error {
  code: string;
  constructor(message: string, code = 'photo') { super(message); this.code = code; }
}
export function validPhotoRef(value: unknown): value is string {
  return typeof value === 'string' && /^photo-[a-z0-9]+-[a-z0-9]+$/.test(value) && value.length <= 80;
}
export function photoId() { return `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`; }
export function validatePhotoBytes(size: number, header: Uint8Array, native: boolean) {
  if (!Number.isSafeInteger(size) || size <= 0) throw new PhotoError('Não foi possível ler a imagem. Escolha outro arquivo.');
  if (size > PHOTO_INPUT_LIMIT) throw new PhotoError('Escolha uma imagem de até 10 MB.');
  const ascii = Array.from(header).map(byte => String.fromCharCode(byte)).join('');
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => header[i] === byte);
  const webp = ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
  const heif = native && ascii.slice(4, 8) === 'ftyp' && /heic|heix|hevc|hevx|mif1|msf1/.test(ascii.slice(8));
  if (!(jpeg || png || webp || heif)) throw new PhotoError(native ? 'Use uma foto JPEG, PNG, WebP ou HEIC/HEIF compatível.' : 'Use uma imagem JPEG, PNG ou WebP.');
}
