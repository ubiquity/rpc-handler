import { appendFile, writeFile } from 'fs/promises';
import * as chainIdList from '../lib/chainlist/constants/chainIds.json';

/**
 * This produces dynamic types and constants for:
 * - networkIds
 * - networkNames
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

    // Clear the file
    await writeFile('types/dynamic.ts', '');


    await appendFile('types/dynamic.ts', `\nexport const chainIds = ${JSON.stringify(idToNetwork, null, 2)} as const;\n`);
    await appendFile('types/dynamic.ts', `\nexport const networks = ${JSON.stringify(networkToId, null, 2)} as const;\n`);
}

(async () => {
    await createDynamicTypes();
})().catch(console.error)
