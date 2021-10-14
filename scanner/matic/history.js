require('../../core')
const Scanner = require("../scanner");

const Analysis = new (require('./analysis'));
const Nft721 = require('./nft721')

class Temp extends Scanner {

    constructor() {
        super('matic');
        this.ango = new Ango({host: CONFIG.scans.maticApi})
    }

    async exec() {
        await this.getHistory()
        await this.getNFTHistory()
        await sleep(1000)
        this.exec();
    }

    async handleTrans(hash, block) {
        Analysis.handleHash(hash,block)
    }

    async getHistory() {
        console.log(`check matic new address get history`)
        let obj = await REDIS.BEEPAY.lpopAsync(`${CONFIG.redisKeys.NEW_ADDRESS}:MATIC`)
        // console.log(`obj`, obj)
        if (!obj) {
            return false
        }
        obj = JSON.parse(obj);
        let transactions = []
        if (!obj.contractAddress) {
            transactions = await this.ango.get('/api', {
                module: "account",
                action: "txlist",
                address: obj.address,
                startblock: 0,
                endblock: 99999999,
                sort: "asc",
                apikey: CONFIG.scans.maticApiKey
            })
        } else {
            transactions = await this.ango.get('/api', {
                module: "account",
                action: "tokentx",
                address: obj.address,
                contractaddress: obj.contractAddress,
                startblock: 0,
                endblock: 99999999,
                sort: "asc",
                apikey: CONFIG.scans.maticApiKey
            })
        }
        if (transactions && transactions.result) {
            for (let it of transactions.result) {
                // console.log(`hash`,it.hash)
                this.handleTrans(it.hash)
            }
        }
        return true
    }

    async getNFTHistory(){
        let result = await  REDIS.BEEPAY.lpopAsync(`${CONFIG.redisKeys.NEW_NFT_ADDRESS}:${this.chain.toUpperCase()}`);
        console.log('getNFTHistory',`${CONFIG.redisKeys.NEW_NFT_ADDRESS}:${this.chain.toUpperCase()}`,result)
        if (result){
            try {
                result = JSON.parse(result);
                let contractAddress = result.contractAddress.toLowerCase();
                let address = result.address.toLowerCase();
                let nft721 = new Nft721(contractAddress);
                await nft721.handleHistory(address);
            } catch (e) {
            }
        }
        return true;
    }
}

async function start() {
    await new Temp().exec();
}



start();
// MATIC.handleHash('0x2a92158efea31d541d1be3c5a88ad644974680909b03e846d07c103f5a0f2fae')
