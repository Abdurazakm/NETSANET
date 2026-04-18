/**
 * encryption.js — AES-256-GCM encryption/decryption using the browser's Web Crypto API
 *
 * Design:
 *   - The patient's encryption key is derived deterministically from their
 *     wallet signature.  They sign a fixed message with MetaMask; the
 *     signature is fed through PBKDF2 to produce a 256-bit AES key.
 *   - Every encrypt() call generates a fresh random 12-byte IV (nonce).
 *     The IV is prepended to the ciphertext so decrypt() can extract it.
 *   - No external libraries — uses only the browser-native Web Crypto API.
 *
 * Data flow:
 *   Patient signs message → signature → PBKDF2 → AES-256-GCM key
 *   encrypt(key, plaintext) → IV + ciphertext  (Uint8Array)
 *   decrypt(key, payload)   → plaintext         (string)
 */

// ─── Constants ───────────────────────────────────────────────────

/**
 * The fixed message that the patient signs with their wallet to derive
 * their encryption key.  By always signing the same message, the same
 * wallet will always produce the same key (deterministic).
 */
export const KEY_DERIVATION_MESSAGE =
  'Netsanet: I authorize this device to encrypt and decrypt my medical records. ' +
  'This signature will be used to derive my personal encryption key. ' +
  'It will NOT execute any blockchain transaction or spend any funds.';

/** AES-GCM uses a 12-byte (96-bit) initialization vector. */
const IV_LENGTH = 12;

/** PBKDF2 iteration count — 100k is a good balance for browser perf. */
const PBKDF2_ITERATIONS = 100_000;

// ─── Key Derivation ──────────────────────────────────────────────

/**
 * Derive a deterministic AES-256-GCM CryptoKey from a wallet signature.
 *
 * How it works:
 *   1. The patient signs KEY_DERIVATION_MESSAGE with MetaMask.
 *   2. That hex signature string is encoded to bytes.
 *   3. Those bytes are imported as PBKDF2 "key material".
 *   4. PBKDF2 stretches the material into a 256-bit AES-GCM key.
 *
 * The same wallet + same message = same signature = same key.
 * This means the patient never needs to "remember" a password —
 * their wallet IS the password.
 *
 * @param {string} signature  The hex signature from MetaMask (e.g. "0xabc...").
 * @returns {Promise<CryptoKey>}  An AES-256-GCM key usable with encrypt/decrypt.
 */
export async function deriveKeyFromSignature(signature) {
  // Encode the signature string into raw bytes
  const encoder = new TextEncoder();
  const signatureBytes = encoder.encode(signature);

  // Import the raw bytes as PBKDF2 key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    signatureBytes,
    { name: 'PBKDF2' },
    false,           // not extractable
    ['deriveKey']
  );

  // Use a fixed salt derived from our app name so it's deterministic
  const salt = encoder.encode('netsanet-medical-records-v1');

  // Derive the final AES-256-GCM key
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,           // not extractable (stays in Web Crypto)
    ['encrypt', 'decrypt']
  );

  return aesKey;
}

/**
 * Request the patient to sign the key-derivation message with MetaMask
 * and return the derived AES key.
 *
 * @param {import('ethers').Signer} signer  An ethers.js Signer (from MetaMask).
 * @returns {Promise<CryptoKey>}  The derived AES-256-GCM key.
 */
export async function deriveKeyFromWallet(signer) {
  // Ask MetaMask to sign our fixed message
  const signature = await signer.signMessage(KEY_DERIVATION_MESSAGE);
  // Derive and return the AES key
  return deriveKeyFromSignature(signature);
}

// ─── Encryption ──────────────────────────────────────────────────

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Output format:  [12-byte IV] + [ciphertext + 16-byte auth tag]
 * This is a single Uint8Array that can be uploaded to IPFS as-is.
 *
 * @param {CryptoKey} key         The AES-256-GCM key from deriveKey*.
 * @param {string}    plaintext   The data to encrypt (e.g. JSON string).
 * @returns {Promise<Uint8Array>} The IV + ciphertext concatenated.
 */
export async function encrypt(key, plaintext) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate a fresh random IV for every encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Concatenate IV + ciphertext into a single buffer
  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), IV_LENGTH);

  return result;
}

/**
 * Decrypt a payload that was produced by encrypt().
 *
 * @param {CryptoKey}  key      The same AES-256-GCM key used to encrypt.
 * @param {Uint8Array} payload  The IV + ciphertext buffer.
 * @returns {Promise<string>}   The decrypted plaintext string.
 */
export async function decrypt(key, payload) {
  // Extract the IV from the first 12 bytes
  const iv = payload.slice(0, IV_LENGTH);
  // The rest is ciphertext + auth tag
  const ciphertext = payload.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// ─── Convenience Helpers ─────────────────────────────────────────

/**
 * Encrypt a JavaScript object (serializes to JSON first).
 *
 * @param {CryptoKey} key   The AES key.
 * @param {Object}    data  Any JSON-serializable object.
 * @returns {Promise<Uint8Array>}
 */
export async function encryptJSON(key, data) {
  const json = JSON.stringify(data);
  return encrypt(key, json);
}

/**
 * Decrypt a payload back into a JavaScript object.
 *
 * @param {CryptoKey}  key      The AES key.
 * @param {Uint8Array} payload  The encrypted payload.
 * @returns {Promise<Object>}   The parsed JSON object.
 */
export async function decryptJSON(key, payload) {
  const json = await decrypt(key, payload);
  return JSON.parse(json);
}

/**
 * Convert a Uint8Array to a base64 string (for JSON transport/storage).
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert a base64 string back to a Uint8Array.
 * @param {string} base64
 * @returns {Uint8Array}
 */
export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
