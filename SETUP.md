# Netsanet — Technical Setup Guide

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
# Pinata JWT (from Step 3)
VITE_PINATA_JWT=eyJhbGciOiJIUzI1NiIs...your_full_jwt_here

# Your Pinata Dedicated Gateway (without https://)
# Example: your-gateway-name.mypinata.cloud
VITE_PINATA_GATEWAY=your-gateway-name.mypinata.cloud

# Sepolia RPC (same as contracts/.env)
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org

# ⚠️  YOU FILL THIS IN AFTER STEP 5 (deploying the contract)
VITE_CONTRACT_ADDRESS=0x...deployed_contract_address
```

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

## Testing the Full Flow

### Test as Patient (Account 1)

1. Make sure MetaMask is on **Account 1** (Sepolia network)
2. Open the app → Role toggle should be on **Patient**
3. Click **Connect MetaMask** → Approve in MetaMask
4. Enter a name (e.g. "Selam") → Click **Register** → Confirm the transaction in MetaMask
5. Click **Unlock Medical Records** → Sign the message in MetaMask (this derives your encryption key — it does NOT cost gas)
6. You should see your dashboard with a QR code and an empty timeline

### Test as Doctor (Account 2)

1. **First**, copy the QR code value. On the Patient dashboard, look at the QR code section. Below it you can see the wallet address. But for the doctor to decrypt records, they need the full QR string. You can right-click inspect the QR to find the `value` prop, or simply:
   - Open browser dev tools (F12)
   - In console, look for the QR value which is in format: `netsanet:0xPatientAddress:Base64EncryptionKey`
   - Copy that full string
2. Switch MetaMask to **Account 2**
3. Refresh the page (or the wallet will auto-detect the change)
4. Toggle to **Doctor / Clinic** mode
5. Connect MetaMask with Account 2
6. In the scanner screen, paste the full `netsanet:0x...:base64key` string → Click **Connect Patient**
7. The Category Access panel will show all categories as "not granted"

### Grant Access (Back to Patient)

1. Switch MetaMask back to **Account 1**
2. Refresh and reconnect as Patient
3. In the **"Who Has Access?"** panel, click **+ Grant Access**
4. Paste Account 2's address as the Doctor Address
5. Select a category (e.g. "HIV Treatment")
6. Set duration (e.g. 6 hours)
7. Click **Authorize Doctor** → Confirm the transaction

### View as Doctor (Back to Account 2)

1. Switch MetaMask to Account 2, refresh
2. Toggle to Doctor mode, reconnect
3. Paste the patient QR string again
4. The Category Access panel should now show "HIV Treatment" as **Granted**
5. If there are records in that category, they'll appear in the timeline

### Add a Record as Doctor

1. While connected as Doctor with an active patient session:
2. Fill out the **Add New Record** form
3. Select a category, enter diagnosis, medication, notes
4. Click **Sign & Submit Record** → This will:
   - Encrypt the data with AES-256-GCM
   - Upload encrypted bytes to Pinata IPFS
   - Store the CID on the blockchain (MetaMask tx confirmation)
5. The timeline should refresh and show the new record

---

## Project File Map

### Contracts (`contracts/`)

| File | Purpose | You need to touch it? |
|------|---------|----------------------|
| `src/NetsanetCore.sol` | The entire smart contract — patient registry, records, access control, audit log | ❌ No (unless adding features) |
| `test/NetsanetCore.t.sol` | 34 Foundry tests covering all contract functions and edge cases | ❌ No (run with `forge test -vvv`) |
| `script/Deploy.s.sol` | Deployment script for Sepolia | ❌ No |
| `.env` | **⚠️ YOU MUST FILL THIS IN** — Private key + RPC URL for deployment | ✅ Yes |
| `foundry.toml` | Foundry configuration | ❌ No |

### Frontend (`frontend/`)

| File | Purpose | You need to touch it? |
|------|---------|----------------------|
| `.env` | **⚠️ YOU MUST FILL THIS IN** — Pinata JWT, Gateway, Contract Address | ✅ Yes |
| `src/App.jsx` | Root component — role toggle (Patient/Doctor), wallet state, routing | ❌ No |
| `src/index.css` | Design system — Ethiopian-themed CSS variables, glassmorphism, utilities | ❌ No (Phase 6 polish) |
| `src/main.jsx` | React entry point | ❌ No |

#### Components (`frontend/src/components/`)

| File | Purpose |
|------|---------|
| `WalletConnect.jsx` | MetaMask connect button with error handling |
| `PatientRegistration.jsx` | Name entry form → calls `registerPatient()` on contract |
| `QRCodeDisplay.jsx` | Generates QR code containing `netsanet:<address>:<base64Key>` |
| `MedicalTimeline.jsx` | Patient's own timeline — fetches all records, decrypts them from IPFS |
| `AccessManager.jsx` | Patient's access control panel — view/grant/revoke per-category grants |
| `DoctorQRScanner.jsx` | QR scanner (camera mock + manual input for demo) |
| `DoctorAccessManager.jsx` | Shows doctor which categories they have access to for the current patient |
| `DoctorMedicalTimeline.jsx` | Doctor's filtered timeline — only shows records in authorized categories |
| `RecordSubmissionForm.jsx` | Doctor's form to add new medical records (encrypt → IPFS → on-chain) |

#### Pages (`frontend/src/pages/`)

| File | Purpose |
|------|---------|
| `PatientDashboard.jsx` | Container for patient view — registration check, key derivation, layout |
| `DoctorDashboard.jsx` | Container for doctor view — QR scan, patient session, wires up all doctor components |

#### Utilities (`frontend/src/utils/`)

| File | Purpose |
|------|---------|
| `contract.js` | Contract ABI (human-readable), address, `getContract()`, `connectWallet()` |
| `encryption.js` | AES-256-GCM encrypt/decrypt, key derivation from wallet signature, key export/import |
| `ipfs.js` | Pinata upload/fetch with gateway fallbacks |
| `records.js` | High-level pipeline: `submitRecord()` (encrypt → upload → return CID), `retrieveRecord()` (fetch → decrypt), category constants, demo data helpers |
| `test-encryption.js` | Standalone encryption integration test (run from browser console) |

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
