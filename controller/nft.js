const Convert = require('./convert')

class Temp extends Convert {

    constructor() {
        super("/nft");
    }

    parseNFT(contract,contractAddress) {
        //cryptoPunks
        if (contractAddress.toLowerCase() === '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb'
            && contract === 'ETH'
        ) {
            return {'lib': 'cryptopunks'}
        }
        if (contractAddress.toLowerCase() === '0xa5f1ea7df861952863df2e8d1312f7305dabf215'
            && contract === 'MATIC') {
            return {'lib': 'zed'}
        }
        if (contractAddress.toLowerCase() === '0xe75cc87965c9569a0fffc61a2b2ad134ad3ef0b8'
            && contract === 'TRUE') {
            return {'lib': 'truepunks'}
        }
        return null;
    }

    async action_addHistoryTransactions(params) {
        let info = await this.parseChain(params.contract)
        let obj = {
            address: params.address,
            contractAddress: params.contractAddress
        }
        REDIS.BEEPAY.lpush(`${CONFIG.redisKeys.NEW_NFT_ADDRESS}:${info.lib}`, JSON.stringify(
            obj
        ))
        return {}
    }

    async action_balance(params) {
        let info =  this.parseNFT(params.contract,params.contractAddress)
        const lib = require(`../nftlibs/${info.lib.toLowerCase()}`)
        if (!lib) {
            return 'NaN'
        }
        const chainLib = new lib()
        try {
            let balance = await chainLib.getBalance(params.address)
            return {balance: balance}

        } catch (ex) {
            console.log(ex)
            return {balance: 0}
        }

    }

    async action_tokenData(params) {
        await this.assertParams(params, ['from', 'to', 'value', 'contract', 'contractAddress'])
        let info = this.parseNFT(params.contract,params.contractAddress)
        const lib = require(`../nftlibs/${info.lib.toLowerCase()}`)
        if (!lib) {
            return {inputData: ''}
        }
        const chainLib = new lib()
        let inputData = await chainLib.getTokenData(params.from, params.to, params.value)
        return {inputData: inputData}

    }
}

module.exports = new Temp();
