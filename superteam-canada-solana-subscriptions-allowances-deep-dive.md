# Solana Native Subscriptions & Allowances: Architecture, Tradeoffs, and New Product Patterns

Published artifact for the Superteam Canada bounty: "Publish Technical Deep Dive on Solana Subscriptions and Allowances Primitive".

## Executive summary

Solana's native Subscriptions & Allowances primitive turns recurring payments and delegated spending into a shared onchain capability instead of something every application has to rebuild with custodial billing, offchain cron jobs, or bespoke escrow programs. The core idea is simple: a wallet owner authorizes a delegate, a plan, or a recurring relationship under explicit limits; the delegate can then pull funds only within those limits until the authorization expires, resets, or is revoked.

That matters because many useful products are not one-time checkouts. SaaS billing, API credits, payroll, metered media, AI-agent budgets, and enterprise invoice collection all need a way to say: "this counterparty can spend up to this much, on this cadence, under these terms." On Solana, this can now be expressed as a standard primitive that runs on mainnet, supports SPL Token and Token-2022 assets, and can be integrated by wallets, merchants, infrastructure providers, and agents.

## The payment problem it solves

Traditional subscription billing has three recurring sources of friction:

1. **Custody and processor dependency** — Cards and centralized processors sit between the customer and the merchant. They provide good UX, but they also add chargeback rules, account risk, geographic limitations, and reconciliation work.
2. **Weak delegation semantics** — A user often has to hand over broad payment authority and trust a merchant not to overcharge, or manually approve every payment.
3. **Poor fit for autonomous software** — AI agents, CLIs, hosted jobs, and API clients need constrained budgets they can spend without interrupting the user for every request.

Subscriptions & Allowances make delegated spending explicit. Instead of "merchant stores a card and charges later," the wallet creates a bounded authorization that is visible, revocable, and enforceable by program logic.

## Mental model: three related patterns

The primitive supports three common patterns.

### 1. Fixed allowances

A fixed allowance is a capped delegation. The owner authorizes a delegate to draw up to a fixed amount, optionally before an expiration time. Once the cap is reached or the window closes, the delegate cannot keep pulling funds under that authorization.

This is the natural pattern for:

- AI agents with a daily or task-level budget.
- CLI tools that need to buy API calls while a job runs.
- Employee or contractor spend controls.
- One-off merchant authorizations where the final amount is not known upfront.

The important design point is that the delegate receives *bounded ability*, not ownership of the account.

### 2. Recurring delegations

A recurring delegation resets the spend cap on a cadence. For example, a user can authorize a delegate to pull up to 50 USDC every month, or an employer can authorize a recurring payroll amount every two weeks.

This is useful when the relationship is ongoing but should remain policy-constrained. The merchant or recipient can collect on schedule, while the payer retains a clear limit and a revocation path.

### 3. Subscription plans

Subscription plans move the relationship from a one-off authorization to a productized plan. A provider publishes a plan, users subscribe to it, and payments can be pulled automatically each cycle under the plan's terms.

This is the closest analogue to SaaS billing. A data provider, RPC provider, newsletter, or hosted agent platform can expose tiers and let users subscribe directly from a Solana wallet.

## Architecture at a practical level

A typical integration has five moving parts:

1. **The payer wallet** owns the funds and signs the initial authorization.
2. **The delegate or provider** is the account allowed to collect within the authorization rules.
3. **The subscription or allowance account** stores the terms: token mint, cap, cadence, expiration, delegate, recipient, and related state.
4. **The token account** holds the SPL Token or Token-2022 balance that payments are drawn from.
5. **The collecting transaction** is submitted later by the delegate/provider and succeeds only if the authorization state allows it.

The security boundary is the authorization state. The collector does not need the user's private key. It can only execute the allowed transfer path. If the cap, cadence, expiry, token, or recipient does not match the authorization, the program should reject the pull.

For developers, this means the application no longer has to invent its own subscription ledger. It can integrate the standard program, store product metadata offchain if needed, and use onchain state for the enforceable money movement.

## Why this is powerful for agentic commerce

The clearest new opportunity is agentic spending. AI agents and developer tools are increasingly able to discover services, call APIs, run jobs, and make decisions. The missing piece is safe payment delegation.

A user should not give an agent unlimited wallet access. But they may be comfortable with:

- "Spend up to 10 USDC today on model inference."
- "Pay this data API up to 2 USDC per 1,000 successful enrichments."
- "Renew my hosted workflow for up to 20 USDC per month."
- "Let this CLI pay for pay.sh services while this command runs, then expire the allowance."

Because the authorization is explicit and bounded, the agent can operate autonomously without becoming a custody risk.

## Relationship to pay.sh

pay.sh is especially interesting because it gives CLIs and agents a way to discover and pay for digital services per request. With Subscriptions & Allowances, pay.sh-style services can support both metered and recurring access:

- A provider can expose a recurring flat-fee plan for predictable usage.
- A developer can authorize a monthly allowance for usage-based API calls.
- An agent can operate within a task-specific cap and stop when the allowance is exhausted.

That makes stablecoin payments feel less like a checkout page and more like an API permission: scoped, budgeted, and revocable.

## Tradeoffs and design considerations

### User experience still needs wallet support

The primitive can enforce the rules, but users need wallet interfaces that explain the rules clearly. "Authorize delegate X to spend 50 USDC per month" must be as understandable as a card subscription screen. Poor allowance UX could recreate the same confusion that token approvals caused in earlier crypto apps.

### Revocation and notification are product requirements

A good integration should make it easy to list active subscriptions, warn before renewals, and revoke authorizations. The onchain primitive makes revocation possible; the product still has to surface it.

### Merchants need retry and dunning logic

If a recurring pull fails because the user has insufficient balance, the merchant still needs offchain business logic: retry schedule, grace period, plan downgrade, and customer messaging. The primitive handles authorization and transfer constraints; it does not replace the whole billing back office.

### Stablecoins reduce volatility but do not remove compliance questions

Most subscription use cases will prefer stablecoins. Even then, companies still need to consider receipts, taxes, refunds, customer support, and regional regulatory obligations.

### Social recovery and multisig flows matter

For teams and enterprises, subscriptions should work with multisigs and smart wallets, not just single-key wallets. Support for Squads and Swig-style flows is important because recurring business payments often belong to organizations.

## Canadian relevance: where this can matter first

### Shopify and Canadian commerce tooling

Shopify made subscriptions and app billing mainstream for merchants, but card rails remain expensive and geographically uneven. A Solana-native subscription layer could help cross-border merchants collect stablecoin recurring payments without waiting for regional card support, especially for digital goods, subscriptions, or B2B services.

### Cohere and AI API budgets

Cohere-style AI platforms are a natural fit for bounded allowances. A developer or agent could authorize a capped monthly spend for inference, embeddings, or retrieval tasks. That reduces billing surprise while keeping automated systems online.

### Canadian fintech and payroll platforms

Companies such as Wealthsimple, Koho, or employer-of-record/payroll providers could use recurring delegations for programmable stablecoin payroll, contractor payouts, or employee spend controls. The strongest fit is not replacing every bank payment immediately; it is giving crypto-native and cross-border users a transparent programmable option.

### Canadian developer infrastructure providers

Any Canadian RPC, indexing, analytics, hosting, or API company can package usage tiers as onchain subscription plans. Customers get wallet-native authorization; providers get automatic collection and less manual invoicing.

## Implementation checklist for builders

1. Use stablecoin-denominated plans unless the product specifically needs another asset.
2. Show the user the delegate, cap, cadence, token, recipient, and expiry before signing.
3. Build an "active authorizations" screen with revoke actions.
4. Treat failed pulls as a product state, not just a transaction error.
5. Keep merchant metadata offchain, but keep enforceable payment limits onchain.
6. Prefer short-lived allowances for agents and long-lived recurring delegations for subscriptions.
7. Add analytics for successful pulls, failed pulls, revocations, and exhausted allowances.

## What becomes possible

The primitive unlocks products that were awkward with one-time crypto payments:

- API subscriptions paid directly from wallets.
- AI agents with capped autonomous budgets.
- Onchain payroll and contractor retainers.
- Usage-based media and content micropayments.
- Enterprise stablecoin invoice collection.
- Wallet-native SaaS plans without a centralized card processor.

The bigger shift is that payment permission becomes programmable. A wallet can express intent in advance: how much, how often, to whom, in which token, and until when. That is a better foundation for autonomous software than unlimited approvals or repeated manual checkouts.

## Conclusion

Solana Subscriptions & Allowances are not just a billing feature. They are a standard language for constrained economic delegation. If wallets make the authorizations understandable and developers treat revocation, retries, and notifications as first-class UX, the primitive can support a new generation of SaaS, API, payroll, and agentic-commerce products.

For Canadian builders, the opportunity is practical: package recurring digital services, AI usage, commerce tools, and cross-border payments in a way that is wallet-native, stablecoin-friendly, and enforceable onchain.

## References

- Solana Foundation: "Solana Now Has Native Subscriptions & Allowances" — https://solana.com/news/subscriptions-and-allowances
- pay.sh — https://pay.sh
- Superteam Canada bounty brief — https://superteam.fun/listing/publish-technical-deep-dive-on-solana-subscriptions-and-allowances-primitive
