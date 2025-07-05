// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.0;

/**
 * @title P256Verifier interface for P-256 elliptic curve signature verification
 * @dev Interface that follows the EIP-7212 EC verify precompile interface
 * @custom:security-contact bounty@safe.global
 */
interface IP256Verifier {
    /**
     * @notice Verifies a P-256 (secp256r1) signature
     * @param message The 32-byte message hash that was signed
     * @param r The r component of the signature
     * @param s The s component of the signature  
     * @param x The x coordinate of the public key
     * @param y The y coordinate of the public key
     * @return success Whether the signature is valid
     */
    function verify(
        bytes32 message,
        uint256 r,
        uint256 s,
        uint256 x,
        uint256 y
    ) external view returns (bool success);
}