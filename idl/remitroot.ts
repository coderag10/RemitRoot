/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/remitroot.json`.
 */
export type Remitroot = {
  "address": "GHmZ7YCiQNHJQZHTGZfK3oJBfjRWFspKU47HcWaGTiKj",
  "metadata": {
    "name": "remitroot",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimInterest",
      "discriminator": [
        62,
        142,
        132,
        209,
        206,
        8,
        79,
        175
      ],
      "accounts": [
        {
          "name": "worker",
          "signer": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "series",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  114,
                  105,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "series.id",
                "account": "bondSeries"
              }
            ]
          },
          "relations": [
            "position"
          ]
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "worker"
              },
              {
                "kind": "account",
                "path": "series"
              }
            ]
          }
        },
        {
          "name": "usdMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "workerToken",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "series"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "createSeries",
      "discriminator": [
        181,
        9,
        52,
        120,
        197,
        221,
        42,
        142
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "issuer"
        },
        {
          "name": "series",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  114,
                  105,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "config.seriesCount",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "series"
              }
            ]
          }
        },
        {
          "name": "usdMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "couponBps",
          "type": "u16"
        },
        {
          "name": "maturityTs",
          "type": "i64"
        },
        {
          "name": "cap",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "usdMint",
          "docs": [
            "Any SPL or Token-2022 mint: the test dollar on devnet, USDC in a local simulation."
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "redeem",
      "discriminator": [
        184,
        12,
        86,
        149,
        70,
        196,
        97,
        225
      ],
      "accounts": [
        {
          "name": "worker",
          "writable": true,
          "signer": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "series",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  114,
                  105,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "series.id",
                "account": "bondSeries"
              }
            ]
          },
          "relations": [
            "position"
          ]
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "worker"
              },
              {
                "kind": "account",
                "path": "series"
              }
            ]
          }
        },
        {
          "name": "usdMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "workerToken",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "series"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "repay",
      "discriminator": [
        234,
        103,
        67,
        82,
        208,
        234,
        219,
        166
      ],
      "accounts": [
        {
          "name": "issuer",
          "signer": true,
          "relations": [
            "series"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "series",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  114,
                  105,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "series.id",
                "account": "bondSeries"
              }
            ]
          }
        },
        {
          "name": "usdMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "issuerToken",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "series"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sendRemittance",
      "discriminator": [
        58,
        184,
        30,
        1,
        90,
        156,
        238,
        87
      ],
      "accounts": [
        {
          "name": "worker",
          "writable": true,
          "signer": true,
          "relations": [
            "rule"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "worker"
              }
            ]
          }
        },
        {
          "name": "series",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  114,
                  105,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "series.id",
                "account": "bondSeries"
              }
            ]
          },
          "relations": [
            "rule"
          ]
        },
        {
          "name": "position",
          "docs": [
            "Only passed when something is saved. A 0% transfer creates no position."
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "worker"
              },
              {
                "kind": "account",
                "path": "series"
              }
            ]
          }
        },
        {
          "name": "usdMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "workerToken",
          "writable": true
        },
        {
          "name": "recipientToken",
          "docs": [
            "Must be a token account owned by the recipient named in the rule."
          ],
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "series"
          ]
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setPaused",
      "discriminator": [
        91,
        60,
        125,
        192,
        176,
        225,
        166,
        218
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setSplitRule",
      "discriminator": [
        66,
        220,
        250,
        64,
        195,
        208,
        184,
        180
      ],
      "accounts": [
        {
          "name": "worker",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "worker"
              }
            ]
          }
        },
        {
          "name": "series",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  114,
                  105,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "series.id",
                "account": "bondSeries"
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
          "name": "recipient",
          "type": "pubkey"
        },
        {
          "name": "saveBps",
          "type": "u16"
        },
        {
          "name": "goalAmount",
          "type": "u64"
        },
        {
          "name": "goalKind",
          "type": "u8"
        }
      ]
    },
    {
      "name": "withdrawProceeds",
      "discriminator": [
        124,
        68,
        215,
        12,
        201,
        136,
        54,
        72
      ],
      "accounts": [
        {
          "name": "issuer",
          "writable": true,
          "signer": true,
          "relations": [
            "series"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "series",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  114,
                  105,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "series.id",
                "account": "bondSeries"
              }
            ]
          }
        },
        {
          "name": "record",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  99,
                  101,
                  101,
                  100,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "series"
              },
              {
                "kind": "account",
                "path": "series.proceedsCount",
                "account": "bondSeries"
              }
            ]
          }
        },
        {
          "name": "usdMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "issuerToken",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "series"
          ]
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "purpose",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bondSeries",
      "discriminator": [
        212,
        151,
        78,
        197,
        178,
        129,
        246,
        238
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    },
    {
      "name": "proceedsRecord",
      "discriminator": [
        221,
        45,
        82,
        175,
        22,
        150,
        3,
        131
      ]
    },
    {
      "name": "splitRule",
      "discriminator": [
        74,
        248,
        193,
        63,
        84,
        211,
        57,
        187
      ]
    }
  ],
  "events": [
    {
      "name": "configInitialized",
      "discriminator": [
        181,
        49,
        200,
        156,
        19,
        167,
        178,
        91
      ]
    },
    {
      "name": "interestClaimed",
      "discriminator": [
        207,
        228,
        188,
        90,
        131,
        122,
        6,
        125
      ]
    },
    {
      "name": "pauseSet",
      "discriminator": [
        175,
        57,
        198,
        136,
        192,
        66,
        204,
        73
      ]
    },
    {
      "name": "proceedsWithdrawn",
      "discriminator": [
        39,
        167,
        165,
        1,
        8,
        206,
        214,
        13
      ]
    },
    {
      "name": "redeemed",
      "discriminator": [
        14,
        29,
        183,
        71,
        31,
        165,
        107,
        38
      ]
    },
    {
      "name": "remittanceSent",
      "discriminator": [
        83,
        67,
        1,
        82,
        210,
        140,
        239,
        237
      ]
    },
    {
      "name": "repaid",
      "discriminator": [
        38,
        248,
        231,
        7,
        150,
        164,
        172,
        23
      ]
    },
    {
      "name": "ruleSet",
      "discriminator": [
        141,
        22,
        70,
        140,
        45,
        27,
        175,
        119
      ]
    },
    {
      "name": "seriesCreated",
      "discriminator": [
        2,
        164,
        54,
        38,
        24,
        181,
        233,
        180
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notAdmin",
      "msg": "Only the admin can do this"
    },
    {
      "code": 6001,
      "name": "notIssuer",
      "msg": "Only the bond issuer can do this"
    },
    {
      "code": 6002,
      "name": "paused",
      "msg": "RemitRoot is paused by the admin; try again later"
    },
    {
      "code": 6003,
      "name": "saveShareTooHigh",
      "msg": "Savings share cannot be more than 50%"
    },
    {
      "code": 6004,
      "name": "invalidRecipient",
      "msg": "The family wallet address is not valid"
    },
    {
      "code": 6005,
      "name": "invalidGoal",
      "msg": "The savings goal is not valid"
    },
    {
      "code": 6006,
      "name": "couponTooHigh",
      "msg": "Coupon rate is too high"
    },
    {
      "code": 6007,
      "name": "invalidName",
      "msg": "Name is empty or too long"
    },
    {
      "code": 6008,
      "name": "invalidPurpose",
      "msg": "Purpose is empty or too long"
    },
    {
      "code": 6009,
      "name": "invalidMaturity",
      "msg": "Maturity must be in the future"
    },
    {
      "code": 6010,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6011,
      "name": "seriesMatured",
      "msg": "This bond series has matured and takes no new savings"
    },
    {
      "code": 6012,
      "name": "notMatured",
      "msg": "This bond series has not matured yet"
    },
    {
      "code": 6013,
      "name": "capExceeded",
      "msg": "This transfer would exceed the bond series cap"
    },
    {
      "code": 6014,
      "name": "wrongSeries",
      "msg": "The split rule points to a different bond series"
    },
    {
      "code": 6015,
      "name": "positionRequired",
      "msg": "A savings share needs the bond position account"
    },
    {
      "code": 6016,
      "name": "positionNotNeeded",
      "msg": "A transfer with nothing saved must not pass a bond position"
    },
    {
      "code": 6017,
      "name": "nothingToClaim",
      "msg": "There is no interest to claim yet"
    },
    {
      "code": 6018,
      "name": "vaultInsufficient",
      "msg": "The vault does not hold enough funds; the issuer must repay first"
    },
    {
      "code": 6019,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "bondSeries",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "issuer",
            "docs": [
              "Can withdraw proceeds and repay."
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "couponBps",
            "docs": [
              "Annual simple interest in basis points, e.g. 900 = 9%."
            ],
            "type": "u16"
          },
          {
            "name": "startTs",
            "type": "i64"
          },
          {
            "name": "maturityTs",
            "type": "i64"
          },
          {
            "name": "cap",
            "docs": [
              "Maximum principal that can ever be sold."
            ],
            "type": "u64"
          },
          {
            "name": "totalPrincipal",
            "docs": [
              "Principal sold so far (lifetime, never decreases)."
            ],
            "type": "u64"
          },
          {
            "name": "totalRedeemed",
            "docs": [
              "Principal paid back to savers at redemption."
            ],
            "type": "u64"
          },
          {
            "name": "interestPaid",
            "docs": [
              "Interest paid to savers, by claim or at redemption."
            ],
            "type": "u64"
          },
          {
            "name": "totalWithdrawn",
            "docs": [
              "Taken out of the vault by the issuer."
            ],
            "type": "u64"
          },
          {
            "name": "totalRepaid",
            "docs": [
              "Paid back into the vault by the issuer."
            ],
            "type": "u64"
          },
          {
            "name": "saverCount",
            "docs": [
              "Workers who have ever saved into this series."
            ],
            "type": "u32"
          },
          {
            "name": "proceedsCount",
            "type": "u32"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Creates series and can pause."
            ],
            "type": "pubkey"
          },
          {
            "name": "usdMint",
            "docs": [
              "The dollar mint every series uses: the test mint on devnet, USDC in a local simulation."
            ],
            "type": "pubkey"
          },
          {
            "name": "paused",
            "docs": [
              "Emergency stop for setting rules, sending and claiming interest. Redeeming always works."
            ],
            "type": "bool"
          },
          {
            "name": "seriesCount",
            "docs": [
              "Id of the next series."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "configInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "usdMint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "interestClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "worker",
            "type": "pubkey"
          },
          {
            "name": "series",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "pauseSet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paused",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "position",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "worker",
            "type": "pubkey"
          },
          {
            "name": "series",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "u64"
          },
          {
            "name": "accruedInterest",
            "docs": [
              "Interest booked up to `last_accrual_ts` and not yet paid."
            ],
            "type": "u64"
          },
          {
            "name": "lastAccrualTs",
            "type": "i64"
          },
          {
            "name": "interestClaimed",
            "docs": [
              "Interest already paid out by `claim_interest`."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "proceedsRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "series",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "purpose",
            "type": "string"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "proceedsWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "series",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "purpose",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "redeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "worker",
            "type": "pubkey"
          },
          {
            "name": "series",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "u64"
          },
          {
            "name": "interest",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "remittanceSent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "worker",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "familyAmount",
            "type": "u64"
          },
          {
            "name": "savedAmount",
            "type": "u64"
          },
          {
            "name": "series",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "repaid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "series",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "totalRepaid",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "ruleSet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "worker",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "saveBps",
            "type": "u16"
          },
          {
            "name": "series",
            "type": "pubkey"
          },
          {
            "name": "goalAmount",
            "type": "u64"
          },
          {
            "name": "goalKind",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "seriesCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "series",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "couponBps",
            "type": "u16"
          },
          {
            "name": "maturityTs",
            "type": "i64"
          },
          {
            "name": "cap",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "splitRule",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "worker",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "docs": [
              "The family wallet."
            ],
            "type": "pubkey"
          },
          {
            "name": "saveBps",
            "docs": [
              "Savings share, 0 to 5000 basis points."
            ],
            "type": "u16"
          },
          {
            "name": "series",
            "docs": [
              "Where savings go."
            ],
            "type": "pubkey"
          },
          {
            "name": "totalSent",
            "type": "u64"
          },
          {
            "name": "totalSaved",
            "type": "u64"
          },
          {
            "name": "transferCount",
            "type": "u32"
          },
          {
            "name": "goalAmount",
            "docs": [
              "Optional savings goal in base units; 0 means no goal."
            ],
            "type": "u64"
          },
          {
            "name": "goalKind",
            "docs": [
              "What the goal is for; see `MAX_GOAL_KIND`."
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "configSeed",
      "type": "bytes",
      "value": "[99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "maxCouponBps",
      "docs": [
        "Highest annual coupon a series may carry: 100%."
      ],
      "type": "u16",
      "value": "10000"
    },
    {
      "name": "maxGoalKind",
      "docs": [
        "Savings goal kinds: 0 none, 1 land, 2 school fees, 3 house, 4 other."
      ],
      "type": "u8",
      "value": "4"
    },
    {
      "name": "maxNameLen",
      "type": "u8",
      "value": "32"
    },
    {
      "name": "maxPurposeLen",
      "type": "u8",
      "value": "64"
    },
    {
      "name": "maxSaveBps",
      "docs": [
        "Highest savings share: 50% of each transfer."
      ],
      "type": "u16",
      "value": "5000"
    },
    {
      "name": "positionSeed",
      "type": "bytes",
      "value": "[112, 111, 115, 105, 116, 105, 111, 110]"
    },
    {
      "name": "proceedsSeed",
      "type": "bytes",
      "value": "[112, 114, 111, 99, 101, 101, 100, 115]"
    },
    {
      "name": "ruleSeed",
      "type": "bytes",
      "value": "[114, 117, 108, 101]"
    },
    {
      "name": "seriesSeed",
      "type": "bytes",
      "value": "[115, 101, 114, 105, 101, 115]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    }
  ]
};
