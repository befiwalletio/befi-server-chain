const Convert = require('./convert_eth');
const TronWeb = require('tronweb');
class TEMP extends Convert {
    constructor() {
        super('TRX',
            'BLOCK_TRX',
            new TronWeb({
                fullHost: CONFIG.scans.tronApi,
                headers: {"TRON-PRO-API-KEY": CONFIG.scans.tronApiKey, 'Content-Type': 'application/json'},
            })
        );
        this.sun=1000000;
        this.defaultpk='';
    }
    reset(){
        this.web3=new TronWeb({
            fullHost: CONFIG.scans.tronApi,
            headers: {"TRON-PRO-API-KEY": CONFIG.scans.tronApiKey, 'Content-Type': 'application/json'},
        });
    }

    async getFees(params){
        let fees = [];
        if (params.contractAddress){
            fees.push({
                'fee': 10, 'gas_price': 0.0, 'gas_limit': 0, 'type': 'general', time: '0'
            });
        }else {
            fees.push({
                'fee': 1, 'gas_price': 0.0, 'gas_limit': 0, 'type': 'general', time: '0'
            });
        }
        return {items:fees};
    }

    async getBalance(address) {
        let balance = await this.web3.trx.getBalance(address);
        if (balance>0){
            return balance/this.sun;
        }
        return '0.0';
    }
    async getBalanceWithAsset(address,assetName) {
        let account = await this.web3.trx.getAccount(address);
        if(account && account['assetV2'] && account['assetV2'].length>0){
            for (let accountElement of account['assetV2']) {
                if (assetName === accountElement['key']){
                    if (accountElement['value']>0){
                        return accountElement['value']/this.sun
                    }
                    return'0.0'
                }
            }
        }
        return'0.0'
    }
    async getTokenBalance(address, contractAddress) {
        let balance=0;
        try {
            this.web3.setPrivateKey(this.defaultpk)
            let contract = await this.web3.contract().at(contractAddress);
            balance = await contract.balanceOf(address).call();
            this.reset()
        } catch (e) {
            console.log(e)
        }
        if (balance>0){
            return balance/this.sun;
        }
        return '0.0';
    }
    async getResources(address){
        let resource = await this.web3.trx.getAccountResources(address);
        console.log('getResources',address,resource)
        return {
            netUsed:resource.freeNetUsed?resource.freeNetUsed:0,
            netLimit:resource.freeNetLimit?resource.freeNetLimit:0,
            energyUsed:0,
            energyLimit:0,
        }
    }

    async _getTransaction(address, condition, offset, limit,contractAddress) {
        if (!condition){condition='';}
        let BLOCK_MODEL = MONGO.BEEPAY.model(this.mongoModel)
        let re = new RegExp(address, "i");
        if (contractAddress){
            var contractRe = new RegExp(contractAddress, "i");
        }
        let obj = {
            'contract':contractAddress!=null? {$regex: contractRe}:null
        }
        switch (condition){
            case "in":
                obj['to']= {$regex: re}
                break;
            case "out":
                obj['from']= {$regex: re}
                break;
            case "failed":
                obj['status']= 'failed'
                obj['$or']=[{"from": {$regex: re}}, {"to": {$regex: re}}]
                break;
            default:
                obj['$or']=[{"from": {$regex: re}}, {"to": {$regex: re}}]
                break;

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

            if (typeof it.timestamp === 'string'){
                try {
                    it.timestamp = parseInt(it.timestamp);
                } catch (e) {
                }
            }
            if(`${it.timestamp}`.length<13){
                it.timestamp=it.timestamp*1000;
            }
            it.timeStr = new Date(it.timestamp).format()
        }
        return trans
    }

    async getTransaction(address, condition, offset, limit) {
        return await this._getTransaction(address, condition, offset, limit)
    }

    async getTokenTransaction(address, contractAddress, condition, offset, limit) {
        return await this._getTransaction(address, condition, offset, limit,contractAddress);
    }

    async getTokenData(from, to, value, contract, contractAddress) {
        try {
            value = this.web3.toSun(value)
            if (contractAddress) {
                const parameter1 = [{type: 'address', value: to}, {type: 'uint256', value: value}]
                let tradeobj = await this.web3.transactionBuilder.triggerSmartContract(
                    this.web3.address.toHex(contractAddress),
                    "transfer(address,uint256)",
                    {},
                    parameter1, from
                );
                return JSON.stringify(tradeobj)
            } else {
                let tradeobj = await this.web3.transactionBuilder.sendTrx(
                    to,
                    value,
                    from
                );
                return JSON.stringify(tradeobj)
            }
        } catch (e) {
            console.log('getTokenData',e)
        }
        return '';
    }

    async send(sign) {
        return new Promise(async (resolve) => {
            if (typeof sign === 'string'){
                sign=JSON.parse(sign);
            }
            try {
                let result = await this.web3.trx.sendRawTransaction(sign);
                console.log("TRX send",result)
                resolve(sign.txid);
            } catch (e) {
                console.log("TRX send error",e)
                resolve('');
            }
        })
    }

}

module.exports = TEMP
