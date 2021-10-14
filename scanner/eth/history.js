///scan eth
require('../../core')
const Scanner = require("../scanner");

const ETH = new (require('../../libs/eth'));

class Temp extends Scanner {

    constructor() {
        super();
        this.ango = new Ango({host: CONFIG.scans.ethApi})
    }

    async exec() {
        this.getHistory()
    }

    async handleTrans(hash, block) {
        await ETH.handleHash(hash, block);
    }

    async getHistory() {
        console.log(`check eth new address get history`)
        let obj = await REDIS.BEEPAY.lpopAsync(`${CONFIG.redisKeys.NEW_ADDRESS}:ETH`)
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
                apikey: CONFIG.scans.ethApiKey
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
                apikey: CONFIG.scans.ethApiKey
            })
        }
        if (transactions && transactions.result) {
            for (let it of transactions.result) {
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