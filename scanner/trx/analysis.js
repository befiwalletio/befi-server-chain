const ANALYSIS = require('../analysis');
const TronWebLib = require('tronweb');

class TEMP extends ANALYSIS {
    constructor(provider) {
        super('TRX','BLOCK_TRX', provider);
        this.tronscan = new Ango({host:CONFIG.scans.tronScanApi});
        this.tronWebs = {};
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

    formatAddress(address) {
        return this.web3.address.fromHex(address)
    }

    parserRawData(data) {
        function string_hex2int(hex) {
            var len = hex.length, a = new Array(len), code;
            for (var i = 0; i < len; i++) {
                code = hex.charCodeAt(i);
                if (48 <= code && code < 58) {
                    code -= 48;
                } else {
                    code = (code & 0xdf) - 65 + 10;
                }
                a[i] = code;
            }
            return a.reduce(function (acc, c) {
                acc = 16 * acc + c;
                return acc;
            }, 0);
        }

        let result = {
            to: '',
            value: '0'
        }

        if (data.length === 136) {
            let to = data.substr(32, 40);
            if (!to.startsWith('0')) {
                to = '41' + to;
                result.to = this.formatAddress(to);
                result.value = string_hex2int(data.substr(72));
            }
        }
        // console.log(result)
        return result;
    }

    async getContractABI(address) {
        let abi = await super.getContractABI(address);
        if (abi){
            return abi;
        }

        try {
            let contract = await this.getTronWeb().trx.getContract(address);
            if (contract && contract.abi) {
                REDIS.BEEPAY.set(CONFIG.redisKeys.CONTRACT_ABI + address.toLowerCase(), contract.abi)
                if ((typeof contract.abi) == 'string') return JSON.parse(contract.abi)
                return contract.abi
            }
        } catch (e) {
            console.log(e);
        }

        return null
    }

    // Handle event logs
    async handleLogs(transactions, logs, extra) {
        console.log(`[${this.chain}] handleLogs [TRANSACTIONS:${transactions?transactions.length:0}]  [LOGS:${logs?logs.length:0}]`)

        let transObj = {}
        for (let tran of transactions) {
            transObj[tran.transactionHash] = tran
        }

        // extra.timestamp;

        for (let item of logs) {
            let tranO = transObj[item.transaction_id];

            let data = tranO?tranO.raw_data?tranO.raw_data.contract[0]:null:null;
            if (!data || !data.parameter) {
                continue;
            }

            let type = data.type;
            let rawData = data.parameter.value;
            let result = tranO.ret[0].contractRet;

            let tran = {
                id: item.transaction_id,
                blockHash: extra.blockHash,
                input: JSON.stringify(tranO.raw_data),
                type,
                status: result,
                timestamp: tranO.raw_data.timestamp,
                from: '',
                to: '',
                value: '0',
                transactionIndex: item.event_index,
                contract: item.contract_address,
                fee: '',
                net: '',
                receipt: {},
                log: {},
            };

            if (type === 'TransferContract' || type === 'TransferAssetContract') {
                tran.from = rawData.owner_address;
                tran.to = rawData.to_address;
                tran.value = rawData.amount;
            }

            if (type === 'TriggerSmartContract') {
                tran.from = rawData.owner_address;
                tran.to = rawData.contract_address;
                tran.contract = rawData.contract_address;
            }

            tran.from = this.web3.address.fromHex(tran.from)
            tran.to = this.web3.address.fromHex(tran.to)
            try {
                tran.contract = this.web3.address.fromHex(tran.contract)
            } catch (e) {
            }
            let hasFrom = 0;
            hasFrom = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, tran.from.toLowerCase())
            if (hasFrom) {
                this.removeCacheTransaction(tran.id, tran.from)
            }

            let hasTo = 0;
            hasTo = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, tran.to.toLowerCase())
            if (hasFrom === 0 && hasTo === 0) {
                continue;
            }
            let txInfo = await this.getTronWeb().trx.getTransactionInfo(tran.id);
            if (txInfo) {
                tran.fee = txInfo.fee;
                tran.blockNumber = txInfo.blockNumber;
                tran.blockTimeStamp = txInfo.blockTimeStamp;

                if (txInfo.fee) {
                    tran.fee = txInfo.fee;
                }

                if (txInfo.receipt) {
                    tran.net = txInfo.receipt.net_usage;
                }

                if (txInfo.receipt) {
                    tran.receipt = txInfo.receipt;
                }

                if (txInfo.log) {
                    tran.log = txInfo.log;
                }

                this.saveTransactionNew(tran.id, [tran]);
            }
        }
    }

    async handleHash(hash, block, step = '1/1') {
        console.log(`${this.chain} handleHash [HASH:${hash}]`)

        try {
            let transaction = await this.getTronWeb().trx.getTransaction(hash);
            if (!transaction && transaction.raw_data) {
                return;
            }
            transaction.step = step;

            let data = transaction.raw_data.contract[0];
            if (!data) {
                return;
            }

            let type = data.type;
            let rawData = data.parameter.value;
            let result = transaction.ret[0].contractRet;

            let tran = {
                id: transaction.txID,
                blockHash: '',
                input: JSON.stringify(item.raw_data),
                type,
                status: result,
                timestamp: transaction.raw_data.timestamp,
                from: '',
                to: '',
                value: '0',
                transactionIndex: 0,
                contract: '',
                fee: '',
                net: '',
                receipt: {},
                log: {},
            };

            if (type === 'TransferContract' || type === 'TransferAssetContract') {
                tran.from = rawData.owner_address;
                tran.to = rawData.to_address;
                tran.value = rawData.amount;
            }

            if (type === 'TriggerSmartContract') {
                tran.from = rawData.owner_address;
                tran.to = rawData.contract_address;
                tran.contract = rawData.contract_address;
            }
            tran.from = this.web3.address.fromHex(tran.from)
            tran.to = this.web3.address.fromHex(tran.to)
            try {
                tran.contract = this.web3.address.fromHex(tran.contract)
            } catch (e) {
            }
            let hasFrom = 0;
            hasFrom = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, tran.from.toLowerCase())
            if (hasFrom) {
                this.removeCacheTransaction(tran.id, tran.from)
            }

            let hasTo = 0;
            hasTo = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, tran.to.toLowerCase())
            if (hasFrom === 0 && hasTo === 0) {
                return;
            }

            let txInfo = await this.getTronWeb().trx.getTransactionInfo(tran.id);
            if (txInfo) {
                tran.fee = txInfo.fee;
                tran.blockNumber = txInfo.blockNumber;
                tran.blockTimeStamp = txInfo.blockTimeStamp;

                if (txInfo.fee) {
                    tran.fee = txInfo.fee;
                }

                if (txInfo.receipt) {
                    tran.net = txInfo.receipt.net_usage;
                }

                if (txInfo.receipt) {
                    tran.receipt = txInfo.receipt;
                }

                if (txInfo.log) {
                    tran.log = txInfo.log;
                }

                this.saveTransactionNew(tran.id, [tran]);
            }
        } catch (e) {
        }
    }

    async handleTransactions(transactions,block) {
        console.log(`[${this.chain}] handleTransactions [TRANSACTIONS:${transactions ? transactions.length : 0}] `)
        let timestamp = block?block.block_header.raw_data.timestamp:'';
        let blockHash = block?block.block_header.blockID:'';
        let blockNumber = block?block.block_header.raw_data.number:'';
        let index=-1;
        for (let transaction of transactions) {
            index++;
            if (!block){
                timestamp =transaction.block_timestamp;
                blockHash =transaction.ref_block_hash;
                blockNumber=transaction.blockNumber;
            }
            // console.log(transaction)
            // return
            let trans={
                id:transaction.txID,
                blockHash:blockHash,
                blockNumber:blockNumber,
                input:JSON.stringify(transaction),
                from:'',
                to:'',
                hash:transaction.txID,
                value:'0',
                contract:'',
                gas:'0',
                gasPrice:'1',
                status:`${transaction.ret[0]['contractRet'].toLowerCase()}`,
                timestamp:timestamp,
                transactionIndex:index,
                type:'',
                assetName:''
            }

            if (transaction.raw_data && transaction.raw_data.contract && transaction.raw_data.contract.length>0 ){

                let data = transaction.raw_data.contract[0];
                trans.type = data.type;
                if (data.parameter && data.parameter.value){
                    let value = data.parameter.value;
                    trans.from = this.formatAddress(value.owner_address);
                    if (trans.type === 'TransferContract'){
                        //TRX
                        trans.to = this.formatAddress(value.to_address);
                        trans.value = value.amount;
                        trans = this.checkTrans(trans);
                        if (trans!=null){
                            this.saveTransactionNew(transaction.txID, [trans]);
                        }
                    }else
                    if (trans.type === 'TriggerSmartContract'){
                        trans.contract = this.formatAddress(value.contract_address);
                        if (value.data){
                            let rawdata = this.parserRawData(value.data)
                            if (rawdata.to === ""){
                                this.getTronWeb().getEventByTransactionID(trans.hash).then(async events=>{

                                    let transList=[];
                                    if (events && events.length>0){

                                        for (let event of events) {


                                            if (event.name === 'Transfer'){
                                                let transTemp = JSON.parse(JSON.stringify(trans));
                                                transTemp.contract = event.contract;
                                                transTemp.from = this.formatAddress(event.result.from);
                                                transTemp.to = this.formatAddress(event.result.to);
                                                transTemp.value = event.result.value;
                                                transTemp = await this.checkTrans(transTemp);

                                                if (transTemp){
                                                    transList.push(transTemp)
                                                }

                                            }else if (event.name === 'TrxPurchase'){
                                                let transTemp = JSON.parse(JSON.stringify(trans));
                                                transTemp.contract = "";
                                                transTemp.from = event.contract;
                                                transTemp.to = this.formatAddress(event.result.buyer);
                                                transTemp.value = event.result.trx_bought;
                                                transTemp = await this.checkTrans(transTemp);

                                                if (transTemp){
                                                    transList.push(transTemp)
                                                }
                                            }else if (event.name === 'TokenPurchase'){
                                                let transTemp = JSON.parse(JSON.stringify(trans));
                                                transTemp.contract = "";
                                                transTemp.from = this.formatAddress(event.result.buyer);
                                                transTemp.to = event.contract;
                                                transTemp.value = event.result.trx_sold;
                                                transTemp = await this.checkTrans(transTemp);

                                                if (transTemp){
                                                    transList.push(transTemp)
                                                }
                                            }
                                        }
                                    }
                                    if (transList.length>0){
                                        this.saveTransactionNew(transaction.txID, transList);
                                    }
                                }).catch(e=>{})


                            }else {
                                trans.to = this.formatAddress(rawdata.to);
                                trans.value = rawdata.value;
                                trans = this.checkTrans(trans);
                                if (trans){
                                    this.saveTransactionNew(transaction.txID, [trans]);
                                }
                            }
                        }
                    }else
                    if (trans.type === 'TransferAssetContract'){
                        trans.to = this.formatAddress(value.to_address);
                        trans.value = value.amount;
                        trans.assetName=value.asset_name;
                        if (block){
                            try {
                                trans.assetName = this.web3.toUtf8(`${value.asset_name}`)
                            } catch (e) {
                            }
                        }
                        let token = await MYSQL.BEEPAYRDS().select('tokens', {
                            where: {
                                extra:JSON.stringify({assetName:trans.assetName}) ,
                                contract: this.chain
                            },
                            columns: [ 'symbol', 'name','contract', 'contractAddress']
                        });
                        if (!token || token.length===0){
                            let tokenTron=await this.getTronWeb().trx.getTokenByID(trans.assetName);
                            if (tokenTron){
                                token={
                                    'symbol':tokenTron.abbr,
                                    'name':tokenTron.name,
                                    'contract':this.chain,
                                    'contractAddress':this.formatAddress(tokenTron.owner_address),
                                    'extra':JSON.stringify({'assetName':trans.assetName})}
                                try {
                                    let tokenInfo = await this.tronscan.get(`/api/token?id=${trans.assetName}&showAll=1`);
                                    if (tokenInfo) {
                                        tokenInfo = tokenInfo.data[0];
                                        token['icon'] = tokenInfo['imgUrl'];
                                        token['whitepaper'] = tokenInfo['whitepaper'];
                                        token['coindesc'] = tokenInfo['description'];
                                        token['website'] = tokenInfo['website'];
                                    }
                                } catch (e) {
                                }
                               await MYSQL.BEEPAYRDS().insert('tokens',token)
                                trans.contract=token.contractAddress
                                // console.log('TransferAssetContract 0000000', `AssetName:${trans.assetName} | ${value.asset_name}========`,'tokenTron',tokenTron )
                            }
                        }else{
                            try {
                                if (token.length > 0) {
                                    token = token[0]
                                }
                            } catch (e) {
                            }
                            trans.contract=token.contractAddress
                        }
                        trans = this.checkTrans(trans);
                        if (trans!=null){
                            this.saveTransactionNew(transaction.txID, [trans]);
                        }

                    }
                }
            }
        }
    }

    async checkTrans(trans){
        if (trans.to==null ||trans.to===''){
            return null;
        }
        let hasFrom = 0;
        hasFrom = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, trans.from.toLowerCase())
        if (hasFrom) {
            this.removeCacheTransaction(trans.id, trans.from);
        }

        let hasTo = 0;
        hasTo = await REDIS.BEEPAY.hexistsAsync(CONFIG.redisKeys.OUR_USERS, trans.to.toLowerCase())
        if (hasFrom === 0 && hasTo === 0) {
            return null;
        }
        let txInfo = await this.getTronWeb().trx.getTransactionInfo(trans.hash);
        // console.log(txInfo)
        if (txInfo) {
            trans.fee = txInfo.fee;
            // trans.blockNumber = txInfo.blockNumber;
            // trans.blockTimeStamp = txInfo.blockTimeStamp;
            if (txInfo.fee) {
                trans.fee = txInfo.fee;
            }

            if (txInfo.receipt) {
                trans.net = txInfo.receipt.net_usage;
            }

            if (txInfo.receipt) {
                trans.receipt = txInfo.receipt;
            }

            if (txInfo.log) {
                trans.log = txInfo.log;
            }
        }
        return trans;
    }

}

module.exports = TEMP

// new TEMP().handleTransactions(testLog)
