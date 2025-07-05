// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";
import {BatchCallAndSponsor} from "../src/BatchCallAndSponsor.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";


contract DeployScript is Script {
    function run() external {
        // 1. start broadcasting transactions
        vm.startBroadcast();

        // 2. deploy
        // MyContract deployed = new MyContract(/* constructor args */);

        // 3. done
        vm.stopBroadcast();
    }
}

contract DeployBatchCallAndSponsorScript is Script {

    uint256 OWNER_PK = vm.envUint("OWNER_PRIVATE_KEY");
    address payable OWNER_ADDRESS = payable(0x2E61D8b5FcE5616980e039906cc1f212f44f5168);

    // The contract that Alice will delegate execution to.
    BatchCallAndSponsor public implementation;

    function run() external {
        // Start broadcasting transactions with Alice's private key.
        vm.startBroadcast(OWNER_PK);

        // Deploy the delegation contract (Alice will delegate calls to this contract).
        implementation = new BatchCallAndSponsor();

        vm.stopBroadcast();
    }
}


contract BatchCallAndSponsorScript is Script {

    uint256 OWNER_PK = vm.envUint("OWNER_PRIVATE_KEY");
    address payable OWNER_ADDRESS = payable(0x2E61D8b5FcE5616980e039906cc1f212f44f5168);
    uint256 USER_PK = vm.envUint("USER_PRIVATE_KEY");
    address payable USER_ADDRESS = payable(0x93998AB1fC2D04fB7A1430073FD95434067F57e1);


    // The contract that Alice will delegate execution to.
    BatchCallAndSponsor public implementation = BatchCallAndSponsor(payable(0x6990aCe3e222Ac4901B713958716Bda39D709a6c));


    function run() external {
        // Start broadcasting transactions with Alice's private key.
        // vm.startBroadcast(OWNER_PK);

        // performDirectExecution();

        // Perform sponsored execution
        performSponsoredExecution();
    }

    function performDirectExecution() internal {
        BatchCallAndSponsor.Call[] memory calls = new BatchCallAndSponsor.Call[](2);

        // ETH transfer
        calls[0] = BatchCallAndSponsor.Call({to: USER_ADDRESS, value: 0.001 ether, data: ""});
        calls[1] = BatchCallAndSponsor.Call({to: USER_ADDRESS, value: 0.0005 ether, data: ""});

        vm.signAndAttachDelegation(address(implementation), OWNER_PK);
        vm.startPrank(OWNER_ADDRESS);
        BatchCallAndSponsor(OWNER_ADDRESS).execute(calls);
        vm.stopPrank();

        console.log("Bob's balance after direct execution:", USER_ADDRESS.balance);
    }

    function performSponsoredExecution() internal {
        console.log("Sending 1 ETH from Alice to a random address, the transaction is sponsored by Bob");

        // Alice signs a delegation allowing `implementation` to execute transactions on her behalf.
        Vm.SignedDelegation memory signedDelegation = vm.signDelegation(address(implementation), OWNER_PK);

        BatchCallAndSponsor.Call[] memory calls = new BatchCallAndSponsor.Call[](2);
        address recipient = USER_ADDRESS;
        calls[0] = BatchCallAndSponsor.Call({to: recipient, value: 0.001 ether, data: ""});
        calls[1] = BatchCallAndSponsor.Call({to: recipient, value: 0.0005 ether, data: ""});

        // Bob attaches the signed delegation from Alice and broadcasts it.
        vm.startBroadcast(USER_PK);
        vm.attachDelegation(signedDelegation);

        // Verify that Alice's account now temporarily behaves as a smart contract.
        bytes memory code = address(OWNER_ADDRESS).code;
        require(code.length > 0, "no code written to Alice");
        // console.log("Code on Alice's account:", vm.toString(code));

        bytes memory encodedCalls = "";
        for (uint256 i = 0; i < calls.length; i++) {
            encodedCalls = abi.encodePacked(encodedCalls, calls[i].to, calls[i].value, calls[i].data);
        }
        bytes32 digest = keccak256(abi.encodePacked(BatchCallAndSponsor(OWNER_ADDRESS).nonce(), encodedCalls));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(OWNER_PK, MessageHashUtils.toEthSignedMessageHash(digest));
        bytes memory signature = abi.encodePacked(r, s, v);

        // As Bob, execute the transaction via Alice's temporarily assigned contract.
        BatchCallAndSponsor(OWNER_ADDRESS).execute(calls, signature);

        vm.stopBroadcast();

        console.log("Recipient balance after sponsored execution:", recipient.balance);
    }
}
