require('../../core')
const Scanner = require("../scanner");

const Analysis = require('./analysis');

class Temp extends Scanner {

    constructor() {
        const TronWebLib = require('tronweb');

        const tronWeb = new TronWebLib({
            fullHost: CONFIG.scans.tronApi,
            headers: { "TRON-PRO-API-KEY": CONFIG.scans.tronApiKey },
        });

        super('TRX', tronWeb);

        this.analysis = new Analysis(tronWeb);
        this.ango = new Ango({host: CONFIG.scans.tronApi})
    }

    async exec() {
        await this.getHistory();
    }

    async handleTrans(hash, block) {
        await this.analysis.handleHash(hash, block);
    }

    async getHistory() {
        console.log(`check ${this.chain} new address get history`);

        let obj = await REDIS.BEEPAY.lpopAsync(`${CONFIG.redisKeys.NEW_ADDRESS}:${this.chain}`)

        if (!obj) {
            await sleep(5000);
            await this.getHistory();
            return false;
        }

        obj = JSON.parse(obj);
        let transactions=null;
        if (obj.contractAddress!==undefined && obj.assetName!==undefined) {
            try {
                transactions = await this.ango.get('/v1/contracts/' + obj.address + '/transactions', {
                    only_to: obj.contractAddress,
                    only_confirmed: true,
                    order_by: "asc",
                    limit: 200, // max 50
                });
            } catch (e) {
            }

        } else {
            // normal address
            try {
                transactions = await this.ango.get('/v1/accounts/' + obj.address + '/transactions', {
                    only_confirmed: true,
                    order_by: "asc",
                    limit: 200, // max 200
                });
            } catch (e) {
            }
        }

        if (transactions && transactions.data) {
            this.analysis.handleTransactions(transactions.data,null)
            // for (let it of transactions.result) {
            //     // console.log(`hash`,it.hash)
            //     await this.handleTrans(it.hash, null);
            // }
        }

        await sleep(10000);
        await this.getHistory();
        return true;
    }
}



async function start() {
    await new Temp().exec();
}

start();
