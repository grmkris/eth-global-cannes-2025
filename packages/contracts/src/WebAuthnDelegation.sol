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
    
    // Struct to store wallet data
    struct WalletData {
        uint256 pubKeyX;
        uint256 pubKeyY;
        uint256 nonce;
        bool initialized;
    }
    
    // Mapping from wallet address to wallet data
    mapping(address => WalletData) public wallets;
    
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
        require(!wallets[msg.sender].initialized, "Already initialized");
        require(_pubKeyX != 0 && _pubKeyY != 0, "Invalid public key");
        
        wallets[msg.sender] = WalletData({
            pubKeyX: _pubKeyX,
            pubKeyY: _pubKeyY,
            nonce: 0,
            initialized: true
        });
        
        emit Initialized(msg.sender, _pubKeyX, _pubKeyY);
        emit Log("WebAuthn Delegation initialized");
    }
    
    /**
     * @notice Execute calls using WebAuthn signature verification
     * @param wallet The wallet address that signed the transaction
     * @param calls Array of calls to execute
     * @param expectedNonce Expected nonce value for replay protection
     * @param webAuthnSignature Encoded WebAuthn signature data
     */
    function execute(
        address wallet,
        Call[] calldata calls,
        uint256 expectedNonce,
        bytes calldata webAuthnSignature        
    ) external returns (bytes[] memory results) {
        WalletData storage walletData = wallets[wallet];
        
        require(walletData.initialized, "Wallet not initialized");
        require(expectedNonce == walletData.nonce, "Invalid nonce");
        
        // Compute the challenge (message hash) that was signed
        bytes32 challenge = keccak256(abi.encode(wallet, calls, expectedNonce));
        
        // Verify WebAuthn signature using the WebAuthn library
        // We require user presence (0x01) flag to be set
        bool valid = WebAuthn.verifySignature(
            challenge,
            webAuthnSignature,
            WebAuthn.USER_PRESENCE,
            walletData.pubKeyX,
            walletData.pubKeyY,
            verifiers
        );
        
        require(valid, "Invalid WebAuthn signature");
        
        // Increment nonce
        walletData.nonce++;
        
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
        address wallet,
        address to,
        uint256 value,
        bytes calldata data,
        uint256 expectedNonce,
        bytes calldata webAuthnSignature
    ) external returns (bytes memory result) {
        Call[] memory calls = new Call[](1);
        calls[0] = Call(to, value, data);
        
        bytes[] memory results = this.execute(wallet, calls, expectedNonce, webAuthnSignature);
        return results[0];
    }
    
    // Allow receiving ETH
    receive() external payable {}
    
    // Getter for public key
    function getPublicKey(address wallet) external view returns (uint256 x, uint256 y) {
        WalletData storage walletData = wallets[wallet];
        return (walletData.pubKeyX, walletData.pubKeyY);
    }
    
    // Check if initialized
    function isInitialized(address wallet) external view returns (bool) {
        return wallets[wallet].initialized;
    }
    
    // Get wallet nonce
    function getNonce(address wallet) external view returns (uint256) {
        return wallets[wallet].nonce;
    }
}