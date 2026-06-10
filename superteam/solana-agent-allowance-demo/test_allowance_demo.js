#!/usr/bin/env node
'use strict'

const assert = require('node:assert/strict')
const {
  AllowanceError,
  createAllowance,
  spendAllowance,
  createSubscription,
  collectSubscription,
  usdc,
  formatUsdc,
} = require('./allowance_demo')

function rejects(fn, message) {
  assert.throws(fn, AllowanceError)
  try {
    fn()
  } catch (err) {
    assert.equal(err.message, message)
  }
}

const allowance = createAllowance({
  payer: 'merchant-wallet.sol',
  authorizedSpender: 'ai-support-agent.sol',
  recipient: 'canadian-ai-api.sol',
  maxAmount: usdc(10),
  currentSlot: 50,
  expiresInSlots: 100,
})

const firstSpend = spendAllowance({
  allowance,
  spender: 'ai-support-agent.sol',
  recipient: 'canadian-ai-api.sol',
  amount: usdc(2.5),
  currentSlot: 55,
  memo: 'ticket translation',
})
assert.equal(firstSpend.amount, 250)
assert.equal(allowance.remainingAmount, usdc(7.5))
assert.equal(allowance.ledger.length, 1)

rejects(
  () => spendAllowance({ allowance, spender: 'unknown-agent.sol', recipient: 'canadian-ai-api.sol', amount: usdc(1), currentSlot: 56, memo: 'bad spender' }),
  'unauthorized spender',
)
rejects(
  () => spendAllowance({ allowance, spender: 'ai-support-agent.sol', recipient: 'wrong-recipient.sol', amount: usdc(1), currentSlot: 56, memo: 'bad recipient' }),
  'wrong recipient',
)
rejects(
  () => spendAllowance({ allowance, spender: 'ai-support-agent.sol', recipient: 'canadian-ai-api.sol', amount: usdc(8), currentSlot: 56, memo: 'too much' }),
  'allowance exceeded',
)
rejects(
  () => spendAllowance({ allowance, spender: 'ai-support-agent.sol', recipient: 'canadian-ai-api.sol', amount: usdc(1), currentSlot: 151, memo: 'expired' }),
  'allowance expired',
)

const subscription = createSubscription({
  payer: 'merchant-wallet.sol',
  merchant: 'support-saas.sol',
  amountPerPeriod: usdc(12),
  startSlot: 100,
  billingIntervalSlots: 10,
  maxPeriods: 2,
})

rejects(
  () => collectSubscription({ subscription, collector: 'support-saas.sol', currentSlot: 99, memo: 'too early' }),
  'subscription not due yet',
)
const firstCollection = collectSubscription({ subscription, collector: 'support-saas.sol', currentSlot: 100, memo: 'month one' })
assert.equal(firstCollection.amount, usdc(12))
assert.equal(subscription.nextCollectionSlot, 110)
assert.equal(subscription.remainingPeriods, 1)
rejects(
  () => collectSubscription({ subscription, collector: 'wrong-merchant.sol', currentSlot: 110, memo: 'wrong merchant' }),
  'unauthorized collector',
)
collectSubscription({ subscription, collector: 'support-saas.sol', currentSlot: 110, memo: 'month two' })
rejects(
  () => collectSubscription({ subscription, collector: 'support-saas.sol', currentSlot: 120, memo: 'extra' }),
  'subscription complete',
)

assert.equal(formatUsdc(usdc(3.25)), '3.25 USDC')
assert.equal(formatUsdc(usdc(12)), '12 USDC')
console.log('all allowance demo tests passed')
