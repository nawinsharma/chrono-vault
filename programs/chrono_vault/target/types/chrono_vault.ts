/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/chrono_vault.json`.
 */
export type ChronoVault = {
  "address": "u8Jw4y4seuWQYPMpZHwFGiPLUzXi1vFrKm6MB5Kiy8f",
  "metadata": {
    "name": "chronoVault",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "ChronoVault - Time-locked capsule program on Solana"
  },
  "instructions": [
    {
      "name": "createCapsule",
      "discriminator": [
        195,
        104,
        42,
        180,
        127,
        169,
        62,
        3
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "capsule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  112,
                  115,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "capsuleId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "capsuleId",
          "type": "string"
        },
        {
          "name": "unlockTimestamp",
          "type": "i64"
        },
        {
          "name": "encryptedCid",
          "type": "string"
        },
        {
          "name": "escrowAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unlockCapsule",
      "discriminator": [
        252,
        32,
        190,
        14,
        240,
        239,
        46,
        228
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "capsule"
          ]
        },
        {
          "name": "capsule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  112,
                  115,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "capsuleId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "capsuleId",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "capsule",
      "discriminator": [
        212,
        231,
        77,
        219,
        58,
        13,
        118,
        241
      ]
    }
  ],
  "events": [
    {
      "name": "capsuleCreated",
      "discriminator": [
        113,
        132,
        247,
        198,
        217,
        47,
        201,
        223
      ]
    },
    {
      "name": "capsuleUnlocked",
      "discriminator": [
        225,
        147,
        157,
        140,
        191,
        11,
        31,
        94
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unlockTimestampMustBeFuture",
      "msg": "Unlock timestamp must be in the future"
    },
    {
      "code": 6001,
      "name": "capsuleAlreadyUnlocked",
      "msg": "Capsule has already been unlocked"
    },
    {
      "code": 6002,
      "name": "unlockTimestampNotReached",
      "msg": "Unlock timestamp has not been reached yet"
    },
    {
      "code": 6003,
      "name": "unauthorizedUnlock",
      "msg": "Only the capsule creator can unlock it"
    },
    {
      "code": 6004,
      "name": "capsuleIdTooLong",
      "msg": "Capsule ID exceeds maximum length of 64 characters"
    },
    {
      "code": 6005,
      "name": "cidTooLong",
      "msg": "Encrypted CID exceeds maximum length of 256 characters"
    }
  ],
  "types": [
    {
      "name": "capsule",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "capsuleId",
            "type": "string"
          },
          {
            "name": "unlockTimestamp",
            "type": "i64"
          },
          {
            "name": "encryptedCid",
            "type": "string"
          },
          {
            "name": "escrowAmount",
            "type": "u64"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "capsuleCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "capsuleId",
            "type": "string"
          },
          {
            "name": "unlockTimestamp",
            "type": "i64"
          },
          {
            "name": "escrowAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "capsuleUnlocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "capsuleId",
            "type": "string"
          },
          {
            "name": "unlockedAt",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
