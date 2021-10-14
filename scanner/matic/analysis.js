const ANALYSIS = require('../analysis');
const NFT = require('./nft721');
const Web3 = require('web3');
const AbiDecoder = require('abi-decoder');
const erc721 = require('../../nftabi/erc721.json');

require('require-all')({
    dirname: __dirname + '/../../abi/',
    filter: /^((?!token.json)).*$/,
    resolve: (obj) => {
        AbiDecoder.addABI(obj);
        return obj
    }
});
AbiDecoder.addABI(erc721)

class TEMP extends ANALYSIS{
    constructor() {
        super('MATIC','BLOCK_MATIC',new Web3(new Web3.providers.HttpProvider(CONFIG.provider.matic.host)));
    }

    async getContractABI(address) {
        let abi = await super.getContractABI(address);
        if (abi){
            return abi;
        }
        try {
            let ango = new Ango({host: CONFIG.scans.maticApi})
            let result = await ango.get('/api', {
                module: "contract",
                action: "getabi",
                address: address,
                apikey: CONFIG.scans.maticApiKey
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
        let weth = CONFIG.provider.matic.weth;
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
                                    } else if (item.name === 'tokenId') {
                                        tran.tokenId = item.value
                                    }
                                }
                                tran.contract = log.address
                                transactions.push(tran)
                                new NFT(tran.contract).test(tran);
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
        let weth = CONFIG.provider.matic.weth;
        let transObj = {}
        for (let tran of transactions) {
            transObj[tran.hash] = tran
        }
        for (let i = 0; i < logs.length; i++) {
            console.log(`Progress ${i} / ${logs.length-1}`)
            let log = logs[i];
            let analysis;
            try {
                analysis = AbiDecoder.decodeLogs([log])
            } catch (ex) {
                continue;
            }
            if (analysis.length <= 0) {
                continue;
            }

            let data = analysis[0]
            // console.log(data)
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
                    }else
                    if (item.name === 'tokenId') {
                        tran.tokenId = item.value
                        // console.log('transfer data',data)
                    }

                }
                tran.contract = data.address
                new NFT(tran.contract).test(tran);
            }
            // console.log(`tran`, tran)
            if (tran.value == 0 ||tran.value == null){
                tran.value = this.web3.utils.hexToNumberString(log.data);
            }
            if (isNaN(tran.value)){
                tran.value=0;
            }
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

// new TEMP().handleTransactions(testLog)
