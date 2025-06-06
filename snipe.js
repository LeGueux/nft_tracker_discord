import { getListingsBySeasonAndRarity } from "./cometh-api.js";
import { buildSnipeEmbed } from "./embeds.js";
import { IS_TEST_MODE } from "./config.js";

export async function handleSnipeForSeason(season) {
    console.log(`buildSnipeEmbed for season: ${season}`);
    const dataListings = await getListingsBySeasonAndRarity([season], ["Limited", "Rare"]);
    const dataFormatted = analyzeListingsFragility(dataListings);
    if (IS_TEST_MODE) {
        console.dir(dataFormatted, { depth: null, colors: true });
        console.table(dataFormatted.map(item => {
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
                'Fragile (+25%)': item.isFragile,
                'VeryFragileAfterBuy (+25%)': item.isVeryFragileAfterBuy,
                ...gaps
            };
        }));
    }

    return await buildSnipeEmbed(dataFormatted, season);
}

// Convertit du wei en DOLZ
function weiToDolz(weiStr) {
    return parseFloat(weiStr) / 1e18;
}

function analyzeListingsFragility(data) {
    const grouped = {};
    const rareFloorsByModel = {}; // floorRare par modèleId

    for (const asset of data.assets) {
        const name = asset.metadata?.name?.split('-')[0]?.trim();
        const animationUrl = asset.metadata?.animation_url;
        const priceWei = asset.orderbookStats?.lowestListingPrice;

        if (!name || !priceWei || !animationUrl) continue;

        // Extraire rarity et modelId depuis animation_url
        let rarity = "Limited";
        let modelId = null;

        const match = animationUrl.match(/\/(g\d+)\/\d+\/(Limited|Rare)\//);
        if (match) {
            modelId = match[1];
            rarity = match[2];
        }

        const priceDolz = parseInt(weiToDolz(priceWei));

        if (rarity === "Rare" && modelId) {
            if (!rareFloorsByModel[modelId]) {
                rareFloorsByModel[modelId] = [];
            }
            rareFloorsByModel[modelId].push(priceDolz);
        }

        const keyName = modelId ? `${name} ${modelId}` : name;

        if (!grouped[keyName]) {
            grouped[keyName] = { prices: [], rarity, modelId };
        }

        grouped[keyName].prices.push(priceDolz);
    }

    const results = [];

    for (const [name, { prices, rarity, modelId }] of Object.entries(grouped)) {
        const sorted = prices.sort((a, b) => a - b);

        // Calculer floorRare pour CE modèle
        const rarePrices = modelId && rareFloorsByModel[modelId] ? rareFloorsByModel[modelId] : [];
        const floorRare = rarePrices.length > 0 ? Math.min(...rarePrices) : null;

        const filteredPrices = floorRare !== null
            ? sorted.filter(price => price < floorRare)
            : sorted.slice();

        if (filteredPrices.length === 0) continue;

        const floor = filteredPrices[0];
        const next = filteredPrices[1] ?? null;
        const priceGap = next && floor ? ((next - floor) / floor) * 100 : null;

        if (rarity === "Limited" && floorRare !== null && floor >= floorRare) continue;

        const simulatedGaps = simulateGapAfterPurchases(filteredPrices, 5);
        const hasFragileSim = simulatedGaps.some(s => s.priceGapPercent !== null && s.priceGapPercent >= 25);

        results.push({
            name,
            modelId,
            floor,
            next,
            prices: filteredPrices,
            priceGapPercent: priceGap,
            isFragile: priceGap !== null && priceGap >= 25,
            isVeryFragileAfterBuy: hasFragileSim,
            simulatedGaps,
            floorRare,
        });
    }

    return results;
}



// Simule les gaps après 1 à N achats, en s'arrêtant si on dépasse floorRare
function simulateGapAfterPurchases(prices, max = 5) {
    const simulations = [];

    for (let i = 1; i <= max; i++) {
        if (prices.length <= i) break;

        const newFloor = prices[i];
        const next = prices[i + 1] ?? null;
        const priceGap = next ? ((next - newFloor) / newFloor) * 100 : null;

        simulations.push({
            afterBuying: i,
            newFloor,
            next,
            priceGapPercent: priceGap,
        });
    }

    return simulations;
}
