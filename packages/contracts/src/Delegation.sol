// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;
 
contract Delegation {
  event Log(string message);
 
  function initialize() external payable {
    emit Log('Hello, world!');
  }
 
  function ping() external {
    emit Log('Pong!');
  }
}