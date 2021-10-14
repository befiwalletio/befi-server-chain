const Web3 = require('web3');
const tokenAbi = require('../nftabi/cryptopunks.json');


class TEMP{
    constructor() {
        this.web3 = new Web3(new Web3.providers.HttpProvider(CONFIG.provider.true.host));
        this.contract='TRUE';
        this.contractAddress = CONFIG.nftContractAddress.truePunks;
        this.decimal = 0;
    }

    getContract(){
        return  new this.web3.eth.Contract(tokenAbi, this.contractAddress);
    }

    async getBalance(address) {
        let contractToken = this.getContract();
        let balance = await contractToken.methods.balanceOf(address).call()
        return balance
    }

    async getTokenData(from,to,tokenId){
        let contractToken = this.getContract();
        const inputData = contractToken.methods.transferPunk(to, tokenId).encodeABI()
        // console.log(`inputData`, inputData)
        return inputData
    }
}

module.exports = TEMP
