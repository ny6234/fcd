import { KoaController, Validate, Get, Controller, Validator } from 'koa-joi-controllers'
import { success } from 'lib/response'
import { ErrorCodes } from 'lib/error'
import { getTaxProceeds, getTotalSupply, getRichList, getCirculatingSupply } from 'service/treasury'
import config from 'config'

const Joi = Validator.Joi

@Controller('')
export default class TreasuryController extends KoaController {
  /**
   * @api {get} /taxproceeds Get taxproceeds
   * @apiName getTaxProceeds
   * @apiGroup Treasury
   *
   * @apiSuccess {number} total Current tax proceeds
   * @apiSuccess {Object[]} taxProceeds tax by denoms
   * @apiSuccess {string} taxProceeds.denom denom name
   * @apiSuccess {string} taxProceeds.amount amount by denom
   * @apiSuccess {string} taxProceeds.adjustedAmount amount by adjusted with luna
   */
  @Get('/taxproceeds')
  async getTaxProceeds(ctx) {
    success(ctx, await getTaxProceeds())
  }

  /**
   * @api {get} /totalsupply/:denom Get total supply of coins
   * @apiName getTotalSupply
   * @apiGroup Treasury
   *
   * @apiParam {string} denom Coin denomination
   *
   * @apiSuccess {string} - total supply of denom
   */
  @Get('/totalsupply/:denom')
  @Validate({
    params: {
      denom: Joi.string().required().valid(config.ACTIVE_DENOMS).description('Denom name')
    },
    failure: ErrorCodes.INVALID_REQUEST_ERROR
  })
  async getTotalSupply(ctx) {
    const { denom } = ctx.params
    success(ctx, await getTotalSupply(denom))
  }
  /**
   * @api {get} /richlist/:denom Get richlist of coins
   * @apiName getRichlist
   * @apiGroup Treasury
   *
   * @apiParam {string} denom Coin denomination
   *
   * @apiSuccess {Object[]}  -       List of accounts
   * @apiSuccess {Number}    -.account
   * @apiSuccess {String}    -.amount
   * @apiSuccess {String}    -.percentage
   */
  @Get('/richlist/:denom')
  @Validate({
    params: {
      denom: Joi.string().required().valid(config.ACTIVE_DENOMS).description('Denom name')
    },
    failure: ErrorCodes.INVALID_REQUEST_ERROR
  })
  async getRichList(ctx) {
    const { denom } = ctx.params
    success(ctx, await getRichList(denom))
  }

  /**
   * @api {get} /circulatingsupply/:denom Get circulating supply of coins
   * @apiName getCirculatingSupply
   * @apiGroup Treasury
   *
   * @apiParam {string} denom Coin denomination
   *
   * @apiSuccess {number}  - Circulating supply of coin.
   */
  @Get('/circulatingsupply/:denom')
  @Validate({
    params: {
      denom: Joi.string().required().valid(config.ACTIVE_DENOMS).description('Denom name')
    },
    failure: ErrorCodes.INVALID_REQUEST_ERROR
  })
  async getCirculatingSupply(ctx) {
    const { denom } = ctx.params
    success(ctx, await getCirculatingSupply(denom))
  }
}
