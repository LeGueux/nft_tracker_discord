import { getAllCardsBySeason } from "./cometh-api.js";
import { buildSnipeEmbed } from "./embeds.js";
import { IS_TEST_MODE } from "./config.js";
import { weiToDolz } from "./utils.js";

const rarityOrder = ['Not Revealed', 'Limited', 'Rare', 'Epic', 'Legendary'];

export async function handleNftHoldersForSeason(season) {
    if (season < 1 || season > 7) return null;
    let dataCardsBySeason = null;

    console.log(`handleNftHoldersForSeason for Season ${season}`);
    dataCardsBySeason = await getAllCardsBySeason([season]);
    console.log(`handleNftHoldersForSeason for Season ${season} - Cards found: ${dataCardsBySeason.total}`);

    const stats = computeNftHoldersForSeason(dataCardsBySeason, {
        topX: 10,
        minCardsPerModel: 5,
    });

    console.log(`🎯 ${stats.numberOfFullCollectors} wallets ont une saison complète`);
    console.log(`📊 Nombre de wallets par modèle :`);
    console.table(stats.walletsPerModel);

    for (const [model, top] of Object.entries(stats.topWalletsPerModel)) {
        console.log(`\n${model}`);
        console.table(top);
    }

    console.log(`🧬 Raretés détectées : ${stats.detectedRarities.join(', ')}`);
    console.log(`🐋 Top whales (min 5 cartes) par modèle :`);
    for (const [model, topList] of Object.entries(stats.topWalletsPerModel)) {
        console.log(`\n📦 ${model} – ${stats.cardsPerModel[model]} cartes totales`);
        console.table(topList, ["wallet", "total", "percentOwned", ...rarityOrder]);
    }
    process.exit(0);

    return await buildSnipeEmbed(dataFormatted, season);
}

function computeNftHoldersForSeason(data, options = {}) {
    const { topX = 5, minCardsPerModel = 0 } = options;

    const walletModels = new Map();               // wallet → Set(models)
    const allModels = new Set();                  // Set(model)
    const modelWallets = new Map();               // model → Set(wallet)
    const modelWalletCounts = new Map();          // model → Map(wallet → { total, [rarity]: count })
    const allRarities = new Set();                // Pour détecter dynamiquement les raretés
    const cardsPerModel = new Map();              // model → total number of cards

    const getModelAndRarity = (animationUrl) => {
        const match = animationUrl?.match(/\/(g\d+)\/\d+\/([^/]+)\//);
        if (!match) return { modelId: null, rarity: 'Unknown' };
        return { modelId: match[1], rarity: match[2] };
    };

    for (const asset of data.assets) {
        const owner = asset.owner.toLowerCase();
        const animationUrl = asset?.metadata?.animation_url;
        const { modelId, rarity } = getModelAndRarity(animationUrl);
        if (!modelId) continue;

        allModels.add(modelId);
        allRarities.add(rarity);

        // wallet → models
        if (!walletModels.has(owner)) walletModels.set(owner, new Set());
        walletModels.get(owner).add(modelId);

        // model → wallets
        if (!modelWallets.has(modelId)) modelWallets.set(modelId, new Set());
        modelWallets.get(modelId).add(owner);

        // model → wallet → rareté dynamique
        if (!modelWalletCounts.has(modelId)) modelWalletCounts.set(modelId, new Map());
        const walletMap = modelWalletCounts.get(modelId);

        if (!walletMap.has(owner)) walletMap.set(owner, { total: 0 });
        const countObj = walletMap.get(owner);

        countObj.total += 1;
        countObj[rarity] = (countObj[rarity] || 0) + 1;

        cardsPerModel.set(modelId, (cardsPerModel.get(modelId) || 0) + 1);
    }

    const totalModels = allModels.size;

    const fullSeasonWallets = [...walletModels.entries()]
        .filter(([_, models]) => models.size === totalModels)
        .map(([wallet]) => wallet);

    const walletsPerModel = {};
    for (const [model, walletSet] of modelWallets.entries()) {
        walletsPerModel[model] = walletSet.size;
    }

    const topWalletsPerModel = {};
    for (const [model, walletMap] of modelWalletCounts.entries()) {
        const sorted = [...walletMap.entries()]
            .filter(([_, counts]) => counts.total >= minCardsPerModel)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, topX);

        topWalletsPerModel[model] = sorted.map(([wallet, counts]) => {
            const result = {
                wallet,
                total: counts.total,
                percentOwned: parseFloat(((counts.total / cardsPerModel.get(model)) * 100).toFixed(2)),
            };

            // Injecte chaque rareté dans l'ordre défini
            for (const rarity of rarityOrder) {
                result[rarity] = counts[rarity] || 0;
            }

            return result;
        });
    }

    return {
        totalModels,
        fullSeasonWallets,
        numberOfFullCollectors: fullSeasonWallets.length,
        walletsPerModel,
        topWalletsPerModel,
        cardsPerModel: Object.fromEntries(cardsPerModel),
        detectedRarities: [...allRarities].sort(),
    };
}
