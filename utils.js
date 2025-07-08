import { COMETH_API_INTERVAL, NFT_LIST_BY_SEASON } from "./config.js";

function getRarityColor(rarity) {
    switch (rarity) {
        case "Rare":
            return "#FFFFFF";
        case "Epic":
            return "#D1AC09";
        case "Legendary":
            return "#BF55EC";
        default:
            return "#000000";
    }
}

export function checkDateIsValidSinceLastOneInterval(date) {
    return date >= new Date(new Date().getTime() - COMETH_API_INTERVAL);
}

// Convertit du wei en DOLZ
export function weiToDolz(weiStr) {
    return parseFloat(weiStr) / 1e18;
}

export async function getNFTData(tokenId) {
    try {
        // Exemple: https://cardsdata.dolz.io/jsons/51690.json
        const response = await fetch(`https://cardsdata.dolz.io/jsons/${tokenId}.json`);
        if (!response.ok) return;

        const data = await response.json();
        return {
            name: data.name,
            image: data.image,
            rarity: data.attributes.find((attr) => attr.trait_type === "Rarity")?.value,
            rarity_color: getRarityColor(data.attributes.find((attr) => attr.trait_type === "Rarity")?.value),
            season: data.attributes.find((attr) => attr.trait_type === "Season")?.value,
            card_number: data.attributes.find((attr) => attr.trait_type === "Card Number")?.value,
            serial_number: data.attributes.find((attr) => attr.trait_type === "Serial Number")?.value,
        };
    } catch (error) {
        console.error(`Erreur lors de la récupération du token ${tokenId}:`, error);
        return {};
    }
}

export function getNFTSeasonByCardNumber(cardNumber) {
    for (const [season, cardNumbers] of Object.entries(NFT_LIST_BY_SEASON)) {
        if (cardNumbers.has(cardNumber)) {
            return season;
        }
    }
    return "Special Edition";
}

export function getContentTagsDependsOnNFT(data, price, type) {
    // Exemple DATA: https://cardsdata.dolz.io/jsons/51690.json
    const FRANCK = `<@${process.env.FRANCK_DISCORD_USER_ID}>`;
    const NICO = `<@${process.env.NICO_DISCORD_USER_ID}>`;

    const isListing = type === "listing";
    const isSale = type === "sale";
    const isStandardSeason = !["Special Edition", "Off-Season"].includes(data.season);
    const isLimited = data.rarity === "Limited";
    const isRare = data.rarity === "Rare";
    const isEpic = data.rarity === "Epic";
    const isRareOrLimited = ["Limited", "Rare"].includes(data.rarity);

    if (isListing && isStandardSeason) {
        // FRANCK ONLY
        // Listing | All seasons                          | Price <= 800
        // Listing | All seasons                          | Price <= 6000 | Epic
        // Listing | S1                                   | Price <= 5000
        // Listing | S2                                   | Price <= 4000
        // Listing | S6                                   | Price <= 1000
        // Listing | S6                                   | Price <= 2000 | Rare
        // Listing | S7                                   | Price <= 1000
        // Listing | S7                                   | Price <= 2000 | Rare
        if (price <= 800 ||
            (isEpic && price <= 6000) ||
            (data.season === "1" && price <= 5000) ||
            (data.season === "2" && price <= 4000) ||
            (data.season === "6" && (price <= 1000 || (isRare && price <= 2000))) ||
            (data.season === "7" && (price <= 1000 || (isRare && price <= 2000)))
        ) {
            return FRANCK;
        }

        // FRANCK + NICO
        // Listing | S6 Octokuro g0065     | Price <= 5000
        // Listing | S7 Emiri Momota g0125 | Price <= 3500
        // Listing | S7 Emiri Momota g0125 | Price <= 5000 | Rare
        if ((["g0125"].includes(data.card_number) && (price <= 3500 || (isRare && price <= 5000))) ||
            (["g0065"].includes(data.card_number) && price <= 5000)
        ) {
            return `${FRANCK} ${NICO}`;
        }
    }
    // NICO ONLY
    // S3 Kelly Zelda g0092      | Limited
    // Listing | S1
    if (["g0092"].includes(data.card_number) ||
        data.season === "1") {
        return NICO;
    }
    return "";
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

    // Tu peux arrondir ou pas selon le besoin :
    return Math.round(bbd * 100) / 100;
}
