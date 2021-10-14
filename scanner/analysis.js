require('../core')

class TEMP {
    constructor(chain, mongomodel, web3) {
        this.chain = chain
        this.mongoModel = mongomodel
        this.web3 = web3;
    }

    /**
     * need child override
     * @param address
     * @returns {Promise<null|any>}
     */
    async getContractABI(address) {
        try {
            let abi = await REDIS.BEEPAY.getAsync(CONFIG.redisKeys.CONTRACT_ABI + address.toLowerCase())
            if (abi) return JSON.parse(abi)
        } catch (e) {
        }
        return null
    }

    /**
     * need child override
     * @param hash
     * @param block
     * @param step
     */
    handleHash(hash, block, step = '1/1') {

    }

    /**
     * need child override
     * @param transactions
     * @param logs
     * @param timestamp
     * @returns {Promise<void>}
     */
    async handleLogs(transactions, logs, timestamp) {

    }

    async handleTransactions(transactions, timestamp) {
        for (let tran of transactions) {
            if (tran.input === '0x') {
                tran.timestamp = timestamp
                let hasFrom = 0;
                hasFrom = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, tran.from.toLowerCase())
                if (hasFrom) {
                    this.removeCacheTransaction(tran.hash, tran.from)
                }
                let hasTo = 0;
                hasTo = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, tran.to.toLowerCase())
                if (hasFrom === 0 && hasTo === 0) {
                    continue;
                }
                let receipt = await this.web3.eth.getTransactionReceipt(tran.hash);
                tran.gas = receipt.gasUsed
                this.saveTransactionNew(tran.hash, [tran])
            }
        }
    }

    async saveTransactionNew(hash, transactions, step) {
        for (let data of transactions) {
            // console.log(`${this.chain} SaveTransaction`, data);
            const BLOCK_MODEL = MONGO.BEEPAY.model(this.mongoModel);
            BLOCK_MODEL.findOne({
                'hash': hash,
                from: data.from,
                to: data.to,
                contract: data.contract,
                value: data.value
            }, (err, trans) => {
                if (err) {
                    return
                }
                data.status = data.transactionIndex == null ? "pending" : "success";
                if (trans) {
                    BLOCK_MODEL.updateOne({"_id": trans._id}, data, (err) => {
                        if (err) {
                            console.log(`update failed [${this.chain}] [${data.blockNumber}] [HASH ${hash}]`, err);
                        } else {
                            console.log(`update success [${this.chain}] [${data.blockNumber}] [${data.from}] [HASH ${hash}]`);
                        }
                    });

                } else {
                    new BLOCK_MODEL(data).save((err) => {
                        if (err) {
                            console.log(`insert failed [${this.chain}] [${data.blockNumber}] [HASH ${hash}]`, err);
                        } else {
                            console.log(`insert success [${this.chain}] [${data.blockNumber}] [${data.from}] [HASH ${hash}]`);
                        }
                    })
                }
            });
        }
    }

    async removeCacheTransaction(hash, address) {
        let cacheTransactions = await REDIS.BEEPAY.lrangeAsync(`${CONFIG.redisKeys.CACHE_TRADE}:${this.chain}:${address.toLowerCase()}`, 0, -1);
        if (cacheTransactions && cacheTransactions.length > 0) {
            for (var i = 0; i < cacheTransactions.length; i++) {
                var item = JSON.parse(cacheTransactions[i]);
                if (hash === item.hash) {//
                    REDIS.BEEPAY.lrem(`${CONFIG.redisKeys.CACHE_TRADE}:${this.chain}:${item.from.toLowerCase()}`, 0, cacheTransactions[i]);
                    return true
                }
            }
        }
        return false;
    }

}

module.exports = TEMP
