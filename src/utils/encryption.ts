import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

async function importKey(keyData: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(keyData);
  return await crypto.subtle.importKey('raw', raw, { name: ALGORITHM }, false, [
    'decrypt',
  ]);
}

export async function encryptData(
  plaintext: string
): Promise<{ encrypted: string; keyId: string }> {
  const key = await generateKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  const ivBase64 = arrayBufferToBase64(iv.buffer);
  const encryptedBase64 = arrayBufferToBase64(encryptedBuffer);
  const encrypted = `${ivBase64}:${encryptedBase64}`;

  const keyId = Crypto.randomUUID();
  const keyExported = await exportKey(key);
  await SecureStore.setItemAsync(`capsule-key-${keyId}`, keyExported);

  return { encrypted, keyId };
}

export async function decryptData(
  encryptedPayload: string,
  keyId: string
): Promise<string> {
  const keyData = await SecureStore.getItemAsync(`capsule-key-${keyId}`);
  if (!keyData) {
    throw new Error('Encryption key not found. Cannot decrypt capsule.');
  }

  const key = await importKey(keyData);
  const [ivBase64, encryptedBase64] = encryptedPayload.split(':');
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const encryptedBuffer = base64ToArrayBuffer(encryptedBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

export async function deleteKey(keyId: string): Promise<void> {
  await SecureStore.deleteItemAsync(`capsule-key-${keyId}`);
}
