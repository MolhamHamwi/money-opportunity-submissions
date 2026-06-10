#!/usr/bin/env node
'use strict'

class AllowanceError extends Error {}

function usdc(amount) {
  return Math.round(Number(amount) * 100)
}

function formatUsdc(cents) {
  return `${(cents / 100).toFixed(2).replace(/\.00$/, '')} USDC`
}

function createAllowance({ payer, authorizedSpender, recipient, maxAmount, currentSlot, expiresInSlots }) {
  if (!payer || !authorizedSpender || !recipient) throw new AllowanceError('missing account')
  if (maxAmount <= 0) throw new AllowanceError('max amount must be positive')
  return {
    payer,
    authorizedSpender,
    recipient,
    maxAmount,
    remainingAmount: maxAmount,
    createdAtSlot: currentSlot,
    expiresAtSlot: currentSlot + expiresInSlots,
    ledger: [],
  }
}

function spendAllowance({ allowance, spender, recipient, amount, currentSlot, memo }) {
  assertActive(allowance, currentSlot)
  if (spender !== allowance.authorizedSpender) throw new AllowanceError('unauthorized spender')
  if (recipient !== allowance.recipient) throw new AllowanceError('wrong recipient')
  if (amount <= 0) throw new AllowanceError('amount must be positive')
  if (amount > allowance.remainingAmount) throw new AllowanceError('allowance exceeded')

  allowance.remainingAmount -= amount
  allowance.ledger.push({
    type: 'allowance_spend',
    slot: currentSlot,
    spender,
    recipient,
    amount,
    memo,
  })
  return allowance.ledger.at(-1)
}

function createSubscription({ payer, merchant, amountPerPeriod, startSlot, billingIntervalSlots, maxPeriods }) {
  if (amountPerPeriod <= 0) throw new AllowanceError('subscription amount must be positive')
  return {
    payer,
    merchant,
    amountPerPeriod,
    billingIntervalSlots,
    nextCollectionSlot: startSlot,
    remainingPeriods: maxPeriods,
    ledger: [],
  }
}

function collectSubscription({ subscription, collector, currentSlot, memo }) {
  if (collector !== subscription.merchant) throw new AllowanceError('unauthorized collector')
  if (subscription.remainingPeriods <= 0) throw new AllowanceError('subscription complete')
  if (currentSlot < subscription.nextCollectionSlot) throw new AllowanceError('subscription not due yet')

  const entry = {
    type: 'subscription_collection',
    slot: currentSlot,
    collector,
    amount: subscription.amountPerPeriod,
    memo,
  }
  subscription.ledger.push(entry)
  subscription.remainingPeriods -= 1
  subscription.nextCollectionSlot += subscription.billingIntervalSlots
  return entry
}

function assertActive(allowance, currentSlot) {
  if (currentSlot > allowance.expiresAtSlot) throw new AllowanceError('allowance expired')
}

function runDemo() {
  const payer = 'merchant-wallet.sol'
  const agent = 'ai-support-agent.sol'
  const apiProvider = 'canadian-ai-api.sol'
  const merchant = 'support-saas.sol'

  const allowance = createAllowance({
    payer,
    authorizedSpender: agent,
    recipient: apiProvider,
    maxAmount: usdc(25),
    currentSlot: 1000,
    expiresInSlots: 100_000,
  })

  const subscription = createSubscription({
    payer,
    merchant,
    amountPerPeriod: usdc(12),
    startSlot: 1200,
    billingIntervalSlots: 432_000,
    maxPeriods: 3,
  })

  const spend = spendAllowance({
    allowance,
    spender: agent,
    recipient: apiProvider,
    amount: usdc(3.25),
    currentSlot: 1010,
    memo: 'search-and-summary-api',
  })
  console.log(`accepted agent spend: ${formatUsdc(spend.amount)} for ${spend.memo}`)

  const collection = collectSubscription({
    subscription,
    collector: merchant,
    currentSlot: 1200,
    memo: 'pro-support-plan',
  })
  console.log(`accepted subscription collection: ${formatUsdc(collection.amount)} for ${collection.memo}`)

  try {
    spendAllowance({ allowance, spender: agent, recipient: apiProvider, amount: usdc(30), currentSlot: 1020, memo: 'oversized batch' })
  } catch (err) {
    console.log(`rejected overspend: ${err.message}`)
  }

  try {
    collectSubscription({ subscription, collector: merchant, currentSlot: 1300, memo: 'too-early-renewal' })
  } catch (err) {
    console.log(`rejected early subscription: ${err.message}`)
  }

  console.log(`remaining allowance: ${formatUsdc(allowance.remainingAmount)}`)
  console.log(`ledger entries: ${allowance.ledger.length + subscription.ledger.length}`)
}

module.exports = {
  AllowanceError,
  createAllowance,
  spendAllowance,
  createSubscription,
  collectSubscription,
  usdc,
  formatUsdc,
}

if (require.main === module) runDemo()
