/**
 * ipfs.js — Upload encrypted medical records to IPFS via Pinata + fetch them back
 *
 * Design:
 *   - Upload: Takes encrypted bytes (Uint8Array), wraps them in a File,
 *     and uploads to Pinata's free-tier IPFS pinning service.
 *     Returns the IPFS CID (Content Identifier).
 *
 *   - Fetch: Takes a CID, fetches the file from the Pinata dedicated
 *     gateway (or public IPFS gateway as fallback), and returns the
 *     raw bytes as Uint8Array for decryption.
 *
 *   - We store the encrypted bytes as a binary file on IPFS.
 *     The filename includes a timestamp for traceability but the
 *     data is fully encrypted — even if someone gets the CID,
 *     they cannot read the medical data without the patient's key.
 *
 * Environment variables needed (in frontend/.env):
 *   VITE_UPLOAD_API_URL   — Your backend upload API URL
 *   VITE_PINATA_GATEWAY   — Your dedicated Pinata gateway URL
 */

// ─── Configuration ───────────────────────────────────────────────

import { bytesToBase64 } from "./encryption.js";

const UPLOAD_API_URL =
  import.meta.env.VITE_UPLOAD_API_URL || "http://localhost:8787";
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY;
const PINATA_API_URL = "https://api.pinata.cloud";

// Public IPFS gateways as fallback
const PUBLIC_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

// ─── Upload ──────────────────────────────────────────────────────

/**
 * Upload encrypted data to IPFS via Pinata.
 *
 * @param {Uint8Array} encryptedData  The encrypted record bytes.
 * @param {Object}     metadata       Optional metadata for Pinata pinning.
 * @param {string}     metadata.name  A display name for the file.
 * @param {Object}     metadata.keyvalues  Key-value pairs for Pinata filtering.
 * @returns {Promise<{cid: string, size: number}>}  The IPFS CID and file size.
 */
export async function uploadToIPFS(encryptedData, metadata = {}) {
  const timestamp = Date.now();
  const filename = metadata.name || `netsanet-record-${timestamp}.enc`;

  const response = await fetch(`${UPLOAD_API_URL.replace(/\/+$/, "")}/api/ipfs/pin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bytesBase64: bytesToBase64(encryptedData),
      name: filename,
      keyvalues: {
        app: "netsanet",
        ...(metadata.keyvalues || {}),
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 404) {
      throw new Error(
        `Upload API route not found at ${UPLOAD_API_URL}. Ensure the backend server is running and VITE_UPLOAD_API_URL points to it.`,
      );
    }

    throw new Error(`Upload API failed (${response.status}): ${errorBody}`);
  }

  const result = await response.json();

  return {
    cid: result.cid,
    size: result.size,
  };
}

// ─── Fetch ───────────────────────────────────────────────────────

/**
 * Fetch encrypted data from IPFS by CID.
 *
 * Tries the dedicated Pinata gateway first, then falls back to public gateways.
 *
 * @param {string} cid  The IPFS Content Identifier.
 * @returns {Promise<Uint8Array>}  The raw encrypted bytes.
 */
export async function fetchFromIPFS(cid) {
  if (!cid) {
    throw new Error('CID is required');
  }

  // Build list of gateway URLs to try
  const urls = [];

  // Dedicated Pinata gateway first (fastest, most reliable)
  if (PINATA_GATEWAY) {
    const gateway = PINATA_GATEWAY.replace(/\/+$/, ''); // strip trailing slash
    urls.push(`https://${gateway}/ipfs/${cid}`);
  }

  // Then public gateways as fallback
  urls.push(...PUBLIC_GATEWAYS.map((gw) => `${gw}${cid}`));

  // Try each gateway in order
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (err) {
      lastError = err;
      console.warn(`IPFS fetch failed for ${url}:`, err.message);
      // Continue to next gateway
    }
  }

  throw new Error(
    `Failed to fetch CID ${cid} from all gateways. Last error: ${lastError?.message}`
  );
}

// ─── High-Level Helpers ──────────────────────────────────────────

/**
 * Upload an encrypted medical record with descriptive metadata.
 *
 * @param {Uint8Array} encryptedData   The encrypted record bytes.
 * @param {string}     patientAddress  The patient's wallet address.
 * @param {string}     category        Record category (e.g. "HIV_TREATMENT").
 * @param {string}     recordType      Human-readable type (e.g. "CD4 Count").
 * @returns {Promise<string>}  The IPFS CID.
 */
export async function uploadMedicalRecord(
  encryptedData,
  patientAddress,
  category,
  recordType
) {
  const result = await uploadToIPFS(encryptedData, {
    name: `netsanet-${category}-${Date.now()}.enc`,
    keyvalues: {
      app: 'netsanet',
      patient: patientAddress,
      category,
      recordType,
      timestamp: new Date().toISOString(),
    },
  });

  return result.cid;
}

/**
 * Fetch an encrypted medical record by CID.
 *
 * @param {string} cid  The IPFS CID stored on-chain.
 * @returns {Promise<Uint8Array>}  The encrypted bytes (ready for decryption).
 */
export async function fetchMedicalRecord(cid) {
  return fetchFromIPFS(cid);
}
