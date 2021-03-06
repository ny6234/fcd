import { startOfDay, format, getTime } from 'date-fns'
import { div, plus, times } from 'lib/math'
import { dashboardRawQuery, getPriceHistory } from './helper'

export interface GetTaxParam {
  count?: number
}

export default async function getBlockRewards(option: GetTaxParam): Promise<BlockRewardsReturn> {
  const { count } = option
  const today = startOfDay(new Date())

  const sumRewardsQuery = `select date(datetime) as datetime,\
  denom, sum(tax) as sum_reward from reward\
  where datetime < '${format(today, 'YYYY-MM-DD HH:mm:ss')}'
  group by 1, 2 order by 1`

  const rewards = await dashboardRawQuery(sumRewardsQuery)

  const priceObj = await getPriceHistory()
  const getPriceObjKey = (date: Date, denom: string) => `${format(date, 'YYYY-MM-DD')}${denom}`

  const rewardObj = rewards.reduce((acc, item) => {
    if (!priceObj[getPriceObjKey(item.datetime, item.denom)] && item.denom !== 'uluna' && item.denom !== 'ukrw') {
      return acc
    }

    // krw의 경우는 그냥 저장
    // luna의 경우는 luna/krt의 가격으로 곱해서 krt 밸류로 환산 후 저장
    // 그외의 경우는 luna/krt의 가격으로 곱한 후 luna/{denom}의 가격으로 나눠서 krt 밸류로 환산 후 저장
    const reward =
      item.denom === 'ukrw'
        ? item.sum_reward
        : item.denom === 'luna'
        ? times(item.sum_reward, priceObj[getPriceObjKey(item.datetime, 'ukrw')])
        : div(
            times(item.sum_reward, priceObj[getPriceObjKey(item.datetime, 'ukrw')]),
            priceObj[getPriceObjKey(item.datetime, item.denom)]
          )

    if (acc[item.datetime]) {
      acc[item.datetime] = plus(acc[item.datetime], reward)
    } else {
      acc[item.datetime] = reward
    }
    return acc
  }, {})

  const rewardArr = Object.keys(rewardObj).map((key) => {
    return {
      datetime: getTime(new Date(key)),
      blockReward: rewardObj[key]
    }
  })

  let cum = '0'
  const sliceCnt = count ? -count : 0
  const cumArray: BlockRewardSumInfo[] = Object.keys(rewardObj)
    .reduce((acc: BlockRewardSumInfo[], key) => {
      cum = plus(cum, rewardObj[key])
      acc.push({
        datetime: getTime(new Date(key)),
        blockReward: cum
      })
      return acc
    }, [])
    .slice(sliceCnt)

  return {
    periodic: rewardArr.slice(sliceCnt),
    cumulative: cumArray
  }
}
