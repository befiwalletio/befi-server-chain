const ANALYSIS = require('../analysis');
const Web3 = require('web3');
const AbiDecoder = require('abi-decoder');

require('require-all')({
    dirname: __dirname + '/../../abi/',
    filter: /^((?!token.json)).*$/,
    resolve: (obj) => {
        AbiDecoder.addABI(obj);
        return obj
    }
});

class TEMP extends ANALYSIS{

    constructor() {
        super('BNB', 'BLOCK_BNB',new Web3(new Web3.providers.HttpProvider(CONFIG.provider.bsc.host)));
    }

    async getContractABI(address) {
        let abi = await super.getContractABI(address);
        if (abi){
            return abi;
        }
        try {
            let ango = new Ango({host: CONFIG.scans.bscApi})
            let result = await ango.get('/api', {
                module: "contract",
                action: "getabi",
                address: address,
                apikey: CONFIG.scans.bscApiKey
            })
            // console.log(`result`, result)
            if (result && result.message !== 'NOTOK' && result.result) {
                REDIS.BEEPAY.set(CONFIG.redisKeys.CONTRACT_ABI + address.toLowerCase(), result.result)
                if ((typeof result.result) == 'string') return JSON.parse(result.result)
                return result.result
            }
        } catch (e) {
            console.log(e);
        }
        return null
    }

    handleHash(hash, block, step = '1/1') {
        console.log(`${this.chain} handleHash [HASH:${hash}]`)
        let weth = CONFIG.provider.bsc.weth;
        try {
            this.web3.eth.getTransaction(hash).then(async (transaction) => {
                if (!transaction) {
                    return;
                }
                transaction.step = step;
                try {
                    let receipt = await this.web3.eth.getTransactionReceipt(hash);
                    transaction.gas = receipt.gasUsed;
                    this.removeCacheTransaction(hash, transaction.from)

                    if (!block) {
                        try {
                            let blockhash = transaction.blockHash;
                            block = await this.web3.eth.getBlock(blockhash);
                        } catch (e) {
                            block = {};
                        }
                    }
                    let transactions = [];
                    let abi = await this.getContractABI(transaction.to)
                    if (abi) {
                        AbiDecoder.addABI(abi)
                    }
                    let logs = AbiDecoder.decodeLogs(receipt.logs);

                    if (logs && logs.length > 0) {
                        for (let log of logs) {
                            if (log.name.toLowerCase() === 'deposit') {
                                let tran = JSON.parse(JSON.stringify(transaction))
                                tran.timestamp = block ? block.timestamp : ''
                                for (let item of log.events) {
                                    if (item.name === 'src' || item.name === 'from') {
                                        tran.from = item.value
                                    } else if (item.name === 'dst' || item.name === 'to') {
                                        tran.to = item.value
                                    } else if (item.name === 'wad' || item.name === 'value') {
                                        tran.value = item.value
                                    }
                                    if (log.address.toLowerCase() !== weth) {//WETH
                                        tran.contract = log.address
                                    }
                                }
                                transactions.push(tran)
                            }

                            if (log.name.toLowerCase() === 'withdrawal') {
                                let tran = JSON.parse(JSON.stringify(transaction))
                                tran.timestamp = block ? block.timestamp : ''
                                //提取代币 to其实是自己
                                tran.to = tran.from.toString()
                                for (let item of log.events) {
                                    if (item.name === 'src' || item.name === 'from') {
                                        tran.from = item.value
                                    } else if (item.name === 'wad' || item.name === 'value') {
                                        tran.value = item.value
                                    }
                                    if (log.address.toLowerCase() !== weth) {//WETH
                                        tran.contract = log.address
                                    }
                                }
                                transactions.push(tran)
                            }

                            if (log.name.toLowerCase() === 'transfer') {
                                let tran = JSON.parse(JSON.stringify(transaction))
                                tran.timestamp = block ? block.timestamp : ''
                                for (let item of log.events) {
                                    if (item.name === 'src' || item.name === 'from') {
                                        tran.from = item.value
                                    } else if (item.name === 'dst' || item.name === 'to') {
                                        tran.to = item.value
                                    } else if (item.name === 'wad' || item.name === 'value') {
                                        tran.value = item.value
                                    }
                                }
                                tran.contract = log.address
                                transactions.push(tran)
                            }
                        }
                    } else {
                        transaction.timestamp = block ? block.timestamp : ''
                        transactions.push(transaction)
                    }
                    // }
                    this.saveTransactionNew(hash, transactions, step)
                } catch (e) {
                    console.log(e)
                }
            }).catch((err) => {
                console.log(err)
            })
        } catch (e) {
        }
    }

    async handleLogs(transactions, logs, timestamp) {
        console.log(`[${this.chain}] handleLogs [TRANSACTIONS:${transactions?transactions.length:0}]  [LOGS:${logs?logs.length:0}]`)
        let weth = CONFIG.provider.bsc.weth;
        let transObj = {}
        for (let tran of transactions) {
            transObj[tran.hash] = tran
        }
        for (let log of logs) {
            let analysis;
            try {
                analysis = AbiDecoder.decodeLogs([log])
            } catch (ex) {
                console.log(ex)
                continue;
            }
            if (analysis.length <= 0) {
                console.log( `${this.chain} on transfers`)
                continue;
            }
            let data = analysis[0]
            // console.log(`data`, data)
            let tran = {
                blockHash: log.blockHash,
                timestamp: timestamp,
                hash: log.transactionHash,
                blockNumber: log.blockNumber,
                input: log.data,
                transactionIndex: log.transactionIndex
            }
            let tranO = transObj[log.transactionHash]
            if (data.name.toLowerCase() === 'deposit') {
                if (data.address.toLowerCase() !== weth) {//WETH
                    continue;
                }
                for (let item of data.events) {
                    tran.from = tranO.from
                    if (item.name === 'dst' || item.name === 'to') {
                        tran.to = item.value
                    }else
                    if (item.name === 'wad' || item.name === 'value') {
                        tran.value = item.value
                    }

                }

            }
            if (data.name.toLowerCase() === 'withdrawal') {
                if (data.address.toLowerCase() !== weth) {//WETH
                    continue;
                }
                tran.to = tran.from ? tran.from.toString() : ''
                for (let item of data.events) {
                    tran.to = tranO.from
                    if (item.name === 'src' || item.name === 'from') {
                        tran.from = item.value
                    }else
                    if (item.name === 'wad' || item.name === 'value') {
                        tran.value = item.value
                    }
                }
            }
            if (data.name.toLowerCase() === 'transfer') {
                for (let item of data.events) {
                    if (item.name === 'src' || item.name === 'from') {
                        tran.from = item.value
                    }else
                    if (item.name === 'dst' || item.name === 'to') {
                        tran.to = item.value
                    }else
                    if (item.name === 'wad' || item.name === 'value') {
                        tran.value = item.value
                    }
                }
                tran.contract = data.address
            }
            // console.log(`tran`, tran)
            let hasFrom = 0;
            if (tran.from) {
                hasFrom = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, tran.from.toLowerCase())
            }
            let hasTo = 0;
            if (tran.to) {
                hasTo = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, tran.to.toLowerCase())
            }

            if (hasFrom) {
                this.removeCacheTransaction(tran.hash, tran.from)
            }
            if (hasFrom === 0 && hasTo === 0) {
                continue;
            }

            tran.gasPrice = tranO.gasPrice
            tran.nonce = tranO.nonce
            let receipt = await this.web3.eth.getTransactionReceipt(log.transactionHash);
            tran.gas = receipt.gasUsed
            this.saveTransactionNew(log.transactionHash, [tran])
        }
    }

}

module.exports = TEMP