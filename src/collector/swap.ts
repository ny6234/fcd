import { get, mergeWith, merge, compact, filter } from 'lodash'
import { TxEntity, SwapEntity } from 'orm'
import { getRepository, EntityManager } from 'typeorm'
import * as lcd from 'lib/lcd'
import { collectorLogger as logger } from 'lib/logger'
import { isNumeric, splitDenomAndAmount } from 'lib/common'
import { div, plus, minus, times } from 'lib/math'
import { getUSDValue, addDatetimeFilterToQuery, isSuccessfulMsg, bulkSave, getAllActivePrices } from './helper'

async function getSpread(denom: string, price: string) {
  const swapRequestParams = {
    offer_coin: '1000000uluna',
    ask_denom: denom
  }

  if (!denom) {
    return
  }

  const swapResult = await lcd.getSwapResult(swapRequestParams)

  return (
    get(swapResult, 'amount') && {
      denom,
      spread: div(minus(times(price, '1000000'), get(swapResult, 'amount')), times(price, '1000000'))
    }
  )
}

async function getSwapSpread(prices) {
  const spreads = await Promise.all(
    Object.keys(prices).map((denom) => {
      return getSpread(denom, prices[denom])
    })
  )
  return compact(spreads).reduce((acc, curr) => {
    return { ...acc, [curr.denom]: curr.spread }
  }, {})
}

const getSwapCoinFromLog = (log) => {
  if (!log) {
    return {}
  }

  const { events } = log

  if (!events) {
    return {}
  }

  const swapEvent = filter(events, { type: 'swap' })[0]

  if (!swapEvent || !swapEvent.attributes) {
    return {}
  }

  const swapCoin = filter(swapEvent.attributes, { key: 'swap_coin' })[0]
  const swapFee = filter(swapEvent.attributes, { key: 'swap_fee' })[0]

  if (!swapCoin || !swapFee) {
    return {}
  }

  return {
    swapCoin: splitDenomAndAmount(swapCoin.value),
    swapFee: splitDenomAndAmount(swapFee.value)
  }
}

function getSwapValues(tx) {
  const logs = get(tx, 'data.logs')
  const msgs = get(tx, 'data.tx.value.msg')

  return msgs && logs
    ? msgs.reduce(
        (acc, msg, i) => {
          const offerCoin = get(msg, 'value.offer_coin')
          if (!logs[i] || !isSuccessfulMsg(logs[i]) || !offerCoin) {
            return acc
          }

          // SWAP IN
          acc.in[offerCoin.denom] = acc.in[offerCoin.denom]
            ? plus(acc.in[offerCoin.denom], offerCoin.amount)
            : offerCoin.amount

          // SWAP OUT
          const { swapCoin, swapFee } = getSwapCoinFromLog(logs[i])
          if (swapCoin) {
            const { amount, denom } = swapCoin
            if (isNumeric(amount)) {
              acc.out[denom] = acc.out[denom] ? plus(acc.out[denom], amount) : amount
            }
          }

          // SWAP FEE
          if (swapFee) {
            const { amount, denom } = swapFee
            if (isNumeric(amount)) {
              acc.fee[denom] = acc.fee[denom] ? plus(acc.fee[denom], amount) : amount
            }
          }

          return acc
        },
        { in: {}, out: {}, fee: {} }
      )
    : {}
}

function getAllUSDValue(swapValues, prices) {
  // SWAP IN
  const ins = Object.keys(swapValues.in).reduce((acc, denom) => {
    acc[denom] = {
      in: swapValues.in[denom],
      inUsd: getUSDValue(denom, swapValues.in[denom], prices)
    }
    return acc
  }, {})

  // SWAP OUT
  const insAndOuts = Object.keys(swapValues.out).reduce((acc, denom) => {
    const out = {
      [denom]: {
        out: swapValues.out[denom],
        outUsd: getUSDValue(denom, swapValues.out[denom], prices)
      }
    }
    return merge(acc, out)
  }, ins)

  // SWAP FEE
  const insAndOutsAndFees = Object.keys(swapValues.fee).reduce((acc, denom) => {
    const fee = {
      [denom]: {
        fee: swapValues.fee[denom],
        feeUsd: getUSDValue(denom, swapValues.fee[denom], prices)
      }
    }
    return merge(acc, fee)
  }, insAndOuts)

  return insAndOutsAndFees
}

async function setSwapFromTx(now: number): Promise<SwapEntity[]> {
  const qb = getRepository(TxEntity).createQueryBuilder('tx').select(`tx.data`)
  qb.andWhere(`data->'tx'->'value'->'msg'@>'[{ "type": "market/MsgSwap"}]'`)
  addDatetimeFilterToQuery(now, qb)

  const txs = await qb.getMany()

  const rewardMerger = (obj, src) => {
    return mergeWith(obj, src, (o, s) => {
      return plus(o, s)
    })
  }

  const swapValues = txs.reduce((acc, tx) => mergeWith(acc, getSwapValues(tx), rewardMerger), {
    in: {},
    out: {},
    fee: {}
  })

  const allActivePrices = await getAllActivePrices(now - (now % 60000) - 60000)
  const swapValuesWithUSDValues = getAllUSDValue(swapValues, allActivePrices)
  const swapSpread = await getSwapSpread(allActivePrices)

  const issuances = await lcd.getAllActiveIssuance()
  const docs = Object.keys(issuances).map((denom) => {
    const swap = new SwapEntity()
    swap.denom = denom
    swap.datetime = new Date(now - (now % 60000) - 60000)
    swap.spread = swapSpread[denom]

    if (!swapValuesWithUSDValues[denom]) {
      return swap
    }

    swap.in = swapValuesWithUSDValues[denom].in
    swap.inUsd = swapValuesWithUSDValues[denom].inUsd
    swap.out = swapValuesWithUSDValues[denom].out
    swap.outUsd = swapValuesWithUSDValues[denom].outUsd
    swap.fee = swapValuesWithUSDValues[denom].fee
    swap.feeUsd = swapValuesWithUSDValues[denom].feeUsd
    return swap
  })

  return docs
}

export async function setSwap(transactionalEntityManager: EntityManager, timestamp: number) {
  const swaps = await setSwapFromTx(timestamp)
  await transactionalEntityManager.save(swaps)
  logger.info(`Save swap - success.`)
}
