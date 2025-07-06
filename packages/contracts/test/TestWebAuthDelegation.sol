// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test, console} from "forge-std/Test.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {WebAuthnDelegation} from "../src/WebAuthnDelegation.sol";
import {FallbackP256Verifier} from "../src/FallbackP256Verifier.sol";
import {IERC5564Announcer} from "../src/interfaces/IERC5564Announcer.sol";
import {IERC6538Registry} from "../src/interfaces/IERC6538Registry.sol";

contract MockAnnouncer is IERC5564Announcer {
    function announce(uint256 schemeId, address stealthAddress, bytes memory ephemeralPubKey, bytes memory metadata) external override {
        emit IERC5564Announcer.Announcement(schemeId, stealthAddress, msg.sender, ephemeralPubKey, metadata);
    }
}

contract MockRegistry is IERC6538Registry {
    function registerKeys(uint256, bytes calldata) external override {}
    function registerKeysOnBehalf(address, uint256, bytes memory, bytes calldata) external override {}
    function incrementNonce() external override {}
    function DOMAIN_SEPARATOR() external pure override returns (bytes32) { return bytes32(0); }
    function stealthMetaAddressOf(address, uint256) external pure override returns (bytes memory) { return ""; }
    function ERC6538REGISTRY_ENTRY_TYPE_HASH() external pure override returns (bytes32) { return bytes32(0); }
    function nonceOf(address) external pure override returns (uint256) { return 0; }
}

contract MockERC20 is ERC20 {
    constructor() ERC20("MockERC20", "MCK") {}

    // function transfer(address to, uint256 amount) external override returns (bool) {
    //     return true;
    // }

    function mockMint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract WebAuthnDelegationTest is Test {
    WebAuthnDelegation public delegation;
    FallbackP256Verifier public fallbackVerifier;
    MockAnnouncer public announcer;
    MockRegistry public registry;

    address public user = address(0x783547126469126842981);
    uint256 public pubKeyX = 1;
    uint256 public pubKeyY = 2;
    uint256 public spendingLimit = 10 ether;
    uint256 public validUntil = block.timestamp + 1000;
    address[] public allowedTargets;
    bytes4[] public allowedSelectors;

    address user2 = address(0xBEEF1234567);
    MockERC20 public erc20;
    function setUp() public {
        fallbackVerifier = new FallbackP256Verifier();
        announcer = new MockAnnouncer();
        registry = new MockRegistry();
        delegation = new WebAuthnDelegation(address(0), address(fallbackVerifier), address(announcer), address(registry));
        allowedTargets.push(user2);
        allowedSelectors.push(bytes4(keccak256("transfer(address,uint256)")));

        erc20 = new MockERC20();
        erc20.mockMint(address(delegation), 10 ether);
    }

    function testDeployment() public {
        assertTrue(address(delegation) != address(0));
    }

    function testInitializeSession() public {
        vm.prank(user);
        delegation.initializeSession(pubKeyX, pubKeyY, validUntil, spendingLimit, allowedTargets, allowedSelectors);
        (uint256 x, uint256 y) = delegation.getSessionPublicKey(user);
        assertEq(x, pubKeyX);
        assertEq(y, pubKeyY);
        assertTrue(delegation.isSessionInitialized(user));
    }

    function testCancelSession() public {
        vm.prank(user);
        delegation.initializeSession(pubKeyX, pubKeyY, validUntil, spendingLimit, allowedTargets, allowedSelectors);
        vm.prank(user);
        delegation.cancelSession();
        assertFalse(delegation.isSessionInitialized(user));
    }

    function testExecuteStub() public {
        // Setup session
        vm.prank(user);
        delegation.initializeSession(pubKeyX, pubKeyY, validUntil, spendingLimit, allowedTargets, allowedSelectors);
        
        // Prepare call and stealth payment arrays (empty for stub)
        WebAuthnDelegation.Call[] memory calls = new WebAuthnDelegation.Call[](0);
        
        WebAuthnDelegation.StealthPayment[] memory stealthPayments = new WebAuthnDelegation.StealthPayment[](0);
        // Prepare dummy signature (not actually checked in stub)
        bytes memory dummySig = hex"01";
        // Call execute (should succeed as signature check is stubbed out)
        vm.prank(user);
        delegation.execute(calls, stealthPayments, 0, dummySig);
        // If no revert, test passes
        assertTrue(true);
    }

    function testExecuteTestnet() public {

        if (block.chainid != 11155111) {
            return;
        }

        IERC5564Announcer announcer2 = IERC5564Announcer(vm.envAddress("ERC5564_ANNOUNCER"));
        IERC6538Registry registry2 = IERC6538Registry(vm.envAddress("ERC6538_REGISTRY"));

        WebAuthnDelegation delegation2 = new WebAuthnDelegation(address(0), address(fallbackVerifier), address(announcer2), address(registry2));
       
        vm.deal(user, 10 ether);
        vm.deal(address(delegation2), 10 ether);
        erc20.mockMint(address(delegation2), 10 ether);

        vm.prank(user);
        delegation2.initializeSession(pubKeyX, pubKeyY, validUntil, spendingLimit, allowedTargets, allowedSelectors);
        
        // Prepare call and stealth payment arrays (empty for stub)
        WebAuthnDelegation.Call[] memory calls = new WebAuthnDelegation.Call[](2);
        bytes memory data = hex"00"; 
        calls[0] = WebAuthnDelegation.Call({to: payable(user2), value: 1 ether, data: data});

        bytes memory data2 = abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), user2, 1 ether);
        calls[1] = WebAuthnDelegation.Call({to: payable(address(erc20)), value: 0, data: data2});
        
        WebAuthnDelegation.StealthPayment[] memory stealthPayments = new WebAuthnDelegation.StealthPayment[](0);
        // Prepare dummy signature (not actually checked in stub)
        bytes memory dummySig = hex"01";
        // Call execute (should succeed as signature check is stubbed out)

        vm.prank(user);
        delegation2.execute(calls, stealthPayments, 0, dummySig);
        
        assertEq(user2.balance, 1 ether);
        assertEq(address(delegation2).balance, 9 ether);

        // erc20
        assertEq(erc20.balanceOf(user2), 1 ether);
        assertEq(erc20.balanceOf(address(delegation2)), 9 ether);
    }

    function testExecuteTestnetStealth() public {

        if (block.chainid != 11155111) {
            return;
        }

        IERC5564Announcer announcer2 = IERC5564Announcer(vm.envAddress("ERC5564_ANNOUNCER"));
        IERC6538Registry registry2 = IERC6538Registry(vm.envAddress("ERC6538_REGISTRY"));

        WebAuthnDelegation delegation2 = new WebAuthnDelegation(address(0), address(fallbackVerifier), address(announcer2), address(registry2));
       
        vm.deal(user, 10 ether);
        vm.deal(address(delegation2), 10 ether);
        erc20.mockMint(address(delegation2), 10 ether);

        vm.prank(user);
        delegation2.initializeSession(pubKeyX, pubKeyY, validUntil, spendingLimit, allowedTargets, allowedSelectors);
        
        // Prepare call and stealth payment arrays (empty for stub)
        WebAuthnDelegation.Call[] memory calls = new WebAuthnDelegation.Call[](0);

        WebAuthnDelegation.StealthPayment[] memory stealthPayments = new WebAuthnDelegation.StealthPayment[](1);
        stealthPayments[0] = WebAuthnDelegation.StealthPayment({
            stealthAddress: user2,
            value: 1 ether,
            metadata: bytes("0x1234"),
            ephemeralPubKey: bytes("0x1234"),
            schemeId: 1,
            isERC20: true,
            erc20Address: address(erc20)
        });
        
        // Prepare dummy signature (not actually checked in stub)
        bytes memory dummySig = hex"01";
        // Call execute (should succeed as signature check is stubbed out)

        vm.prank(user);
        delegation2.execute(calls, stealthPayments, 0, dummySig);

        // erc20
        assertEq(erc20.balanceOf(user2), 1 ether);
        assertEq(erc20.balanceOf(address(delegation2)), 9 ether);
    }
}
