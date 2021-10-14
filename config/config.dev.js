module.exports = {
    server: {
        name: 'bee_chain',
        port: 9001,
        debug: true,
    },
    mongo: {
        BEEPAY: {
            uri: "",
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
        }
    },
    mysql: {
        BEEPAY: {
            host: "127.0.0.1",
            port: 3306,
            user: "root",
            password: "123456",
            database: "beepay"
        }
    },
    redis: {
        BEEPAY: {
            host: "127.0.0.1",
            port: 6379,
            auth: ""
        }
    },
    provider: {
        eth: {
            host: "",
            chainId: 1,
            weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            scanUrl: "https://etherscan.io/",
            defaultIcon: 'https://cdn.beefinance.pro/tokenImg/basicImg.png'
        },
        matic: {
            host: "",
            chainId: 137,
            weth: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
            scanUrl: "https://polygonscan.com/",
            defaultIcon: 'https://cdn.beefinance.pro/tokenImg/basicImg.png'
        },
        bsc: {
            host: "https://bsc-dataseed1.defibit.io",
            chainId: 56,
            weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            scanUrl: "https://bscscan.com/",
            defaultIcon: 'https://cdn.beefinance.pro/tokenImg/basicImg.png'
        },
        'true': {
            host: "https://rpc.truescan.network",
            chainId: 19330,
            weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            scanUrl: "https://www.truescan.network/",
            defaultIcon: 'https://cdn.beefinance.pro/tokenImg/basicImg.png'
        },
        trx: {
            scanUrl: "https://tronscan.org/#/",
            defaultIcon: 'https://cdn.beefinance.pro/tokenImg/basicImg.png'
        }
    },
    hosts: {
        local: {
            host: 'http://127.0.0.1:9001',
            appid: '123',
            version: '1.0.0',
            description: ''
        },
        api: {
            host: 'http://127.0.0.1:9000',
            appid: '123',
            version: '1.0.0',
            description: ''
        },
        token: {
            host: 'http://127.0.0.1:9002',
            appid: '123',
            version: '1.0.0',
            description: ''
        }
    },
    redisKeys: {
        DECIMAL: "BEEPAY:TOKEN:DECIMAL",
        NEW_ADDRESS: "BEEPAY:CHAIN:HISTORY:TASK",
        NEW_NFT_ADDRESS: "BEEPAY:CHAIN:HISTORY:NFT:TASK",
        OUR_USERS: "BEEPAY:OUR:USERS:ADDRESSES",
        CACHE_TRADE: "BEEPAY:CACHE:TRADE",
        USER_ALLTOKENS: "BEEPAY:TOKEN:USERALLTOKENS",
        CONTRACT_ABI: "BEEPAY:CHAIN:CONTRACT:ABI:"
    },
    scans: {
        ethApi: "https://api.etherscan.io",
        ethApiKey: "",

        oklinkApi: "https://www.oklink.com",
        oklinkApiKey: "",

        maticApi: "https://api.polygonscan.com",
        maticApiKey: "",

        bscApi: "https://api.bscscan.com",
        bscApiKey: "",

        trueApi: "https://api.truescan.network",
        trueApiKey: "",

        tronApi: "https://api.trongrid.io",
        tronApiKey: "",
        tronApiKeys: [],

        tronScanApi: "https://apilist.tronscan.org"
    },
    nftContractAddress: {
        cryptoPunks: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
        truePunks: '0xe75cc87965c9569a0fffc61a2b2ad134ad3ef0b8',
        zed: '0xa5f1ea7df861952863df2e8d1312f7305dabf215',
    }
}
