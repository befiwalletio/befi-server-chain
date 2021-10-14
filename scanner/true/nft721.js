const Nft721 = require('../nft721');
const Web3 = require("web3");
class TEMP extends Nft721{

    constructor(contractAddress) {
        super('MATIC',
            contractAddress,
            [''],
            new Web3(new Web3.providers.HttpProvider(CONFIG.provider.true.host))
        );
    }

    test(trans) {
        this.trans=trans;
        if (this.nfts.indexOf(this.contractAddress.toLowerCase())>=0){
            console.log(`${this.contract} TEST handleNF`,this.nfts,this.contractAddress)
            this.handleNF();
            return true;
        }
        return false;
    }

    async handleNFToken(nft) {
        switch (this.contractAddress){
            case '':
                // this.handleTruePunk(nft)
                break;
        }
    }

    async handleHistory(address) {
        let contractObj = this.getContract();
        let balance = await  contractObj.methods.balanceOf(address).call();
        if (balance>0){
            for (let i = 0; i < balance; i++) {
                let result = await contractObj.methods.tokenOfOwnerByIndex(address,i).call()
            }
        }

    }
}

module.exports=TEMP;