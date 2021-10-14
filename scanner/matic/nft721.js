const Nft721 = require('../nft721');
const Web3 = require("web3");
class TEMP extends Nft721{

    constructor(contractAddress) {
        super('MATIC',
            contractAddress,
            ['0xa5f1ea7df861952863df2e8d1312f7305dabf215'],
            new Web3(new Web3.providers.HttpProvider(CONFIG.provider.matic.host))
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
            case '0xa5f1ea7df861952863df2e8d1312f7305dabf215':
                this.handleZED(nft)
                break;
        }
    }

    /**
     * ZED Horse (ZED)
     * 0xa5f1ea7df861952863df2e8d1312f7305dabf215
     * @returns {Promise<void>}
     */
    async handleZED(nft){
        let tokenId = this.trans.tokenId;
        let name = nft.name;
        let img = nft.image;
        let desc = nft.external_url;
        let attributes = {};
        try {
            for (let item of nft.attributes) {
                attributes[item.trait_type] = item.value;
            }
        } catch (e) {
        }
        console.log({tokenId,name,img,desc,attributes},this.trans)
        let row = await MYSQL.BEEPAY_ONE('select * from nftdetails where tokenId=? and contractAddress=?',[tokenId,this.contractAddress]);
        if (row){
            await MYSQL.BEEPAY('update nftdetails set address=?,hash=? where id=?',[this.trans.to.toLowerCase(),this.trans.hash,row.id]);
        }else{
            await MYSQL.BEEPAY('insert into nftdetails (hash,contract,contractAddress,tokenId,name,img,detail,uri,address) values(?,?,?,?,?,?,?,?,?)',
                [this.trans.hash,this.contract,this.contractAddress,tokenId,name,img,desc,JSON.stringify(attributes),this.trans.to.toLowerCase()])
        }
    }


    async handleHistory(address) {
        let contractObj = this.getContract();
        let balance = await  contractObj.methods.balanceOf(address).call();
        if (balance>0){
            this.trans.to=address;
            for (let i = 0; i < balance; i++) {
                let result = await contractObj.methods.tokenOfOwnerByIndex(address,i).call()
                await this.handleNF(result,contractObj);
            }
        }

    }
}

module.exports=TEMP;