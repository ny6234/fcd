import 'koa-body'
import { KoaController, Validate, Get, Controller, Validator } from 'koa-joi-controllers'
import { success } from 'lib/response'
import { ErrorCodes } from 'lib/error'
import { getPrice, getSwapRate } from 'service/market'
import { TimeIntervals } from 'lib/common'
import config from 'config'

const Joi = Validator.Joi

@Controller('/market')
export default class TxController extends KoaController {
  /**
   * @api {get} /market/price Get price history
   * @apiName getMarketPrice
   * @apiGroup Market
   *
   * @apiParam {string} denom Coin denomination
   * @apiParam {string} interval Price interval
   * @apiParam {number} [count=50]
   *
   * @apiSuccess {number} lastPrice
   * @apiSuccess {string} oneDayVariation
   * @apiSuccess {string} oneDayVariationRate
   * @apiSuccess {Object[]} prices Price history
   * @apiSuccess {string} prices.denom Coin denomination
   * @apiSuccess {number} prices.datetime
   * @apiSuccess {number} prices.price
   */
  @Get('/price')
  @Validate({
    query: {
      interval: Joi.string().required().valid(Object.values(TimeIntervals)).description('Time interval'),
      denom: Joi.string().required().valid(config.ACTIVE_DENOMS).description('Denoms string'),
      count: Joi.string().required().default(50).min(0).description('Price data points count')
    },
    failure: ErrorCodes.INVALID_REQUEST_ERROR
  })
  async getDenomPrice(ctx) {
    const { interval, denom } = ctx.request.query
    const count = +ctx.request.query.count || 50
    success(ctx, await getPrice({ denom, interval, count }))
  }

  /**
   * @api {get} /market/swaprate/:denom Get current swaprate
   * @apiName getSwapRate
   * @apiGroup Market
   *
   * @apiParam {string} denom Coin denomination
   *
   * @apiSuccess {Object[]} -
   * @apiSuccess {string} -.denom Coin denomination
   * @apiSuccess {string} -.swaprate Current swap rate
   * @apiSuccess {string} -.oneDayVariation
   * @apiSuccess {string} -.oneDayVariationRate
   */
  @Get('/swaprate/:base')
  @Validate({
    params: {
      base: Joi.string().required().valid(config.ACTIVE_DENOMS).description('Base denoms of swap')
    },
    failure: ErrorCodes.INVALID_REQUEST_ERROR
  })
  async getDenomSwapRate(ctx) {
    const { base } = ctx.params
    success(ctx, await getSwapRate(base))
  }
}
