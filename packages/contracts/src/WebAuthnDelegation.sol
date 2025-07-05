// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {WebAuthn} from "./lib/WebAuthn.sol";
import {P256} from "./lib/P256.sol";
import {IERC5564Announcer} from "./interfaces/IERC5564Announcer.sol";
import {IERC6538Registry} from "./interfaces/IERC6538Registry.sol";

contract WebAuthnDelegation {
    using WebAuthn for bytes;
    
    event Log(string message);
    event TransactionExecuted(address indexed to, uint256 value, bytes data);
    event StealthPaymentExecuted(address indexed stealthAddress, uint256 value, bytes metadata);
    event BatchExecuted(uint256 nonce, Call[] calls);
    event Initialized(address indexed account, uint256 pubKeyX, uint256 pubKeyY);
    
    // Struct to represent a transaction
    struct Call {
        address to;
        uint256 value;
        bytes data;
    }

    struct StealthPayment {
        uint256 schemeId;
        address stealthAddress;
        bytes ephemeralPubKey;
        bytes metadata;
        uint256 value;
    }

    struct Session {
        uint256 sessionId;
        WebAuthnPubKey sessionPubKey;
        uint256 validUntil;
        uint256 spendingLimit; // Usdc max spending limit for session
        AllowedTargets allowedTargets;
        AllowedSelectors allowedSelectors;
    }

    struct AllowedTargets {
        bool isSet;
        address[] targets; // Contract addresses that can be called within the session
    }

    struct AllowedSelectors {
        bool isSet;
        bytes4[] selectors; // Selectors that can be called within the session
    }
  

    mapping(address => Session) public sessions;
    mapping
    
    // Store the WebAuthn public key (x, y coordinates)
    struct WebAuthnPubKey {
        uint256 x;
        uint256 y;
    }
    
    // Nonce for replay protection
    uint256 public nonce;
    
    // P256 verifiers configuration
    P256.Verifiers public immutable verifiers;

    IERC5564Announcer public announcer; // Stealth payment announcer
    IERC6538Registry public registry;
    
    constructor(address precompile, address fallbackVerifier, address announcerAddress, address registryAddress) {
        // Configure P256 verifiers with precompile and fallback addresses
        // For chains without P256 precompile, use address(0) for precompile
        verifiers = P256.Verifiers.wrap(
            uint176(uint160(fallbackVerifier)) | (uint176(uint160(precompile)) << 160)
        );

        announcer = ERC5564Announcer(announcerAddress);
        registry = IERC6538Registry(registryAddress);
    }
    
    function initializeSession(uint256 _pubKeyX, uint256 _pubKeyY, uint256 _spendingLimit, address[] memory _allowedTargets, bytes4[] memory _allowedSelectors) external payable {

        require(sessions[msg.sender].sessionId == 0, "Already initialized");

        Session storage session = sessions[msg.sender];

        session.sessionId = uint256(keccak256(abi.encodePacked(msg.sender, _pubKeyX, _pubKeyY, _spendingLimit, _allowedTargets, _allowedSelectors) ));
        session.sessionPubKey = WebAuthnPubKey(_pubKeyX, _pubKeyY);
        session.spendingLimit = _spendingLimit;

        if (_allowedTargets.length > 0) {
            session.allowedTargets.isSet = true;
            session.allowedTargets.targets = _allowedTargets;
        }

        if (_allowedSelectors.length > 0) {
            session.allowedSelectors.isSet = true;
            session.allowedSelectors.selectors = _allowedSelectors;
        }

        emit Log("WebAuthn Delegation initialized");
    }

    function cancelSession() external {
        require(sessions[msg.sender].sessionId != 0, "Not initialized");
        delete sessions[msg.sender];
    }
    
    /**
     * @notice Execute calls using WebAuthn signature verification
     * @param calls Array of calls to execute
     * @param expectedNonce Expected nonce value for replay protection
     * @param webAuthnSignature Encoded WebAuthn signature data
     */
    function execute(
        Call[] calldata calls,
        StealthPayment[] calldata stealthPayments,
        uint256 expectedNonce,
        bytes calldata webAuthnSignature
    ) external returns (bytes[] memory results) {
        validateTransaction(calls, stealthPayments, expectedNonce, webAuthnSignature);
        
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

        for (uint256 i = 0; i < stealthPayments.length; i++) {
            (bool success, bytes memory result) = stealthPayments[i].stealthAddress.call{value: stealthPayments[i].value}(stealthPayments[i].metadata);
            require(success, "Stealth payment failed");
            results[i] = result;

            announcer.announce(
                stealthPayments[i].schemeId, 
                stealthPayments[i].stealthAddress, 
                stealthPayments[i].ephemeralPubKey, 
                stealthPayments[i].metadata
            );

            emit StealthPaymentExecuted(stealthPayments[i].stealthAddress, stealthPayments[i].value, stealthPayments[i].metadata);
        }
        
        emit Log("Transaction executed with WebAuthn signature");
    }

    function validateTransaction(
        Call[] calldata calls,
        StealthPayment[] calldata stealthPayments,
        uint256 expectedNonce,
        bytes calldata webAuthnSignature
    ) private view {
         require(expectedNonce == nonce, "Invalid nonce");

        Session memory session = sessions[msg.sender];

        require(session.sessionId != 0, "Not initialized");
        require(block.timestamp < session.validUntil, "Session expired");

        uint256 totalValue = 0;
        for (uint256 i = 0; i < calls.length; i++) {
            totalValue += calls[i].value;
        }

        for (uint256 i = 0; i < stealthPayments.length; i++) {
            totalValue += stealthPayments[i].value;
        }

        require(totalValue <= session.spendingLimit, "Spending limit exceeded");

        for (uint256 i = 0; i < calls.length; i++) {
            if (session.allowedTargets.isSet) {
                require(contains(session.allowedTargets.targets, calls[i].to), "Target not allowed");
            }
            if (session.allowedSelectors.isSet) {
                require(contains(session.allowedSelectors.selectors, bytes4(calls[i].data)), "Selector not allowed");
            }
        }

        // Compute the challenge (message hash) that was signed
        bytes32 challenge = keccak256(abi.encode(calls, stealthPayments, expectedNonce));
        
        // Verify WebAuthn signature using the WebAuthn library
        // We require user presence (0x01) flag to be set
        bool valid = WebAuthn.verifySignature(
            challenge,
            webAuthnSignature,
            WebAuthn.USER_PRESENCE,
            session.sessionPubKey.x,
            session.sessionPubKey.y,
            verifiers
        );
        
        // require(valid, "Invalid WebAuthn signature");
    }
    
    // Allow receiving ETH
    receive() external payable {}
    
    // Getter for public key
    function getSessionPublicKey(address sessionOwner) external view returns (uint256 x, uint256 y) {
        Session storage session = sessions[sessionOwner];
        return (session.sessionPubKey.x, session.sessionPubKey.y);
    }
    
    // Check if initialized
    function isSessionInitialized(address sessionOwner) external view returns (bool) {
        return sessions[sessionOwner].sessionId != 0;
    }



    // utility function
    function contains(address[] memory array, address value) internal pure returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == value) {
                return true;
            }
        }
        return false;
    }

    function contains(bytes4[] memory array, bytes4 value) internal pure returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == value) {
                return true;
            }
        }
        return false;
    }
}