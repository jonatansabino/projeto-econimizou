import { PHOTO_OUTPUT_LIMIT, PhotoError, photoId, validPhotoRef, validatePhotoBytes, type PhotoRepository } from '../domain/profile-photo';

// O único armazenamento binário web é IndexedDB. URLs blob são leases de renderização.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      if (typeof indexedDB === 'undefined') throw new Error('storage_unavailable');
      request = indexedDB.open('economizou-profile-photos', 1);
    } catch { reject(new PhotoError('Este navegador não permite salvar fotos locais. Use um avatar.')); return; }
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new PhotoError('Não foi possível acessar as fotos locais neste navegador.'));
    request.onblocked = () => reject(new PhotoError('Feche outras abas do aplicativo e tente novamente.'));
  });
}
async function operation<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('photos', mode);
      const request = run(transaction.objectStore('photos'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = transaction.onerror = () => reject(new PhotoError('Não foi possível salvar a foto no navegador. Verifique o espaço disponível.'));
    });
  } finally { db.close(); }
}
async function normalize(file: File): Promise<Blob> {
  validatePhotoBytes(file.size, new Uint8Array(await file.slice(0, 32).arrayBuffer()), false);
  const uri = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = uri;
    await image.decode();
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    if (!size) throw new Error('invalid_dimensions');
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas_unavailable');
    ctx.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 512, 512);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('encoding_failed')), 'image/jpeg', 0.85));
    if (blob.size > PHOTO_OUTPUT_LIMIT) throw new PhotoError('A imagem processada ultrapassa 2 MB. Escolha outra foto.');
    return blob;
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    throw new PhotoError('Não foi possível abrir esta imagem. Escolha outra foto.');
  } finally { URL.revokeObjectURL(uri); }
}
export function createPhotoRepository(scope: string): PhotoRepository {
  const staged = new Map<string, { blob: Blob; uri: string }>();
  const key = (id: string) => `${scope}|${id}`;
  return {
    scope,
    recover: async () => null,
    pick(signal) {
      // A abertura precisa acontecer dentro do gesto do usuário, antes de qualquer await.
      return new Promise((resolve, reject) => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp';
        input.style.display = 'none'; document.body.append(input);
        let finished = false;
        const cleanup = () => { input.remove(); signal?.removeEventListener('abort', abort); };
        const cancel = () => { if (finished) return; finished = true; cleanup(); resolve(null); };
        const abort = cancel;
        signal?.addEventListener('abort', abort, { once: true });
        input.oncancel = cancel;
        input.onchange = async () => {
          if (finished) return;
          const file = input.files?.[0]; if (!file) return cancel();
          try {
            const blob = await normalize(file);
            if (finished || signal?.aborted) return cancel();
            const id = photoId(); const uri = URL.createObjectURL(blob); staged.set(id, { blob, uri });
            finished = true; cleanup(); resolve({ id, uri, scope });
          } catch (error) { if (!finished) { finished = true; cleanup(); reject(error); } }
        };
        if (signal?.aborted) cancel(); else input.click();
      });
    },
    async commit(photo) {
      const draft = photo.scope === scope && staged.get(photo.id);
      if (!draft || !validPhotoRef(photo.id)) throw new PhotoError('Escolha a foto novamente antes de salvar.');
      await operation('readwrite', store => store.put(draft.blob, key(photo.id)));
      return photo.id;
    },
    async discard(photo) { if (photo.scope !== scope) return; const draft = staged.get(photo.id); if (draft) URL.revokeObjectURL(draft.uri); staged.delete(photo.id); },
    async resolve(ref) {
      if (!validPhotoRef(ref)) return null;
      const blob = await operation('readonly', store => store.get(key(ref)));
      if (!(blob instanceof Blob)) return null;
      const uri = URL.createObjectURL(blob); return { uri, release: () => URL.revokeObjectURL(uri) };
    },
    async remove(ref) { if (validPhotoRef(ref)) await operation('readwrite', store => store.delete(key(ref))); },
  };
}
