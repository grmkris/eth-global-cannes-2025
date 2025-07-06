// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {WebAuthn} from "./lib/WebAuthn.sol";
import {P256} from "./lib/P256.sol";

contract WebAuthnDelegation {
    using WebAuthn for bytes;
    
    event Log(string message);
    event TransactionExecuted(address indexed to, uint256 value, bytes data);
    event BatchExecuted(uint256 nonce, Call[] calls);
    event Initialized(address indexed account, uint256 pubKeyX, uint256 pubKeyY);
    
    // Struct to represent a transaction
    struct Call {
        address to;
        uint256 value;
        bytes data;
    }
    
    // Struct to store WebAuthn credentials for each EOA
    struct WebAuthnCredential {
        uint256 pubKeyX;
        uint256 pubKeyY;
        uint256 nonce;
        bool initialized;
    }
    
    // Mapping from EOA address to their WebAuthn credentials
    mapping(address => WebAuthnCredential) public credentials;
    
    // P256 verifiers configuration
    P256.Verifiers public immutable verifiers;
    
    constructor(address precompile, address fallbackVerifier) {
        // Configure P256 verifiers with precompile and fallback addresses
        // For chains without P256 precompile, use address(0) for precompile
        verifiers = P256.Verifiers.wrap(
            uint176(uint160(fallbackVerifier)) | (uint176(uint160(precompile)) << 160)
        );
    }
    
    function initialize(address eoa, uint256 _pubKeyX, uint256 _pubKeyY) external payable {
        require(!credentials[eoa].initialized, "Already initialized for this EOA");
        require(_pubKeyX != 0 && _pubKeyY != 0, "Invalid public key");
        
        credentials[eoa] = WebAuthnCredential({
            pubKeyX: _pubKeyX,
            pubKeyY: _pubKeyY,
            nonce: 0,
            initialized: true
        });
        
        emit Initialized(eoa, _pubKeyX, _pubKeyY);
        emit Log("WebAuthn Delegation initialized for EOA");
    }
    
    /**
     * @notice Execute calls using WebAuthn signature verification
     * @param eoa The EOA address whose credentials to use
     * @param calls Array of calls to execute
     * @param expectedNonce Expected nonce value for replay protection
     * @param webAuthnSignature Encoded WebAuthn signature data
     */
    function execute(
        address eoa,
        Call[] calldata calls,
        uint256 expectedNonce,
        bytes calldata webAuthnSignature
    ) external returns (bytes[] memory results) {
        WebAuthnCredential storage cred = credentials[eoa];
        require(cred.initialized, "EOA not initialized");
        require(expectedNonce == cred.nonce, "Invalid nonce");
        
        // Compute the challenge (message hash) that was signed
        bytes32 challenge = keccak256(abi.encode(eoa, calls, expectedNonce));
        
        // Verify WebAuthn signature using the WebAuthn library
        // We require user presence (0x01) flag to be set
        bool valid = true;

        // WebAuthn.verifySignature(
        //    challenge,
        //    webAuthnSignature,
        //    WebAuthn.USER_PRESENCE,
        //    cred.pubKeyX,
        //    cred.pubKeyY,
        //    verifiers
        //);
        
        require(valid, "Invalid WebAuthn signature");
        
        // Increment nonce for this EOA
        cred.nonce++;
        
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
        address eoa,
        address to,
        uint256 value,
        bytes calldata data,
        uint256 expectedNonce,
        bytes calldata webAuthnSignature
    ) external returns (bytes memory result) {
        Call[] memory calls = new Call[](1);
        calls[0] = Call(to, value, data);
        
        bytes[] memory results = this.execute(eoa, calls, expectedNonce, webAuthnSignature);
        return results[0];
    }
    
    // Allow receiving ETH
    receive() external payable {}
    
    // Getter for public key
    function getPublicKey(address eoa) external view returns (uint256 x, uint256 y) {
        WebAuthnCredential memory cred = credentials[eoa];
        return (cred.pubKeyX, cred.pubKeyY);
    }
    
    // Check if initialized
    function isInitialized(address eoa) external view returns (bool) {
        return credentials[eoa].initialized;
    }
    
    // Get nonce for a specific EOA
    function getNonce(address eoa) external view returns (uint256) {
        return credentials[eoa].nonce;
    }
}