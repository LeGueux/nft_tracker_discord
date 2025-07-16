import { getAllCardsBySeason } from "./cometh-api.js";
import { buildNftHoldersEmbed } from "./embeds.js";
import { IS_TEST_MODE, RARITY_ORDER } from "./config.js";

const rarityOrder = ['Not Revealed', 'Limited', 'Rare', 'Epic', 'Legendary'];

export async function handleNftHoldersForSeason(season) {
    if (season < 1 || season > 7) return null;
    let dataCardsBySeason = null;

    console.log(`handleNftHoldersForSeason for Season ${season}`);
    dataCardsBySeason = await getAllCardsBySeason([season]);
    console.log(`handleNftHoldersForSeason for Season ${season} - Cards found: ${dataCardsBySeason.total}`);

    const stats = computeNftHoldersStats(dataCardsBySeason, {
        topX: 3,
        minCardsPerModel: 5,
    });
    if (IS_TEST_MODE) {
        console.log(`🎯 ${stats.numberOfFullCollectors} wallets ont une saison complète`);
        console.log(`📊 Nombre de wallets par modèle :`);
        console.table(stats.walletsPerModel);

        console.log(`🐋 Top whales (min 5 cartes) par modèle :`);
        for (const [modelId, topList] of Object.entries(stats.topWalletsPerModel)) {
            console.log(`\n📦 ${modelId} – ${stats.cardsPerModel[modelId]} cartes totales`);
            console.table(topList, ["wallet", "total", "listed", "percentOwned", ...RARITY_ORDER]);
        }
    }

    return await buildNftHoldersEmbed(stats, season);
}

export function computeNftHoldersStats(data, options = {}, ignoreUnrevealed = true) {
    const { topX = 5, minCardsPerModel = 0 } = options;

    const walletModels = new Map();               // wallet → Set(models)
    const allModels = new Set();                  // Set(modelId)
    const modelWallets = new Map();               // modelId → Set(wallet)
    const modelWalletCounts = new Map();          // modelId → Map(wallet → { total, [rarity]: count })
    const cardsPerModel = new Map();              // modelId → total number of cards
    const modelNames = new Map();                 // modelId => nom

    const getModelAndRarity = (animationUrl) => {
        const match = animationUrl?.match(/\/(g\d+)\/\d+\/([^/]+)\//);
        if (!match) return { modelId: null, rarity: 'Unknown' };
        return { modelId: match[1], rarity: match[2] };
    };

    for (const asset of data.assets) {
        const name = asset.metadata?.name?.split('-')[0]?.trim();
        const owner = asset.owner.toLowerCase();
        const animationUrl = asset?.metadata?.animation_url;
        let modelId = ignoreUnrevealed ? null : 'Unknown';
        let rarity = 'Not Revealed';
        const isListed = asset.orderbookStats?.lowestListingPrice != null;
        if (animationUrl) {
            const getModelAndRarityData = getModelAndRarity(animationUrl);
            modelId = getModelAndRarityData.modelId;
            rarity = getModelAndRarityData.rarity;
        }
        if (!modelId) continue;

        if (modelId && name) {
            modelNames.set(modelId, name);
        }

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
            for (const rarity of rarityOrder) {
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
