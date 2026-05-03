import { ethers } from "ethers";

const DEPLOYED_CONTRACTS_BY_CHAIN_ID = {
  84532: "0x4f4658ef6f545164279b1fafb2a29796c08c4d3d",
  11155111: "0x83dcfbf71551cc20fc8a4799cc0d3ddbc2f704b3",
};

// Human-readable ABI for the MVP contract surface used by the frontend.
export const CONTRACT_ABI = [
  // Patient registration
  "function registerPatient(string calldata _name) external",
  "function patients(address) external view returns (string name, uint256 createdAt, bool exists)",

  // Record management
  "function addRecord(address _patient, string calldata _ipfsCID, uint8 _category, string calldata _recordType) external",
  "function getMyRecords() external view returns (tuple(string ipfsCID, uint8 category, string recordType, address addedByClinic, uint256 timestamp)[])",
  "function getRecordsByCategory(address _patient, uint8 _category) external returns (tuple(string ipfsCID, uint8 category, string recordType, address addedByClinic, uint256 timestamp)[])",

  // Access control
  "function grantAccess(address _doctor, uint8 _category, uint256 _durationHours) external",
  "function requestAccess(address _patient, uint8 _category, uint256 _durationHours) external",
  "function respondToAccessRequest(address _doctor, uint8 _category, bool _approve) external",
  "function revokeAccess(address _doctor, uint8 _category) external",
  "function hasActiveAccess(address _patient, address _doctor, uint8 _category) public view returns (bool)",
  "function getMyAccessGrants() external view returns (tuple(address doctor, uint8 category, uint256 grantedAt, uint256 expiresAt, bool revoked)[])",
  "function getMyPendingAccessRequests() external view returns (tuple(address doctor, uint8 category, uint256 requestedAt, uint256 requestedDurationHours, uint256 respondedAt, uint8 status)[])",
  "function getGrantDetails(address _patient, address _doctor, uint8 _category) external view returns (tuple(address doctor, uint8 category, uint256 grantedAt, uint256 expiresAt, bool revoked), bool)",
  "function getAccessRequestDetails(address _patient, address _doctor, uint8 _category) external view returns (tuple(address doctor, uint8 category, uint256 requestedAt, uint256 requestedDurationHours, uint256 respondedAt, uint8 status), bool)",

  // Audit
  "function getMyAuditLog() external view returns (tuple(address accessor, uint8 category, uint256 timestamp, string action)[])",
];

function resolveContractAddress(chainId) {
  const deployedAddress = DEPLOYED_CONTRACTS_BY_CHAIN_ID[Number(chainId)];

  if (deployedAddress) {
    return deployedAddress;
  }

  throw new Error(
    `NetsanetCore is not configured for chain ${chainId}. Set VITE_CONTRACT_ADDRESS or switch MetaMask to Base Sepolia (84532) or Sepolia (11155111).`,
  );
}

/**
 * Helper to get a ready-to-use Contract instance connected to the user's wallet.
 * @param {ethers.Signer} signer - The user's wallet signer
 * @param {number} chainId - The active chain ID
 * @returns {ethers.Contract}
 */
export function getContract(signer, chainId) {
  return new ethers.Contract(
    resolveContractAddress(chainId),
    CONTRACT_ABI,
    signer,
  );
}

/**
 * Setup ethers provider and get signer.
 */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask is not installed. Please install it to use Netsanet.",
    );
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  const network = await provider.getNetwork();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const resolvedAddress = resolveContractAddress(Number(network.chainId));
  const deployedCode = await provider.getCode(resolvedAddress);

  if (deployedCode === "0x") {
    throw new Error(
      `No NetsanetCore contract was found at ${resolvedAddress} on chain ${network.chainId}. Switch MetaMask to the correct network or set VITE_CONTRACT_ADDRESS to the deployed contract address.`,
    );
  }

  const contract = new ethers.Contract(resolvedAddress, CONTRACT_ABI, signer);

  return { provider, signer, address, contract };
}
