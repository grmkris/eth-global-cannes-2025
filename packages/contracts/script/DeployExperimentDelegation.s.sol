// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ExperimentDelegation} from "../src/ithaca/ExperimentDelegation.sol";

contract DeployExperimentDelegationScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy ExperimentDelegation contract
        ExperimentDelegation experimentDelegation = new ExperimentDelegation();

        vm.stopBroadcast();
        
        // Log deployment address
        // solhint-disable-next-line no-console
        console.log("ExperimentDelegation deployed at:", address(experimentDelegation));
    }
}