// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test, console} from "forge-std/Test.sol";
import {Delegation} from "../src/Delegation.sol";

contract DelegationTest is Test {
    Delegation public delegation;
    
    event Log(string message);

    function setUp() public {
        delegation = new Delegation();
    }

    function testInitialize() public {
        // Test that initialize function works and emits correct event
        vm.expectEmit(true, true, true, true);
        emit Log("Hello, world!");
        
        delegation.initialize();
    }

    function testInitializeWithValue() public {
        // Test that initialize function works with value sent
        vm.expectEmit(true, true, true, true);
        emit Log("Hello, world!");
        
        delegation.initialize{value: 1 ether}();
    }

    function testPing() public {
        // Test that ping function works and emits correct event
        vm.expectEmit(true, true, true, true);
        emit Log("Pong!");
        
        delegation.ping();
    }

    function testMultipleCalls() public {
        // Test multiple function calls work correctly
        vm.expectEmit(true, true, true, true);
        emit Log("Hello, world!");
        delegation.initialize();

        vm.expectEmit(true, true, true, true);
        emit Log("Pong!");
        delegation.ping();
    }

    function testContractDeployment() public view {
        // Test that contract is deployed correctly
        assertTrue(address(delegation) != address(0));
    }
}
