import { init as initORM, TxEntity, BlockEntity } from 'orm'
import { getRepository, IsNull } from 'typeorm'

async function setBlockId(tx, height) {
  const block = await getRepository(BlockEntity).findOne({
    where: {
      height
    }
  })
  tx.block = block
  await getRepository(TxEntity).save(tx)
  console.log(`Save block id to tx-${tx.id}`)
}

async function insertBlockId() {
  const txs = await getRepository(TxEntity).find({
    where: {
      block: IsNull()
    },
    order: {
      id: 'ASC'
    },
    take: 1000
  })
  await Promise.all(txs.map((tx) => setBlockId(tx, tx.data['height'])))
}

async function start() {
  await initORM()

  for (let i = 0; i < 13000; i += 1) {
    await insertBlockId()
  }
}

start().catch(console.error)
