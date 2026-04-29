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

import { encryptJSON, decryptJSON } from './encryption.js';
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

const RECORD_DETAIL_EXCLUDED_KEYS = new Set([
  'doctorName',
  'clinicName',
  'doctor',
  'clinic',
]);

export const CATEGORY_FIELD_SCHEMAS = {
  0: [
    {
      key: 'chiefComplaint',
      label: 'Chief Complaint',
      input: 'textarea',
      rows: 3,
      placeholder: 'e.g. Persistent cough, mild fever, and fatigue',
    },
    {
      key: 'diagnosis',
      label: 'Assessment / Diagnosis',
      input: 'textarea',
      rows: 3,
      placeholder: 'Clinical impression or confirmed diagnosis',
    },
    {
      key: 'treatmentPlan',
      label: 'Treatment Plan',
      input: 'textarea',
      rows: 3,
      placeholder: 'Medication, advice, or procedures recommended',
    },
    {
      key: 'followUpDate',
      label: 'Follow-up Date',
      input: 'date',
    },
    {
      key: 'notes',
      label: 'Doctor Notes',
      input: 'textarea',
      rows: 3,
      placeholder: 'Observations, next steps, and additional context',
    },
  ],
  1: [
    {
      key: 'diagnosis',
      label: 'Diagnosis',
      input: 'textarea',
      rows: 3,
      placeholder: 'e.g. HIV-1 positive, clinically stable on ART',
    },
    {
      key: 'medication',
      label: 'ART Medication',
      input: 'textarea',
      rows: 3,
      placeholder: 'e.g. TDF/3TC/DTG',
    },
    {
      key: 'cd4Count',
      label: 'CD4 Count',
      input: 'text',
      placeholder: 'e.g. 650 cells/mm3',
    },
    {
      key: 'viralLoad',
      label: 'Viral Load',
      input: 'text',
      placeholder: 'e.g. Undetectable (<50 copies/mL)',
    },
    {
      key: 'adherenceStatus',
      label: 'Adherence Status',
      input: 'text',
      placeholder: 'e.g. Excellent adherence, no missed doses',
    },
    {
      key: 'nextAppointment',
      label: 'Next Appointment',
      input: 'date',
    },
    {
      key: 'notes',
      label: 'Doctor Notes',
      input: 'textarea',
      rows: 3,
      placeholder: 'Observations, side effects, and follow-up guidance',
    },
  ],
  2: [
    {
      key: 'diagnosis',
      label: 'Diagnosis',
      input: 'textarea',
      rows: 3,
      placeholder: 'e.g. Anxiety disorder, depression, trauma-related stress',
    },
    {
      key: 'symptoms',
      label: 'Presenting Symptoms',
      input: 'textarea',
      rows: 3,
      placeholder: 'Symptoms discussed during the visit',
    },
    {
      key: 'sessionSummary',
      label: 'Session Summary',
      input: 'textarea',
      rows: 3,
      placeholder: 'Key themes, interventions, or observations',
    },
    {
      key: 'medication',
      label: 'Medication',
      input: 'textarea',
      rows: 3,
      placeholder: 'If prescribed or adjusted',
    },
    {
      key: 'riskAssessment',
      label: 'Risk Assessment',
      input: 'text',
      placeholder: 'e.g. Low risk, moderate risk, no self-harm ideation',
    },
    {
      key: 'followUpDate',
      label: 'Next Session Date',
      input: 'date',
    },
    {
      key: 'notes',
      label: 'Therapist Notes',
      input: 'textarea',
      rows: 3,
      placeholder: 'Additional confidential notes or care guidance',
    },
  ],
  3: [
    {
      key: 'testName',
      label: 'Test Name',
      input: 'text',
      placeholder: 'e.g. CBC, Lipid Panel, X-Ray, PCR',
    },
    {
      key: 'resultSummary',
      label: 'Result Summary',
      input: 'textarea',
      rows: 3,
      placeholder: 'Overall interpretation of the result',
    },
    {
      key: 'measuredValue',
      label: 'Measured Value',
      input: 'text',
      placeholder: 'e.g. Hemoglobin 12.8 g/dL',
    },
    {
      key: 'referenceRange',
      label: 'Reference Range',
      input: 'text',
      placeholder: 'e.g. 12.0 - 15.5 g/dL',
    },
    {
      key: 'orderedBy',
      label: 'Ordered By',
      input: 'text',
      placeholder: 'Doctor or department that requested the test',
    },
    {
      key: 'notes',
      label: 'Lab Notes',
      input: 'textarea',
      rows: 3,
      placeholder: 'Specimen notes, interpretation, or next steps',
    },
  ],
  4: [
    {
      key: 'diagnosis',
      label: 'Diagnosis / Indication',
      input: 'textarea',
      rows: 3,
      placeholder: 'Condition being treated',
    },
    {
      key: 'medication',
      label: 'Medication',
      input: 'textarea',
      rows: 3,
      placeholder: 'Drug name and strength',
    },
    {
      key: 'dosage',
      label: 'Dosage',
      input: 'text',
      placeholder: 'e.g. 500mg',
    },
    {
      key: 'frequency',
      label: 'Frequency',
      input: 'text',
      placeholder: 'e.g. Twice daily after meals',
    },
    {
      key: 'duration',
      label: 'Duration',
      input: 'text',
      placeholder: 'e.g. 7 days, 3 months',
    },
    {
      key: 'instructions',
      label: 'Instructions',
      input: 'textarea',
      rows: 3,
      placeholder: 'Special usage instructions or warnings',
    },
    {
      key: 'notes',
      label: 'Prescription Notes',
      input: 'textarea',
      rows: 3,
      placeholder: 'Additional pharmacist or clinician notes',
    },
  ],
  5: [
    {
      key: 'gestationalAge',
      label: 'Gestational Age',
      input: 'text',
      placeholder: 'e.g. 24 weeks + 3 days',
    },
    {
      key: 'bloodPressure',
      label: 'Blood Pressure',
      input: 'text',
      placeholder: 'e.g. 110/70 mmHg',
    },
    {
      key: 'fetalHeartRate',
      label: 'Fetal Heart Rate',
      input: 'text',
      placeholder: 'e.g. 145 bpm',
    },
    {
      key: 'maternalWeight',
      label: 'Maternal Weight',
      input: 'text',
      placeholder: 'e.g. 68 kg',
    },
    {
      key: 'visitFindings',
      label: 'Visit Findings',
      input: 'textarea',
      rows: 3,
      placeholder: 'Prenatal observations and findings',
    },
    {
      key: 'nextVisitDate',
      label: 'Next Visit Date',
      input: 'date',
    },
    {
      key: 'notes',
      label: 'Prenatal Notes',
      input: 'textarea',
      rows: 3,
      placeholder: 'Supplement advice, risk flags, and follow-up notes',
    },
  ],
  6: [
    {
      key: 'diagnosis',
      label: 'Diagnosis',
      input: 'textarea',
      rows: 3,
      placeholder: 'e.g. Type 2 Diabetes, Hypertension, Asthma',
    },
    {
      key: 'medication',
      label: 'Medication',
      input: 'textarea',
      rows: 3,
      placeholder: 'Current treatment regimen',
    },
    {
      key: 'vitalReadings',
      label: 'Vital Readings',
      input: 'textarea',
      rows: 3,
      placeholder: 'e.g. BP, glucose, oxygen saturation',
    },
    {
      key: 'lifestylePlan',
      label: 'Lifestyle Plan',
      input: 'textarea',
      rows: 3,
      placeholder: 'Diet, exercise, smoking cessation, and other guidance',
    },
    {
      key: 'diseaseStatus',
      label: 'Disease Status',
      input: 'text',
      placeholder: 'e.g. Stable, improving, uncontrolled',
    },
    {
      key: 'nextReviewDate',
      label: 'Next Review Date',
      input: 'date',
    },
    {
      key: 'notes',
      label: 'Care Notes',
      input: 'textarea',
      rows: 3,
      placeholder: 'Monitoring notes, complications, and next steps',
    },
  ],
};

export function getCategoryFieldSchema(category) {
  return CATEGORY_FIELD_SCHEMAS[String(category)] ?? [];
}

function hasDisplayValue(value) {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== undefined;
}

function humanizeFieldKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatRecordFieldValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

export function buildRecordDisplayFields(category, data) {
  if (!data || typeof data !== 'object') {
    return [];
  }

  const schema = getCategoryFieldSchema(category);
  const schemaKeys = new Set(schema.map((field) => field.key));

  const orderedFields = schema
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: data[field.key],
    }))
    .filter((field) => hasDisplayValue(field.value));

  const extraFields = Object.entries(data)
    .filter(
      ([key, value]) =>
        !schemaKeys.has(key) &&
        !RECORD_DETAIL_EXCLUDED_KEYS.has(key) &&
        hasDisplayValue(value)
    )
    .map(([key, value]) => ({
      key,
      label: humanizeFieldKey(key),
      value,
    }));

  return [...orderedFields, ...extraFields];
}

export function extractRecordAuthor(payload) {
  const author = payload?.author ?? {};
  const data = payload?.data ?? {};

  const doctorName = (
    author.doctorName ??
    data.doctorName ??
    data.doctor ??
    ''
  ).trim();

  const clinicName = (
    author.clinicName ??
    data.clinicName ??
    data.clinic ??
    ''
  ).trim();

  return { doctorName, clinicName };
}

export function formatRecordAuthor(author, fallbackLabel) {
  const parts = [author.doctorName, author.clinicName].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  return fallbackLabel;
}

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
  recordType,
  author = {}
) {
  // 1. Add metadata wrapper around the raw medical data
  const envelope = {
    version: 1,
    createdAt: new Date().toISOString(),
    category,
    recordType,
    author: {
      doctorName: author.doctorName?.trim() ?? '',
      clinicName: author.clinicName?.trim() ?? '',
    },
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
    'CD4 Count & Viral Load Report',
    {
      doctorName: 'Dr. Amina Hassan',
      clinicName: 'MSF Bole Clinic',
    }
  );

  // Mental Health Record — from private therapist
  const mentalHealthRecord = {
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
    'Counseling Session Notes',
    {
      doctorName: 'Dr. Yohannes Bekele',
      clinicName: 'Private Practice - Dr. Bekele',
    }
  );

  return { hivCID, mentalHealthCID };
}
