require('../core');

///chain scanner
class Scanner{

    constructor(chain,web3) {
        this.chain=chain;
        this.startIndex=0;
        this.web3Http=web3;
    }

    async exec2() {
        console.log(`${this.chain} Scanner exec....${this.startIndex}`)
        this.startIndex++;
        let connected = await this.checkConnect();
        if (!connected) {
            return 1;
        }
        try {
            var currentBlockNumber = await this.web3Http.eth.getBlockNumber();
        } catch (e) {
            console.log(`${this.chain} Scanner exec getBlockNumber....`, e.toString())
            return 1;
        }
        let blocknumber = await REDIS.BEEPAY.hgetAsync('BEEPAY:BLOCKNUMBER', `${this.chain}`);
        console.log({chain:this.chain,blocknumber});
        if (blocknumber && !isNaN(blocknumber)) {
            try {
                blocknumber = parseInt(blocknumber);
                if (blocknumber <= currentBlockNumber) {

                } else {
                    blocknumber = currentBlockNumber;
                    REDIS.BEEPAY.hsetAsync('BEEPAY:BLOCKNUMBER', `${this.chain}`, blocknumber);
                    return 1;
                }
            } catch (e) {
                REDIS.BEEPAY.hsetAsync('BEEPAY:BLOCKNUMBER', `${this.chain}`, currentBlockNumber);
                // await this.retry();
                return 1;
            }
        } else {
            blocknumber = currentBlockNumber;
            REDIS.BEEPAY.hsetAsync('BEEPAY:BLOCKNUMBER', `${this.chain}`, blocknumber);
            return 1;
        }
        try {
            this.startParser(blocknumber);
            blocknumber++;
            await REDIS.BEEPAY.hsetAsync('BEEPAY:BLOCKNUMBER', `${this.chain}`, blocknumber);
        } catch (e) {
        }
        return 1;
    }

    async exec(){}

    async checkConnect(){
        return new Promise(resolve => {
            return resolve(true);
        })
    }

    /**
     * need child override
     * @param blocknumber
     * @returns {Promise<void>}
     */
    async startParser(blocknumber){}

    /**
     * need child override
     * @param blocknumber
     * @returns {Promise<void>}
     */
    async getBlock(blocknumber){}
}

module.exports=Scanner;