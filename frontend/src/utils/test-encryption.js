/**
 * test-encryption.js — In-browser integration test for the encryption pipeline
 *
 * This module exports a single function `runEncryptionTests()` that can be
 * called from a React component or the browser console to verify:
 *
 *   1. Key derivation produces a valid CryptoKey
 *   2. Encrypt → decrypt round-trip preserves data exactly
 *   3. JSON encrypt → decrypt preserves objects and types
 *   4. Different keys cannot decrypt each other's data
 *   5. Tampered ciphertext is rejected (integrity check)
 *   6. Base64 encoding round-trip works
 *   7. Two encryptions of the same plaintext produce different ciphertext (unique IVs)
 *
 * Note: This does NOT test IPFS upload/fetch (that requires valid Pinata keys).
 *       It tests the cryptographic correctness of the encryption module.
 *
 * Usage:
 *   import { runEncryptionTests } from '../utils/test-encryption';
 *   const results = await runEncryptionTests();
 *   console.table(results);
 */

import {
  deriveKeyFromSignature,
  encrypt,
  decrypt,
  encryptJSON,
  decryptJSON,
  bytesToBase64,
  base64ToBytes,
} from './encryption.js';

// ─── Test Harness ────────────────────────────────────────────────

/**
 * Run all encryption pipeline tests.
 * @returns {Promise<Array<{name: string, passed: boolean, error?: string}>>}
 */
export async function runEncryptionTests() {
  const results = [];

  async function test(name, fn) {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`  ✅ ${name}`);
    } catch (err) {
      results.push({ name, passed: false, error: err.message });
      console.error(`  ❌ ${name}: ${err.message}`);
    }
  }

  console.log('🔐 Running Netsanet Encryption Tests...\n');

  // ── Test 1: Key Derivation ──────────────────────────────────

  let key1;
  await test('Key derivation produces a valid CryptoKey', async () => {
    // Simulate a MetaMask signature (in real usage this comes from signer.signMessage)
    const fakeSignature = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1c';
    key1 = await deriveKeyFromSignature(fakeSignature);

    if (!key1) throw new Error('Key is null');
    if (key1.type !== 'secret') throw new Error(`Expected 'secret', got '${key1.type}'`);
    if (key1.algorithm.name !== 'AES-GCM') throw new Error(`Expected AES-GCM, got ${key1.algorithm.name}`);
    if (key1.algorithm.length !== 256) throw new Error(`Expected 256-bit, got ${key1.algorithm.length}`);
  });

  // ── Test 2: Deterministic Key Derivation ────────────────────

  await test('Same signature always produces the same key', async () => {
    const sig = '0xdeadbeef1234';
    const keyA = await deriveKeyFromSignature(sig);
    const keyB = await deriveKeyFromSignature(sig);

    // Encrypt with keyA, decrypt with keyB — should work if they're the same
    const plaintext = 'determinism test';
    const encrypted = await encrypt(keyA, plaintext);
    const decrypted = await decrypt(keyB, encrypted);
    if (decrypted !== plaintext) throw new Error('Keys are not deterministic');
  });

  // ── Test 3: Encrypt → Decrypt Round-Trip ────────────────────

  await test('Encrypt → decrypt preserves plaintext exactly', async () => {
    const plaintext = 'Hello, Selam! Your CD4 count is 650. ነፃነት';
    const encrypted = await encrypt(key1, plaintext);
    const decrypted = await decrypt(key1, encrypted);

    if (decrypted !== plaintext) {
      throw new Error(`Expected "${plaintext}", got "${decrypted}"`);
    }
  });

  // ── Test 4: JSON Round-Trip ─────────────────────────────────

  await test('JSON encrypt → decrypt preserves object structure and types', async () => {
    const record = {
      clinic: 'MSF Bole Clinic',
      diagnosis: 'HIV-1 positive',
      cd4Count: 650,
      viralLoad: null,
      medications: ['TDF', '3TC', 'DTG'],
      isStable: true,
      nested: { deep: { value: 42 } },
    };

    const encrypted = await encryptJSON(key1, record);
    const decrypted = await decryptJSON(key1, encrypted);

    // Verify every field
    if (decrypted.clinic !== 'MSF Bole Clinic') throw new Error('clinic mismatch');
    if (decrypted.cd4Count !== 650) throw new Error('cd4Count mismatch');
    if (decrypted.viralLoad !== null) throw new Error('null not preserved');
    if (decrypted.medications.length !== 3) throw new Error('array length mismatch');
    if (decrypted.isStable !== true) throw new Error('boolean mismatch');
    if (decrypted.nested.deep.value !== 42) throw new Error('nested object mismatch');
  });

  // ── Test 5: Wrong Key Cannot Decrypt ────────────────────────

  await test('Different key cannot decrypt data (access control proof)', async () => {
    const key2 = await deriveKeyFromSignature('0xdifferent_wallet_signature');

    const secret = 'Mental health: anxiety management session notes';
    const encrypted = await encrypt(key1, secret);

    try {
      await decrypt(key2, encrypted);
      throw new Error('Decryption should have failed with wrong key!');
    } catch (err) {
      // We expect an OperationError from Web Crypto (decryption failed)
      if (err.message === 'Decryption should have failed with wrong key!') {
        throw err; // Re-throw our assertion error
      }
      // Otherwise the error is from Web Crypto — which is exactly what we want
    }
  });

  // ── Test 6: Tampered Ciphertext Is Rejected ─────────────────

  await test('Tampered ciphertext is rejected (integrity)', async () => {
    const plaintext = 'ART regimen: TDF/3TC/DTG';
    const encrypted = await encrypt(key1, plaintext);

    // Flip a byte in the ciphertext (after the 12-byte IV)
    const tampered = new Uint8Array(encrypted);
    tampered[15] ^= 0xFF; // flip bits in byte 15

    try {
      await decrypt(key1, tampered);
      throw new Error('Decryption of tampered data should have failed!');
    } catch (err) {
      if (err.message === 'Decryption of tampered data should have failed!') {
        throw err;
      }
      // AES-GCM auth tag check failed — correct behavior
    }
  });

  // ── Test 7: Base64 Round-Trip ───────────────────────────────

  await test('Base64 encode → decode preserves bytes', async () => {
    const original = new Uint8Array([0, 1, 2, 128, 255, 42, 0, 99]);
    const b64 = bytesToBase64(original);
    const restored = base64ToBytes(b64);

    if (restored.length !== original.length) throw new Error('Length mismatch');
    for (let i = 0; i < original.length; i++) {
      if (restored[i] !== original[i]) {
        throw new Error(`Byte mismatch at index ${i}`);
      }
    }
  });

  // ── Test 8: Unique IVs ─────────────────────────────────────

  await test('Two encryptions of same data produce different ciphertext (unique IVs)', async () => {
    const plaintext = 'same data twice';
    const enc1 = await encrypt(key1, plaintext);
    const enc2 = await encrypt(key1, plaintext);

    // The outputs should be different (different random IVs)
    let identical = true;
    if (enc1.length !== enc2.length) {
      identical = false;
    } else {
      for (let i = 0; i < enc1.length; i++) {
        if (enc1[i] !== enc2[i]) {
          identical = false;
          break;
        }
      }
    }

    if (identical) {
      throw new Error('Two encryptions produced identical output — IV reuse!');
    }

    // But both should decrypt to the same plaintext
    const dec1 = await decrypt(key1, enc1);
    const dec2 = await decrypt(key1, enc2);
    if (dec1 !== plaintext || dec2 !== plaintext) {
      throw new Error('Decryption failed after unique IV check');
    }
  });

  // ── Test 9: Empty String ───────────────────────────────────

  await test('Empty string encrypts and decrypts correctly', async () => {
    const encrypted = await encrypt(key1, '');
    const decrypted = await decrypt(key1, encrypted);
    if (decrypted !== '') throw new Error('Empty string not preserved');
  });

  // ── Test 10: Large Payload ─────────────────────────────────

  await test('Large payload (50KB) encrypts and decrypts correctly', async () => {
    // Simulate a large medical record with many entries
    const largeData = 'x'.repeat(50_000);
    const encrypted = await encrypt(key1, largeData);
    const decrypted = await decrypt(key1, encrypted);
    if (decrypted.length !== 50_000) throw new Error('Length mismatch');
    if (decrypted !== largeData) throw new Error('Content mismatch');
  });

  // ── Summary ────────────────────────────────────────────────

  console.log('\n📊 Results:');
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`   ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('   🎉 All encryption tests passed!\n');
  } else {
    console.log('   ⚠️  Some tests failed. Check errors above.\n');
  }

  return results;
}
