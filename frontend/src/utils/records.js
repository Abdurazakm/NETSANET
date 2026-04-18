/**
 * records.js — High-level record pipeline: encrypt → upload → store CID on-chain
 *                                          fetch CID → download → decrypt
 *
 * This is the "glue" module that the frontend components will call.
 * It orchestrates encryption.js and ipfs.js together.
 *
 * Usage (from a React component):
 *
 *   import { submitRecord, retrieveRecords } from '../utils/records';
 *
 *   // Doctor submits a record for a patient
 *   const cid = await submitRecord(encryptionKey, {
 *     diagnosis: 'HIV positive, stable on ART',
 *     cd4Count: 650,
 *     medication: 'TDF/3TC/DTG',
 *     notes: 'Patient responding well to treatment',
 *   }, patientAddress, 'HIV_TREATMENT', 'CD4 Count Report');
 *
 *   // Doctor/patient retrieves and decrypts records
 *   const records = await retrieveRecords(encryptionKey, arrayOfCIDs);
 */

import { encryptJSON, decryptJSON, bytesToBase64, base64ToBytes } from './encryption.js';
import { uploadMedicalRecord, fetchMedicalRecord } from './ipfs.js';

// ─── Record Categories (mirrors the Solidity enum) ──────────────

export const RECORD_CATEGORIES = {
  GENERAL_CONSULTATION: 0,
  HIV_TREATMENT: 1,
  MENTAL_HEALTH: 2,
  LAB_RESULT: 3,
  PRESCRIPTION: 4,
  PRENATAL_CARE: 5,
  CHRONIC_DISEASE: 6,
};

export const CATEGORY_LABELS = {
  0: 'General Consultation',
  1: 'HIV Treatment',
  2: 'Mental Health',
  3: 'Lab Result',
  4: 'Prescription',
  5: 'Prenatal Care',
  6: 'Chronic Disease',
};

export const CATEGORY_COLORS = {
  0: '#3B82F6', // blue
  1: '#EF4444', // red
  2: '#8B5CF6', // purple
  3: '#10B981', // green
  4: '#F59E0B', // amber
  5: '#EC4899', // pink
  6: '#F97316', // orange
};

// ─── Submit Record Pipeline ─────────────────────────────────────

/**
 * Full pipeline: encrypt medical data → upload to IPFS → return CID.
 *
 * The CID is then stored on-chain by the calling component via the
 * smart contract's addRecord() function.
 *
 * @param {CryptoKey} encryptionKey    The patient's AES-256-GCM key.
 * @param {Object}    recordData       The medical record data (plain object).
 * @param {string}    patientAddress   The patient's wallet address.
 * @param {string}    category         Category name (e.g. 'HIV_TREATMENT').
 * @param {string}    recordType       Human-readable type (e.g. 'CD4 Count').
 * @returns {Promise<string>}          The IPFS CID to store on-chain.
 */
export async function submitRecord(
  encryptionKey,
  recordData,
  patientAddress,
  category,
  recordType
) {
  // 1. Add metadata wrapper around the raw medical data
  const envelope = {
    version: 1,
    createdAt: new Date().toISOString(),
    category,
    recordType,
    data: recordData,
  };

  // 2. Encrypt the entire envelope
  const encryptedBytes = await encryptJSON(encryptionKey, envelope);

  // 3. Upload encrypted bytes to IPFS via Pinata
  const cid = await uploadMedicalRecord(
    encryptedBytes,
    patientAddress,
    category,
    recordType
  );

  console.log(`✅ Record uploaded. CID: ${cid}`);
  return cid;
}

// ─── Retrieve Records Pipeline ──────────────────────────────────

/**
 * Fetch and decrypt a single record by its IPFS CID.
 *
 * @param {CryptoKey} encryptionKey  The patient's AES-256-GCM key.
 * @param {string}    cid            The IPFS CID from the smart contract.
 * @returns {Promise<Object>}        The decrypted medical record envelope.
 */
export async function retrieveRecord(encryptionKey, cid) {
  // 1. Fetch encrypted bytes from IPFS
  const encryptedBytes = await fetchMedicalRecord(cid);

  // 2. Decrypt back to the envelope object
  const envelope = await decryptJSON(encryptionKey, encryptedBytes);

  return envelope;
}

/**
 * Fetch and decrypt multiple records in parallel.
 *
 * @param {CryptoKey}  encryptionKey  The patient's AES-256-GCM key.
 * @param {string[]}   cids           Array of IPFS CIDs.
 * @returns {Promise<Object[]>}       Array of decrypted record envelopes.
 */
export async function retrieveRecords(encryptionKey, cids) {
  const results = await Promise.allSettled(
    cids.map((cid) => retrieveRecord(encryptionKey, cid))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true, cid: cids[index], data: result.value };
    } else {
      console.error(`Failed to retrieve CID ${cids[index]}:`, result.reason);
      return { success: false, cid: cids[index], error: result.reason.message };
    }
  });
}

// ─── Demo / Seed Data Helpers ───────────────────────────────────

/**
 * Create pre-built demo records for Selam's story.
 * Used in Phase 6 to pre-populate the demo with realistic data.
 *
 * @param {CryptoKey} encryptionKey  Selam's encryption key.
 * @param {string}    patientAddress Selam's wallet address.
 * @returns {Promise<{hivCID: string, mentalHealthCID: string}>}
 */
export async function createDemoRecords(encryptionKey, patientAddress) {
  // HIV Treatment Record — from MSF Bole Clinic
  const hivRecord = {
    clinic: 'MSF Bole Clinic',
    doctor: 'Dr. Amina Hassan',
    diagnosis: 'HIV-1 positive, clinically stable on first-line ART',
    cd4Count: 650,
    viralLoad: 'Undetectable (<50 copies/mL)',
    medication: 'TDF/3TC/DTG (Tenofovir/Lamivudine/Dolutegravir)',
    drugTolerances: 'Good tolerance, no side effects reported',
    nextAppointment: '2024-05-15',
    notes: 'Patient has been on this regimen for 6 years. CD4 count trending upward. Viral load consistently undetectable for 4 years. Continue current regimen.',
  };

  const hivCID = await submitRecord(
    encryptionKey,
    hivRecord,
    patientAddress,
    'HIV_TREATMENT',
    'CD4 Count & Viral Load Report'
  );

  // Mental Health Record — from private therapist
  const mentalHealthRecord = {
    clinic: 'Private Practice — Dr. Bekele',
    doctor: 'Dr. Yohannes Bekele',
    diagnosis: 'Generalized Anxiety Disorder (GAD), currently managed',
    medication: 'Sertraline 50mg daily',
    sessionNotes: 'Patient reports improved coping strategies. Anxiety triggers related to clinic transitions discussed. Recommended continued weekly sessions.',
    moodScore: 7,
    nextSession: '2024-04-25',
    notes: 'Patient making good progress. Consider reducing session frequency to biweekly in next review.',
  };

  const mentalHealthCID = await submitRecord(
    encryptionKey,
    mentalHealthRecord,
    patientAddress,
    'MENTAL_HEALTH',
    'Counseling Session Notes'
  );

  return { hivCID, mentalHealthCID };
}
