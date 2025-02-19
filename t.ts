import { JsonRpcProvider } from "@ethersproject/providers";

async function getCode() {
    const provider = new JsonRpcProvider("http://localhost:8545");
    const tx = provider.prepareRequest("eth_getCode", ["0x000000000022d473030f116ddee9f6b43ac78ba3"]);
    console.log(tx);
    const txRec = await provider.getCode("0x000000000022d473030f116ddee9f6b43ac78ba3");
    console.log(txRec);
}

getCode().catch(console.error);

// https://gnosis.drpc.org