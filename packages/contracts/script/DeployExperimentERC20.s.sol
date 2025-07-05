// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ExperimentERC20} from "../src/ithaca/ExperimentERC20.sol";

contract DeployExperimentERC20Script is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy ExperimentERC20 contract with the deployer as the authorized origin
        ExperimentERC20 experimentERC20 = new ExperimentERC20(deployerAddress);

        vm.stopBroadcast();
        
        // Log deployment address
        // solhint-disable-next-line no-console
        console.log("ExperimentERC20 deployed at:", address(experimentERC20));
        // solhint-disable-next-line no-console
        console.log("Authorized origin set to:", deployerAddress);
    }
}