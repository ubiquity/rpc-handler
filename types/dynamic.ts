
export const chainIds = {
  "1": "ethereum",
  "8": "ubiq",
  "10": "optimism",
  "19": "songbird",
  "20": "elastos",
  "24": "kardiachain",
  "25": "cronos",
  "30": "rsk",
  "40": "telos",
  "50": "xdc",
  "52": "csc",
  "55": "zyx",
  "56": "binance",
  "57": "syscoin",
  "60": "gochain",
  "61": "ethereumclassic",
  "66": "okexchain",
  "70": "hoo",
  "82": "meter",
  "87": "nova network",
  "88": "viction",
  "100": "xdai",
  "106": "velas",
  "108": "thundercore",
  "122": "fuse",
  "128": "heco",
  "137": "polygon",
  "148": "shimmer_evm",
  "169": "manta",
  "200": "xdaiarb",
  "204": "op_bnb",
  "246": "energyweb",
  "248": "oasys",
  "250": "fantom",
  "269": "hpb",
  "288": "boba",
  "311": "omax",
  "314": "filecoin",
  "321": "kucoin",
  "324": "era",
  "336": "shiden",
  "361": "theta",
  "369": "pulse",
  "416": "sx",
  "463": "areon",
  "534": "candle",
  "570": "rollux",
  "592": "astar",
  "820": "callisto",
  "888": "wanchain",
  "1030": "conflux",
  "1088": "metis",
  "1101": "polygon_zkevm",
  "1116": "core",
  "1231": "ultron",
  "1234": "step",
  "1284": "moonbeam",
  "1285": "moonriver",
  "1440": "living assets mainnet",
  "1559": "tenet",
  "1975": "onus",
  "2000": "dogechain",
  "2222": "kava",
  "2332": "soma",
  "4337": "beam",
  "4689": "iotex",
  "5000": "mantle",
  "5050": "xlc",
  "5551": "nahmii",
  "6969": "tombchain",
  "7700": "canto",
  "8217": "klaytn",
  "8453": "base",
  "8899": "jbc",
  "9001": "evmos",
  "9790": "carbon",
  "10000": "smartbch",
  "15551": "loop",
  "17777": "eos_evm",
  "32520": "bitgert",
  "32659": "fusion",
  "32769": "zilliqa",
  "42161": "arbitrum",
  "42170": "arbitrum_nova",
  "42220": "celo",
  "42262": "oasis",
  "43114": "avalanche",
  "47805": "rei",
  "55555": "reichain",
  "59144": "linea",
  "71402": "godwoken",
  "333999": "polis",
  "420420": "kekchain",
  "888888": "vision",
  "245022934": "neon",
  "1313161554": "aurora",
  "1666600000": "harmony",
  "11297108109": "palm",
  "836542336838601": "curio"
} as const;

export const networks = {
  "ethereum": 1,
  "ubiq": 8,
  "optimism": 10,
  "songbird": 19,
  "elastos": 20,
  "kardiachain": 24,
  "cronos": 25,
  "rsk": 30,
  "telos": 40,
  "xdc": 50,
  "csc": 52,
  "zyx": 55,
  "binance": 56,
  "syscoin": 57,
  "gochain": 60,
  "ethereumclassic": 61,
  "okexchain": 66,
  "hoo": 70,
  "meter": 82,
  "nova network": 87,
  "viction": 88,
  "xdai": 100,
  "velas": 106,
  "thundercore": 108,
  "fuse": 122,
  "heco": 128,
  "polygon": 137,
  "shimmer_evm": 148,
  "manta": 169,
  "xdaiarb": 200,
  "op_bnb": 204,
  "energyweb": 246,
  "oasys": 248,
  "fantom": 250,
  "hpb": 269,
  "boba": 288,
  "omax": 311,
  "filecoin": 314,
  "kucoin": 321,
  "era": 324,
  "shiden": 336,
  "theta": 361,
  "pulse": 369,
  "sx": 416,
  "areon": 463,
  "candle": 534,
  "rollux": 570,
  "astar": 592,
  "callisto": 820,
  "wanchain": 888,
  "conflux": 1030,
  "metis": 1088,
  "polygon_zkevm": 1101,
  "core": 1116,
  "ultron": 1231,
  "step": 1234,
  "moonbeam": 1284,
  "moonriver": 1285,
  "living assets mainnet": 1440,
  "tenet": 1559,
  "onus": 1975,
  "dogechain": 2000,
  "kava": 2222,
  "soma": 2332,
  "beam": 4337,
  "iotex": 4689,
  "mantle": 5000,
  "xlc": 5050,
  "nahmii": 5551,
  "tombchain": 6969,
  "canto": 7700,
  "klaytn": 8217,
  "base": 8453,
  "jbc": 8899,
  "evmos": 9001,
  "carbon": 9790,
  "smartbch": 10000,
  "loop": 15551,
  "eos_evm": 17777,
  "bitgert": 32520,
  "fusion": 32659,
  "zilliqa": 32769,
  "arbitrum": 42161,
  "arbitrum_nova": 42170,
  "celo": 42220,
  "oasis": 42262,
  "avalanche": 43114,
  "rei": 47805,
  "reichain": 55555,
  "linea": 59144,
  "godwoken": 71402,
  "polis": 333999,
  "kekchain": 420420,
  "vision": 888888,
  "neon": 245022934,
  "aurora": 1313161554,
  "harmony": 1666600000,
  "palm": 11297108109,
  "curio": 836542336838601
} as const;

export const extraRpcs = {
  "1": [
    "https://mainnet.eth.cloud.ava.do/",
    "https://ethereumnodelight.app.runonflux.io",
    "https://eth-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf",
    "https://main-light.eth.linkpool.io",
    "https://rpc.notadegen.com/eth",
    "https://eth.llamarpc.com",
    "https://endpoints.omniatech.io/v1/eth/mainnet/public",
    "https://go.getblock.io/d7dab8149ec04390aaa923ff2768f914",
    "https://ethereum-rpc.publicnode.com",
    "https://1rpc.io/eth",
    "https://rpc.builder0x69.io/",
    "https://rpc.mevblocker.io",
    "https://rpc.flashbots.net/",
    "https://eth-pokt.nodies.app",
    "https://rpc.payload.de",
    "https://api.zmok.io/mainnet/oaen6dy8ff6hju9k",
    "https://eth.meowrpc.com",
    "https://eth.drpc.org",
    "https://eth.merkle.io",
    "https://rpc.lokibuilder.xyz/wallet",
    "https://api.stateless.solutions/ethereum/v1/0ec6cac0-ecac-4247-8a41-1e685deadfe4",
    "https://rpc.polysplit.cloud/v1/chain/1",
    "https://rpc.tornadoeth.cash/eth",
    "https://rpc.tornadoeth.cash/mev"
  ],
  "2": [
    "https://node.eggs.cool",
    "https://node.expanse.tech"
  ],
  "3": [
    "https://rpc.ankr.com/eth_ropsten",
    "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
  ],
  "4": [
    "https://rpc.ankr.com/eth_rinkeby",
    "https://rinkeby.infura.io/3/9aa3d95b3bc440fa88ea12eaa4456161"
  ],
  "5": [
    "https://endpoints.omniatech.io/v1/eth/goerli/public",
    "https://ethereum-goerli-rpc.publicnode.com",
    "https://rpc.tornadoeth.cash/goerli"
  ],
  "6": [
    "https://www.ethercluster.com/kotti"
  ],
  "7": [
    "https://rpc.dome.cloud"
  ],
  "8": [
    "https://rpc.octano.dev"
  ],
  "10": [
    "https://mainnet.optimism.io/",
    "https://optimism.llamarpc.com",
    "https://1rpc.io/op",
    "https://op-pokt.nodies.app",
    "https://endpoints.omniatech.io/v1/op/mainnet/public",
    "https://optimism-rpc.publicnode.com",
    "https://optimism.meowrpc.com",
    "https://optimism.drpc.org",
    "https://api.stateless.solutions/optimism/v1/f373feb1-c8e4-41c9-bb74-2c691988dd34",
    "https://rpc.tornadoeth.cash/optimism"
  ],
  "11": [
    "https://api.metadium.com/dev"
  ],
  "14": [],
  "15": [
    "https://prenet.diode.io:8443/"
  ],
  "17": [
    "https://rpc.thaifi.com"
  ],
  "19": [
    "https://songbird.towolabs.com/rpc"
  ],
  "20": [
    "https://api.elastos.io/esc",
    "https://api.trinity-tech.io/esc"
  ],
  "22": [
    "https://api.trinity-tech.io/eid",
    "https://api.elastos.io/eid"
  ],
  "24": [
    "https://rpc.kardiachain.io"
  ],
  "25": [
    "https://evm.cronos.org",
    "https://cronos-rpc.elk.finance/",
    "https://cronos-evm-rpc.publicnode.com",
    "https://1rpc.io/cro"
  ],
  "27": [
    "https://rpc.shibachain.net"
  ],
  "29": [
    "https://rpc.genesisl1.org"
  ],
  "30": [
    "https://public-node.rsk.co"
  ],
  "33": [
    "https://rpc.goodata.io"
  ],
  "35": [
    "https://rpc.tbwg.io"
  ],
  "38": [
    "https://rpc.valorbit.com/v2"
  ],
  "40": [
    "https://mainnet.telos.net/evm",
    "https://rpc1.eu.telos.net/evm",
    "https://rpc1.us.telos.net/evm",
    "https://rpc2.us.telos.net/evm",
    "https://api.kainosbp.com/evm",
    "https://rpc2.eu.telos.net/evm",
    "https://evm.teloskorea.com/evm",
    "https://rpc2.teloskorea.com/evm",
    "https://rpc01.us.telosunlimited.io/evm",
    "https://rpc02.us.telosunlimited.io/evm",
    "https://1rpc.io/telos/evm"
  ],
  "44": [],
  "50": [
    "https://rpc.xdcrpc.com",
    "https://rpc1.xinfin.network",
    "https://erpc.xinfin.network",
    "https://rpc.xinfin.network",
    "https://erpc.xdcrpc.com",
    "https://rpc.xdc.org"
  ],
  "51": [
    "https://rpc.apothem.network",
    "https://erpc.apothem.network",
    "https://apothem.xdcrpc.com"
  ],
  "52": [
    "https://rpc.coinex.net/",
    "https://rpc1.coinex.net/",
    "https://rpc2.coinex.net/",
    "https://rpc3.coinex.net/",
    "https://rpc4.coinex.net/"
  ],
  "55": [
    "https://rpc-1.zyx.network/",
    "https://rpc-2.zyx.network/",
    "https://rpc-3.zyx.network/",
    "https://rpc-5.zyx.network/"
  ],
  "56": [
    "https://bsc-dataseed.bnbchain.org/",
    "https://bsc-dataseed1.defibit.io/",
    "https://bsc-dataseed1.ninicoin.io/",
    "https://bsc-dataseed2.defibit.io/",
    "https://bsc-dataseed3.defibit.io/",
    "https://bsc-dataseed4.defibit.io/",
    "https://bsc-dataseed2.ninicoin.io/",
    "https://bsc-dataseed3.ninicoin.io/",
    "https://bsc-dataseed4.ninicoin.io/",
    "https://bsc-dataseed1.bnbchain.org/",
    "https://bsc-dataseed2.bnbchain.org/",
    "https://bsc-dataseed3.bnbchain.org/",
    "https://bsc-dataseed4.bnbchain.org/",
    "https://bsc-dataseed6.dict.life/",
    "https://bscrpc.com",
    "https://bsc.rpcgator.com/",
    "https://bsc-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf",
    "https://nodes.vefinetwork.org/smartchain",
    "https://binance.llamarpc.com",
    "https://endpoints.omniatech.io/v1/bsc/mainnet/public",
    "https://bsc-pokt.nodies.app",
    "https://1rpc.io/bnb",
    "https://bsc-rpc.publicnode.com",
    "https://bsc.meowrpc.com",
    "https://bsc.drpc.org",
    "https://rpc.polysplit.cloud/v1/chain/56",
    "https://rpc.tornadoeth.cash/bsc"
  ],
  "57": [
    "https://rpc.syscoin.org",
    "https://syscoin-evm-rpc.publicnode.com"
  ],
  "58": [
    "https://dappnode1.ont.io:10339",
    "https://dappnode2.ont.io:10339",
    "https://dappnode3.ont.io:10339",
    "https://dappnode4.ont.io:10339"
  ],
  "59": [
    "https://api.eosargentina.io",
    "https://api.metahub.cash"
  ],
  "60": [
    "https://rpc.gochain.io"
  ],
  "61": [
    "https://etc.mytokenpocket.vip",
    "https://rpc.etcinscribe.com",
    "https://etc.etcdesktop.com",
    "https://etc.rivet.link"
  ],
  "62": [
    "https://www.ethercluster.com/morden"
  ],
  "63": [
    "https://rpc.mordor.etccooperative.org"
  ],
  "64": [],
  "66": [
    "https://exchainrpc.okex.org",
    "https://1rpc.io/oktc"
  ],
  "68": [],
  "70": [
    "https://http-mainnet.hoosmartchain.com"
  ],
  "74": [
    "https://idchain.one/rpc/"
  ],
  "76": [],
  "77": [
    "https://sokol.poa.network"
  ],
  "78": [
    "https://ethnode.primusmoney.com/mainnet"
  ],
  "79": [
    "https://dataserver-us-1.zenithchain.co/",
    "https://dataserver-asia-3.zenithchain.co/",
    "https://dataserver-asia-4.zenithchain.co/",
    "https://dataserver-asia-2.zenithchain.co/"
  ],
  "80": [],
  "82": [
    "https://rpc.meter.io"
  ],
  "86": [
    "https://evm.gatenode.cc"
  ],
  "87": [
    "https://rpc.novanetwork.io:9070",
    "https://dev.rpc.novanetwork.io/"
  ],
  "88": [
    "https://rpc.tomochain.com"
  ],
  "90": [
    "https://s0.garizon.net/rpc"
  ],
  "91": [
    "https://s1.garizon.net/rpc"
  ],
  "92": [
    "https://s2.garizon.net/rpc"
  ],
  "93": [
    "https://s3.garizon.net/rpc"
  ],
  "96": [
    "https://rpc.bitkubchain.io"
  ],
  "97": [
    "https://bsctestapi.terminet.io/rpc",
    "https://endpoints.omniatech.io/v1/bsc/testnet/public",
    "https://bsc-testnet-rpc.publicnode.com"
  ],
  "99": [
    "https://core.poanetwork.dev"
  ],
  "100": [
    "https://rpc.gnosischain.com",
    "https://xdai-archive.blockscout.com",
    "https://gnosis-pokt.nodies.app",
    "https://gnosis.drpc.org",
    "https://endpoints.omniatech.io/v1/gnosis/mainnet/public",
    "https://gnosis-rpc.publicnode.com",
    "https://1rpc.io/gnosis",
    "https://rpc.tornadoeth.cash/gnosis"
  ],
  "101": [],
  "106": [
    "https://evmexplorer.velas.com/rpc",
    "https://velas-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf"
  ],
  "108": [
    "https://mainnet-rpc.thundercore.com"
  ],
  "111": [
    "https://rpc.etherlite.org"
  ],
  "119": [
    "https://evmapi.nuls.io",
    "https://evmapi2.nuls.io"
  ],
  "122": [
    "https://rpc.fuse.io",
    "https://fuse-pokt.nodies.app"
  ],
  "123": [
    "https://rpc.fusespark.io"
  ],
  "124": [],
  "126": [
    "https://rpc.mainnet.oychain.io",
    "https://rpc.oychain.io"
  ],
  "127": [],
  "128": [
    "https://http-mainnet.hecochain.com",
    "https://http-mainnet-node.huobichain.com",
    "https://hecoapi.terminet.io/rpc"
  ],
  "131": [
    "https://tokioswift.engram.tech",
    "https://tokio-archive.engram.tech"
  ],
  "137": [
    "https://rpc-mainnet.maticvigil.com",
    "https://polygon-rpc.com",
    "https://rpc-mainnet.matic.network",
    "https://matic-mainnet-full-rpc.bwarelabs.com",
    "https://matic-mainnet-archive-rpc.bwarelabs.com",
    "https://polygonapi.terminet.io/rpc",
    "https://polygon-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf",
    "https://polygon-mainnet-public.unifra.io",
    "https://polygon.llamarpc.com",
    "https://endpoints.omniatech.io/v1/matic/mainnet/public",
    "https://polygon-pokt.nodies.app",
    "https://1rpc.io/matic",
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon.drpc.org",
    "https://polygon.meowrpc.com",
    "https://getblock.io/nodes/matic/",
    "https://api.stateless.solutions/polygon/v1/5850f066-209e-4e3c-a294-0757a4eb34b3",
    "https://rpc.tornadoeth.cash/polygon"
  ],
  "142": [
    "https://rpc.prodax.io"
  ],
  "163": [
    "https://node.mainnet.lightstreams.io"
  ],
  "167": [
    "https://node.atoshi.io",
    "https://node2.atoshi.io",
    "https://node3.atoshi.io"
  ],
  "169": [
    "https://pacific-rpc.manta.network/http",
    "https://1rpc.io/manta"
  ],
  "186": [
    "https://rpc.seelen.pro/"
  ],
  "188": [
    "https://mainnet.bmcchain.com/"
  ],
  "195": [],
  "199": [
    "https://rpc.bittorrentchain.io/"
  ],
  "200": [
    "https://arbitrum.xdaichain.com"
  ],
  "204": [
    "https://opbnb-rpc.publicnode.com",
    "https://1rpc.io/opbnb"
  ],
  "211": [],
  "217": [
    "https://rpc2.siriusnet.io"
  ],
  "222": [
    "https://blockchain-api-mainnet.permission.io/rpc"
  ],
  "246": [
    "https://rpc.energyweb.org"
  ],
  "248": [
    "https://oasys-mainnet.gateway.pokt.network/v1/lb/c967bd31",
    "https://oasys-mainnet-archival.gateway.pokt.network/v1/lb/c967bd31"
  ],
  "250": [
    "https://rpcapi.fantom.network",
    "https://rpc.ftm.tools/",
    "https://rpc.fantom.network",
    "https://rpc2.fantom.network",
    "https://rpc3.fantom.network",
    "https://endpoints.omniatech.io/v1/fantom/mainnet/public",
    "https://fantom-pokt.nodies.app",
    "https://1rpc.io/ftm",
    "https://fantom-rpc.publicnode.com",
    "https://fantom.drpc.org"
  ],
  "255": [
    "https://1rpc.io/kroma"
  ],
  "256": [
    "https://hecotestapi.terminet.io/rpc"
  ],
  "258": [],
  "262": [
    "https://sur.nilin.org"
  ],
  "288": [
    "https://mainnet.boba.network/",
    "https://1rpc.io/boba/eth"
  ],
  "300": [],
  "311": [
    "https://mainapi.omaxray.com/"
  ],
  "314": [
    "https://api.node.glif.io",
    "https://node.filutils.com/rpc/v1",
    "https://api.chain.love/rpc/v1"
  ],
  "321": [
    "https://rpc-mainnet.kcc.network",
    "https://kcc.mytokenpocket.vip",
    "https://kcc-rpc.com"
  ],
  "324": [
    "https://zksync.meowrpc.com",
    "https://zksync.drpc.org",
    "https://1rpc.io/zksync2-era"
  ],
  "333": [],
  "336": [
    "https://rpc.shiden.astar.network:8545/"
  ],
  "338": [
    "https://evm-t3.cronos.org/"
  ],
  "361": [
    "https://eth-rpc-api.thetatoken.org/rpc"
  ],
  "369": [
    "https://rpc.pulsechain.com",
    "https://rpc-pulsechain.g4mm4.io",
    "https://evex.cloud/pulserpc",
    "https://pulse-s.projectpi.xyz",
    "https://pulsechain-rpc.publicnode.com"
  ],
  "385": [],
  "416": [
    "https://rpc.sx.technology"
  ],
  "420": [
    "https://endpoints.omniatech.io/v1/op/goerli/public",
    "https://optimism-goerli-rpc.publicnode.com"
  ],
  "463": [
    "https://mainnet-rpc.areon.network",
    "https://mainnet-rpc2.areon.network",
    "https://mainnet-rpc3.areon.network",
    "https://mainnet-rpc4.areon.network",
    "https://mainnet-rpc5.areon.network"
  ],
  "499": [],
  "512": [
    "https://rpc.acuteangle.com"
  ],
  "530": [
    "https://fx-json-web3.portfolio-x.xyz:8545/"
  ],
  "555": [
    "https://rpc.velaverse.io"
  ],
  "558": [
    "https://rpc.tao.network"
  ],
  "570": [
    "https://rpc.rollux.com",
    "https://rollux.rpc.syscoin.org"
  ],
  "592": [
    "https://evm.astar.network/",
    "https://rpc.astar.network:8545",
    "https://getblock.io/nodes/bsc/",
    "https://1rpc.io/astr"
  ],
  "595": [],
  "686": [
    "https://eth-rpc-karura.aca-staging.network",
    "https://rpc.evm.karura.network"
  ],
  "707": [],
  "777": [
    "https://node.cheapeth.org/rpc"
  ],
  "787": [
    "https://eth-rpc-acala.aca-staging.network",
    "https://rpc.evm.acala.network"
  ],
  "803": [],
  "813": [
    "https://mainnet.meerlabs.com"
  ],
  "820": [
    "https://rpc.callisto.network",
    "https://clo-geth.0xinfra.com/"
  ],
  "880": [],
  "888": [
    "https://gwan-ssl.wandevs.org:56891",
    "https://gwan2-ssl.wandevs.org"
  ],
  "943": [
    "https://pulsetest-s.projectpi.xyz",
    "https://pulsechain-testnet-rpc.publicnode.com"
  ],
  "977": [],
  "998": [],
  "1001": [
    "https://public-en-baobab.klaytn.net"
  ],
  "1003": [],
  "1010": [
    "https://meta.evrice.com"
  ],
  "1012": [
    "https://global.rpc.mainnet.newtonproject.org"
  ],
  "1022": [],
  "1024": [
    "https://api-para.clover.finance"
  ],
  "1030": [
    "https://evm.confluxrpc.com",
    "https://conflux-espace-public.unifra.io"
  ],
  "1072": [
    "https://json-rpc.evm.testnet.shimmer.network/"
  ],
  "1088": [
    "https://andromeda.metis.io/?owner=1088",
    "https://metis-pokt.nodies.app"
  ],
  "1089": [
    "https://humans-mainnet-evm.itrocket.net"
  ],
  "1100": [
    "https://jsonrpc.dymension.nodestake.org",
    "https://evm-archive.dymd.bitszn.com",
    "https://dymension.liquify.com/json-rpc",
    "https://dymension-evm.kynraze.com"
  ],
  "1101": [
    "https://1rpc.io/polygon/zkevm",
    "https://polygon-zkevm.drpc.org"
  ],
  "1115": [
    "https://rpc.test.btcs.network"
  ],
  "1116": [
    "https://rpc.coredao.org",
    "https://core.public.infstones.com",
    "https://1rpc.io/core"
  ],
  "1130": [
    "https://dmc.mydefichain.com/mainnet",
    "https://dmc01.mydefichain.com/mainnet"
  ],
  "1131": [
    "https://dmc.mydefichain.com/testnet",
    "https://dmc01.mydefichain.com/testnet",
    "https://eth.testnet.ocean.jellyfishsdk.com/"
  ],
  "1139": [
    "https://mathchain.maiziqianbao.net/rpc"
  ],
  "1197": [],
  "1202": [],
  "1213": [
    "https://dataseed.popcateum.org"
  ],
  "1214": [],
  "1231": [
    "https://ultron-rpc.net"
  ],
  "1246": [
    "https://rpc-cnx.omplatform.com"
  ],
  "1280": [
    "https://nodes.halo.land"
  ],
  "1284": [
    "https://rpc.api.moonbeam.network",
    "https://1rpc.io/glmr",
    "https://endpoints.omniatech.io/v1/moonbeam/mainnet/public",
    "https://moonbeam-rpc.publicnode.com"
  ],
  "1285": [
    "https://moonriver-rpc.publicnode.com"
  ],
  "1287": [
    "https://rpc.testnet.moonbeam.network"
  ],
  "1288": [],
  "1338": [
    "https://rpc.atlantischain.network/"
  ],
  "1339": [
    "https://rpc.elysiumchain.tech/",
    "https://rpc.elysiumchain.us/"
  ],
  "1440": [],
  "1442": [],
  "1501": [
    "https://rpc-canary-1.bevm.io/",
    "https://rpc-canary-2.bevm.io/"
  ],
  "1506": [
    "https://mainnet.sherpax.io/rpc"
  ],
  "1515": [
    "https://beagle.chat/eth"
  ],
  "1618": [
    "https://send.catechain.com"
  ],
  "1620": [],
  "1657": [
    "https://dataseed1.btachain.com/"
  ],
  "1707": [
    "https://rpc.blockchain.or.th"
  ],
  "1708": [
    "https://rpc.testnet.blockchain.or.th"
  ],
  "1856": [],
  "1881": [
    "https://rpc.cartenz.works"
  ],
  "1972": [
    "https://rpc2.redecoin.eu"
  ],
  "1975": [
    "https://rpc.onuschain.io"
  ],
  "1987": [],
  "2000": [
    "https://rpc.dogechain.dog",
    "https://rpc-us.dogechain.dog",
    "https://rpc-sg.dogechain.dog",
    "https://rpc.dogechain.dog",
    "https://rpc01-sg.dogechain.dog",
    "https://rpc02-sg.dogechain.dog",
    "https://rpc03-sg.dogechain.dog"
  ],
  "2016": [
    "https://eu-rpc.mainnetz.io"
  ],
  "2021": [
    "https://mainnet2.edgewa.re/evm",
    "https://mainnet3.edgewa.re/evm",
    "https://edgeware-evm.jelliedowl.net/"
  ],
  "2025": [
    "https://mainnet.rangersprotocol.com/api/jsonrpc"
  ],
  "2049": [
    "https://msc-rpc.movoscan.com/"
  ],
  "2077": [],
  "2100": [
    "https://api.ecoball.org/ecoball/"
  ],
  "2213": [
    "https://seed4.evanesco.org:8546"
  ],
  "2222": [
    "https://evm.kava.io",
    "https://kava-evm-rpc.publicnode.com",
    "https://kava-pokt.nodies.app"
  ],
  "2323": [],
  "2332": [],
  "2458": [],
  "2468": [],
  "2559": [],
  "2612": [
    "https://api.ezchain.com/ext/bc/C/rpc"
  ],
  "3501": [
    "https://rpc.jfinchain.com"
  ],
  "3639": [
    "https://rpc.ichainscan.com"
  ],
  "3690": [],
  "4002": [
    "https://rpc.testnet.fantom.network/",
    "https://endpoints.omniatech.io/v1/fantom/testnet/public",
    "https://fantom-testnet-rpc.publicnode.com"
  ],
  "4139": [
    "https://humans-testnet-evm.itrocket.net"
  ],
  "4181": [
    "https://rpc1.phi.network"
  ],
  "4444": [
    "https://janus.htmlcoin.dev/janus/"
  ],
  "4689": [
    "https://babel-api.mainnet.iotex.io",
    "https://babel-api.mainnet.iotex.one",
    "https://babel-api.fastblocks.io"
  ],
  "5000": [
    "https://mantle-rpc.publicnode.com",
    "https://mantle.drpc.org",
    "https://1rpc.io/mantle"
  ],
  "5050": [
    "https://rpc.liquidchain.net/",
    "https://rpc.xlcscan.com/"
  ],
  "5165": [
    "https://bahamut-rpc.publicnode.com"
  ],
  "5177": [],
  "5197": [
    "https://mainnet.eraswap.network"
  ],
  "5315": [],
  "5551": [
    "https://l2.nahmii.io/"
  ],
  "5700": [
    "https://rollux.rpc.tanenbaum.io",
    "https://syscoin-tanenbaum-evm-rpc.publicnode.com"
  ],
  "5729": [
    "https://rpc-testnet.hika.network"
  ],
  "5869": [
    "https://proxy.wegochain.io"
  ],
  "6363": [
    "https://dsc-rpc.digitsoul.co.th"
  ],
  "6626": [
    "https://http-mainnet.chain.pixie.xyz"
  ],
  "6688": [
    "https://iris-evm-rpc.publicnode.com"
  ],
  "7000": [
    "https://zeta.rpcgrid.com"
  ],
  "7001": [],
  "7070": [
    "https://planq-rpc.nodies.app",
    "https://jsonrpc.planq.nodestake.top/"
  ],
  "7341": [
    "https://rpc.shyft.network/"
  ],
  "7700": [
    "https://canto.gravitychain.io/",
    "https://canto.evm.chandrastation.com/",
    "https://jsonrpc.canto.nodestake.top/",
    "https://canto.dexvaults.com/",
    "https://canto-rpc.ansybl.io"
  ],
  "7777": [
    "https://testnet1.rotw.games",
    "https://testnet2.rotw.games",
    "https://testnet3.rotw.games",
    "https://testnet4.rotw.games",
    "https://testnet5.rotw.games"
  ],
  "7895": [],
  "8000": [
    "https://dataseed.testnet.teleport.network"
  ],
  "8081": [],
  "8082": [],
  "8131": [
    "https://testnet.meerlabs.com"
  ],
  "8217": [
    "https://public-en-cypress.klaytn.net",
    "https://1rpc.io/klay",
    "https://klaytn-pokt.nodies.app",
    "https://klaytn.drpc.org"
  ],
  "8453": [
    "https://mainnet.base.org",
    "https://developer-access-mainnet.base.org",
    "https://rpc.notadegen.com/base",
    "https://base.llamarpc.com",
    "https://1rpc.io/base",
    "https://base-pokt.nodies.app",
    "https://base.meowrpc.com",
    "https://base-rpc.publicnode.com",
    "https://base.drpc.org",
    "https://endpoints.omniatech.io/v1/base/mainnet/public"
  ],
  "8899": [
    "https://rpc-l1.jibchain.net",
    "https://jib-rpc.inan.in.th",
    "https://rpc-l1.jbc.aomwara.in.th",
    "https://rpc-l1.jbc.xpool.pw"
  ],
  "8995": [
    "https://core.bloxberg.org"
  ],
  "9000": [
    "https://evmos-testnet-json.qubelabs.io",
    "https://evmos-tjson.antrixy.org",
    "https://evmos-testnet-rpc.kingsuper.services",
    "https://rpc.evmos.test.theamsolutions.info",
    "https://api.evmos-test.theamsolutions.info",
    "https://rpc.evmos.testnet.node75.org",
    "https://rpc-evm.testnet.evmos.dragonstake.io",
    "https://evmos-testnet-rpc.stake-town.com",
    "https://evmos-testnet-jsonrpc.stake-town.com",
    "https://api.evmos-test.theamsolutions.info",
    "https://jsonrpc-t.evmos.nodestake.top",
    "https://evmos-testnet-jsonrpc.autostake.com",
    "https://evmos-testnet-jsonrpc.alkadeta.com",
    "https://evm-rpc.evmost.silentvalidator.com",
    "https://testnet-evm-rpc-evmos.hoodrun.io",
    "https://alphab.ai/rpc/eth/evmos_testnet",
    "https://t-evmos-jsonrpc.kalia.network",
    "https://jsonrpc-evmos-testnet.mzonder.com",
    "https://evmos-testnet.lava.build/lava-referer-16223de7-12c0-49f3-8d87-e5f1e6a0eb3b"
  ],
  "9001": [
    "https://jsonrpc-evmos.goldenratiostaking.net",
    "https://eth.bd.evmos.org:8545/",
    "https://evmos-json-rpc.stakely.io",
    "https://jsonrpc-evmos-ia.cosmosia.notional.ventures",
    "https://json-rpc.evmos.blockhunters.org",
    "https://evmos-json-rpc.agoranodes.com",
    "https://evmos-json.antrixy.org",
    "https://jsonrpc.evmos.nodestake.top",
    "https://evmos-jsonrpc.alkadeta.com",
    "https://evmos-json.qubelabs.io",
    "https://evmos-rpc.theamsolutions.info",
    "https://evmos-api.theamsolutions.info",
    "https://evmos-jsonrpc.theamsolutions.info",
    "https://evm-rpc-evmos.hoodrun.io",
    "https://evmos-json-rpc.0base.dev",
    "https://json-rpc.evmos.tcnetwork.io",
    "https://rpc-evm.evmos.dragonstake.io",
    "https://evmosevm.rpc.stakin-nodes.com",
    "https://evmos-jsonrpc.stake-town.com",
    "https://json-rpc-evmos.mainnet.validatrium.club",
    "https://rpc-evmos.imperator.co",
    "https://evm-rpc.evmos.silentvalidator.com",
    "https://alphab.ai/rpc/eth/evmos",
    "https://evmos-jsonrpc.kalia.network",
    "https://jsonrpc-evmos.mzonder.com",
    "https://evmos-pokt.nodies.app",
    "https://evmos-evm-rpc.publicnode.com"
  ],
  "9100": [],
  "10000": [
    "https://smartbch.fountainhead.cash/mainnet",
    "https://global.uat.cash",
    "https://rpc.uatvo.com"
  ],
  "10086": [],
  "10101": [
    "https://eu.mainnet.xixoio.com"
  ],
  "10200": [
    "https://rpc.chiadochain.net",
    "https://gnosis-chiado-rpc.publicnode.com",
    "https://1rpc.io/gnosis"
  ],
  "10248": [],
  "11111": [
    "https://api.trywagmi.xyz/rpc"
  ],
  "11235": [
    "https://haqq-evm-rpc.publicnode.com"
  ],
  "12052": [
    "https://zerorpc.singularity.gold"
  ],
  "13000": [
    "https://rpc.ssquad.games"
  ],
  "13381": [
    "https://rpc.phoenixplorer.com/"
  ],
  "15551": [],
  "15557": [],
  "16000": [],
  "17000": [
    "https://ethereum-holesky-rpc.publicnode.com",
    "https://1rpc.io/holesky",
    "https://holesky-rpc.nocturnode.tech"
  ],
  "17777": [],
  "18159": [
    "https://mainnet-rpc.memescan.io/",
    "https://mainnet-rpc2.memescan.io/",
    "https://mainnet-rpc3.memescan.io/",
    "https://mainnet-rpc4.memescan.io/"
  ],
  "19845": [],
  "21816": [
    "https://seed.omlira.com"
  ],
  "23294": [
    "https://1rpc.io/oasis/sapphire"
  ],
  "24484": [],
  "24734": [
    "https://node1.mintme.com"
  ],
  "31102": [],
  "32520": [
    "https://rpc.icecreamswap.com",
    "https://nodes.vefinetwork.org/bitgert",
    "https://flux-rpc.brisescan.com",
    "https://flux-rpc1.brisescan.com",
    "https://flux-rpc2.brisescan.com",
    "https://rpc-1.chainrpc.com",
    "https://rpc-2.chainrpc.com",
    "https://node1.serverrpc.com",
    "https://node2.serverrpc.com"
  ],
  "32659": [
    "https://mainnet.fusionnetwork.io"
  ],
  "34443": [
    "https://1rpc.io/mode"
  ],
  "35011": [],
  "35441": [],
  "39797": [
    "https://nodeapi.energi.network",
    "https://explorer.energi.network/api/eth-rpc"
  ],
  "39815": [
    "https://mainnet.oho.ai",
    "https://mainnet-rpc.ohoscan.com",
    "https://mainnet-rpc2.ohoscan.com"
  ],
  "42069": [],
  "42161": [
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum.llamarpc.com",
    "https://1rpc.io/arb",
    "https://arb-pokt.nodies.app",
    "https://endpoints.omniatech.io/v1/arbitrum/one/public",
    "https://arbitrum-one-rpc.publicnode.com",
    "https://arbitrum.meowrpc.com",
    "https://arbitrum.drpc.org",
    "https://rpc.tornadoeth.cash/arbitrum"
  ],
  "42170": [
    "https://nova.arbitrum.io/rpc",
    "https://arbitrum-nova-rpc.publicnode.com",
    "https://arbitrum-nova.drpc.org"
  ],
  "42220": [
    "https://forno.celo.org",
    "https://1rpc.io/celo"
  ],
  "42262": [
    "https://emerald.oasis.dev/",
    "https://1rpc.io/oasis/emerald"
  ],
  "43110": [],
  "43113": [
    "https://api.avax-test.network/ext/bc/C/rpc",
    "https://avalanchetestapi.terminet.io/ext/bc/C/rpc",
    "https://endpoints.omniatech.io/v1/avax/fuji/public",
    "https://avalanche-fuji-c-chain-rpc.publicnode.com"
  ],
  "43114": [
    "https://api.avax.network/ext/bc/C/rpc",
    "https://avalanche.public-rpc.com",
    "https://avalancheapi.terminet.io/ext/bc/C/rpc",
    "https://avalanche-c-chain-rpc.publicnode.com",
    "https://1rpc.io/avax/c",
    "https://avax-pokt.nodies.app/ext/bc/C/rpc",
    "https://endpoints.omniatech.io/v1/avax/mainnet/public",
    "https://avax.meowrpc.com",
    "https://avalanche.drpc.org",
    "https://rpc.tornadoeth.cash/avax"
  ],
  "45000": [
    "https://rpc.autobahn.network"
  ],
  "47805": [
    "https://rpc.rei.network"
  ],
  "50001": [
    "https://rpc.oracle.liveplex.io"
  ],
  "53935": [
    "https://avax-pokt.nodies.app/ext/bc/q2aTwKuyzgs8pynF7UXBZCU7DejbZbZ6EUyHr3JQzYgwNPUPi/rpc"
  ],
  "55555": [
    "https://rei-rpc.moonrhythm.io"
  ],
  "59140": [],
  "59144": [
    "https://1rpc.io/linea",
    "https://linea.drpc.org",
    "https://linea.decubate.com"
  ],
  "63000": [
    "https://rpc.ecredits.com"
  ],
  "70000": [],
  "70001": [
    "https://proxy1.thinkiumrpc.net/"
  ],
  "70002": [
    "https://proxy2.thinkiumrpc.net/"
  ],
  "70103": [
    "https://proxy103.thinkiumrpc.net/"
  ],
  "71394": [
    "https://mainnet.godwoken.io/rpc/eth-wallet"
  ],
  "80001": [
    "https://rpc-mumbai.maticvigil.com",
    "https://polygontestapi.terminet.io/rpc",
    "https://endpoints.omniatech.io/v1/matic/mumbai/public",
    "https://polygon-mumbai-bor-rpc.publicnode.com",
    "https://polygon-mumbai-pokt.nodies.app"
  ],
  "81457": [
    "https://rpc.blast.io",
    "https://blast.din.dev/rpc",
    "https://blastl2-mainnet.public.blastapi.io",
    "https://blast.blockpi.network/v1/rpc/public"
  ],
  "84531": [
    "https://1rpc.io/base-goerli",
    "https://base-goerli-rpc.publicnode.com",
    "https://endpoints.omniatech.io/v1/base/goerli/public"
  ],
  "84532": [
    "https://rpc.notadegen.com/base/sepolia"
  ],
  "99999": [
    "https://rpc.uschain.network"
  ],
  "100000": [],
  "100001": [],
  "100002": [],
  "100003": [],
  "100004": [],
  "100005": [],
  "100006": [],
  "100007": [],
  "100008": [],
  "103090": [
    "https://evm.cryptocurrencydevs.org",
    "https://rpc.crystaleum.org"
  ],
  "108801": [],
  "110000": [],
  "110001": [],
  "110002": [],
  "110003": [],
  "110004": [],
  "110005": [],
  "110006": [],
  "110007": [],
  "110008": [],
  "142857": [],
  "167008": [],
  "200625": [
    "https://boot2.akroma.org/"
  ],
  "201018": [
    "https://openapi.alaya.network/rpc"
  ],
  "210425": [],
  "246529": [],
  "256256": [
    "https://mainnet.block.caduceus.foundation"
  ],
  "281121": [],
  "314159": [],
  "333999": [
    "https://rpc.polis.tech"
  ],
  "363636": [
    "https://dgs-rpc.digitsoul.co.th"
  ],
  "420420": [
    "https://mainnet.kekchain.com",
    "https://rpc2.kekchain.com",
    "https://kek.interchained.org",
    "https://kekchain.interchained.org"
  ],
  "420666": [
    "https://testnet.kekchain.com"
  ],
  "421613": [
    "https://endpoints.omniatech.io/v1/arbitrum/goerli/public",
    "https://arbitrum-goerli-rpc.publicnode.com",
    "https://api.stateless.solutions/arbitrum-one/v1/77abba85-53e4-4430-a332-a46deb9900ea"
  ],
  "421614": [],
  "431140": [
    "https://rpc.markr.io/ext/"
  ],
  "512512": [
    "https://galaxy.block.caduceus.foundation"
  ],
  "534351": [
    "https://scroll-sepolia.drpc.org",
    "https://scroll-testnet.rpc.grove.city/v1/a7a7c8e2"
  ],
  "534352": [
    "https://rpc.scroll.io",
    "https://rpc-scroll.icecreamswap.com",
    "https://1rpc.io/scroll",
    "https://scroll.drpc.org",
    "https://scroll-mainnet.rpc.grove.city/v1/a7a7c8e2"
  ],
  "534353": [],
  "534354": [
    "https://prealpha-rpc.scroll.io/l2"
  ],
  "827431": [
    "https://mainnet-rpc.curvescan.io"
  ],
  "888888": [
    "https://infragrid.v.network/ethereum/compatible"
  ],
  "900000": [
    "https://api.posichain.org",
    "https://api.s0.posichain.org"
  ],
  "955305": [
    "https://host-76-74-28-226.contentfabric.io/eth/"
  ],
  "1313114": [
    "https://rpc.ethoprotocol.com"
  ],
  "1313500": [
    "https://rpc.xerom.org"
  ],
  "2099156": [
    "https://mainnet.plian.io/pchain"
  ],
  "7762959": [],
  "8007736": [
    "https://mainnet.plian.io/child_0"
  ],
  "10067275": [
    "https://testnet.plian.io/child_test"
  ],
  "11155111": [
    "https://rpc.notadegen.com/eth/sepolia",
    "https://endpoints.omniatech.io/v1/eth/sepolia/public",
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://1rpc.io/sepolia"
  ],
  "11155420": [],
  "13371337": [],
  "16658437": [
    "https://testnet.plian.io/testnet"
  ],
  "18289463": [],
  "20181205": [
    "https://hz.rpc.qkiscan.cn",
    "https://rpc1.qkiscan.cn",
    "https://rpc2.qkiscan.cn",
    "https://rpc3.qkiscan.cn",
    "https://rpc1.qkiscan.io",
    "https://rpc2.qkiscan.io",
    "https://rpc3.qkiscan.io"
  ],
  "28945486": [],
  "35855456": [
    "https://node.joys.digital"
  ],
  "61717561": [
    "https://c.onical.org"
  ],
  "88888888": [
    "https://rpc.teamblockchain.team"
  ],
  "168587773": [],
  "192837465": [
    "https://mainnet.gather.network"
  ],
  "245022926": [
    "https://devnet.neonevm.org"
  ],
  "245022934": [
    "https://neon-proxy-mainnet.solana.p2p.org",
    "https://neon-mainnet.everstake.one"
  ],
  "311752642": [
    "https://mainnet-rpc.oneledger.network"
  ],
  "356256156": [
    "https://testnet.gather.network"
  ],
  "486217935": [
    "https://devnet.gather.network"
  ],
  "1122334455": [],
  "1313161554": [
    "https://mainnet.aurora.dev",
    "https://endpoints.omniatech.io/v1/aurora/mainnet/public",
    "https://1rpc.io/aurora",
    "https://aurora.drpc.org"
  ],
  "1313161555": [
    "https://endpoints.omniatech.io/v1/aurora/testnet/public"
  ],
  "1313161556": [],
  "1666600000": [
    "https://api.harmony.one",
    "https://a.api.s0.t.hmny.io",
    "https://api.s0.t.hmny.io",
    "https://1rpc.io/one",
    "https://hmyone-pokt.nodies.app",
    "https://endpoints.omniatech.io/v1/harmony/mainnet-0/public"
  ],
  "1666600001": [
    "https://s1.api.harmony.one"
  ],
  "1666600002": [
    "https://s2.api.harmony.one"
  ],
  "1666600003": [],
  "1666700000": [
    "https://endpoints.omniatech.io/v1/harmony/testnet-0/public"
  ],
  "2021121117": [],
  "3125659152": [],
  "11297108109": [],
  "836542336838601": [],
  "11297108099": [],
  "197710212030": [
    "https://rpc.ntity.io"
  ],
  "6022140761023": [
    "https://molereum.jdubedition.com"
  ]
};
