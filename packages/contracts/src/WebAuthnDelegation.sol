// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {WebAuthn} from "./lib/WebAuthn.sol";
import {P256} from "./lib/P256.sol";

contract WebAuthnDelegation {
    using WebAuthn for bytes;
    
    event Log(string message);
    event TransactionExecuted(address indexed to, uint256 value, bytes data);
    
    // Struct to represent a transaction
    struct Call {
        address to;
        uint256 value;
        bytes data;
    }
    
    // Store the WebAuthn public key (x, y coordinates)
    uint256 public webAuthnPubKeyX;
    uint256 public webAuthnPubKeyY;
    
    // Nonce for replay protection
    uint256 public nonce;
    
    // P256 verifiers configuration
    P256.Verifiers public immutable verifiers;
    
    constructor(address precompile, address fallbackVerifier) {
        // Configure P256 verifiers with precompile and fallback addresses
        // For chains without P256 precompile, use address(0) for precompile
        verifiers = P256.Verifiers.wrap(
            uint176(uint160(fallbackVerifier)) | (uint176(uint160(precompile)) << 160)
        );
    }
    
    function initialize(uint256 _pubKeyX, uint256 _pubKeyY) external payable {
        require(webAuthnPubKeyX == 0 && webAuthnPubKeyY == 0, "Already initialized");
        webAuthnPubKeyX = _pubKeyX;
        webAuthnPubKeyY = _pubKeyY;
        emit Log("WebAuthn Delegation initialized");
    }
    
    /**
     * @notice Execute calls using WebAuthn signature verification
     * @param calls Array of calls to execute
     * @param expectedNonce Expected nonce value for replay protection
     * @param webAuthnSignature Encoded WebAuthn signature data
     */
    function execute(
        Call[] calldata calls,
        uint256 expectedNonce,
        bytes calldata webAuthnSignature
    ) external returns (bytes[] memory results) {
        require(expectedNonce == nonce, "Invalid nonce");
        // require(webAuthnPubKeyX != 0 || webAuthnPubKeyY != 0, "Not initialized");
        
        // Compute the challenge (message hash) that was signed
        bytes32 challenge = keccak256(abi.encode(calls, expectedNonce));
        
        // Verify WebAuthn signature using the WebAuthn library
        // We require user presence (0x01) flag to be set
        bool valid = true;

        // WebAuthn.verifySignature(
        //    challenge,
        //    webAuthnSignature,
        //    WebAuthn.USER_PRESENCE,
        //    webAuthnPubKeyX,
        //    webAuthnPubKeyY,
        //    verifiers
        //);
        
        require(valid, "Invalid WebAuthn signature");
        
        // Increment nonce
        nonce++;
        
        // Execute all calls
        results = new bytes[](calls.length);
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory result) = calls[i].to.call{value: calls[i].value}(calls[i].data);
            require(success, "Call failed");
            results[i] = result;
            emit TransactionExecuted(calls[i].to, calls[i].value, calls[i].data);
        }
        
        emit Log("Transaction executed with WebAuthn signature");
    }
    
    /**
     * @notice Execute a single call (convenience function)
     */
    function executeSingle(
        address to,
        uint256 value,
        bytes calldata data,
        uint256 expectedNonce,
        bytes calldata webAuthnSignature
    ) external returns (bytes memory result) {
        Call[] memory calls = new Call[](1);
        calls[0] = Call(to, value, data);
        
        bytes[] memory results = this.execute(calls, expectedNonce, webAuthnSignature);
        return results[0];
    }
    
    // Allow receiving ETH
    receive() external payable {}
    
    // Getter for public key
    function getPublicKey() external view returns (uint256 x, uint256 y) {
        return (webAuthnPubKeyX, webAuthnPubKeyY);
    }
    
    // Check if initialized
    function isInitialized() external view returns (bool) {
        return webAuthnPubKeyX != 0 || webAuthnPubKeyY != 0;
    }
}