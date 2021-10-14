
require('../core')
const erc721 = require('../nftabi/erc721.json');
class TEMP{

    constructor(contract,contractAddress,nfts,web3) {
        this.contract = contract;
        this.contractAddress = contractAddress.toLowerCase();
        this.nfts=nfts;
        this.web3=web3;
        this.trans={
            from:'',
            to:'',
            hash:'',
            tokenId:''
        }
    }

    /**
     * need child override
     * @param trans
     * @returns {boolean}
     */
    test(trans){
        return false;
    }
    // getAbi(){
    //     switch (this.contractAddress){
    //         case "":
    //             return erc721;
    //         case "":
    //             return
    //     }
    //     return '';
    // }
    getContract(){
        let nfContract = new this.web3.eth.Contract(erc721,this.contractAddress);
        return nfContract;
    }

    async handleNF(tokenId,nfContract){
        if (!tokenId){
            tokenId = this.trans.tokenId;
        }else {
            this.trans.tokenId=tokenId;
        }
        if (!nfContract){
            nfContract = this.getContract();
        }
        let result = await  nfContract.methods.tokenURI(tokenId).call()
        if (result && result.indexOf('http')===0){
            result = await (new Ango()).get(result);
            this.handleNFToken(result);
        }

    }

    /**
     * need child override
     * @param nft
     */
    async handleNFToken(nft){}

    async handleHistory(address){}


}

module.exports=TEMP;