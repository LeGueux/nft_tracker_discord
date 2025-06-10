import { getListingsBySeasonAndRarity } from "./cometh-api.js";
import { buildSnipeEmbed } from "./embeds.js";
import { IS_TEST_MODE } from "./config.js";

export async function handleSnipeForSeason(season) {
    let dataListings = null;
    let isSnipeOnly = false;
    if (season === 100) {
        console.log("buildSnipeEmbed for ALL cards");
        dataListings = await getListingsBySeasonAndRarity(["Off-Season", "Special Edition", "1", "2", "3", "4", "5", "6", "7"], ["Limited", "Rare"]);
        isSnipeOnly = true;
    } else if (season === 110) {
        console.log("buildSnipeEmbed for All Seasons");
        dataListings = await getListingsBySeasonAndRarity(["1", "2", "3", "4", "5", "6", "7"], ["Limited", "Rare"]);
        isSnipeOnly = true;
    } else if (season === 120) {
        console.log("buildSnipeEmbed for Season Edition");
        dataListings = await getListingsBySeasonAndRarity(["Special Edition"], ["Limited", "Rare"]);
        isSnipeOnly = true;
    } else if (season === 130) {
        console.log("buildSnipeEmbed for Off-Season");
        dataListings = await getListingsBySeasonAndRarity(["Off-Season"], ["Limited", "Rare"]);
    } else {
        console.log(`buildSnipeEmbed for Season ${season}`);
        dataListings = await getListingsBySeasonAndRarity([season], ["Limited", "Rare"]);
    }
    const dataFormatted = analyzeListingsFragility(dataListings, isSnipeOnly);
    if (IS_TEST_MODE) {
        // console.dir(dataFormatted, { depth: null, colors: true });
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
                'Fragile L1 (+25%)': item.isFragileLevel1,
                'Fragile L2 (+25%)': item.isFragileLevel2,
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

function analyzeListingsFragility(data, snipeOnly = false) {
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
        const isFragileLevel2 = simulatedGaps.some(s => s.priceGapPercent !== null && s.priceGapPercent >= 25);

        if (snipeOnly && (priceGap === null || priceGap < 25) && !isFragileLevel2) continue;

        results.push({
            name,
            modelId,
            floor,
            next,
            prices: filteredPrices.slice(0, 10),
            countLimitedBeforeRare: filteredPrices.length,
            priceGapPercent: priceGap,
            isFragileLevel1: priceGap !== null && priceGap >= 25,
            isFragileLevel2: isFragileLevel2,
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
