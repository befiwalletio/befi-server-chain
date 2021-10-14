const Scanner = require("../scanner");
const Web3 = require('web3');
const Analysis = new (require('./analysis'));

class Temp extends Scanner {

    constructor() {
        super('BNB',new Web3(new Web3.providers.HttpProvider(CONFIG.provider.bsc.host)));
    }

    async startParser(blocknumber) {
        console.log(`${this.chain} Scanner Start Parser：${blocknumber} ${typeof blocknumber}`)
        try {
            // Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            // Withdrawal: '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65',
            // Deposit: '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c'
            // let block = await this.web3Http.eth.getBlock(temp, true)
            let block = await  this.getBlock(blocknumber);
            if (!block){
                console.log(`[${this.chain}] [${blocknumber}] Block null`)
                return true;
            }
            let transactions=block.transactions;
            try {
                Analysis.handleTransactions(transactions, block.timestamp);
            } catch (e) {
                console.log(e)
            }
            this.web3Http.eth.getPastLogs({
                fromBlock:blocknumber,
                toBlock:blocknumber,
                topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',]
            },(err,logs)=>{
                // console.log(err,logs)
                // new ${this.chain}Lib().decodeLogs(logs);
                try {
                    console.log(`logs ${logs.length}`);
                    Analysis.handleLogs(transactions,logs, block.timestamp);
                } catch (e) {
                }
            }).catch(err=>{})

            this.web3Http.eth.getPastLogs({
                fromBlock:blocknumber,
                toBlock:blocknumber,
                topics:['0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65',]
            },(err,logs)=>{
                // console.log(err,logs)
                // new ${this.chain}Lib().decodeLogs(logs);
                try {
                    console.log(`logs ${logs.length}`);
                    Analysis.handleLogs(transactions,logs, block.timestamp);
                } catch (e) {
                }
            }).catch(err=>{})
            this.web3Http.eth.getPastLogs({
                fromBlock:blocknumber,
                toBlock:blocknumber,
                topics:['0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c',]
            },(err,logs)=>{
                // console.log(err,logs)
                // new ${this.chain}Lib().decodeLogs(logs);
                try {
                    console.log(`logs ${logs.length}`);
                    Analysis.handleLogs(transactions,logs, block.timestamp);
                } catch (e) {
                }
            }).catch(err=>{})
        } catch (e) {
            console.log('Parser error',e)
        }
        return true;
    }

    async getBlock(blocknumber){
        let temp = this.web3Http.utils.toHex(blocknumber);
        let block = await (new Ango({})).get(
            `https://api.bscscan.com/api`,
            {
                module:"proxy",
                action:"eth_getBlockByNumber",
                tag:temp,
                boolean:true,
                apikey:CONFIG.scans.bscApiKey
            }
        );
        if (block){
            block = block.result;
        }
        return block;
    }


}

const temp = new Temp();
async function start() {
    await temp.exec2();
    await sleep(500);
    await start();
}

start();

// new Temp().startParser(16847575);
