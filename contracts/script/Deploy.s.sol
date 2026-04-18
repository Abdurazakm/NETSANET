// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/NetsanetCore.sol";

/// @title Deploy — Deploys NetsanetCore to Sepolia (or any EVM chain)
/// @dev   Usage:
///        forge script script/Deploy.s.sol \
///            --rpc-url $SEPOLIA_RPC_URL \
///            --private-key $PRIVATE_KEY \
///            --broadcast \
///            --verify
contract DeployNetsanetCore is Script {

    function run() external {
        // Read deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        NetsanetCore core = new NetsanetCore();

        vm.stopBroadcast();

        console.log("===================================");
        console.log("NetsanetCore deployed at:", address(core));
        console.log("===================================");
    }
}
