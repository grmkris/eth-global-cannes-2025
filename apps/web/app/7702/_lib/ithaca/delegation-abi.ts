export const delegationAbi = [
  {
    "type": "fallback",
    "stateMutability": "payable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "authorize",
    "inputs": [
      {
        "name": "publicKey",
        "type": "tuple",
        "internalType": "struct ECDSA.PublicKey",
        "components": [
          {
            "name": "x",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "y",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "name": "expiry",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "signature",
        "type": "tuple",
        "internalType": "struct ECDSA.RecoveredSignature",
        "components": [
          {
            "name": "r",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "s",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "yParity",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "keyIndex",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "authorize",
    "inputs": [
      {
        "name": "publicKey",
        "type": "tuple",
        "internalType": "struct ECDSA.PublicKey",
        "components": [
          {
            "name": "x",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "y",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "name": "expiry",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "keyIndex",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "execute",
    "inputs": [
      {
        "name": "calls",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "execute",
    "inputs": [
      {
        "name": "calls",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "signature",
        "type": "tuple",
        "internalType": "struct ECDSA.Signature",
        "components": [
          {
            "name": "r",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "s",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "name": "metadata",
        "type": "tuple",
        "internalType": "struct WebAuthnP256.Metadata",
        "components": [
          {
            "name": "authenticatorData",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "clientDataJSON",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "challengeIndex",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "typeIndex",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "userVerificationRequired",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "name": "keyIndex",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "execute",
    "inputs": [
      {
        "name": "calls",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "signature",
        "type": "tuple",
        "internalType": "struct ECDSA.Signature",
        "components": [
          {
            "name": "r",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "s",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "name": "keyIndex",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "prehash",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "keys",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "authorized",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "expiry",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "publicKey",
        "type": "tuple",
        "internalType": "struct ECDSA.PublicKey",
        "components": [
          {
            "name": "x",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "y",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "multiSend",
    "inputs": [
      {
        "name": "transactions",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "nonce",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "revoke",
    "inputs": [
      {
        "name": "keyIndex",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revoke",
    "inputs": [
      {
        "name": "keyIndex",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "signature",
        "type": "tuple",
        "internalType": "struct ECDSA.RecoveredSignature",
        "components": [
          {
            "name": "r",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "s",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "yParity",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "error",
    "name": "InvalidAuthority",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "KeyExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "KeyNotAuthorized",
    "inputs": []
  }
] as const