import { buildSaleListingNFTEmbed } from './embeds.js';
import { getThreadIdForToken } from './discord.js';
import {
    getNFTData,
    weiToDolz,
    checkDateIsValidSinceLastOneInterval,
    getContentTagsDependsOnNFT,
} from './utils.js';
import { sendStatusMessage } from './error-handler.js';
import { IS_TEST_MODE } from './config.js';

export async function callComethApiForLastSales(discordClient) {
    try {
        console.log(`callComethApiForLastSales à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
        const response = await fetch(
            'https://api.marketplace.cometh.io/v1/orders/filled-events/search',
            {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    apikey: process.env.COMETH_API_KEY,
                },
                body: JSON.stringify({
                    tokenAddress: process.env.NFT_CONTRACT_ADDRESS,
                    limit: 10,
                }),
            },
        );

        const data = await response.json();
        // console.log(data);
        for (const item of data.filledEvents) {
            console.log(item.tokenId, item.direction, checkDateIsValidSinceLastOneInterval(new Date(item.blockTimestamp)));
            if (checkDateIsValidSinceLastOneInterval(new Date(item.blockTimestamp))) {
                const tokenId = item.tokenId;
                const data = await getNFTData(tokenId);
                const price = parseInt(weiToDolz(item.erc20FillAmount)) / 0.9803;
                const seller = item.direction === 'sell' ? item.maker : item.taker;
                const buyer = item.direction === 'sell' ? item.taker : item.maker;
                const embed = await buildSaleListingNFTEmbed(
                    data,
                    seller,
                    buyer,
                    price,
                    tokenId,
                    'sale',
                );
                const threadId = getThreadIdForToken('sale', seller);
                const thread = await discordClient.channels.fetch(threadId);
                if (thread?.isTextBased()) {
                    await thread.send({
                        content: getContentTagsDependsOnNFT(data, price, 'sale'),
                        embeds: [embed],
                        allowedMentions: {
                            users: [
                                process.env.FRANCK_DISCORD_USER_ID,
                                process.env.NICO_DISCORD_USER_ID,
                            ],
                        },
                    });
                }
            }
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des cartes:', error);
    }
}

export async function callComethApiForLastListings(discordClient) {
    try {
        console.log(`callComethApiForLastListings à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
        // https://api.marketplace.cometh.io/v1/doc#tag/order/operation/searchOrders
        const response = await fetch(
            'https://api.marketplace.cometh.io/v1/orders/search',
            {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    apikey: process.env.COMETH_API_KEY,
                },
                body: JSON.stringify({
                    tokenAddress: process.env.NFT_CONTRACT_ADDRESS,
                    statuses: ['open'],
                    limit: 50,
                    orderBy: 'UPDATED_AT',
                    orderByDirection: 'DESC',
                }),
            },
        );

        const data = await response.json();
        // console.log(data);
        for (const item of data.orders) {
            console.log(item.tokenId, item.direction, checkDateIsValidSinceLastOneInterval(new Date(item.signedAt)));
            if (!checkDateIsValidSinceLastOneInterval(new Date(item.signedAt))) {
                break; // Sort complètement de la boucle si la condition est fausse
            }
            if (item.direction == 'sell') {
                const tokenId = item.tokenId;
                const data = await getNFTData(tokenId);
                const price = parseInt(weiToDolz(item.totalPrice));
                const embed = await buildSaleListingNFTEmbed(
                    data,
                    item.maker,
                    null,
                    price,
                    tokenId,
                    'listing',
                );
                const threadNameDependsOnPrice = price < 500 ? 'main' : 'listing';
                const threadId = getThreadIdForToken(threadNameDependsOnPrice);
                const thread = await discordClient.channels.fetch(threadId);
                if (thread?.isTextBased()) {
                    await thread.send({
                        content: getContentTagsDependsOnNFT(data, price, 'listing'),
                        embeds: [embed],
                        allowedMentions: {
                            users: [
                                process.env.FRANCK_DISCORD_USER_ID,
                                process.env.NICO_DISCORD_USER_ID,
                            ],
                        },
                    });
                }
            } else if (
                item.direction == 'buy' &&
                [
                    process.env.FRANCK_ADDRESS_1.toLowerCase(),
                    process.env.FRANCK_ADDRESS_2.toLowerCase(),
                    process.env.NICO_ADDRESS_1.toLowerCase(),
                    process.env.NICO_ADDRESS_2.toLowerCase(),
                ].includes(item.asset?.owner.toLowerCase())
            ) {
                const isForFranck = [
                    process.env.FRANCK_ADDRESS_1.toLowerCase(),
                    process.env.FRANCK_ADDRESS_2.toLowerCase(),
                ].includes(item.asset.owner.toLowerCase());
                const tokenId = item.tokenId;
                const data = await getNFTData(tokenId);
                const price = parseInt(weiToDolz(item.totalPrice));
                const embed = await buildSaleListingNFTEmbed(
                    data,
                    item.asset.owner,
                    item.maker,
                    price,
                    tokenId,
                    'offer',
                );
                const threadId = getThreadIdForToken('offer');
                const thread = await discordClient.channels.fetch(threadId);
                const contentTag = isForFranck
                    ? `<@${process.env.FRANCK_DISCORD_USER_ID}>`
                    : `<@${process.env.NICO_DISCORD_USER_ID}>`;
                if (thread?.isTextBased()) {
                    await thread.send({
                        content: contentTag,
                        embeds: [embed],
                        allowedMentions: {
                            users: [
                                process.env.FRANCK_DISCORD_USER_ID,
                                process.env.NICO_DISCORD_USER_ID,
                            ],
                        },
                    });
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des cartes:', error);
    }
}

export async function getDolzUsername(address) {
    try {
        // Envoi de la requête POST à l'API avec l'adresse du wallet
        const response = await fetch('https://back.dolz.io/api.php', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                command: 'getDolzUsername',
                userAddress: address,
            }),
        });

        // Parsing de la réponse JSON
        const data = await response.json();

        // Retourne le nom d'utilisateur tel que renvoyé par l'API
        return data;
    } catch (error) {
        // Affichage de l'erreur dans la console en cas d'échec
        console.error(
            `Erreur lors de la récupération du username de ${address}:`,
            error,
        );

        // Retourne une chaîne vide par défaut si une erreur survient
        return '';
    }
}

export async function getBabyDolzBalance(address) {
    try {
        // Envoi de la requête POST à l'API avec le corps contenant le type de commande et l'adresse du portefeuille
        const response = await fetch('https://back.dolz.io/api.php', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                command: 'getBabyDolzBalance',
                wallet: address,
            }),
        });

        // Parsing de la réponse JSON
        const data = await response.json();

        // Conversion de la donnée retournée en entier
        return parseInt(data);
    } catch (error) {
        // Affichage de l'erreur en cas d'échec de la requête ou de parsing
        console.error(
            `Erreur lors de la récupération du nombre de BabyDolz de ${address}:`,
            error,
        );
        // Retourne 0 par défaut en cas d'erreur
        return 0;
    }
}

export async function searchFilledEventsByCriterias({
    maker = null,
    taker = null,
    attributes = [],
    limit = 1,
    returnOnlyTotal = false,
} = {}) {
    try {
        console.log(`🔍 searchCardsByCriterias lancé à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
        console.log(`🧪 Paramètres : ${JSON.stringify({ attributes, limit })}`);

        const body = {
            tokenAddress: process.env.NFT_CONTRACT_ADDRESS,
            attributes,
            limit,
        };

        if (maker) {
            body.maker = maker.toLowerCase();
        }

        if (taker) {
            body.taker = taker.toLowerCase();
        }

        if (attributes) {
            body.attributes = attributes; // tableau d’objets : ex [{ Season: 'S1' }, { Rarity: 'Rare' }]
        }

        const response = await fetch('https://api.marketplace.cometh.io/v1/orders/filled-events/search',
            {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    apikey: process.env.COMETH_API_KEY,
                },
                body: JSON.stringify(body),
            },
        );

        const data = await response.json();
        // console.log(data);
        const nowMinus30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const grouped = {};

        for (const item of data.filledEvents) {
            const eventDate = new Date(item.blockTimestamp);
            if (eventDate.getTime() >= nowMinus30Days) {
                const dateStr = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
                const price = parseInt(weiToDolz(item.erc20FillAmount) / 0.9803);
                if (!grouped[dateStr]) {
                    if (maker || taker) {
                        grouped[dateStr] = { date: dateStr, volumeAchats: 0, nbAchats: 0, volumeVentes: 0, nbVentes: 0 };
                    } else {
                        grouped[dateStr] = { date: dateStr, volume: 0, count: 0 };
                    }
                }
                if (maker || taker) {
                    const isTransactionSale = (item.direction === 'sell' && maker) || (item.direction === 'buy' && taker);
                    if (isTransactionSale) {
                        grouped[dateStr].volumeVentes += price;
                        grouped[dateStr].nbVentes += 1;
                    } else {
                        grouped[dateStr].volumeAchats += price;
                        grouped[dateStr].nbAchats += 1;
                    }
                } else {
                    grouped[dateStr].volume += price;
                    grouped[dateStr].count += 1;
                }
            } else {
                break; // plus vieux que 30 jours, on arrête
            }
        }

        // Transformation en tableau
        const result = Object.values(grouped);

        // Tri si nécessaire par date
        result.sort((a, b) => new Date(a.date) - new Date(b.date));

        return returnOnlyTotal ? result.total : result;
    } catch (error) {
        console.error('❌ Erreur dans searchCardsByCriterias:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur dans searchCardsByCriterias - Rejection : \`${error}\``,
        );
        return { assets: [], total: 0 };
    }
}

export async function searchCardsByCriterias({
    owner = null,
    attributes = [],
    onSaleOnly = false,
    limit = 1,
    skip = 0,
    orderBy = 'PRICE',
    direction = 'ASC',
    returnOnlyTotal = false,
} = {}) {
    try {
        console.log(`🔍 searchCardsByCriterias lancé à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
        console.log(`🧪 Paramètres : ${JSON.stringify({ attributes, onSaleOnly, limit, skip, orderBy, direction })}`);

        const body = {
            contractAddress: process.env.NFT_CONTRACT_ADDRESS,
            attributes, // tableau d’objets : ex [{ Season: 'S1' }, { Rarity: 'Rare' }]
            limit,
            skip,
            orderBy,
            direction,
        };

        if (onSaleOnly) {
            body.isOnSale = true;
        }

        if (owner) {
            body.owner = owner.toLowerCase();
        }

        const response = await fetch('https://api.marketplace.cometh.io/v1/assets/search',
            {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    apikey: process.env.COMETH_API_KEY,
                },
                body: JSON.stringify(body),
            },
        );

        const data = await response.json();
        return returnOnlyTotal ? data.total : data;
    } catch (error) {
        console.error('❌ Erreur dans searchCardsByCriterias:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur dans searchCardsByCriterias - Rejection : \`${error}\``,
        );
        return { assets: [], total: 0 };
    }
}

export async function getFloorPricesByModelAndRarity(pairs = []) {
    const floorPrices = {};

    for (const { modelId, rarity } of pairs) {
        const key = `${modelId}-${rarity}`;
        try {
            console.log(`Recherche pour modèle ${modelId} et rareté ${rarity} et key ${key}`);
            const result = await searchCardsByCriterias({
                attributes: [{ 'Card Number': [modelId], 'Rarity': [rarity] }],
                onSaleOnly: true,
                limit: 1,
                orderBy: 'PRICE',
                direction: 'ASC',
            });

            const asset = result.assets?.[0];
            if (IS_TEST_MODE) {
                console.log(`Recherche pour modèle ${modelId} et rareté ${rarity}:`, asset?.metadata, asset?.orderbookStats);
            }
            if (asset?.orderbookStats?.lowestListingPrice) {
                floorPrices[key] = parseInt(weiToDolz(asset.orderbookStats.lowestListingPrice));
            } else {
                floorPrices[key] = 0;
            }
        } catch (e) {
            console.error(`Erreur pour key ${key} :`, e);
            floorPrices[key] = 0;
        }
    }

    return floorPrices;
}

export async function getFloorPriceByModelAndRarity(modelId, rarity) {
    console.log(`Recherche FP pour modèle ${modelId} et rareté ${rarity}`);
    const result = await searchCardsByCriterias({
        attributes: [{ 'Card Number': [modelId], 'Rarity': [rarity] }],
        onSaleOnly: true,
        limit: 1,
        orderBy: 'PRICE',
        direction: 'ASC',
    });

    const asset = result.assets?.[0];
    if (asset?.orderbookStats?.lowestListingPrice) {
        return parseInt(weiToDolz(asset.orderbookStats.lowestListingPrice));
    } else {
        return 0;
    }
}
