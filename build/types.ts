import { appendFile, writeFile } from 'fs/promises';
import chainIdList from '../lib/chainlist/constants/chainIds.json';
import chainlist from "../lib/chainlist/constants/extraRpcs";

/**
 * This produces dynamic types and constants for:
 * - networkIds
 * - networkNames
 * - extraRpcs
 */
async function createDynamicTypes() {
    const idToNetwork: Record<string, string> = {};
    const networkToId: Record<string, number> = {};

    for (const [id, name] of Object.entries(chainIdList)) {
        if (name === 'default') continue;
        if (typeof name === 'object') continue;
        const networkId = parseInt(id);
        idToNetwork[networkId] = name;
        networkToId[name] = networkId;
    }
    const extraRpcs: Record<string, string[]> = {};

    Object.keys(chainlist).forEach((networkId) => {
        const officialUrls = chainlist[networkId].rpcs.filter((rpc) => typeof rpc === "string");
        const extraUrls: string[] = chainlist[networkId].rpcs.filter((rpc) => rpc.url !== undefined && rpc.tracking === "none").map((rpc) => rpc.url);

        extraRpcs[networkId] = [...officialUrls, ...extraUrls].filter((rpc) => rpc.startsWith("https://"));
    });


    // Clear the file
    await writeFile('types/dynamic.ts', '');


    await appendFile('types/dynamic.ts', `\nexport const chainIds = ${JSON.stringify(idToNetwork, null, 2)} as const;\n`);
    await appendFile('types/dynamic.ts', `\nexport const networks = ${JSON.stringify(networkToId, null, 2)} as const;\n`);
    await appendFile('types/dynamic.ts', `\nexport const extraRpcs = ${JSON.stringify(extraRpcs, null, 2)};\n`);
}

(async () => {
    await createDynamicTypes();
})().catch(console.error)
