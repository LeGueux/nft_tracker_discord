import { searchCardsByCriterias, getDolzUsername } from './cometh-api.js';
import { computeNftHoldersStats } from './command-nft-holders.js';
import { analyzeListingsFragility } from './command-snipe.js';
import { buildNftTrackingEmbed } from './embeds.js';
import { getNFTData } from './utils.js';
import { IS_TEST_MODE, RARITY_ORDER } from './config.js';
import fs from 'fs/promises';
import path from 'path';

export async function handleNftTrackingForModel(modelId, nbHolders = 15, withAddress = false) {
    let dataCard = null;

    console.log(`handleNftTrackingForModel for modelId ${modelId} nbHolders: ${nbHolders} withAddress: ${withAddress}`);
    // In case API is too slow or down, we can use a local mock file
    // const dataRaw = await fs.readFile(path.resolve('./mocks/card_' + modelId + '.json'), 'utf-8');
    // dataCard = JSON.parse(dataRaw);
    dataCard = await searchCardsByCriterias({
        attributes: [{ 'Card Number': [modelId] }],
        limit: 2000,
    });
    console.log(`handleNftTrackingForModel for modelId ${modelId} - Cards found: ${dataCard.total}`);

    const nftHoldersStats = computeNftHoldersStats(dataCard, {
        topX: nbHolders,
        minCardsPerModel: 1,
    }, false);

    if (IS_TEST_MODE) {
        console.log(`📊 Nombre de wallets par modèle :`);
        console.table(nftHoldersStats.walletsPerModel);

        console.log(`🐋 Top whales (min X cartes) par modèle:`);
        for (const [modelId, topList] of Object.entries(nftHoldersStats.topWalletsPerModel)) {
            console.log(`\n📦 ${modelId} – ${nftHoldersStats.cardsPerModel[modelId]} cartes totales`);
            console.table(topList, ['wallet', 'total', 'listed', 'percentOwned', ...RARITY_ORDER]);
            // for (const item of topList) {
            //     const holderUsernameData = await getDolzUsername(item.wallet);
            //     const holderUsername = (holderUsernameData[0]?.duUsername ?? '').split('#')[0];
            //     console.log(`\nWallet: ${item.wallet} - username: ${holderUsername} - Total: ${item.total} - Listed: ${item.listed}`);
            // }
        }
    }

    const snipeStats = analyzeListingsFragility(dataCard, false);
    if (IS_TEST_MODE) {
        console.table(snipeStats.map(item => {
            const gaps = {};
            for (let i = 0; i < 5; i++) {
                const gapObj = item.simulatedGaps[i];
                const gapValue = gapObj?.priceGapPercent;
                gaps[`Gap ↑ After ${i + 1} Buy`] = gapValue !== null && gapValue !== undefined
                    ? `${gapValue.toFixed(2)}%`
                    : '-';
            }

            return {
                Name: item.name,
                'S/N': item.modelId,
                FloorLimited: item.floor,
                Next: item.next ?? '-',
                FloorRare: item.floorRare ?? '-',
                Prices: item.prices.join(', '),
                'Gap %': item.priceGapPercent !== null ? item.priceGapPercent.toFixed(2) : '-',
                'Fragile L1 (+25%)': item.isFragileLevel1,
                'Fragile L2 (+25%)': item.isFragileLevel2,
                ...gaps
            };
        }));
    }
    const dataFirstAssetOfCards = await getNFTData(dataCard.assets[0]?.tokenId);
    const isUnrevealed = dataFirstAssetOfCards?.rarity === 'Not revealed';

    return await buildNftTrackingEmbed(nftHoldersStats, snipeStats, modelId, isUnrevealed, withAddress);
}
