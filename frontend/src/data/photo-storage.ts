import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { PHOTO_OUTPUT_LIMIT, PhotoError, photoId, validPhotoRef, validatePhotoBytes, type PhotoRepository, type StagedPhoto } from '../domain/profile-photo';

const PENDING_KEY = '@econimizou/photo-picker-pending';
async function readPending(): Promise<{ scope: string; request: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return typeof value?.scope === 'string' && typeof value?.request === 'string' ? value : null;
  } catch { return null; }
}
export function createPhotoRepository(scope: string): PhotoRepository {
  // Codificação sem colisões e componentes curtos; nenhum caminho externo é aceito.
  const encoded = scope.split('').map(char => char.charCodeAt(0).toString(16).padStart(4, '0')).join('');
  const root = new Directory(Paths.document, 'profile-photos', ...(encoded.match(/.{1,80}/g) ?? []));
  const drafts = new Directory(root, 'drafts'); const images = new Directory(root, 'images');
  const pending = new Set<string>();
  async function stage(asset: ImagePicker.ImagePickerAsset): Promise<StagedPhoto> {
    const source = new File(asset.uri);
    const header = source.open(); let bytes: Uint8Array;
    try { bytes = await header.readBytes(32); } finally { header.close(); }
    validatePhotoBytes(source.size, bytes, true);
    let normalized: string | undefined;
    try {
      const decoded = await ImageManipulator.manipulate(source.uri).renderAsync();
      const side = Math.min(decoded.width, decoded.height);
      if (!side) throw new Error('invalid_image');
      const result = await ImageManipulator.manipulate(decoded).crop({ originX: Math.floor((decoded.width - side) / 2), originY: Math.floor((decoded.height - side) / 2), width: side, height: side }).resize({ width: 512, height: 512 }).renderAsync();
      normalized = (await result.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: false })).uri;
      const file = new File(normalized);
      if (file.size > PHOTO_OUTPUT_LIMIT) throw new PhotoError('A imagem processada ultrapassa 2 MB. Escolha outra foto.');
      drafts.create({ intermediates: true, idempotent: true });
      const id = photoId(); const destination = new File(drafts, `${id}.jpg`);
      await file.copy(destination); pending.add(id);
      return { id, uri: destination.uri, scope };
    } catch (error) {
      if (error instanceof PhotoError) throw error;
      throw new PhotoError('Não foi possível abrir esta imagem. Escolha outra foto.');
    } finally { if (normalized) { try { new File(normalized).delete(); } catch { /* Cache será limpo pelo sistema. */ } } }
  }
  async function fromResult(result: ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult | null) {
    if (!result) return null;
    if ('code' in result) throw new PhotoError('Não foi possível recuperar a seleção. Escolha a foto novamente.');
    return result.canceled ? null : stage(result.assets[0]);
  }
  return {
    scope,
    async recover() {
      if (Platform.OS !== 'android') return null;
      const marker = await readPending();
      if (!marker || marker.scope !== scope) return null;
      const result = await ImagePicker.getPendingResultAsync();
      await AsyncStorage.removeItem(PENDING_KEY);
      return fromResult(result);
    },
    async pick(signal) {
      const request = photoId();
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ scope, request }));
      try {
        // O seletor de fotos do sistema concede acesso limitado ao item escolhido.
        // Nenhuma permissão ampla/câmera é solicitada ao montar as telas.
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, allowsEditing: true, aspect: [1, 1], quality: 1, base64: false, exif: false });
        if (signal?.aborted) return null;
        return await fromResult(result);
      } catch (error) {
        if (error instanceof PhotoError) throw error;
        const permission = /permission|denied|access/i.test(String((error as { code?: string })?.code ?? ''));
        throw new PhotoError(permission ? 'Acesso à galeria negado. Permita o acesso nas configurações do aparelho.' : 'Não foi possível escolher a foto. Tente novamente.', permission ? 'permission' : 'photo');
      } finally {
        try {
          const marker = await readPending();
          if (marker?.request === request) await AsyncStorage.removeItem(PENDING_KEY);
        } catch { /* Não invalida uma seleção válida por falha ao limpar o marcador. */ }
      }
    },
    async commit(photo) {
      if (photo.scope !== scope || !validPhotoRef(photo.id) || !pending.has(photo.id)) throw new PhotoError('Escolha a foto novamente antes de salvar.');
      const source = new File(drafts, `${photo.id}.jpg`);
      if (!source.exists) throw new PhotoError('A prévia não está mais disponível. Escolha a foto novamente.');
      images.create({ intermediates: true, idempotent: true });
      const destination = new File(images, `${photo.id}.jpg`);
      if (!destination.exists) await source.copy(destination);
      return photo.id;
    },
    async discard(photo) { if (photo.scope !== scope || !pending.has(photo.id)) return; const file = new File(drafts, `${photo.id}.jpg`); if (file.exists) file.delete(); pending.delete(photo.id); },
    async resolve(ref) { if (!validPhotoRef(ref)) return null; const file = new File(images, `${ref}.jpg`); return file.exists ? { uri: file.uri, release() {} } : null; },
    async remove(ref) { if (!validPhotoRef(ref)) return; const file = new File(images, `${ref}.jpg`); if (file.exists) file.delete(); },
  };
}
