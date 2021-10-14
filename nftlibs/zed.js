const Web3 = require('web3');
const tokenAbi = require('../nftabi/erc721.json');


class TEMP {
    constructor() {
        this.web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.provider.matic.host));
        this.contract='MATIC';
        this.contractAddress = CONFIG.nftContractAddress.zed;
        this.decimal = 0;
    }

    getContract(){
        return  new this.web3.eth.Contract(tokenAbi, this.contractAddress);
    }

    async getBalance(address) {
        console.log(address)
        let contract = this.getContract();
        let balance = await contract.methods.balanceOf(address).call()
        return balance
    }

    async getTokenData(from,to,tokenId){
        let contractToken = this.getContract();
        const inputData = contractToken.methods.transferFrom(from,to, tokenId).encodeABI()
        // console.log(`inputData`, inputData)
        return inputData
    }

    async getHistory(address){

    }
}

module.exports = TEMP
