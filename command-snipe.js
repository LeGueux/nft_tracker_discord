import { searchCardsByCriteriasV2, getNFTData } from './api-service.js';
import { buildSnipeEmbed } from './embeds.js';
import { processWithConcurrencyLimit, getFloorPriceByModelAndRarity } from './utils.js';
import { IS_TEST_MODE } from './config.js';

export async function handleSnipeForSeason(season) {
    console.log(`handleSnipeForSeason for season code ${season}`);

    let attributes = [];
    let isSnipeOnly = false;
    let nbMaxGaps = 5;

    const seasonMap = {
        100: { seasons: ['1', '2', '3', '4', '5', '6', '7', '8', 'Special Edition', 'Off-Season'], snipe: true, gaps: 2 },
        110: { seasons: ['1', '2', '3', '4', '5', '6', '7', '8'], snipe: true, gaps: 2 },
        111: { seasons: ['6', '7', '8'], snipe: true, gaps: 2 },
        120: { seasons: ['Special Edition'], snipe: true },
        130: { seasons: ['Off-Season'], snipe: false },
    };

    if (seasonMap[season]) {
        const cfg = seasonMap[season];

        attributes = [
            { name: 'Rarity', value: 'Limited' },
            ...cfg.seasons.map(s => ({ name: 'Season', value: s }))
        ];

        isSnipeOnly = cfg.snipe;
        nbMaxGaps = cfg.gaps ?? nbMaxGaps; // utilise cfg.gaps si défini
    } else {
        attributes = [
            { name: 'Rarity', value: 'Limited' },
            { name: 'Season', value: season.toString() },
        ];
    }

    const dataListings = await searchCardsByCriteriasV2({
        attributes,
        limit: 100,
        status: 'Listed',
        listingOnly: true,
    });
    const dataFormatted = await analyzeListingsFragility(dataListings, isSnipeOnly, nbMaxGaps);
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
                'Fragile L1 (+30%)': item.isFragileLevel1,
                'Fragile L2 (+30%)': item.isFragileLevel2,
                ...gaps
            };
        }));
    }

    return await buildSnipeEmbed(dataFormatted, season);
}

async function analyzeListingsFragility(data, snipeOnly = false, nbMaxGaps = 4) {
    const grouped = {};

    // ⚙️ Récupérer les nftData avec une limite de concurrence
    const nftDataMap = {};
    await processWithConcurrencyLimit(
        data.results,
        10,
        async (asset) => {
            const nftData = await getNFTData(asset.nftId, false);
            nftDataMap[asset.nftId] = nftData;
        }
    );

    // 🧩 1️⃣ Regrouper les listings
    for (const asset of data.results) {
        const nftData = nftDataMap[asset.nftId];
        const name = asset.name?.trim();
        let priceDolz = asset.listing?.price ?? null;
        if (!name || !priceDolz) continue;

        const modelId = asset.cardNumber;
        const keyName = `${name} ${modelId}`;

        if (!grouped[keyName]) grouped[keyName] = { prices: [], modelId };

        const ownerMap = {
            [process.env.FRANCK_ADDRESS_1.toLowerCase()]: '-F1',
            [process.env.FRANCK_ADDRESS_2.toLowerCase()]: '-F2',
            [process.env.NICO_ADDRESS_1.toLowerCase()]: '-N1',
            [process.env.NICO_ADDRESS_2.toLowerCase()]: '-N2',
            [process.env.BOB_ADDRESS_1.toLowerCase()]: '-B1',
            [process.env.COCH_ADDRESS_1.toLowerCase()]: '-C1',
        };

        const suffix = ownerMap[nftData?.owner?.toLowerCase()] ?? '';
        priceDolz = `${priceDolz}${suffix}`;

        grouped[keyName].prices.push(priceDolz);
    }

    // 🧩 2️⃣ Récupérer tous les modelId uniques
    const uniqueModelIds = [...new Set(Object.values(grouped).map(g => g.modelId))];

    // ⚡ 3️⃣ Paralléliser les appels à getFloorPriceByModelAndRarity
    const floorRareMap = {};
    await processWithConcurrencyLimit(
        uniqueModelIds,
        10, // tu peux ajuster cette limite
        async (modelId) => {
            const floor = await getFloorPriceByModelAndRarity(modelId, 'Rare');
            floorRareMap[modelId] = floor;
        }
    );

    // 🧩 4️⃣ Calculs finaux
    const results = [];

    for (const [name, { prices, modelId }] of Object.entries(grouped)) {
        const cleanPrices = prices.map(price => {
            if (typeof price === 'string') {
                const cleanedString = price.split('-')[0];
                return parseInt(cleanedString, 10);
            }
            return price;
        });

        const sortedPrices = cleanPrices.sort((a, b) => a - b);
        const floorRare = floorRareMap[modelId] ?? null;

        const filteredPrices = floorRare !== null
            ? sortedPrices.filter(price => price < floorRare)
            : sortedPrices.slice();

        if (filteredPrices.length === 0) continue;

        const floor = filteredPrices[0];
        const next = filteredPrices[1] ?? null;
        const priceGap = next && floor ? ((next - floor) / floor) * 100 : null;

        // Ignore si le floor Limited dépasse déjà le floor Rare
        if (floorRare !== null && floor >= floorRare) continue;

        // Simulations après achats successifs
        const simulatedGaps = simulateGapAfterPurchases(filteredPrices);
        // Fragile level 2 = un gap >= 30% après au moins un achat
        const isFragileLevel2 = simulatedGaps
            .slice(0, nbMaxGaps)
            .some(s => s.priceGapPercent !== null && s.priceGapPercent >= 30);


        // Mode Snipe = on ne garde que les gros gaps
        if (snipeOnly && (priceGap === null || priceGap < 30) && !isFragileLevel2) continue;

        results.push({
            name,
            modelId,
            floor: prices[0],
            next: prices[1] ?? null,
            prices: prices.slice(0, 10),
            countLimitedBeforeRare: filteredPrices.length,
            priceGapPercent: priceGap,
            isFragileLevel1: priceGap !== null && priceGap >= 30,
            isFragileLevel2,
            simulatedGaps,
            floorRare,
        });
    }

    return results;
}

// Simule les gaps après 1 à N achats, en s'arrêtant si on dépasse floorRare
function simulateGapAfterPurchases(prices, nbMaxGaps = 5) {
    return Array.from({ length: Math.min(nbMaxGaps, prices.length - 1) }, (_, i) => {
        const newFloor = prices[i + 1];
        const next = prices[i + 2] ?? null;

        return {
            afterBuying: i + 1,
            newFloor,
            next,
            priceGapPercent: next ? ((next - newFloor) / newFloor) * 100 : null
        };
    });
}

