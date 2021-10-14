const ANALYSIS = require('../analysis');
const punk = require('../../nftabi/cryptopunks.json');
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
AbiDecoder.addABI(punk);
class TEMP extends ANALYSIS {
    constructor() {
        super('TRUE', 'BLOCK_TRUE', new Web3(new Web3.providers.HttpProvider(CONFIG.provider.true.host)));
    }

    async getContractABI(address) {
        return null
    }

    handleHash(hash, block, step = '1/1') {
        console.log(`${this.chain} handleHash [HASH:${hash}]`)
        let weth = CONFIG.provider.eth.weth;
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
                    console.log(receipt.logs)
                    let transactions = [];
                    let abi = await this.getContractABI(transaction.to)
                    if (abi) {
                        AbiDecoder.addABI(abi)
                    }
                    let logs = AbiDecoder.decodeLogs(receipt.logs);

                    if (logs && logs.length > 0) {
                        for (let log of logs) {
                            console.log(log)
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
                            } else if (log.name.toLowerCase() === 'withdrawal') {
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
                            } else if (log.name.toLowerCase() === 'transfer') {
                                let tran = JSON.parse(JSON.stringify(transaction))
                                tran.timestamp = block ? block.timestamp : ''
                                for (let item of log.events) {
                                    if (item.name === 'src' || item.name === 'from') {
                                        tran.from = item.value
                                    } else if (item.name === 'dst' || item.name === 'to') {
                                        tran.to = item.value
                                    } else if (item.name === 'wad' || item.name === 'value') {
                                        tran.value = item.value
                                    }else if (item.name==='tokenId'){
                                        tran.tokenId = item.value;
                                    }
                                }
                                tran.contract = log.address
                                transactions.push(tran)
                                // new NFT721(tran.contract).test(tran);

                            }
                        }
                    } else {
                        transaction.timestamp = block ? block.timestamp : ''
                        transactions.push(transaction)
                    }
                    // }
                    // this.saveTransactionNew(hash, transactions, step)
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
        if (transactions && transactions.length>0){
            console.log(`[${this.chain}] handleLogs [TRANSACTIONS:${transactions ? transactions.length : 0}]  [LOGS:${logs ? logs.length : 0}]`)
        }

        let weth = CONFIG.provider.eth.weth;
        let transObj = {}
        for (let tran of transactions) {
            transObj[tran.hash] = tran
        }
        for (let log of logs) {
            let analysis;
            try {
                analysis = AbiDecoder.decodeLogs([log])
            } catch (ex) {
                continue;
            }
            if (analysis.length <= 0) {
                console.log(`${this.chain} 无法识别的交易`)
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
                    } else if (item.name === 'wad' || item.name === 'value') {
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
                    } else if (item.name === 'wad' || item.name === 'value') {
                        tran.value = item.value
                    }
                }
            }
            if (data.name.toLowerCase() === 'transfer') {
                for (let item of data.events) {
                    if (item.name === 'src' || item.name === 'from') {
                        tran.from = item.value
                    } else if (item.name === 'dst' || item.name === 'to') {
                        tran.to = item.value
                    } else if (item.name === 'wad' || item.name === 'value') {
                        tran.value = item.value
                    }else if (item.name === 'tokenId') {
                        tran.tokenId = item.value
                    }
                }
                tran.contract = data.address
                // new NFT721(tran.contract).test(tran);
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

    async handlePunk(transactions,logs,timestamp){
        if (transactions && transactions.length>0){
            console.log(`[${this.chain}] handlePunk [TRANSACTIONS:${transactions ? transactions.length : 0}]  [LOGS:${logs ? logs.length : 0}]`)
        }

        let transObj = {}
        for (let tran of transactions) {
            transObj[tran.hash] = tran
        }
        for (let log of logs) {

            let analysis = AbiDecoder.decodeLogs([log])

            if (analysis.length <= 0) {
                continue;
            }
            let data = analysis[0]
            console.log(`data`, data)
            let tran = {
                blockHash: log.blockHash,
                timestamp: timestamp,
                hash: log.transactionHash,
                blockNumber: log.blockNumber,
                input: log.data,
                transactionIndex: log.transactionIndex
            }
            let tranO = transObj[log.transactionHash]
            //https://www.larvalabs.com/public/images/cryptopunks/punk0001.png
            if (data.name.toLowerCase() === 'punktransfer') {
                for (let item of data.events) {
                    if (item.name === 'src' || item.name === 'from') {
                        tran.from = item.value
                    } else if (item.name === 'dst' || item.name === 'to') {
                        tran.to = item.value
                    } else if (item.name === 'wad' || item.name === 'value') {
                        tran.value = item.value
                    }else if (item.name === 'punkIndex') {
                        tran.tokenId = item.value
                    }
                }
                tran.contract = data.address
            }
            let cryptopunks='0xe75cc87965c9569a0fffc61a2b2ad134ad3ef0b8';
            if (tran.contract.toLowerCase() === cryptopunks){
                //https://www.larvalabs.com/public/images/cryptopunks/punk0001.png
                let tokenId = tran.tokenId;
                if (tokenId.length===1){
                    tokenId=`000${tokenId}`;
                }else if (tokenId.length===2){
                    tokenId=`00${tokenId}`;
                }else if (tokenId.length===3){
                    tokenId=`0${tokenId}`;
                }
                let image = `https://www.larvalabs.com/public/images/cryptopunks/punk${tokenId}.png`;
                let result = await MYSQL.BEEPAY_ONE('select * from nftdetails where contract=? and contractAddress=? and tokenId=?',[this.chain,cryptopunks,tran.tokenId]);
                if (result){
                    await MYSQL.BEEPAY('update nftdetails set address=?,hash=? where id=?',[tran.to.toLowerCase(),tran.hash,result.id]);
                }else {
                    await MYSQL.BEEPAY(`insert into nftdetails (hash,contract,contractAddress,tokenId,name,img,detail,uri,address) values(?,?,?,?,?,?,?,?,?)`,
                        [tran.hash,this.chain,cryptopunks,tran.tokenId,'',image,'','',tran.to.toLowerCase()]);
                }
            }
        }

    }

}

module.exports = TEMP

// new TEMP().handleTransactions(testLog)
