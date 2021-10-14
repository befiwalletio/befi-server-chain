const Convert = require('./convert_eth');
const Web3 = require('web3');
const Decimal = require("decimal.js");

class TEMP extends Convert {
    constructor() {
        super('TRUE',
            'BLOCK_TRUE',
            new Web3(new Web3.providers.HttpProvider(CONFIG.provider.true.host))
        );
    }

    async _getTransaction(address, condition, offset, limit,contractAddress) {
        address = this.formatAddress(address)
        if (contractAddress){
            contractAddress = this.formatAddress(contractAddress)
            var contractRe = new RegExp(contractAddress, "i");
        }

        let BLOCK_MODEL = MONGO.BEEPAY.model(this.mongoModel)
        let re = new RegExp(address, "i");

        let obj = {
            $or: [{"from": {$regex: re}}, {"to": {$regex: re}}],
            'contract':contractAddress!=null? {$regex: contractRe}:null
        }
        if (condition === 'in') {
            obj = {
                "to": {$regex: re},
                'contract':contractAddress!=null? {$regex: contractRe}:null
            }
        }
        if (condition === 'out') {
            obj = {
                "from": {$regex: re},
                'contract':contractAddress!=null? {$regex: contractRe}:null
            }
        }
        if (condition === 'failed') {
            obj = {
                $or: [{"from": {$regex: re}}, {"to": {$regex: re}}],
                'status': 'failed',
                'contract':contractAddress!=null? {$regex: contractRe}:null
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

            it.timeStr = new Date(it.timestamp * 1000).format()
            let decimal=18;
            if (contractAddress){
                decimal = await this.getTokenDecimal(this.chain, contractAddress)
            }
            it.value = new Decimal(it.value).div(Math.pow(10, decimal)).toFixed()
            it.scanUrl = `${CONFIG.provider.true.scanUrl}tx/${it.hash}`
            it.gasLimit = it.gas
            it.gas = new Decimal(it.gas).mul(it.gasPrice).div(Math.pow(10, 18)).toFixed()
            it.gasPrice = this.web3.utils.fromWei(it.gasPrice, 'gwei')
            it.contract = this.chain
        }
        return trans
    }

    async getTransaction(address, condition, offset, limit) {
        return await this._getTransaction(address, condition, offset, limit)
    }

    async getTokenTransaction(address, contractAddress, condition, offset, limit){
        return await this._getTransaction(address, condition, offset, limit,contractAddress)
    }

}

module.exports = TEMP
