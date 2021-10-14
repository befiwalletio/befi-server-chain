///scan eth
require('../../core')
const Scanner = require("../scanner");

const LIB = new (require('../../libs/bnb'));

class Temp extends Scanner {

    constructor() {
        super('BNB');
        this.ango = new Ango({host: CONFIG.scans.bscApi})
    }

    async exec() {
        this.getHistory()
    }

    async handleTrans(hash, block) {
        await LIB.handleHash(hash, block);
    }

    async getHistory() {
        console.log(`check ${this.chain} new address get history`)
        let obj = await REDIS.BEEPAY.lpopAsync(`${CONFIG.redisKeys.NEW_ADDRESS}:${this.chain}`)
        // console.log(`obj`, obj)
        if (!obj) {
            await sleep(1000)
            this.getHistory()
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
                apikey: CONFIG.scans.bscApiKey
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
                apikey: CONFIG.scans.bscApiKey
            })
        }
        if (transactions && transactions.result) {
            for (let it of transactions.result) {
                // console.log(`hash`,it.hash)
                this.handleTrans(it.hash)
            }
        }
        this.getHistory()
    }
}


async function start() {
    await new Temp().exec();
}
start();
