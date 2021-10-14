const Convert = require('./convert');
const ethers = require('ethers');
const Decimal = require("decimal.js");
const tokenAbi = require("../abi/token.json");
const keccak256 = require("keccak256");
const AbiDecoder = require("abi-decoder");

class TEMP extends Convert {

    constructor(chain, mongoModel, web3) {
        super();
        this.chain = chain
        this.mongoModel = mongoModel
        this.web3 = web3;
    }

    async getFees(params) {
        params.data = params.data || '0x'
        let isContract = false;
        let gasLimit = 21000;
        let gasPrice = await this.web3.eth.getGasPrice()
        //normal trans
        if (params.to) {
            // is contract ?
            let code = await this.web3.eth.getCode(params.to)
            if (params.to && code.length > 10) {
                isContract = true;
            }
            let obj = {
                from: params.from,
                to: params.to,
                value: params.value ? ethers.utils.parseEther(parseFloat(params.value).toFixed(18)) : '0x0',
                gasPrice: gasPrice,
                data: params.data
            };
            if (!isContract) {
                if (params.data.length > 2) {
                    try {
                        gasLimit = await this.web3.eth.estimateGas(obj);
                    } catch (e) {
                        console.log(e);
                        gasLimit = 120000;
                    }
                }

            } else {
                try {
                    gasLimit = await this.web3.eth.estimateGas(obj);
                } catch (ex) {
                    console.log(`ex`, ex)
                }
                gasLimit = (gasLimit * 1.5).toFixed(0)
            }
        } else {
            // token trans
            if (params.contractAddress) {
                let code = await this.web3.eth.getCode(params.contractAddress)
                if (params.contractAddress && code.length > 10) {
                    gasLimit = 80000
                }
            }
        }

        let fees = [];
        fees.push({
            'fee': this.web3.utils.fromWei(new Decimal(gasPrice).mul(gasLimit).mul(2).toFixed(0), 'ether'),
            'gas_price': this.web3.utils.fromWei(new Decimal(gasPrice).mul(2).toFixed(0), 'ether'),
            'gas_limit': gasLimit,
            'gas_price_str': this.web3.utils.fromWei(new Decimal(gasPrice).mul(2).toFixed(0), 'gwei'),
            'type': 'fastest',
            'contract': this.chain,
            'time': '0.5'
        });
        fees.push({
            'fee': this.web3.utils.fromWei(new Decimal(gasPrice).mul(gasLimit).mul(1.2).toFixed(0), 'ether'),
            'gas_price': this.web3.utils.fromWei(new Decimal(gasPrice).mul(1.2).toFixed(0), 'ether'),
            'gas_limit': gasLimit,
            'gas_price_str': this.web3.utils.fromWei(new Decimal(gasPrice).mul(1.2).toFixed(0), 'gwei'),
            'type': 'fast',
            'contract': this.chain,
            'time': '2'
        });
        fees.push({
            'fee': this.web3.utils.fromWei(new Decimal(gasPrice).mul(gasLimit).toFixed(0), 'ether'),
            'gas_price': this.web3.utils.fromWei(new Decimal(gasPrice).toFixed(0), 'ether'),
            'gas_limit': gasLimit,
            'gas_price_str': this.web3.utils.fromWei(new Decimal(gasPrice).toFixed(0), 'gwei'),
            'type': 'general',
            'contract': this.chain,
            'time': '5'
        });
        fees.push({
            'fee': this.web3.utils.fromWei(new Decimal(gasPrice).mul(gasLimit).mul(0.9).toFixed(0), 'ether'),
            'gas_price': this.web3.utils.fromWei(new Decimal(gasPrice).mul(0.9).toFixed(0), 'ether'),
            'gas_limit': gasLimit,
            'gas_price_str': this.web3.utils.fromWei(new Decimal(gasPrice).mul(0.9).toFixed(0), 'gwei'),
            'type': 'slow',
            'contract': this.chain,
            'time': '30'
        });
        return {
            items: fees
        }
    }

    async getBalance(address) {
        address = this.formatAddress(address);
        let balance = await this.web3.eth.getBalance(address)
        var etherString = ethers.utils.formatEther(balance);
        return etherString
    }

    async getTokenDecimal(contract, contractAddress) {
        let decimal = await REDIS.BEEPAY.hgetAsync(CONFIG.redisKeys.DECIMAL, `${contract.toUpperCase()}:${contractAddress.toLowerCase()}`)
        if (decimal) {
            return parseInt(decimal)
        }
        let contractToken = new this.web3.eth.Contract(tokenAbi, contractAddress)
        decimal = await contractToken.methods.decimals().call()
        if (decimal) {
            REDIS.BEEPAY.hsetAsync(CONFIG.redisKeys.DECIMAL, `${contract.toUpperCase()}:${contractAddress.toLowerCase()}`, decimal)
            return decimal
        }
        return 18;
    }

    async getTokenBalance(address, contractAddress) {
        address = this.formatAddress(address);
        contractAddress = this.formatAddress(contractAddress);
        let contract = new this.web3.eth.Contract(tokenAbi, contractAddress)
        let balance = await contract.methods.balanceOf(address).call()
        let decimal = await this.getTokenDecimal(this.chain, contractAddress)
        var etherString = ethers.utils.formatUnits(balance, decimal);
        return etherString
    }

    async getTransaction(address, condition, offset, limit) {
        return await this._getTransactions(address,condition,offset,limit);
    }

    async getTokenTransaction(address, contractAddress, condition, offset, limit) {
        return await this._getTransactions(address,condition,offset,limit,contractAddress);
    }

    async _getTransactions(address,condition, offset, limit,contractAddress){
        address = this.formatAddress(address)
        if (contractAddress){
            contractAddress = this.formatAddress(contractAddress)
            var contractRe = new RegExp(contractAddress, "i");
        }
        let BLOCK_MODEL = MONGO.BEEPAY.model(this.mongoModel)
        let re = new RegExp(address, "i");

        let obj = {
            $or: [{"from": {$regex: re}}, {"to": {$regex: re}}],
            'contract': contractAddress!=null?{$regex: contractRe}:null
        }
        if (condition === 'in') {
            obj = {
                "to": {$regex: re},
                'contract': contractAddress!=null?{$regex: contractRe}:null
            }
        }
        if (condition === 'out') {
            obj = {
                "from": {$regex: re},
                'contract': contractAddress!=null?{$regex: contractRe}:null
            }
        }
        if (condition === 'failed') {
            obj = {
                $or: [{"from": {$regex: re}}, {"to": {$regex: re}}],
                'status': 'failed',
                'contract': contractAddress!=null?{$regex: contractRe}:null
            }
        }
        let trans = await BLOCK_MODEL.find(obj, null, {
            lean: true
        }).sort({'timestamp': -1}).skip(offset).limit(limit).exec()
        for (let it of trans) {
            if (condition === 'out') {
                if (it.from.toLowerCase() === address.toLowerCase()) {
                    it.type = 'out'
                } else {
                    it.type = 'in'
                }
            } else if (condition === 'in') {
                if (it.to.toLowerCase() === address.toLowerCase()) {
                    it.type = 'in'
                } else {
                    it.type = 'out'
                }
            } else {
                if (it.from.toLowerCase() === address.toLowerCase()) {
                    it.type = 'out'
                } else {
                    it.type = 'in'
                }
            }

            let decimal=18;
            if (contractAddress){
                decimal = await this.getTokenDecimal(this.chain, contractAddress)
            }

            if (it.value===null){
                it.value=0
            }
            it.timeStr = new Date(it.timestamp * 1000).format()
            it.value = new Decimal(it.value).div(Math.pow(10, decimal)).toFixed()
            it.scanUrl = `${CONFIG.provider[this.chain.toLowerCase()].scanUrl}tx/${it.hash}`
            it.gasLimit = it.gas
            it.gas = new Decimal(it.gas).mul(it.gasPrice).div(Math.pow(10, 18)).toFixed()
            it.gasPrice = this.web3.utils.fromWei(it.gasPrice, 'gwei')
            it.contract = this.chain
        }
        return trans
    }
    async getNonce(address) {
        try {
            let nonce = await this.web3.eth.getTransactionCount(address, 'pending')
            return nonce
        } catch (e) {
            return 0;
        }
    }

    async send(sign) {
        return new Promise(resolve => {
            if (sign.substring(0, 2) !== '0x') sign = '0x' + sign;
            this.web3.eth.sendSignedTransaction(sign)
                .on('transactionHash', function (hash) {
                    resolve(hash)
                }).on('receipt', function (receipt) {
                //receipt
                console.log(`result`, receipt)
            }).on('error', function (receipt) {
                //receipt
                console.log(`error`, receipt)
                resolve('')
            })
        })
    }

    async getTokenData(from, to, value, contract, contractAddress) {
        let decimal = await this.getTokenDecimal(contract, contractAddress)
        let contractToken = new this.web3.eth.Contract(tokenAbi, contractAddress)
        value = new Decimal(value).mul(Math.pow(10, decimal)).toFixed()
        const inputData = contractToken.methods.transfer(to, value).encodeABI()
        return inputData
    }

    formatAddress(address) {
        address = address.toLowerCase().replace(/^0x/i, '')
        const addressHash = keccak256(address).toString('hex').replace(/^0x/i, '')
        let adrList = []
        for (var i = 0; i < 40; i++) {
            if (parseInt(addressHash[i], 16) > 7) {
                adrList.push(address[i].toUpperCase())
            } else {
                adrList.push(address[i].toLowerCase())
            }
        }
        return '0x' + adrList.join('')
        return address;
    }

    async getInfoByContractAddress(contractAddress) {
        let abi = await this.getContractABI(contractAddress);
        if (abi) {
            try {
                let contractToken = new this.web3.eth.Contract(abi, contractAddress)
                let name = await contractToken.methods.name().call()
                let symbol = await contractToken.methods.symbol().call()
                return {
                    name: name,
                    symbol: symbol,
                    contract: this.chain,
                    contractAddress: contractAddress,
                    icon: CONFIG.provider.eth.defaultIcon
                }
            } catch (e) {
            }
        }
        return null;

    }

    /**
     * //get abi from address
     * need child override
     * @param address
     * @returns {Promise<boolean>}
     */
    async getContractABI(address) {

        return false
    }

    async handleHash(hash, block, step = '1/1', needSave = true) {
        return new Promise(resolve => {
            this.web3.eth.getTransaction(hash).then(async (transaction) => {
                if (!transaction) {
                    resolve(hash);
                    return;
                }

                transaction.step = step;
                try {
                    let receipt = await this.web3.eth.getTransactionReceipt(hash);
                    transaction.gas = receipt.gasUsed;
                    console.log(`transaction input`, transaction.input)
                    let decodeInput = AbiDecoder.decodeMethod(transaction.input)
                    console.log(`decodeInput`, decodeInput)
                    console.log(`receipt log`, receipt.logs)

                    this.removeCacheTransaction(hash, transaction.from)

                    if (!block) {
                        let blockhash = transaction.blockHash;
                        block = await this.web3.eth.getBlock(blockhash);
                    }
                    let transactions = []
                    let abi = await this.getContractABI(transaction.to)
                    if (abi) {
                        AbiDecoder.addABI(abi)
                    }
                    let logs = AbiDecoder.decodeLogs(receipt.logs);
                    console.log(`decode logs`, logs)
                    if (logs && logs.length > 0) {
                        for (let log of logs) {
                            if (log.name.toLowerCase() === 'deposit') {
                                let tran = JSON.parse(JSON.stringify(transaction))
                                tran.timestamp = block ? block.timestamp : ''
                                for (let item of log.events) {
                                    if (item.name === 'src' || item.name === 'from') {
                                        tran.from = item.value
                                    }
                                    if (item.name === 'dst' || item.name === 'to') {
                                        tran.to = item.value
                                    }
                                    if (item.name === 'wad' || item.name === 'value') {
                                        tran.value = item.value
                                    }
                                    if (log.address.toLowerCase() != CONFIG.provider.bsc.weth) {//WETH
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
                                    }
                                    if (item.name === 'wad' || item.name === 'value') {
                                        tran.value = item.value
                                    }
                                    if (log.address.toLowerCase() != CONFIG.provider.bsc.weth) {//WETH
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
                                    }
                                    if (item.name === 'dst' || item.name === 'to') {
                                        tran.to = item.value
                                    }
                                    if (item.name === 'wad' || item.name === 'value') {
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
                resolve(hash);
            }).catch((err) => {
                console.log(err)
                resolve(hash);
            })
        });
    }

    async saveTransactionNew(hash, transactions, step) {
        for (let data of transactions) {
            let hasFrom = 1;
            if (data.from) {
                hasFrom = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, data.from.toLowerCase())
            }
            let hasTo = 1;
            if (data.to) {
                hasTo = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, data.to.toLowerCase())
            }

            if (hasFrom === 0 && hasTo === 0) {
                continue;
            }
            let BLOCK_MODEL = MONGO.BEEPAY.model(this.mongoModel);
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
                data.status = data.transactionIndex === null ? "pending" : "success";
                if (trans) {
                    BLOCK_MODEL.updateOne({"_id": trans._id}, data, (err) => {

                    });

                } else {
                    new BLOCK_MODEL(data).save((err) => {

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
                    return false
                }
            }
        }
    }


    async assertParams(params, keys = []) {
        for (let key of keys) {
            if (!params[key]) {
                await this.error(801);
                break
            }
        }
    }

    error(code = 20001, message, language = 'en') {
        throw new NetException(code, message, language);
    }
}

module.exports = TEMP;
