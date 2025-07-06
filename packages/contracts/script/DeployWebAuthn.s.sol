// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WebAuthnDelegation} from "../src/WebAuthnDelegation.sol";
import {FallbackP256Verifier} from "../src/FallbackP256Verifier.sol";

contract DeployWebAuthnScript is Script {
    function run() external {

        // address announcerAddress, address registryAddress

        uint256 deployerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy fallback P256 verifier
        FallbackP256Verifier fallbackVerifier = new FallbackP256Verifier();
        
        // Deploy WebAuthn delegation contract
        // For chains with P256 precompile, use 0x0000000000000000000000000000000000000100
        // For chains without, use address(0)
        address precompile = address(0); // No precompile on most test networks
        WebAuthnDelegation webAuthnDelegation = new WebAuthnDelegation(
            precompile,
            address(fallbackVerifier)
        );

        vm.stopBroadcast();
        
        // Log deployment addresses
        // solhint-disable-next-line no-console
        console.log("FallbackP256Verifier deployed at:", address(fallbackVerifier));
        // solhint-disable-next-line no-console
        console.log("WebAuthnDelegation deployed at:", address(webAuthnDelegation));
    }
}