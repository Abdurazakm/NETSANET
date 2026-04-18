import { ethers } from 'ethers';

// Fallback to empty string to not break locally if not set
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

// We use the Human-Readable ABI format supported by ethers v6.
// This is much cleaner and faster for an MVP than importing the whole JSON ABI.
export const CONTRACT_ABI = [
  "struct Patient { string name; uint256 createdAt; bool exists; }",
  "struct MedicalRecord { string ipfsCID; uint8 category; string recordType; address addedByClinic; uint256 timestamp; }",
  "struct AccessGrant { address doctor; uint8 category; uint256 grantedAt; uint256 expiresAt; bool revoked; }",
  "struct AuditEntry { address accessor; uint8 category; uint256 timestamp; string action; }",

  // Patient Registration
  "function registerPatient(string calldata _name) external",
  "function patients(address) external view returns (string name, uint256 createdAt, bool exists)",
  
  // Record Management
  "function addRecord(address _patient, string calldata _ipfsCID, uint8 _category, string calldata _recordType) external",
  "function getMyRecords() external view returns (tuple(string ipfsCID, uint8 category, string recordType, address addedByClinic, uint256 timestamp)[])",
  "function getRecordsByCategory(address _patient, uint8 _category) external returns (tuple(string ipfsCID, uint8 category, string recordType, address addedByClinic, uint256 timestamp)[])",
  
  // Access Control
  "function grantAccess(address _doctor, uint8 _category, uint256 _durationHours) external",
  "function revokeAccess(address _doctor, uint8 _category) external",
  "function hasActiveAccess(address _patient, address _doctor, uint8 _category) public view returns (bool)",
  "function getMyAccessGrants() external view returns (tuple(address doctor, uint8 category, uint256 grantedAt, uint256 expiresAt, bool revoked)[])",

  // Audit
  "function getMyAuditLog() external view returns (tuple(address accessor, uint8 category, uint256 timestamp, string action)[])"
];

/**
 * Helper to get a ready-to-use Contract instance connected to the user's wallet.
 * @param {ethers.Signer} signer - The user's wallet signer
 * @returns {ethers.Contract}
 */
export function getContract(signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Setup ethers provider and get signer
 */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install it to use Netsanet.");
  }

  // Ethers v6 standard provider setup
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  
  // Also get the contract instance
  const contract = getContract(signer);

  return { provider, signer, address, contract };
}
