import { getDolzUsername, getNFTData, searchCardsByCriteriasV2 } from './cometh-api.js';
import { buildNftTrackingEmbed } from './embeds.js';
import { IS_TEST_MODE, RARITY_ORDER } from './config.js';
import { processWithConcurrencyLimit } from './utils.js';

export async function handleNftTrackingForModel(modelId, nbHolders = 15, withAddress = false) {
    console.log(`handleNftTrackingForModel for modelId ${modelId} nbHolders: ${nbHolders} withAddress: ${withAddress}`);

    let dataSearchResults = await searchCardsByCriteriasV2({
        attributes: [{ 'name': 'Card Number', 'value': [modelId] }],
        limit: 2000,
    });
    console.log(`handleNftTrackingForModel for modelId ${modelId} - Cards found: ${dataSearchResults.total}`);

    // Limite la concurrence à `concurrency` appels API
    const nftResults = await processWithConcurrencyLimit(
        dataSearchResults.results.map((asset, index) => ({ asset, index })),
        50,
        async ({ asset, index }) => {
            const nftData = await getNFTData(asset.nftId, false);
            return { index, asset, nftData };
        }
    );
    // 🔹 Recréer le tableau dans l'ordre initial
    nftResults.sort((a, b) => a.index - b.index);

    const nftHoldersStats = await computeNftHoldersStats(nftResults, {
        topX: 10000,
        minCardsPerModel: 1,
    });

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

    const assetRarityFirst = dataSearchResults.results[0]?.rarity;
    const isUnrevealed = assetRarityFirst === 'Not revealed';

    return await buildNftTrackingEmbed(nftHoldersStats, nftResults, modelId, isUnrevealed, nbHolders, withAddress);
}

async function computeNftHoldersStats(nftResults, options = {}) {
    const { topX = 5, minCardsPerModel = 0 } = options;

    const walletModels = new Map();               // wallet → Set(models)
    const allModels = new Set();                  // Set(modelId)
    const modelWallets = new Map();               // modelId → Set(wallet)
    const modelWalletCounts = new Map();          // modelId → Map(wallet → { total, [rarity]: count })
    const cardsPerModel = new Map();              // modelId → total number of cards
    const modelNames = new Map();                 // modelId => nom

    for (const { asset, nftData } of nftResults) {
        const name = asset.name.trim();
        const owner = nftData.owner.toLowerCase();
        const isListed = asset.listing != null;
        // Extraire rarity et modelId depuis animation_url
        let rarity = asset.rarity;
        let modelId = asset.cardNumber;

        modelNames.set(modelId, name);

        allModels.add(modelId);

        // wallet → models
        if (!walletModels.has(owner)) walletModels.set(owner, new Set());
        walletModels.get(owner).add(modelId);

        // modelId → wallets
        if (!modelWallets.has(modelId)) modelWallets.set(modelId, new Set());
        modelWallets.get(modelId).add(owner);

        // modelId → wallet → rareté dynamique
        if (!modelWalletCounts.has(modelId)) modelWalletCounts.set(modelId, new Map());
        const walletMap = modelWalletCounts.get(modelId);

        if (!walletMap.has(owner)) walletMap.set(owner, { total: 0, listed: 0 });
        const countObj = walletMap.get(owner);

        countObj.total += 1;
        if (isListed) countObj.listed += 1;
        countObj[rarity] = (countObj[rarity] || 0) + 1;

        cardsPerModel.set(modelId, (cardsPerModel.get(modelId) || 0) + 1);
    }

    const totalModels = allModels.size;
    const fullSeasonWallets = [...walletModels.entries()]
        .filter(([_, models]) => models.size === totalModels)
        .map(([wallet]) => wallet);

    const walletsPerModel = {};
    for (const [modelId, walletSet] of modelWallets.entries()) {
        walletsPerModel[modelId] = walletSet.size;
    }

    const topWalletsPerModel = {};
    for (const [modelId, walletMap] of modelWalletCounts.entries()) {
        const sorted = [...walletMap.entries()]
            .filter(([_, counts]) => counts.total >= minCardsPerModel)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, topX);

        topWalletsPerModel[modelId] = sorted.map(([wallet, counts]) => {
            const result = {
                wallet,
                total: counts.total,
                listed: counts.listed || 0,
                percentOwned: parseFloat(((counts.total / cardsPerModel.get(modelId)) * 100).toFixed(2)),
            };

            // Injecte chaque rareté dans l'ordre défini
            for (const rarity of RARITY_ORDER) {
                result[rarity] = counts[rarity] || 0;
            }

            return result;
        });
    }

    return {
        modelNames: Object.fromEntries(modelNames),
        cardsPerModel: Object.fromEntries(cardsPerModel),
        topWalletsPerModel,
        numberOfFullCollectors: fullSeasonWallets.length,
        walletsPerModel,
    };
}
