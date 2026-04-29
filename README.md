# Netsanet

> Patient-owned medical records with category-based access control, end-to-end encryption, and on-chain consent.

Netsanet (ነፃነት) is a Web3 healthcare application built around a simple but important idea:

**Medical history should belong to the patient, not stay trapped inside institutions.**

In Ethiopia, there is no shared medical record system across its fragmented healthcare landscape. Every clinic a patient visits starts from zero with no knowledge of what any previous clinic saw, tested, or treated. The de facto solution is a small paper booklet: the *Ye Ethiopia Tena Defter*, that patients carry to every visit. It gets wet, torn, lost in floods, burned in conflict, or simply falls apart. When it is gone, the patient's history is gone. There is no backup. Anywhere.

---

## The Problem

In Ethiopia's healthcare system, records are owned by institutions, not patients. Care history is difficult to transfer, and the fragmentation across government hospitals, NGO clinics, and private facilities creates massive gaps in patient care.

This complete lack of continuity leads to real human costs:
- **Repeated diagnostic tests**: Patients spend life savings to repeat tests they already paid for, wasting money and time.
- **Dangerous medication errors**: Doctors prescribe blindly, risking severe allergic reactions or adverse interactions because allergy and medication histories physically do not exist where they are standing.
- **HIV treatment interruptions**: Patients forced to restart baseline testing face weeks without antiretroviral medication, undoing years of carefully managed care.

These are not edge cases. These are the everyday realities that cost lives.

### The Human Cost: Hirut's Story

Consider **Hirut (27)**, who was displaced during the Tigray conflict while pregnant. She had been receiving prenatal care at a clinic in Mekelle when the conflict forced her to flee. She left with nothing, including her paper medical booklet. 

At a displacement camp, an NGO health team asked about her pregnancy history. How many weeks? Any complications? Blood type? Allergies? Previous C-section? She remembered some things, but not the things the doctors most needed to know. Her first-trimester screening had flagged a potential placenta concern. That flag never made it to the camp clinic, and that missing piece of information almost cost her life.

*"My body remembered what happened. The doctors needed the paper. The paper was gone."*

---

## The Solution

What if a patient carried their entire medical history in their pocket, and no clinic, no government, no disaster could ever take it away from them?

Netsanet flips the ownership of medical records. With Netsanet, records belong to the patient, always, permanently, without exception. It is a **patient-owned medical record sharing system** that combines:

- **wallet-based identity**
- **encrypted off-chain medical data**
- **on-chain consent and auditability**
- **category-based selective disclosure**

Think of it like a medical notebook that only the patient can open. Every doctor who treats them adds a page, but only the patient holds the key. No flood, no conflict, no clinic closure can ever destroy it because it does not live in any building. It lives with the patient on their phone.

The patient controls access at the category level. A doctor can be granted access to one category, for a limited time, without seeing the rest of the patient's history. That means:
- an HIV specialist can see HIV Treatment records
- a therapist can see Mental Health records
- a clinician can add a new report
- the patient still keeps control of the whole record timeline

---

## Why This Matters

Netsanet is not "blockchain for blockchain's sake." The Web3 layer solves the core challenge of **portable trust across institutions**.

Every previous attempt at solving this in Ethiopia required a trusted central authority to hold everyone's records. But there is no single institution in Ethiopia trusted simultaneously by government hospitals, international NGOs, private clinics, and patients.

With Netsanet, you no longer need every clinic to adopt new centralized software or trust a single authority. You only need the patient: the one constant in a system of disconnected parts to hold their own record. 

The blockchain provides:
- neutral ownership across institutions
- tamper-resistant access grants and revocations
- transparent audit logs
- portable patient control that does not depend on one clinic's database

The web app does **not** store raw medical data on-chain. Medical payloads are encrypted before upload, and only encrypted pointers and permission logic live on the blockchain. This ensures that sensitive records remain private while life-saving continuity of care is maintained.

---

## Core Features

### Patient features

- Register as a patient on-chain
- Derive an encryption key from a wallet signature
- View an encrypted medical timeline
- Generate a QR-based medical identity for doctor sessions
- Grant access by category and duration
- Approve or decline incoming doctor requests
- Revoke active access at any time
- Review who currently has access
- Review on-chain audit activity

### Doctor features

- Connect with a separate wallet
- Scan or paste a patient QR session
- See only the categories the patient has approved
- Request access by category and time window
- View authorized records in a filtered timeline
- Add new encrypted records for the patient
- Use category-specific report forms
- Include doctor name and clinic or hospital attribution in reports

### Record system features

- Encrypted medical payloads stored off-chain
- CID pointers stored on-chain
- Category-based visibility enforcement at the contract level
- Time-limited access grants
- Full patient-side access control
- Report attribution visible on both patient and doctor timelines

---

## Supported Medical Categories

The current MVP supports 7 record categories:

1. General Consultation
2. HIV Treatment
3. Mental Health
4. Lab Result
5. Prescription
6. Prenatal Care
7. Chronic Disease

Each category has its own adaptive report fields in the doctor dashboard, so the report form changes depending on the type of care being documented.

---

## How It Works

### Patient flow

```text
Connect wallet -> Register -> Unlock encryption key -> View and manage records
```

1. The patient connects MetaMask.
2. The patient registers their name on-chain.
3. The patient signs a message to derive a deterministic encryption key.
4. The patient views their QR code, medical timeline, and access controls.
5. The patient grants or revokes doctor access by category.

### Doctor flow

```text
Connect wallet -> Scan patient QR -> Request or use granted access -> View timeline -> Add encrypted record
```

1. The doctor connects their own wallet.
2. The doctor scans the patient's QR session.
3. The doctor checks which categories are accessible.
4. If access is missing, the doctor requests it.
5. Once approved, the doctor can view only the permitted categories.
6. The doctor can submit a new encrypted medical record.

### Record flow

```text
Fill form -> Encrypt locally -> Upload encrypted payload -> Store CID on-chain -> Decrypt on authorized view
```

---

## Selective Disclosure: The Key Idea

This is the most important behavior in Netsanet.

Access is:

- **category-based**
- **time-limited**
- **patient-controlled**
- **auditable**

Example:

- a patient may grant a doctor access to `HIV Treatment` for 6 hours
- that doctor can read HIV Treatment records during that window
- the same doctor cannot see `Mental Health` unless that category is also granted
- when the access expires or is revoked, the doctor loses access

This is not just hidden in the UI. It is enforced by the smart contract when category records are requested.

---

## Architecture

```text
Frontend (React + Vite)
  |
  |-- MetaMask / ethers.js
  |
  |-- Web Crypto API
  |     -> derive key
  |     -> encrypt/decrypt records locally
  |
  |-- IPFS via Pinata
  |     -> stores encrypted medical payloads
  |
  |-- NetsanetCore.sol
        -> patient registry
        -> record CID pointers
        -> access grants
        -> access requests
        -> revocations
        -> audit trail
```

### Storage model

| Layer | Stores | Why |
| --- | --- | --- |
| Browser | Encryption and decryption | Sensitive data stays client-side |
| IPFS | Encrypted medical payloads | Decentralized and scalable storage |
| Smart contract | Access logic, audit entries, record pointers | Transparent consent and enforcement |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Smart contracts | Solidity `^0.8.20` |
| Contract tooling | Foundry |
| Frontend | React 19 + Vite |
| Web3 integration | ethers.js v6 |
| Wallet | MetaMask |
| Encrypted storage | IPFS via Pinata |
| Cryptography | Web Crypto API (AES-256-GCM) |
| QR flow | `qrcode.react` + `html5-qrcode` |
| Styling | CSS + Tailwind utilities |

---

## What Is Already Implemented

This repository is already a functioning MVP.

### Smart contract

- patient registration
- record pointer storage
- category-based access grants
- doctor access requests
- approve or decline flow
- revocation and expiry logic
- audit trail

### Frontend

- patient dashboard
- doctor dashboard
- QR-based patient handoff
- encrypted timeline view
- access management UI
- category-specific record forms
- doctor and clinic report attribution
- responsive UI improvements for major workflow panels

### Testing

- Foundry test suite for the contract
- frontend production build validation

---

## Demo Story

Netsanet is especially easy to understand through a real scenario:

> A patient has been receiving HIV care for years at one clinic. The clinic closes, or the patient relocates. They arrive at a new hospital without paper records. Instead of losing continuity of care, they open Netsanet, share a QR, and grant temporary access only to the relevant category.

That lets the new doctor:

- access the relevant care history
- avoid seeing unrelated sensitive categories
- add a new report to the patient's timeline
- preserve continuity without removing patient control

---

## Security and Privacy Notes

Netsanet is privacy-conscious by design, but this is still an MVP.

### Current protections

- raw medical records are encrypted before upload
- sensitive payloads are not stored on-chain
- access is time-limited and category-specific
- patient actions and doctor access are auditable

### Important MVP note

For demo simplicity, the patient QR session currently includes the exported patient encryption key so the doctor can decrypt authorized records during the session.

That is acceptable for a hackathon demonstration, but in a production version this should be replaced with a more secure key exchange model.

---

## Why Web3 Fits This Use Case



Because the core challenge is not just data storage. It is **portable trust across institutions**.

Web3 helps because:

- no single hospital has to be the permanent owner of the record
- access grants and revocations are transparent and tamper-resistant
- consent logic can be enforced consistently across different providers
- patients can carry a portable identity and permission layer with them

The blockchain is the **consent and audit layer**, not the raw medical database.

---



# Technical Setup Guide

This document tells you exactly how to get the project running on your machine, what secrets to fill in, and what each file does.

---

## Prerequisites

You need all of the following installed before starting:

| Tool | Version | Installation |
|------|---------|-------------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org/) |
| **npm** | v9+ | Comes with Node.js |
| **Foundry** (`forge`, `cast`) | Latest | [getfoundry.sh](https://getfoundry.sh/) — run `curl -L https://foundry.paradigm.xyz \| bash` then `foundryup` |
| **MetaMask** | Browser extension | [metamask.io](https://metamask.io/) |
| **Git** | Any | [git-scm.com](https://git-scm.com/) |

### Accounts You Need (All Free)

| Service | What for | Sign up |
|---------|----------|---------|
| **Pinata** | IPFS file storage for encrypted records | [pinata.cloud](https://www.pinata.cloud/) — free tier: 1GB, 500 files |
| **Alchemy** (optional) | Faster Sepolia RPC than public endpoint | [alchemy.com](https://www.alchemy.com/) — free tier |
| **Sepolia Faucet** | Free testnet ETH for gas | [cloud.google.com/web3/faucet](https://cloud.google.com/web3/faucet) |

---

## Step-by-Step Setup

### Step 1: Clone & Install

```bash
git clone <your-repo-url>
cd Netsanet

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Get Sepolia Testnet ETH

1. Open MetaMask → switch to **Sepolia Test Network**
2. Copy your wallet address
3. Go to [Google Cloud Faucet](https://cloud.google.com/web3/faucet) and request Sepolia ETH
4. You need ~0.05 ETH for deploying the contract + a few test transactions

> **Important**: You will need **two separate MetaMask accounts** to properly test the Patient ↔ Doctor flow. Create a second account in MetaMask to act as the doctor.

### Step 3: Get a Pinata API Key

1. Sign up at [pinata.cloud](https://www.pinata.cloud/)
2. Go to **API Keys** → Create New Key
3. Copy the **JWT** token (the long one)
4. Also note your **Dedicated Gateway** URL (found in Gateways section), it looks like `your-gateway-name.mypinata.cloud`

### Step 4: Fill in Environment Variables

There are **two `.env` files** you must configure:

---

#### 📁 File: `contracts/.env`

```env
# Your MetaMask wallet private key (the account that will deploy the contract)
# ⚠️  NEVER commit this to git! NEVER use a mainnet wallet!
PRIVATE_KEY=0xabc123...your_sepolia_private_key_here

# Sepolia RPC URL
# Option A (public, slower): https://rpc.sepolia.org
# Option B (Alchemy, faster): https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Optional: for verifying contract on Etherscan
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**How to get your private key from MetaMask:**
MetaMask → Click the three dots on your account → Account Details → Show Private Key → Enter password → Copy

---

#### 📁 File: `frontend/.env`

```env
# Upload API URL for the backend proxy
VITE_UPLOAD_API_URL=http://localhost:8787

# Your Pinata Dedicated Gateway (without https://)
# Example: your-gateway-name.mypinata.cloud
VITE_PINATA_GATEWAY=your-gateway-name.mypinata.cloud

# Sepolia RPC (same as contracts/.env)
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org

# ⚠️  YOU FILL THIS IN AFTER STEP 5 (deploying the contract)
VITE_CONTRACT_ADDRESS=0x...deployed_contract_address
```

#### 📁 File: `backend/.env`

```env
PORT=8787
PINATA_JWT=your_pinata_jwt_here
CORS_ORIGIN=http://localhost:5173
```

The backend keeps your Pinata JWT off the browser. The frontend uploads encrypted files to your local API, and the API pins them to IPFS.

---

### Step 5: Deploy the Smart Contract to Sepolia

```bash
cd contracts

# First: load your .env variables
source .env    # Linux/Mac
# On Windows (PowerShell): manually set the env vars or use:
# $env:PRIVATE_KEY = "0x..."
# $env:SEPOLIA_RPC_URL = "https://rpc.sepolia.org"

# Run the deployment
forge script script/Deploy.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast

# On Windows PowerShell:
forge script script/Deploy.s.sol --rpc-url $env:SEPOLIA_RPC_URL --private-key $env:PRIVATE_KEY --broadcast
```

The output will print:
```
===================================
NetsanetCore deployed at: 0x1234...abcd
===================================
```

**Copy that address** and paste it into `frontend/.env` as `VITE_CONTRACT_ADDRESS`.

### Step 6: Run the Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in a browser with MetaMask installed.

---


## Running Foundry Tests

```bash
cd contracts
forge test -vvv
```

All 34 tests should pass. They cover:
- Patient registration (happy + duplicate + empty name)
- Record addition (happy + non-existent patient + empty CID)
- Access granting (happy + zero address + self-grant + zero duration + max duration)
- Access revocation (happy + already revoked + already expired)
- Category-filtered reads (authorized + unauthorized + cross-category isolation)
- Time-based auto-expiry
- Audit log entries
- Grant overwrite (re-granting refreshes expiry)

---

## Common Issues & Debugging

| Problem | Cause | Fix |
|---------|-------|-----|
| "MetaMask is not installed" | No MetaMask extension | Install MetaMask browser extension |
| Transaction reverts with "Not a registered patient" | Trying patient-only actions without registering | Register as patient first from the Patient view |
| "VITE_PINATA_JWT is not set" | Missing `.env` value | Fill in `frontend/.env` with your Pinata JWT |
| Pinata upload fails 401 | Invalid or expired JWT | Generate a new API key at pinata.cloud |
| Records show "Decryption failed" | Wrong encryption key or corrupted IPFS data | Make sure the same wallet is used; check Pinata gateway is accessible |
| "Access denied: no active grant" | Doctor trying to read without patient approval | Patient must grant access first from Patient view |
| MetaMask shows wrong network | Not on Sepolia | Switch MetaMask to Sepolia Test Network |
| Contract address is `0x000...000` | `VITE_CONTRACT_ADDRESS` not set in frontend `.env` | Deploy contract (Step 5) and paste the address |
| `forge` not found | Foundry not installed | Run `foundryup` to install |

---

## Environment Variables Checklist

Before running, confirm **all** of these are filled in:

```
contracts/.env
  ✅ PRIVATE_KEY          — Your MetaMask Sepolia private key
  ✅ SEPOLIA_RPC_URL      — Sepolia RPC endpoint

frontend/.env
  ✅ VITE_PINATA_JWT      — Your Pinata API JWT token
  ✅ VITE_PINATA_GATEWAY  — Your Pinata dedicated gateway hostname
  ✅ VITE_CONTRACT_ADDRESS — The deployed contract address (after Step 5)
  ✅ VITE_SEPOLIA_RPC_URL — Sepolia RPC endpoint
```


## Future Improvements

This MVP proves the product concept, but there is a lot of room to grow.

### Product improvements

- verified doctor and clinic identity registry
- patient-friendly doctor profiles instead of wallet-first identity
- better dashboard analytics and audit visualizations
- mobile-first experience or PWA version
- multilingual UI support

### Security improvements

- replace QR key-sharing with secure session key exchange
- stronger provider authentication and verification
- more robust access revocation UX
- better handling for compromised wallets or account recovery

### Technical improvements

- EMR and hospital system integrations
- dedicated indexing layer for faster history queries
- improved code splitting and frontend performance
- production deployment and monitoring
- richer automated end-to-end testing

### Ecosystem and business improvements

- NGO and hospital pilot programs
- white-label provider dashboards
- interoperability APIs
- public health deployment partnerships

---

## Vision

Netsanet is not trying to make healthcare more speculative.

It is trying to make healthcare records:

- more portable
- more private
- more patient-controlled
- more interoperable across disconnected systems

The long-term vision is a world where a patient does not lose their medical history just because they changed clinics.

---



