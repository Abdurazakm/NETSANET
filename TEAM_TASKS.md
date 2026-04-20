# TEAM_TASKS.md

## Goal For The Next 48 Hours
Deliver one stable demo path with zero live coding:
1. Patient registers
2. Patient shows QR
3. Doctor scans/pastes patient
4. Patient grants access
5. Doctor views allowed records only
6. Doctor adds a record and it appears in timeline

This file is the execution playbook for the current codebase.

---

## Current Project Context (Do Not Redesign)

Already exists:
- Contract logic in contracts/src/NetsanetCore.sol and tests in contracts/test/NetsanetCore.t.sol
- React patient and doctor dashboards in frontend/src/pages
- Contract utils, encryption, IPFS utils in frontend/src/utils
- Core UI components for registration, access, timeline, record submit

Known gaps affecting demo reliability:
- QR camera flow in frontend/src/components/DoctorQRScanner.jsx is not production-stable
- No clear patient-facing audit log UI
- Network/env mismatch and Pinata failure states are weak
- Demo checklist/runbook is not strict enough for repeated rehearsals

---

## Team Rules (To Avoid Confusion)

1. Each file has one owner. Others can suggest, but owner merges final behavior.
2. No one adds new features outside the 6-step demo path.
3. Contract interface is frozen after Member 1 publishes final ABI/address.
4. Every task must end with a verifiable output, not only code changes.
5. Integrate daily, do not wait until end of day.

---

## Demo Acceptance Criteria (Shared)

- Full 6-step flow runs on Sepolia without editing code.
- One category isolation proof is shown live:
  - granted category succeeds
  - non-granted category fails
- New doctor record appears after submission.
- Team can run demo in under 5 minutes.

---

## Member 1 - Smart Contract and Access Logic Lead

Role:
- Blockchain Engineer (source of truth for on-chain behavior)

Owns files:
- contracts/src/NetsanetCore.sol
- contracts/test/NetsanetCore.t.sol
- contracts/script/Deploy.s.sol

Does not own:
- Frontend UX wording and layout
- IPFS client behavior

Tasks (in order):
1. Freeze contract function interface used by frontend.
  - Output: function list + argument order shared in team chat.
2. Re-run and stabilize Foundry tests.
  - Output: passing test run screenshot/text summary.
3. Add demo-path assertions in tests:
  - patient grants HIV
  - doctor reads HIV
  - doctor denied Mental Health
  - doctor adds HIV record
  - Output: test names and green status.
4. Confirm event payloads used by frontend timelines/audit assumptions.
  - Output: short event field map.
5. Deploy final contract to Sepolia.
  - Output: deployed address + tx hash + network.

Definition of done:
- Contract deployed and address shared.
- Demo-path tests all green.

---

## Member 2 - Frontend Patient Flow Owner

Role:
- Frontend Engineer (patient journey clarity)

Owns files:
- frontend/src/pages/PatientDashboard.jsx
- frontend/src/components/PatientRegistration.jsx
- frontend/src/components/QRCodeDisplay.jsx
- frontend/src/components/AccessManager.jsx
- frontend/src/components/MedicalTimeline.jsx

Does not own:
- Doctor QR camera implementation
- Contract deployment logic

Tasks (in order):
1. Improve registration validation and failure messages.
  - Output: patient cannot submit empty/invalid values.
2. Make QR card demo-ready.
  - Add copy button for patient payload and clear copy success state.
  - Output: one-click copy tested.
3. Improve access grant panel clarity.
  - Show Active, Expired, Revoked labels.
  - Output: status changes visible immediately after action.
4. Harden patient timeline states.
  - Add loading, empty, error UI states.
  - Output: no blank screen behavior.
5. Add patient audit UI view if feasible within current components.
  - Output: patient can see recent access actions.

Definition of done:
- Patient completes register -> QR -> grant path in under 90 seconds.

---

## Member 3 - Frontend Doctor Flow Owner

Role:
- Frontend Engineer (doctor session and submission)

Owns files:
- frontend/src/pages/DoctorDashboard.jsx
- frontend/src/components/DoctorQRScanner.jsx
- frontend/src/components/DoctorAccessManager.jsx
- frontend/src/components/DoctorMedicalTimeline.jsx
- frontend/src/components/RecordSubmissionForm.jsx

Does not own:
- Patient dashboard UX
- Backend IPFS utility internals

Tasks (in order):
1. Implement stable QR scan with manual fallback.
  - Use camera first, manual paste always available.
  - Output: doctor can start session both ways.
2. Improve access status panel copy.
  - Clear allowed/denied/expired guidance text.
  - Output: doctor knows exactly why access fails.
3. Guard no-patient-selected state.
  - Disable record fetch/submit until patient session exists.
  - Output: no invalid action path.
4. Ensure timeline refresh after submit.
  - Output: new record appears without page reload.
5. Add clear error messages for submit failure.
  - Output: doctor sees next action (retry/change network/check grant).

Definition of done:
- Doctor can identify patient, verify access, view records, submit record in one uninterrupted flow.

---

## Member 4 - Encryption and IPFS Reliability Owner

Role:
- Full-Stack Engineer (data pipeline reliability)

Owns files:
- frontend/src/utils/encryption.js
- frontend/src/utils/ipfs.js
- frontend/src/utils/records.js

Supports (pair review only):
- frontend/src/components/RecordSubmissionForm.jsx
- frontend/src/components/MedicalTimeline.jsx
- frontend/src/components/DoctorMedicalTimeline.jsx

Does not own:
- Wallet/network UI
- Contract access logic

Tasks (in order):
1. Standardize record payload schema in one place.
  - Output: required fields list agreed with Member 3.
2. Improve encryption/decryption error surfaces.
  - Output: errors identify where failure happened (encrypt/upload/fetch/decrypt).
3. Add lightweight retry for IPFS fetch.
  - Output: transient gateway failures recover automatically.
4. Validate category mapping consistency against contract enum order.
  - Output: mapping table shared with Members 1, 2, 3.
5. Create seed helper for 2-3 realistic demo records.
  - Output: reusable seed path documented.

Definition of done:
- Record pipeline is repeatable and failures are understandable.

---

## Member 5 - Web3 Integration and Environment Owner

Role:
- Integration Engineer (env, wallet, network, deployment consistency)

Owns files:
- frontend/src/utils/contract.js
- SETUP.md
- README.md
- contracts/script/Deploy.s.sol (deployment checklist section only)
- frontend/.env (local template usage)
- contracts/.env (local template usage)

Does not own:
- Feature-level UX for patient/doctor screens
- Contract business rules

Tasks (in order):
1. Add startup env validation for frontend and contracts.
  - Output: missing env keys fail fast with readable message.
2. Add Sepolia network guard messaging.
  - Output: wrong network gives clear switch instruction.
3. Publish canonical deploy -> env sync checklist.
  - Output: one checklist in SETUP.md and README.md.
4. Verify clean-room setup on second machine/account.
  - Output: pass/fail report with exact fixes applied.
5. Lock shared contract address update process.
  - Output: single source of truth section in README.

Definition of done:
- Any teammate can clone, configure, and run demo flow without guesswork.

---

## Member 6 - QA, Demo Flow, and Presentation Owner

Role:
- QA and Demo Lead (final readiness gate)

Owns files:
- README.md (demo run section)
- SETUP.md (verification section)
- netsanet.txt
- contracts/test/NetsanetCore.t.sol (test scenario review only)

Does not own:
- Primary feature implementation files

Tasks (in order):
1. Create strict demo script with account-switch cues.
  - Output: presenter script with exact clicks and spoken lines.
2. Build manual test checklist for 6 MVP steps.
  - Output: pass/fail checklist with evidence links or screenshots.
3. Run 3 full rehearsals.
  - Output: issue log with blocker, owner, fix deadline.
4. Build fallback playbook.
  - Manual patient ID path
  - Pre-generated QR text
  - Pre-seeded records
  - Output: fallback narrative ready if camera/IPFS fails.
5. Declare go/no-go before final demo.
  - Output: single readiness status summary.

Definition of done:
- Team can reliably present in under 5 minutes with fallback plan ready.

---

## Ownership Matrix (Single Owner Per Area)

- Contract behavior and deployment: Member 1
- Patient UX path: Member 2
- Doctor UX path: Member 3
- Encryption/IPFS pipeline: Member 4
- Env/network/wallet integration: Member 5
- QA runbook and rehearsal gate: Member 6

---

## 48-Hour Execution Plan

### Hours 0-12 (Critical Lock-In)
- Member 1 freezes interface and deploys contract.
- Member 5 locks env/network validation and setup checklist.
- Members 2 and 3 finish happy-path UI for patient and doctor.
- Member 4 verifies record pipeline with one real end-to-end upload.
- Member 6 drafts demo script v1.

Checkpoint output:
- One complete dry run from register to add-record with at least manual QR fallback.

### Hours 12-24 (Reliability Pass)
- Member 3 finalizes camera scan reliability.
- Member 4 adds retry/error improvements and seed records.
- Member 2 adds clear statuses and audit/timeline states.
- Member 6 runs rehearsal #1 and logs blockers.

Checkpoint output:
- Category isolation proof demonstrated once end-to-end.

### Hours 24-48 (Rehearsal + Freeze)
- Fix only blockers from rehearsal logs.
- Member 6 runs rehearsals #2 and #3.
- Member 5 validates clean-room setup again.
- Code freeze except severe demo blockers.

Final output:
- Repeatable 5-minute demo with backup mode.

---

## What To Skip If Time Is Tight

Skip first:
- Perfect camera UX tuning
- Major UI redesign
- New backend services
- Extra categories beyond demo proof

Never skip:
- End-to-end happy path
- Access isolation proof
- Record submission visibility in timeline
- Deployment and env reliability
