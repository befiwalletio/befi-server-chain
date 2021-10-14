const TronWeb = require("./base");
const Analysis = require('./analysis');

class Temp extends TronWeb {

    constructor() {
        super('TRX');
        this.analysises = {};
        this.ango = new Ango({host: CONFIG.scans.tronApi});
    }

    getAnalysis(){
        let  keys = CONFIG.scans.tronApiKeys;
        let keyIndex = Math.floor(Math.random() * keys.length);
        let key = keys[keyIndex];
        let analysis = this.analysises[key];
        if (analysis){
            return analysis;
        }
        let tronweb = this.getTronWeb(key);
        analysis = new Analysis(tronweb);
        this.analysises[key]=analysis;
        return analysis;
    }

    async startParser(blockNumber) {
        try {
            let block = await this.getBlock(blockNumber);
            if (!block) {
                return;
            }

            let transactions = block.transactions;
            try {
                await this.getAnalysis().handleTransactions(transactions, block);
            } catch (e) {
            }
        } catch (e) {
        }
    }

    async getBlock(blockNumber) {
        return await this.getTronWeb().trx.getBlockByNumber(blockNumber);
    }

    // async handleEventLogs(blockNumber, txs, timestamp, blockHash) {
    //     let result = await this.ango.get('/v1/blocks/' + blockNumber + '/events', {
    //         only_confirmed: true,
    //         limit: 200,
    //     });
    //
    //     if (result && result.data) {
    //         await this.analysis.handleLogs(txs, result.data, {timestamp, blockHash});
    //     }
    // }
}


const temp = new Temp();

async function start() {
    temp.exec2();
    await sleep(2200);
    await start();
}

start();
