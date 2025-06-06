import { getListingsBySeasonAndRarity } from "./cometh-api.js";

export async function buildSnipeEmbed(season) {
    console.log(`buildSnipeEmbed for season: ${season}`);
    const dataListings = await getListingsBySeasonAndRarity([season], ["Limited", "Rare"]);
    const dataFormatted = analyzeListingsFragility(dataListings);
    console.dir(dataFormatted, { depth: null, colors: true });
    console.table(dataFormatted.map(item => ({
        Name: item.name,
        Rarity: item.rarity,
        Floor: item.floor,
        Next: item.next ?? '-',
        FloorRare: item.floorRare !== null ? item.floorRare : '-',
        Prices: item.prices.join(', '),
        'Gap %': item.priceGapPercent !== null ? item.priceGapPercent.toFixed(2) : '-',
        Fragile: item.isFragile,
        'Gap ↑ After 1 Buy': item.simulatedGaps[0]?.priceGapPercent !== null
            ? item.simulatedGaps[0].priceGapPercent.toFixed(2) + '%'
            : '-',
        'Gap ↑ After 2 Buy': item.simulatedGaps[1]?.priceGapPercent !== null
            ? item.simulatedGaps[1].priceGapPercent.toFixed(2) + '%'
            : '-'
    })));
}

// Convertit du wei en DOLZ
function weiToDolz(weiStr) {
    return parseFloat(weiStr) / 1e18;
}

function analyzeListingsFragility(data) {
    const grouped = {};
    const rareFloors = [];

    for (const asset of data.assets) {
        const name = asset.metadata?.name;
        const rarity = asset.metadata?.attributes?.find(a => a.trait_type === "Rarity")?.value || "Limited";
        const priceWei = asset.orderbookStats?.lowestListingPrice;

        if (!name || !priceWei) continue;

        const priceDolz = parseInt(weiToDolz(priceWei));

        if (rarity === "Rare") {
            rareFloors.push(priceDolz);
        }

        if (!grouped[name]) {
            grouped[name] = { prices: [], rarity };
        }

        grouped[name].prices.push(priceDolz);
    }

    const floorRare = rareFloors.length > 0 ? Math.min(...rareFloors) : null;
    console.log(`Floor Rare: ${floorRare !== null ? floorRare : "Aucun Rare"}`);

    const results = [];

    for (const [name, { prices, rarity }] of Object.entries(grouped)) {
        // Trie les prix croissants
        const sorted = prices.sort((a, b) => a - b);

        // Filtre les prix au-dessus ou égaux au floorRare
        const filteredPrices = floorRare !== null
            ? sorted.filter(price => price < floorRare)
            : sorted.slice();

        if (filteredPrices.length === 0) continue; // rien à afficher

        const floor = filteredPrices[0];
        const next = filteredPrices[1] ?? null;
        const priceGap = next && floor ? ((next - floor) / floor) * 100 : null;

        // Ignore les Limited avec floor >= floorRare (déjà filtré par filteredPrices)
        if (rarity === "Limited" && floorRare !== null && floor >= floorRare) continue;

        // Simule les gaps mais avec filteredPrices (prix < floorRare)
        const simulatedGaps = simulateGapAfterPurchases(filteredPrices, 3);
        const hasFragileSim = simulatedGaps.some(s => s.priceGapPercent !== null && s.priceGapPercent >= 25);

        results.push({
            name,
            rarity,
            floor,
            next,
            prices: filteredPrices,
            priceGapPercent: priceGap,
            isFragile: priceGap !== null && priceGap >= 25,
            isVeryFragileAfterBuy: hasFragileSim,
            simulatedGaps,
            floorRare // ajoute le floorRare ici pour l’afficher plus tard
        });
    }

    return results;
}

// Simule les gaps après 1 à N achats, en s'arrêtant si on dépasse floorRare
function simulateGapAfterPurchases(prices, max = 3) {
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
