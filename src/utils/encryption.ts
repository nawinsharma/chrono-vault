import { gcm } from '@noble/ciphers/aes.js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { uuidv4 } from './uuid';

const KEY_LENGTH = 32;
const IV_LENGTH = 12;

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa !== 'undefined') return btoa(binary);
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const a = bytes[i++]!;
    const b = i < bytes.length ? bytes[i++]! : 0;
    const c = i < bytes.length ? bytes[i++]! : 0;
    result += BASE64_CHARS[a >> 2];
    result += BASE64_CHARS[((a & 3) << 4) | (b >> 4)];
    result += i > bytes.length + 1 ? '=' : BASE64_CHARS[((b & 15) << 2) | (c >> 6)];
    result += i > bytes.length ? '=' : BASE64_CHARS[c & 63];
  }
  return result;
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  base64 = base64.replace(/=+$/, '');
  const n = base64.length;
  const bytes = new Uint8Array((n * 3) >> 2);
  let j = 0;
  for (let i = 0; i < n; i += 4) {
    const a = BASE64_CHARS.indexOf(base64[i]!);
    const b = BASE64_CHARS.indexOf(base64[i + 1]!);
    const c = BASE64_CHARS.indexOf(base64[i + 2]!);
    const d = BASE64_CHARS.indexOf(base64[i + 3]!);
    bytes[j++] = (a << 2) | (b >> 4);
    if (c !== -1) bytes[j++] = ((b & 15) << 4) | (c >> 2);
    if (d !== -1) bytes[j++] = ((c & 3) << 6) | d;
  }
  return bytes.slice(0, j);
}

export async function encryptData(
  plaintext: string
): Promise<{ encrypted: string; keyId: string }> {
  const key = await Crypto.getRandomBytesAsync(KEY_LENGTH);
  const iv = await Crypto.getRandomBytesAsync(IV_LENGTH);
  const plaintextBytes = new TextEncoder().encode(plaintext);

  const aes = gcm(key, iv);
  const ciphertext = aes.encrypt(plaintextBytes);

  const ivBase64 = bytesToBase64(iv);
  const encryptedBase64 = bytesToBase64(ciphertext);
  const encrypted = `${ivBase64}:${encryptedBase64}`;

  const keyId = await uuidv4();
  const keyBase64 = bytesToBase64(key);
  await SecureStore.setItemAsync(`capsule-key-${keyId}`, keyBase64);

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

  const key = base64ToBytes(keyData);
  const [ivBase64, encryptedBase64] = encryptedPayload.split(':');
  const iv = base64ToBytes(ivBase64);
  const ciphertext = base64ToBytes(encryptedBase64);

  const aes = gcm(key, iv);
  const decrypted = aes.decrypt(ciphertext);
  return new TextDecoder().decode(decrypted);
}

export async function deleteKey(keyId: string): Promise<void> {
  await SecureStore.deleteItemAsync(`capsule-key-${keyId}`);
}
