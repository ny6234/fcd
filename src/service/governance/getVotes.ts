import * as lcd from 'lib/lcd'
import { errorReport } from 'lib/errorReporting'
import { chain, flatten, get, compact, reverse, filter } from 'lodash'
import { getAccountInfo } from './helper'

export enum VoteTypes {
  YES = 'Yes',
  NO = 'No',
  NO_WITH_VETO = 'NoWithVeto',
  ABSTAIN = 'Abstain'
}

interface GetProposalVotesInput {
  proposalId: string
  page: number
  limit: number
  option?: voteOption
}

interface Vote {
  txhash: string
  answer: string
  voter: {
    accountAddress: string
    operatorAddress?: string
    moniker?: string
  }
}

interface GetProposalVotesReturn {
  totalCnt: number
  page: number
  limit: number
  votes: Vote[]
}

async function getVoteFromTx(tx) {
  const msgs = get(tx, 'tx.value.msg')
  const mapMsgToVote = async (msg): Promise<Vote | undefined> => {
    let answer: string | undefined
    let voter: string | undefined

    if (msg.type === 'gov/MsgVote') {
      answer = get(msg, 'value.option')
      voter = get(msg, 'value.voter')
    }

    if (!answer || !voter) {
      return
    }

    return {
      txhash: tx.txhash,
      answer,
      voter: await getAccountInfo(voter)
    }
  }
  return compact(await Promise.all(msgs.map(mapMsgToVote)))
}

function getUniqueVote(txs, option?: string) {
  const uniqueTxs: any[] = []
  reverse(txs).forEach((tx) => {
    if (filter(uniqueTxs, { voter: tx.voter }).length === 0) {
      uniqueTxs.push(tx)
    }
  })

  if (option) {
    return filter(uniqueTxs, { answer: option })
  }

  return uniqueTxs
}

export default async function getProposalVotes(
  input: GetProposalVotesInput
): Promise<GetProposalVotesReturn | undefined> {
  const { proposalId, page, limit, option } = input
  const votes = await lcd.getProposalVoteTxs(proposalId).catch((e) => {
    errorReport(e)
  })

  if (!votes || !votes['txs']) {
    return {
      totalCnt: 0,
      page,
      limit,
      votes: []
    }
  }

  const voteTxs = flatten(await Promise.all(votes.txs.map(getVoteFromTx)))
  const uniqueVoteTxs = getUniqueVote(voteTxs, option)

  return {
    totalCnt: Number(uniqueVoteTxs.length),
    page,
    limit,
    votes: chain(uniqueVoteTxs)
      .drop((page - 1) * limit)
      .take(limit)
      .value()
  }
}
