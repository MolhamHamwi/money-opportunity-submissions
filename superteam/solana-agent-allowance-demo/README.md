# Agent Allowance Demo for Solana Native Subscriptions & Allowances

Submission artifact for the Superteam Canada bounty **“Technical Demo: Solana Native Subscriptions & Allowances Code Sample.”**

This is a small, dependency-free JavaScript demo that models a practical Solana native allowances use case: a user gives an AI support agent a bounded USDC budget that can pay for API calls and a recurring subscription without giving the agent unlimited wallet access.

The goal is to make the product pattern concrete:

- a payer approves a scoped allowance;
- an agent spends from that allowance only within policy limits;
- a merchant collects a subscription only after the billing interval elapses;
- invalid early, oversized, expired, or wrong-recipient collections fail;
- a ledger records the accepted transfers for auditability.

The same flow maps to the Solana native subscriptions/allowances primitive: the `AllowanceAccount` in this demo represents the shared onchain authorization state, while `spendAllowance` and `collectSubscription` represent program instructions that validate the authorization before moving tokens.

## Why this use case matters

AI agents and background automation need small recurring budgets: paid search, hosted model calls, data enrichment, support tickets, SMS, storage, or analytics. Asking the user to sign every micro-payment breaks automation, but broad token approvals are too risky. A native allowance gives the agent a **bounded, inspectable, revocable** budget.

A Canadian example: a Shopify merchant could authorize a support automation app to spend up to 25 USDC per week on ticket summarization and translation. The app can keep working during busy periods, but it cannot drain the merchant wallet or charge the wrong counterparty.

## Files

- `allowance_demo.js` — executable demo and core validation logic.
- `test_allowance_demo.js` — regression tests for valid and invalid payment attempts.

## Run

Requires Node.js 18+ and no npm install.

```bash
node superteam/solana-agent-allowance-demo/allowance_demo.js
node superteam/solana-agent-allowance-demo/test_allowance_demo.js
```

Expected demo output:

```text
accepted agent spend: 3.25 USDC for search-and-summary-api
accepted subscription collection: 12 USDC for pro-support-plan
rejected overspend: allowance exceeded
rejected early subscription: subscription not due yet
remaining allowance: 21.75 USDC
ledger entries: 2
```

## How this maps to Solana

| Demo concept | Solana primitive equivalent |
| --- | --- |
| `AllowanceAccount.payer` | user wallet/token account authority |
| `authorizedSpender` | agent, merchant, or delegated service account |
| `recipient` | token account allowed to receive funds |
| `remainingAmount` | onchain allowance/subscription state |
| `expiresAtSlot` | authorization expiry constraint |
| `billingIntervalSlots` | subscription cadence constraint |
| `ledger` | emitted events / indexed transaction history |

## Product extension ideas

1. **Agent marketplace budget vaults** — users approve per-agent budgets for research, support, or workflow automation.
2. **Usage-based API credits** — a SaaS provider collects only when usage crosses a threshold.
3. **Canadian merchant automation** — Shopify ecosystem apps can charge stablecoin subscriptions without storing card mandates.
4. **Community operations** — Superteam-style communities can fund recurring event tooling or contributor micro-budgets with explicit spend caps.

## Safety notes

This repository is a demo, not audited production code. A production Solana implementation should use the official native subscriptions/allowances program, token program constraints, wallet-visible cancellation controls, replay protection, and complete integration tests on localnet/devnet.
