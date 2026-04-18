# Netsanet — ነፃነት

## Patient-Owned Medical Records for Ethiopia

A Web3 solution to Ethiopia's most invisible healthcare crisis: the fact that medical records belong to institutions, not patients. Netsanet flips ownership — the patient holds their entire medical history on their phone, encrypted, permanent, and under their sole control.

---

## What This App Does

Netsanet is a single web application with **two modes**: Patient and Doctor. You toggle between them in the header. Both modes connect via MetaMask.

### Patient Flow

```
Connect Wallet → Register Name → Unlock Encryption Key → View Dashboard
```

1. **Connect Wallet** — The patient opens the app and connects MetaMask.
2. **Register** — First-time patients enter their name. This calls `registerPatient()` on the smart contract and creates their on-chain identity.
3. **Unlock Records** — The patient signs a fixed message with MetaMask. This signature is used to deterministically derive an AES-256-GCM encryption key using PBKDF2. The same wallet always produces the same key — no passwords to remember.
4. **Dashboard** — The patient sees:
   - **Medical ID (QR Code)** — Contains their wallet address and (for the MVP demo) their exported encryption key. They show this to any doctor.
   - **"Who Has Access?" Panel** — Lists all active/expired/revoked access grants by category. The patient can grant new access or revoke existing access at any time.
   - **Medical Timeline** — All of their records, fetched from the blockchain (CID pointers) and decrypted from IPFS, displayed in a chronological timeline grouped by category (HIV Treatment, Mental Health, Lab Results, etc.).

### Doctor Flow

```
Connect Wallet → Scan/Enter Patient QR → View Authorized Records → Submit New Records
```

1. **Connect Wallet** — The doctor connects their own MetaMask wallet.
2. **Scan Patient** — The doctor scans the patient's QR code (or pastes the QR string manually for demo purposes). The QR contains the patient's wallet address and encryption key.
3. **Category Access Panel** — Shows which record categories the doctor currently has access to. For categories without access, the doctor must ask the patient to grant it from the Patient view.
4. **Patient Timeline (Authorized View)** — The doctor sees ONLY the records in categories they have been explicitly granted access to. If a doctor has HIV Treatment access but not Mental Health access, the Mental Health records are not hidden or blurred — they are simply never returned by the smart contract. This is the core security guarantee.
5. **Add New Record** — The doctor fills out a form (category, diagnosis, medication, vitals, notes), which gets:
   - Encrypted with the patient's AES key
   - Uploaded to IPFS via Pinata
   - CID stored on the blockchain via `addRecord()`

### Access Control — The Key Feature

Access is **category-based** and **time-limited**:

| Concept | How it works |
|---------|-------------|
| **Categories** | Records are split into 7 categories: General Consultation, HIV Treatment, Mental Health, Lab Result, Prescription, Prenatal Care, Chronic Disease |
| **Granting** | The patient selects a doctor address + category + duration (1–168 hours) and calls `grantAccess()` on the smart contract |
| **Enforcement** | The smart contract's `getRecordsByCategory()` function checks `hasActiveAccess()` before returning any CIDs. No access = no data returned |
| **Expiry** | Access automatically expires after the granted duration. No action needed. |
| **Revocation** | The patient can manually revoke access before expiry via `revokeAccess()` |
| **Audit Trail** | Every access grant, revocation, record addition, and record read is logged on-chain and visible in the patient's audit log |

### Demo Scenario: Selam's Story

The demo is designed around this narrative:

> Selam is HIV-positive, has been on ART for 6 years at an MSF clinic. The clinic closes. She walks into Tikur Anbessa hospital. She has no paper booklet. She opens Netsanet.

1. **Patient View** — Selam has 2 records: one HIV Treatment record, one Mental Health record.
2. **Switch to Doctor View** — New doctor scans Selam's QR.
3. **Doctor requests HIV Treatment access** — Selam approves for 6 hours.
4. **Doctor sees ONLY HIV records** — The mental health records are completely invisible (contract-level enforcement).
5. **Doctor adds a new HIV consultation** — It's encrypted and stored.
6. **Show audit log** — Selam sees exactly who accessed what and when.

---

## Architecture

```
┌──────────────────────────────────┐
│        Frontend (Vite+React)     │
│  Patient Dashboard │ Doctor Dash │
│  MetaMask ←→ ethers.js v6       │
└─────────┬────────────┬──────────┘
          │            │
    ┌─────▼─────┐  ┌──▼──────────────┐
    │ Sepolia   │  │ Pinata IPFS     │
    │ Testnet   │  │ (encrypted data)│
    │           │  │                 │
    │ NetsanetCore.sol               │
    │ - Patient Registry             │
    │ - Record CID pointers          │
    │ - Access Grants (time-limited) │
    │ - Audit Trail                  │
    └───────────┘  └─────────────────┘
```

| Layer | What's stored | Why |
|-------|--------------|-----|
| **On-chain** (Smart Contract) | Patient metadata, record CID pointers, access grants, audit log | Immutable, trustless, auto-enforced expiry |
| **Off-chain** (IPFS via Pinata) | Encrypted medical record JSON files | Cheap, scalable, decentralized |
| **Browser** (Web Crypto API) | AES-256-GCM encryption/decryption | Zero external dependencies, key derived from wallet |

---

## Project Status

### ✅ Completed (Phases 1–5)

| Phase | What | Status |
|-------|------|--------|
| 1 | Project scaffolding, Vite+React, CSS design system | ✅ Done |
| 2 | Smart contract (`NetsanetCore.sol`), 34 Foundry tests, deploy script | ✅ Done (all tests pass) |
| 3 | Encryption pipeline (AES-256-GCM), IPFS upload/fetch via Pinata | ✅ Done |
| 4 | Patient frontend: wallet connect, registration, QR code, timeline, access management | ✅ Done |
| 5 | Doctor frontend: QR scanner, access viewer, record submission, filtered timeline | ✅ Done |

### 🔲 Remaining (Phase 6 — Polish & Demo Prep)

- [ ] End-to-end test with real MetaMask + deployed Sepolia contract
- [ ] Ethiopian-themed UI polish (animations, typography, color refinements)
- [ ] Demo data seeding (pre-populate Selam's story with one click)
- [ ] Comprehensive error handling (disconnected wallet, tx failures, expired access)
- [ ] Deploy frontend to Vercel
- [ ] Final README with demo video script

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Smart Contracts | Solidity ^0.8.20 + Foundry | Fast compile/test/deploy |
| Blockchain | Sepolia Testnet | Free testnet ETH |
| Frontend | Vite + React 19 | Fast dev server, hot reload |
| Blockchain SDK | ethers.js v6 | Best documented for beginners |
| Wallet | MetaMask (browser extension) | Standard Web3 wallet |
| IPFS Storage | Pinata (free tier: 1GB, 500 files) | Simple API, free |
| Encryption | AES-256-GCM via Web Crypto API | Built into every browser |
| QR Codes | `qrcode.react` + `html5-qrcode` | Generate + scan |
| Styling | Vanilla CSS with CSS variables | Full control, no framework overhead |

---

## Team

**Nathaniel Abayneh (Woof Woof)** — Creator & Lead Developer

Built for a hackathon competition. The pitch document is in `Netsanet_Pitch_Document.docx`.
