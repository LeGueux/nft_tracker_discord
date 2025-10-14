import { searchCardsByCriteriasV2, getNFTData } from './cometh-api.js';
import { buildSnipeEmbed } from './embeds.js';
import { IS_TEST_MODE } from './config.js';

export async function handleSnipeForSeason(season) {
    console.log(`handleSnipeForSeason for season code ${season}`);

    let attributes = [];
    let isSnipeOnly = false;

    switch (season) {
        case 100:
            attributes = [
                { 'name': 'Rarity', 'value': 'Limited' },
                { 'name': 'Rarity', 'value': 'Rare' },
                { 'name': 'Season', 'value': '1' },
                { 'name': 'Season', 'value': '2' },
                { 'name': 'Season', 'value': '3' },
                { 'name': 'Season', 'value': '4' },
                { 'name': 'Season', 'value': '5' },
                { 'name': 'Season', 'value': '6' },
                { 'name': 'Season', 'value': '7' },
                { 'name': 'Season', 'value': '8' },
                { 'name': 'Season', 'value': 'Special Edition' },
                { 'name': 'Season', 'value': 'Off-Season' },
            ];
            isSnipeOnly = true;
            break;
        case 110:
            attributes = [
                { 'name': 'Rarity', 'value': 'Limited' },
                { 'name': 'Rarity', 'value': 'Rare' },
                { 'name': 'Season', 'value': '1' },
                { 'name': 'Season', 'value': '2' },
                { 'name': 'Season', 'value': '3' },
                { 'name': 'Season', 'value': '4' },
                { 'name': 'Season', 'value': '5' },
                { 'name': 'Season', 'value': '6' },
                { 'name': 'Season', 'value': '7' },
                { 'name': 'Season', 'value': '8' },
            ];
            isSnipeOnly = true;
            break;
        case 120:
            attributes = [
                { 'name': 'Rarity', 'value': 'Limited' },
                { 'name': 'Rarity', 'value': 'Rare' },
                { 'name': 'Season', 'value': 'Special Edition' },
            ];
            isSnipeOnly = true;
            break;
        case 130:
            attributes = [
                { 'name': 'Rarity', 'value': 'Limited' },
                { 'name': 'Rarity', 'value': 'Rare' },
                { 'name': 'Season', 'value': 'Off-Season' },
            ];
            break;
        default:
            attributes = [
                { 'name': 'Rarity', 'value': 'Limited' },
                { 'name': 'Rarity', 'value': 'Rare' },
                { 'name': 'Season', 'value': season.toString() },
            ];
    }

    const dataListings = await searchCardsByCriteriasV2({
        attributes,
        limit: 10000,
        status: 'Listed',
        listingOnly: true,
    });
    const dataFormatted = await analyzeListingsFragility(dataListings, isSnipeOnly);
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

async function analyzeListingsFragility(data, snipeOnly = false) {
    const grouped = {};
    const rareFloorsByModel = {}; // floorRare par modèleId

    for (const asset of data.results) {
        // TODO find a way to batch these calls, if 200 cards means 200 calls...
        // const nftData = await getNFTData(asset.nftId, false);
        const name = asset.name.trim();
        let priceDolz = asset.listing?.price ?? null;

        if (!name || !priceDolz) continue;

        // Extraire rarity et modelId depuis animation_url
        let rarity = asset.rarity;
        let modelId = asset.cardNumber;

        if (!['Limited', 'Rare'].includes(rarity)) continue;

        if (rarity === 'Rare') {
            if (!rareFloorsByModel[modelId]) {
                rareFloorsByModel[modelId] = [];
            }
            rareFloorsByModel[modelId].push(priceDolz);
        }

        const keyName = modelId ? `${name} ${modelId}` : name;

        if (!grouped[keyName]) {
            grouped[keyName] = { prices: [], rarity, modelId };
        }

        // TODO remettre plus tard si on veut différencier les listings par propriétaire
        // const ownerMap = {
        //     [process.env.FRANCK_ADDRESS_1.toLowerCase()]: '-F1',
        //     [process.env.FRANCK_ADDRESS_2.toLowerCase()]: '-F2',
        //     [process.env.NICO_ADDRESS_1.toLowerCase()]: '-N1',
        //     [process.env.NICO_ADDRESS_2.toLowerCase()]: '-N2',
        //     [process.env.BOB_ADDRESS_1.toLowerCase()]: '-B1',
        //     [process.env.COCH_ADDRESS_1.toLowerCase()]: '-C1',
        // };

        // const suffix = ownerMap[nftData?.owner?.toLowerCase()];
        // if (suffix) {
        //     priceDolz += suffix;
        // }

        grouped[keyName].prices.push(priceDolz);
    }

    const results = [];

    for (const [name, { prices, rarity, modelId }] of Object.entries(grouped)) {
        const cleanPrices = prices.map(price => {
            if (typeof price === 'string') {
                const cleanedString = price.split('-')[0];
                return parseInt(cleanedString, 10);
            }
            // Si c'est déjà un nombre, on le retourne tel quel
            return price;
        });
        const sortedPrices = cleanPrices.sort((a, b) => a - b);

        // Calculer floorRare pour CE modèle
        const rarePrices = modelId && rareFloorsByModel[modelId] ? rareFloorsByModel[modelId] : [];
        const floorRare = rarePrices.length > 0 ? Math.min(...rarePrices) : null;

        const filteredPrices = floorRare !== null
            ? sortedPrices.filter(price => price < floorRare)
            : sortedPrices.slice();

        if (filteredPrices.length === 0) continue;

        const floor = filteredPrices[0];
        const next = filteredPrices[1] ?? null;
        const priceGap = next && floor ? ((next - floor) / floor) * 100 : null;

        if (rarity === 'Limited' && floorRare !== null && floor >= floorRare) continue;

        const simulatedGaps = simulateGapAfterPurchases(filteredPrices, 5);
        const isFragileLevel2 = simulatedGaps.some(s => s.priceGapPercent !== null && s.priceGapPercent >= 25);

        if (snipeOnly && (priceGap === null || priceGap < 25) && !isFragileLevel2) continue;

        const maxPricesLength1 = Math.min(filteredPrices.length, 10);

        results.push({
            name,
            modelId,
            floor: prices[0],
            next: prices[1] ?? null,
            prices: prices.slice(0, maxPricesLength1),
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
