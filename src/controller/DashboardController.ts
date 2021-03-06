import 'koa-body'
import { KoaController, Validate, Get, Controller, Validator } from 'koa-joi-controllers'
import { success } from 'lib/response'
import {
  getGeneralInfo,
  getTransactionVol,
  getBlockRewards,
  getSeigniorageProceeds,
  getStakingReturn,
  getAccountGrowth
} from 'service/dashboard'

const Joi = Validator.Joi

@Controller('/dashboard')
export default class TxController extends KoaController {
  /**
   * @api {get} /dashboard Get information to be used on the dashboard
   * @apiName getDashboard
   * @apiGroup Dashboard
   *
   * @apiSuccess {Object} price Current oracle price
   * @apiSuccess {string} price.ukrw ukrw amount
   * @apiSuccess {string} price.uluna uluna amount
   * @apiSuccess {string} price.umnt umnt amount
   * @apiSuccess {string} price.usdr usdr amount
   * @apiSuccess {string} price.uusd uusd amount
   * @apiSuccess {String} taxRate Current tax rate
   * @apiSuccess {Object} taxCaps Current tax cap
   * @apiSuccess {Object} issuances Total issuances of coins
   * @apiSuccess {string} issuances.ukrw ukrw amount
   * @apiSuccess {string} issuances.uluna uluna amount
   * @apiSuccess {string} issuances.umnt umnt amount
   * @apiSuccess {string} issuances.usdr usdr amount
   * @apiSuccess {string} issuances.uusd uusd amount
   * @apiSuccess {Object} stakingPool Current state of the staking pool
   * @apiSuccess {Object} stakingPool Current state of the staking pool
   * @apiSuccess {Object} communityPool Current state of the community pool
   * @apiSuccess {string} communityPool.ukrw ukrw amount
   * @apiSuccess {string} communityPool.uluna uluna amount
   * @apiSuccess {string} communityPool.umnt umnt amount
   * @apiSuccess {string} communityPool.usdr usdr amount
   * @apiSuccess {string} communityPool.uusd uusd amount
   */
  @Get('/')
  async getDashboard(ctx): Promise<void> {
    success(ctx, await getGeneralInfo())
  }

  /**
   * @api {get} /dashboard/tx_volume Get tx volume history
   * @apiName getTxVolume
   * @apiGroup Dashboard
   *
   * @apiParam {number} count number of previous days history from today
   *
   * @apiSuccess {Object[]} cumulative
   * @apiSuccess {string} cumulative.denom denom name
   * @apiSuccess {Object[]} cumulative.data.data history data
   * @apiSuccess {number} cumulative.data.datetime unix time
   * @apiSuccess {string} cumulative.data.txVolume time wise cumulative tx volume
   *
   * @apiSuccess {Object[]} periodic
   * @apiSuccess {string} periodic.denom denom name
   * @apiSuccess {array} periodic.data
   * @apiSuccess {number} periodic.data.datetime unix time
   * @apiSuccess {string} periodic.data.txVolume periodic tx volume
   */
  @Get('/tx_volume')
  @Validate({
    query: {
      count: Joi.number().min(0).default(0).description('Number days history')
    }
  })
  async getTxVolume(ctx): Promise<void> {
    const count = +ctx.request.query.count
    success(ctx, await getTransactionVol(count))
  }

  /**
   * @api {get} /dashboard/block_rewards Get block reward history
   * @apiName getBlockReward
   * @apiGroup Dashboard
   *
   * @apiParam {number} count number of previous days history from today
   *
   * @apiSuccess {Object[]} cumulative cumulative history
   * @apiSuccess {Number} cumulative.datetime unix timestamp
   * @apiSuccess {Number} cumulative.blockReward cumulative reward
   *
   * @apiSuccess {Object[]} periodic periodic hostory
   * @apiSuccess {Number} periodic.datetime unix timestamp
   * @apiSuccess {Number} periodic.blockReward periodic reward on that timestamp
   */
  @Get('/block_rewards')
  @Validate({
    query: {
      count: Joi.number().min(0).default(0).description('Number days history')
    }
  })
  async getBlockRewards(ctx): Promise<void> {
    const count = +ctx.request.query.count

    success(
      ctx,
      await getBlockRewards({
        count
      })
    )
  }
  /**
   * @api {get} /dashboard/seigniorage_proceeds Get the amount of seigniorage in the start of the day
   * @apiName getSeigniorageProc
   * @apiGroup Dashboard
   *
   * @apiParam {number} count number of previous days from today
   *
   * @apiSuccess {Object[]} _
   * @apiSuccess {Number} _.datetime unix time of history data
   * @apiSuccess {String} _.seigniorageProceeds amount of seigniorage on datetime
   */
  @Get('/seigniorage_proceeds')
  @Validate({
    query: {
      count: Joi.number().min(1).default(1).description('Number days history')
    }
  })
  async getSeigniorageProc(ctx): Promise<void> {
    const count = +ctx.request.query.count

    success(
      ctx,
      await getSeigniorageProceeds({
        count
      })
    )
  }

  /**
   * @api {get} /dashboard/staking_return Get staking return history
   * @apiName getStakingReturn
   * @apiGroup Dashboard
   *
   * @apiParam {number} count number of previous days history from today
   *
   * @apiSuccess {Object[]} - return history
   * @apiSuccess {Number} -.datetime unix timestamp
   * @apiSuccess {Number} -.dailyReturn daily return
   * @apiSuccess {Number} -.annualizedReturn annualize return
   *
   */
  @Get('/staking_return')
  @Validate({
    query: {
      count: Joi.number().min(1).default(1).description('Number days history')
    }
  })
  async getStakingReturn(ctx): Promise<void> {
    const count = +ctx.request.query.count

    success(
      ctx,
      await getStakingReturn({
        count
      })
    )
  }

  /**
   * @api {get} /dashboard/account_growth Get account growth history
   * @apiName getAccountGrowth
   * @apiGroup Dashboard
   *
   * @apiParam {number} count number of previous days history from today
   *
   * @apiSuccess {Object[]} cumulative cumulative history data
   * @apiSuccess {Number} cumulative.datetime unix timestamp
   * @apiSuccess {Number} cumulative.totalAccount total account
   * @apiSuccess {Number} cumulative.activeAccount active account count
   *
   * @apiSuccess {Object[]} periodic periodic history
   * @apiSuccess {Number} periodic.datetime unix timestamp
   * @apiSuccess {Number} periodic.totalAccount total account on datetime
   * @apiSuccess {Number} periodic.activeAccount active account on datetime
   */
  @Get('/account_growth')
  @Validate({
    query: {
      count: Joi.number().min(1).default(1).description('Number days history')
    }
  })
  async getAccountGrth(ctx): Promise<void> {
    const count = +ctx.request.query.count

    success(
      ctx,
      await getAccountGrowth({
        count
      })
    )
  }
}
