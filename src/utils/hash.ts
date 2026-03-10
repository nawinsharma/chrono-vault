import * as Crypto from 'expo-crypto';

export async function generateSalt(byteLength = 24): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(byteLength);
  const binary = String.fromCharCode(...bytes);
  return typeof btoa !== 'undefined'
    ? btoa(binary)
    : Buffer.from(bytes).toString('base64');
}

export async function sha256Hex(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

export async function computeCommitmentHash(
  prediction: string,
  salt: string
): Promise<string> {
  return sha256Hex(`${prediction}:${salt}`);
}

export async function verifyCommitment(
  prediction: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const computed = await computeCommitmentHash(prediction, salt);
  return computed === expectedHash;
}
