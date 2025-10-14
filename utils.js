import { COMETH_API_INTERVAL, NFT_LIST_BY_SEASON } from './config.js';
import { searchCardsByCriterias, searchCardsByCriteriasV2 } from './cometh-api.js';

export function getRarityColor(rarity) {
    switch (rarity) {
        case 'Rare':
            return '#FFFFFF';
        case 'Epic':
            return '#D1AC09';
        case 'Legendary':
            return '#BF55EC';
        default:
            return '#000000';
    }
}

export function checkDateIsValidSinceLastOneInterval(date) {
    return date >= new Date(new Date().getTime() - COMETH_API_INTERVAL);
}

// Convertit du wei en DOLZ
export function weiToDolz(weiStr) {
    return parseFloat(weiStr) / 1e18;
}

export function getNFTSeasonByCardNumber(cardNumber) {
    for (const [season, cardNumbers] of Object.entries(NFT_LIST_BY_SEASON)) {
        if (cardNumbers.has(cardNumber)) {
            return season;
        }
    }
    return 'Special Edition';
}

export function getContentTagsDependsOnNFT(data, price, type) {
    // Exemple DATA: https://cardsdata.dolz.io/jsons/51690.json
    const FRANCK = `<@${process.env.FRANCK_DISCORD_USER_ID}>`;
    const NICO = `<@${process.env.NICO_DISCORD_USER_ID}>`;
    const BOB = `<@${process.env.BOB_DISCORD_USER_ID}>`;
    const COCH = `<@${process.env.COCH_DISCORD_USER_ID}>`;

    const isListing = type === 'listing';
    const isSale = type === 'sale';
    const isStandardSeason = !['Special Edition', 'Off-Season'].includes(data.season);
    const isLimited = data.rarity === 'Limited';
    const isRare = data.rarity === 'Rare';
    const isEpic = data.rarity === 'Epic';
    const isRareOrLimited = ['Limited', 'Rare'].includes(data.rarity);

    if (isListing && isStandardSeason) {
        // FRANCK ONLY
        // Listing | All seasons                            | Price <= 6000 | Epic
        // Listing | S6                                     | Price <= 2000 | NOT Limited
        // Listing | S7                                     | Price <= 2000 | NOT Limited
        // Listing | S6 Octokuro       g0065                | Price <= 5000 | Limited, Rare
        // Listing | S7 Emiri Momota   g0125                | Price <= 4000 | Limited, Rare
        // Listing | S8 Alexis Crystal g0124                | Price <= 2000
        if ((isEpic && price <= 6000) ||
            (data.season === '6' && !isLimited && price <= 2000) ||
            (data.season === '7' && !isLimited && price <= 2000) ||
            (['g0065'].includes(data.card_number) && price <= 5000) ||
            (['g0125'].includes(data.card_number) && price <= 4000) ||
            (['g0124'].includes(data.card_number) && price <= 2000)
        ) {
            return FRANCK;
        }
    }
    // FRANCK ONLY
    return '';
}

export function calculateBBDRewardNftByNFTData(nftData) {
    const rarityLabel = nftData.rarity;
    const serialRaw = nftData.serial_number;

    const rarityTable = {
        Limited: { rarity: 2, minRarity: 0 },
        Rare: { rarity: 3, minRarity: 1 },
        Epic: { rarity: 6, minRarity: 2 },
        Legendary: { rarity: 8, minRarity: 4 },
    };

    const rarityValues = rarityTable[rarityLabel];

    if (!rarityValues) {
        throw new Error(`Unknown rarity label: ${rarityLabel}`);
    }

    const [serialStr, supplyStr] = serialRaw.split('/');
    const serial = parseInt(serialStr, 10);
    const supply = parseInt(supplyStr, 10);

    if (isNaN(serial) || isNaN(supply) || serial < 1 || supply < 1) {
        throw new Error(`Invalid serial format: ${serialRaw}`);
    }

    const { rarity, minRarity } = rarityValues;

    const numerator = Math.log10(1 + ((serial - 1) / supply * 1000));
    const denominator = Math.log10(1000);

    const bbd = rarity * (1 - (numerator / denominator)) + minRarity;

    return Math.round(bbd * 100) / 100;
}

export async function getFloorPricesByModelAndRarity(pairs = []) {
    const floorPrices = {};

    for (const { modelId, rarity } of pairs) {
        const key = `${modelId}-${rarity}`;
        try {
            console.log(`Recherche pour modèle ${modelId} et rareté ${rarity} et key ${key}`);
            floorPrices[key] = await getFloorPriceByModelAndRarity(modelId, rarity);
        } catch (e) {
            console.error(`Erreur pour key ${key} :`, e);
            floorPrices[key] = 0;
        }
    }

    return floorPrices;
}

export async function getFloorPriceByModelAndRarity(modelId, rarity) {
    console.log(`Recherche FP pour modèle ${modelId} et rareté ${rarity}`);
    const result = await searchCardsByCriteriasV2({
        attributes: [{ 'name': 'Card Number', 'value': [modelId] }, { 'name': 'Rarity', 'value': rarity }],
        status: 'Listed',
        limit: 1,
        sort: 'priceLowToHigh',
    });

    const asset = result.results?.[0];
    
    if (asset?.listing?.price) {
        return asset.listing.price;
    } else {
        return null;
    }
}

export async function processWithConcurrencyLimit(items, concurrency, asyncCallback) {
    const results = [];
    const executing = new Set();

    for (const item of items) {
        const p = (async () => await asyncCallback(item))()
            .then(result => {
                results.push(result);
                executing.delete(p);
            });

        executing.add(p);

        if (executing.size >= concurrency) {
            // Attend qu'au moins une promesse se termine
            await Promise.race(executing);
        }
    }

    // Attend la fin de toutes les promesses restantes
    await Promise.all(executing);
    return results;
}
