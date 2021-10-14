const Convert = require('./convert')

class Temp extends Convert {

    constructor() {
        super("/chain");
    }

    async action_test(params) {
        let result = await HOSTS.LOCAL().post('/chain/fees', {'contract': "ETH"});

        return result;
    }

    //get gas
    async action_fees(params) {
        //symbol contract from to data value contractAddress
        let info = await this.parseChain(params.contract)
        const lib = require(`../libs/${info.lib.toLowerCase()}`)
        if (!lib) {
            return {}
        }
        const chainLib = new lib()
        return await chainLib.getFees({
            from: params.from,
            to: params.to,
            value: params.value,
            data: params.data,
            contractAddress:params.contractAddress
        })
    }

    async action_nonce(params) {
        let info = await this.parseChain(params.contract)
        const lib = require(`../libs/${info.lib.toLowerCase()}`)
        if (!lib) {
            return {}
        }
        const chainLib = new lib()
        let nonce = await chainLib.getNonce(params.address)
        return {nonce}
    }

    //send trans
    //from to contract sign value
    async action_send(params) {
        let info = await this.parseChain(params.contract)
        const lib = require(`../libs/${info.lib.toLowerCase()}`)
        if (!lib) {
            return {}
        }
        const chainLib = new lib()
        let hash = await chainLib.send(params.sign)
        this._cacheTransaction(params.from, params.to, params.contract, params.contractAddress, params.value, params.sign, hash)
        return {hash: hash}
    }

    _cacheTransaction(from, to, contract, contractAddress, value, sign, hash) {
        let obj = {
            hash: hash,
            lib: contract,
            from: from,
            to: to,
            contract: contract,
            contractAddress: contractAddress,
            fee: '',
            value: value,
            status: 'pending',
            sign: sign,
            time: new Date().getTime()
        }
        let time = 60//1 min
        if (contract === 'ETH') time = 60 * 30;
        if (contract === 'MATIC') time = 60 * 30;
        if (contract === 'BNB') time = 60 * 30;
        if (contract === 'TRUE') time = 60 * 30;
        if (contract === 'TRX') time = 60 * 30;
        REDIS.BEEPAY.rpushAsync(`${CONFIG.redisKeys.CACHE_TRADE}:${contract}:${from.toLowerCase()}`, JSON.stringify(obj));
        REDIS.BEEPAY.expire(`${CONFIG.redisKeys.CACHE_TRADE}:${contract}:${from.toLowerCase()}`, time);
    }

    async action_tokenData(params) {
        let info = await this.parseChain(params.contract)
        const lib = require(`../libs/${info.lib.toLowerCase()}`)
        if (!lib) {
            return {}
        }
        const chainLib = new lib()
        let inputData = await chainLib.getTokenData(params.from, params.to, params.value, params.contract, params.contractAddress)
        return {inputData: inputData}
    }

    async parseContract(params) {
        if (!String.isEmpty(params.contract) && !String.isEmpty(params.contractAddress)) {
            return {'lib': params.contract, 'contractAddress': params.contractAddress}
        }
        return await this.parseSymbol(params.symbol, params.contractAddress)
    }

    async action_balance(params) {
        let info = await this.parseContract(params)
        const lib = require(`../libs/${info.lib.toLowerCase()}`)
        if (!lib) {
            return 'NaN'
        }
        const chainLib = new lib()
        let result={balance: 0};
        try {
            if (info.lib ==='TRX'){
                let resources = await chainLib.getResources(params.address)
                // console.log('TRX RESOURCE',resources)
                result = Object.assign(result,resources);
            }
            if (params.assetName && chainLib['getBalanceWithAsset']){
                let balance = await chainLib.getBalanceWithAsset(params.address,params.assetName)
                result.balance=balance;
            }else
            if (params.symbol === params.contract ) {
                let balance = await chainLib.getBalance(params.address)
                result.balance=balance;
            } else {
                let balance = await chainLib.getTokenBalance(params.address, params.contractAddress)
                result.balance=balance;
            }
        } catch (ex) {
            console.log(ex)
        }
        return result;
    }

    //get transactions
    async action_transactions(params) {
        let address = params.address
        let contractAddress = params.contractAddress
        var offset = params.offset ? parseInt(params.offset) : 0;
        var limit = params.limit ? parseInt(params.limit) : 30;
        let info = await this.parseChain(params.contract)
        const lib = require(`../libs/${info.lib.toLowerCase()}`)
        if (!lib) {
            return {}
        }
        const chainLib = new lib()
        let transactions = []
        if (contractAddress) {
            transactions = await chainLib.getTokenTransaction(address, contractAddress, params.condition, offset, limit)
        } else {
            transactions = await chainLib.getTransaction(address, params.condition, offset, limit)
        }
        if (params.condition === 'out' || params.condition === 'all') {
            let cacheTransactions = await REDIS.BEEPAY.lrangeAsync(`${CONFIG.redisKeys.CACHE_TRADE}:${params.contract}:${address.toLowerCase()}`, 0, -1);
            if (cacheTransactions && cacheTransactions.length > 0) {
                if (offset === 0) {//
                    for (var i = 0; i < cacheTransactions.length; i++) {
                        var item = JSON.parse(cacheTransactions[i]);
                        if (contractAddress) {//
                            if (item.contractAddress && (item.contractAddress.toLowerCase() === contractAddress.toLowerCase())) {
                                this.formatCacheTransaction(item)
                                transactions.unshift(item)
                            }
                        } else {
                            if (!item.contractAddress) {//
                                this.formatCacheTransaction(item)
                                console.log(`transaction`, item)
                                transactions.unshift(item)
                            }
                        }
                    }
                }
            }
        }

        return {
            transactions: transactions
        }

    }

    async formatCacheTransaction(item) {
        item.type = 'out'
        item.timeStr = new Date(item.time).format()
        item.gas = 0
        item.gasPrice = 0
        item.scanUrl  =  `${CONFIG.provider[item.contract.toLowerCase()].scanUrl}tx/${item.hash}`
        item.gasLimit = 0
        if(item.contract.toLowerCase() === 'trx'){
            item.scanUrl  =  `${CONFIG.provider[item.contract.toLowerCase()].scanUrl}/#/transaction/${item.hash}`
        }
        return true;
    }

    //search coin from chain
    async action_searchCoin(params) {
        let coin = await this.request_coin('ETH',params.condition);
        if(coin === null){
            coin = await this.request_coin('MATIC',params.condition);
        }
        if (coin === null){
            if (params['client_c']>=106){
                coin = await this.request_coin('BNB',params.condition);
            }
        }
        if (coin === null){
            if (params['client_c']>=108){
                coin = await this.request_coin('TRUE',params.condition);
            }
        }
        return {
            coin: coin
        }
    }

    //get history transactions
    async action_addHistoryTransactions(params) {
        let info = await this.parseChain(params.contract)

        let obj = {
            address: params.address
        }
        if (params.contractAddress) {
            obj.contractAddress = params.contractAddress
        }
        if (params.assetName) {
            obj.assetName = params.assetName
        }
        REDIS.BEEPAY.lpush(`${CONFIG.redisKeys.NEW_ADDRESS}:${info.lib}`, JSON.stringify(
            obj
        ))
        let res = await REDIS.BEEPAY.hgetAsync(CONFIG.redisKeys.OUR_USERS, params.address.toLowerCase())
        let wids = []
        if (res && res != undefined) {
            wids = res.split(',')
        }
        if (wids.indexOf(params.wid.toLowerCase()) < 0) {
            wids.push(params.wid.toLowerCase())
        }
        REDIS.BEEPAY.hsetAsync(CONFIG.redisKeys.OUR_USERS, params.address.toLowerCase(), wids.join(','))
        return {}
    }

    async request_coin(contract,condition){
        let info = await this.parseChain(contract)
        const lib = require(`../libs/${info.lib.toLowerCase()}`)
        if (!lib) {
            return {}
        }
        const chainLib = new lib()
        let coin = await chainLib.getInfoByContractAddress(condition)
        if (coin){
            MYSQL.BEEPAYRDS().insert('tokens', {
                name: coin.name,
                symbol: coin.symbol,
                contract: contract,
                contractAddress: condition,
                icon: CONFIG.provider.eth.defaultIcon
            })
        }
        return coin;
    }
}

module.exports = new Temp();
