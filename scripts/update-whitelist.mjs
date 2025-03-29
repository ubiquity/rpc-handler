import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const chainlistGeneratedPath = path.join(projectRoot, 'lib/chainlist/out/rpcs.json');
const ourWhitelistPath = path.join(projectRoot, 'src/rpc-whitelist.json');

async function updateWhitelist() {
  console.log('Starting whitelist update...');

  try {
    // 1. Read the generated Chainlist rpcs.json
    console.log(`Reading generated Chainlist data from: ${chainlistGeneratedPath}`);
    const chainlistRaw = await fs.readFile(chainlistGeneratedPath, 'utf-8');
    // Assuming the generated file is an array of objects like:
    // { chainId: number, rpc: string[], name: string, ... }
    // Adjust parsing if the structure is different
    const chainlistData = JSON.parse(chainlistRaw);
    console.log(`Successfully read ${chainlistData.length} entries from Chainlist data.`);

    // 2. Read our existing rpc-whitelist.json
    console.log(`Reading existing whitelist from: ${ourWhitelistPath}`);
    const ourWhitelistRaw = await fs.readFile(ourWhitelistPath, 'utf-8');
    const ourWhitelist = JSON.parse(ourWhitelistRaw);
    console.log(`Existing whitelist contains ${Object.keys(ourWhitelist.rpcs || {}).length} chains.`);

    // 3. Merge/Update Logic (NEEDS DEFINITION - Placeholder: Overwrite)
    console.log('Merging data (using Overwrite strategy - placeholder)...');
    const chainlistRpcsMap = chainlistData.reduce((acc, chain) => {
        // Filter for valid HTTPS URLs, excluding placeholders
        const validUrls = (chain.rpc || [])
            .filter(url => typeof url === 'string' && url.startsWith('https://') && !url.includes('${'));
        if (validUrls.length > 0) {
             acc[chain.chainId.toString()] = validUrls;
        }
       return acc;
    }, {});

    // Merge/Add strategy:
    console.log('Merging data (using Merge/Add strategy)...');
    for (const chainIdStr in chainlistRpcsMap) {
      const newUrls = chainlistRpcsMap[chainIdStr];
      // Ensure the rpcs object exists
      ourWhitelist.rpcs = ourWhitelist.rpcs || {};
      if (ourWhitelist.rpcs[chainIdStr]) {
        // Chain exists, merge URLs ensuring uniqueness
        const existingUrls = new Set(ourWhitelist.rpcs[chainIdStr]);
        let addedCount = 0;
        newUrls.forEach(url => {
          if (!existingUrls.has(url)) {
            existingUrls.add(url);
            addedCount++;
          }
        });
        ourWhitelist.rpcs[chainIdStr] = Array.from(existingUrls);
        if (addedCount > 0) {
           console.log(`Merged/Added ${addedCount} new URLs for chain ${chainIdStr}.`);
        } else {
           console.log(`No new URLs to add for existing chain ${chainIdStr}.`);
        }
      } else {
        // New chain, add it
        console.log(`Adding new chain ${chainIdStr} with ${newUrls.length} URLs from Chainlist data...`);
        ourWhitelist.rpcs[chainIdStr] = newUrls;
      }
    }
    // Note: This strategy doesn't remove chains present in our whitelist but missing from Chainlist.

    // 4. Write back the updated whitelist
    console.log(`Writing updated whitelist back to: ${ourWhitelistPath}`);
    await fs.writeFile(ourWhitelistPath, JSON.stringify(ourWhitelist, null, 2));

    console.log('Whitelist update completed successfully.');

  } catch (error) {
    console.error('Error updating whitelist:', error);
    process.exit(1); // Exit with error code
  }
}

updateWhitelist();
