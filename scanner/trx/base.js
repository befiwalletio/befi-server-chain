require('../../core');
const TronWebLib = require("tronweb");

class TronWeb {

    constructor(chain) {
        this.chain = chain;
        this.startIndex = 0;
        this.tronWebs = {};
    }

    async exec2() {
        console.log(`${this.chain} Scanner exec....${this.startIndex}`)
        this.startIndex++;
        let currentBlockNumber = 1;
        try {
            let currentBlockInfo = await this.getTronWeb().trx.getNodeInfo();
            if (currentBlockInfo) {
                currentBlockNumber = currentBlockInfo.beginSyncNum;
                console.log('currentBlockNumber', currentBlockNumber);
            }
        } catch (e) {
            console.log(`${this.chain} Scanner exec getBlockNumber....`, e.toString())
            return 1;
        }
        let blocknumber = await REDIS.BEEPAY.hgetAsync('BEEPAY:BLOCKNUMBER', `${this.chain}`);
        // console.log({chain: this.chain, blocknumber});
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

    async exec() {

        return 1;
    }

    getTronWeb(key){
        if (key==null){
            let  keys = CONFIG.scans.tronApiKeys;
            let keyIndex = Math.floor(Math.random() * keys.length);
            key = keys[keyIndex];
        }
        console.log("GetTronWeb Key",key)
        let tronweb = this.tronWebs[key];
        if (tronweb){
            return tronweb;
        }
        tronweb = new TronWebLib({
            fullHost: CONFIG.scans.tronApi,
            headers: {"TRON-PRO-API-KEY": key},
        });
        this.tronWebs[key]=tronweb;
        return tronweb;
    }

    async checkConnect() {
        return new Promise(resolve => {
            return resolve(true);
        })
    }

    /**
     * need child override
     * @param blocknumber
     * @returns {Promise<void>}
     */
    async startParser(blocknumber) {
    }

    /**
     * need child override
     * @param blocknumber
     * @returns {Promise<void>}
     */
    async getBlock(blocknumber) {
    }
}

module.exports = TronWeb;