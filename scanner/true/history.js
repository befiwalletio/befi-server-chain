require('../../core')
const Scanner = require("../scanner");
const Web3 = require('web3');
const Analysis = new (require('./analysis'));
const Nft721 = require('./nft721')

class Temp extends Scanner {

    constructor() {
        super('TRUE', new Web3(new Web3.providers.HttpProvider(CONFIG.provider.true.host)));
        this.ango = new Ango({host: CONFIG.scans.trueApi})
    }

    async exec() {
        await this.getHistory()
        // await this.getNFTHistory()
        // this.exec();
    }

    async handleTrans(hash, block) {
        await Analysis.handleHash(hash, block);
    }

    async getHistory() {
        console.log(`check ${this.chain} new address get history`)
        let obj = await REDIS.BEEPAY.lpopAsync(`${CONFIG.redisKeys.NEW_ADDRESS}:${this.chain}`)
        if (!obj) {
            await sleep(1000)
            this.getHistory()
            return false
        }
        obj = JSON.parse(obj);

        let transactions = await this.ango.get('/main/txs', {
            address: obj.address,
            page: 0,
            size: 100,
            sort: "asc"
        })
        console.log(transactions)
        if (transactions && transactions.data && transactions.data[0]) {
            for (let it of transactions.data[0]) {
                this.handleTrans(it.txHash)
            }
        }
        return true;
    }

    async getNFTHistory(){
        let result = await  REDIS.BEEPAY.lpopAsync(`${CONFIG.redisKeys.NEW_NFT_ADDRESS}:${this.chain}`);
        console.log('getNFTHistory',`${CONFIG.redisKeys.NEW_NFT_ADDRESS}:${this.chain}`,result)
        if (result){
            result = JSON.parse(result);
            let contractAddress = result.contractAddress.toLowerCase();
            let address = result.address.toLowerCase();
            let nft721 = new Nft721(contractAddress);
            await nft721.handleHistory(address);
        }
        return true;
    }
}



async function start() {
    await new Temp().exec();
}

start();