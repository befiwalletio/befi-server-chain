const Scanner = require("../scanner");
const Web3 = require('web3');
const Analysis = new (require('./analysis'));

class Temp extends Scanner {

    constructor() {
        super('ETH',new Web3(new Web3.providers.HttpProvider(CONFIG.provider.eth.host)));
    }
    async startParser(blocknumber) {
        try {
            // Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            // Withdrawal: '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65',
            // Deposit: '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c'
            // PunkTransfer: '0x05af636b70da6819000c49f85b21fa82081c632069bb626f30932034099107d8'
            let block = await this.getBlock(blocknumber)
            if (!block){
                return true;
            }
            let transactions=block.transactions;
            try {
                Analysis.handleTransactions(transactions, block.timestamp);
            } catch (e) {
            }
            this.web3Http.eth.getPastLogs({
                fromBlock:blocknumber,
                toBlock:blocknumber,
                topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',]
            },(err,logs)=>{
                try {
                    Analysis.handleLogs(transactions,logs, block.timestamp);
                } catch (e) {
                }
            }).catch(err=>{})

            this.web3Http.eth.getPastLogs({
                fromBlock:blocknumber,
                toBlock:blocknumber,
                topics:['0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65',]
            },(err,logs)=>{
                try {
                    Analysis.handleLogs(transactions,logs, block.timestamp);
                } catch (e) {
                }
            }).catch(err=>{})
            this.web3Http.eth.getPastLogs({
                fromBlock:blocknumber,
                toBlock:blocknumber,
                topics:['0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c',]
            },(err,logs)=>{
                try {
                    Analysis.handleLogs(transactions,logs, block.timestamp);
                } catch (e) {
                }
            }).catch(err=>{})
            //PunkTransfer
            this.web3Http.eth.getPastLogs({
                fromBlock:blocknumber,
                toBlock:blocknumber,
                topics:['0x05af636b70da6819000c49f85b21fa82081c632069bb626f30932034099107d8',]
            },(err,logs)=>{
                try {
                    Analysis.handlePunk(transactions,logs, block.timestamp);
                } catch (e) {
                }
            }).catch(err=>{})

        } catch (e) {
        }
        return true;
    }

    async getBlock(blocknumber) {
        let block = await this.web3Http.eth.getBlock(blocknumber,true)
        return block;
    }

}


const temp = new Temp();
async function start(){
    await temp.exec2();
    await sleep(5000);
    await start();
}
start();