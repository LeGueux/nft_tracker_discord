import { buildSaleListingNFTEmbed } from './embeds.js';
import { getThreadIdForToken } from './discord.js';
import {
    getRarityColor,
    weiToDolz,
    checkDateIsValidSinceLastOneInterval,
    getContentTagsDependsOnNFT,
    getFloorPriceByModelAndRarity,
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
                    'sale',
                );
                const threadId = getThreadIdForToken('sale', seller);
                console.log(`Thread ID pour la vente (sale): Token ID : ${tokenId}, Seller : ${seller}`);
                const thread = await discordClient.channels.fetch(threadId);
                if (thread?.isTextBased()) {
                    await thread.send({
                        content: getContentTagsDependsOnNFT(data, price, 'sale'),
                        embeds: [embed],
                        allowedMentions: {
                            users: [
                                process.env.FRANCK_DISCORD_USER_ID,
                                process.env.NICO_DISCORD_USER_ID,
                                process.env.BOB_DISCORD_USER_ID,
                                process.env.COCH_DISCORD_USER_ID,
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
                                process.env.BOB_DISCORD_USER_ID,
                                process.env.COCH_DISCORD_USER_ID,
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
                    process.env.BOB_ADDRESS_1.toLowerCase(),
                    process.env.COCH_ADDRESS_1.toLowerCase(),
                ].includes(item.asset?.owner.toLowerCase())
            ) {
                const isForFranck = [
                    process.env.FRANCK_ADDRESS_1.toLowerCase(),
                    process.env.FRANCK_ADDRESS_2.toLowerCase(),
                ].includes(item.asset.owner.toLowerCase());
                const isForNico = [
                    process.env.NICO_ADDRESS_1.toLowerCase(),
                    process.env.NICO_ADDRESS_2.toLowerCase(),
                ].includes(item.asset.owner.toLowerCase());
                const isForBob = [
                    process.env.BOB_ADDRESS_1.toLowerCase(),
                ].includes(item.asset.owner.toLowerCase());
                const isForCoch = [
                    process.env.COCH_ADDRESS_1.toLowerCase(),
                ].includes(item.asset.owner.toLowerCase());
                const tokenId = item.tokenId;
                const data = await getNFTData(tokenId);
                const price = parseInt(weiToDolz(item.totalPrice));
                const embed = await buildSaleListingNFTEmbed(
                    data,
                    item.asset.owner,
                    item.maker,
                    price,
                    'offer',
                );
                const threadId = getThreadIdForToken('offer');
                console.log(`Thread ID pour l'offre (offer): Token ID: ${tokenId}, Owner: ${item.asset.owner}`);
                const thread = await discordClient.channels.fetch(threadId);
                let contentTag = `<@${process.env.FRANCK_DISCORD_USER_ID}>`;
                if (isForNico) {
                    contentTag = `<@${process.env.NICO_DISCORD_USER_ID}>`;
                } else if (isForBob) {
                    contentTag = `<@${process.env.BOB_DISCORD_USER_ID}>`;
                } else if (isForCoch) {
                    contentTag = `<@${process.env.COCH_DISCORD_USER_ID}>`;
                }
                if (thread?.isTextBased()) {
                    await thread.send({
                        content: contentTag,
                        embeds: [embed],
                        allowedMentions: {
                            users: [
                                process.env.FRANCK_DISCORD_USER_ID,
                                process.env.NICO_DISCORD_USER_ID,
                                process.env.BOB_DISCORD_USER_ID,
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

export async function getDolzPrice() {
    try {
        // Envoi de la requête POST à l'API avec le corps contenant le type de commande
        const response = await fetch('https://back.dolz.io/api.php', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                command: 'getDolzPrice',
            }),
        });

        // Parsing de la réponse JSON
        const data = await response.json();

        return 'DOLZ' in data ? parseFloat(data['DOLZ']) : 0;
    } catch (error) {
        // Affichage de l'erreur en cas d'échec de la requête ou de parsing
        console.error(
            `Erreur lors de la récupération du prix du Dolz:`,
            error,
        );
        // Retourne 0 par défaut en cas d'erreur
        return 0;
    }
}

export async function getUserNFTs(address) {
    try {
        // Envoi de la requête POST à l'API avec le corps contenant le type de commande et le wallet address
        const response = await fetch('https://back.dolz.io/api.php', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                command: 'getUserNFTs',
                contractAddress: process.env.NFT_CONTRACT_ADDRESS,
                walletAddress: address,
            }),
        });
        // Parsing de la réponse JSON
        const data = await response.json();

        return data;
    } catch (error) {
        // Affichage de l'erreur en cas d'échec de la requête ou de parsing
        console.error(
            `Erreur lors de la récupération du prix du Dolz:`,
            error,
        );
        // Retourne 0 par défaut en cas d'erreur
        return 0;
    }
}

export async function getNFTData(tokenId, withFloorPrice = true) {
    console.log(`Récupération des données pour le token ID: ${tokenId} (withFloorPrice: ${withFloorPrice})`);
    try {
        const response = await fetch('https://back.dolz.io/apiMarket.php', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                command: 'getNFTInfos',
                contractAddress: process.env.NFT_CONTRACT_ADDRESS,
                nftId: tokenId,
            }),
        });
        // Parsing de la réponse JSON
        const data = await response.json();

        // Sécurité : vérifier que la structure est bien conforme
        if (!data?.traits || !data?.extendedInfos) {
            console.warn(`Structure inattendue pour le token ${tokenId}`, data);
            return {};
        }

        // Extraction et mappage vers l'ancien format
        const traits = data.traits;
        const rarity = traits.Rarity?.[0];
        const season = traits.Season?.[0];
        const cardNumber = traits['Card Number']?.[0];
        const serialBase = traits['Serial Number']?.[0];

        // Récupération du total selon la rareté
        const totalForRarity = data.extendedInfos?.nftInfos?.[rarity] || '?';
        const serialNumber = serialBase ? `${serialBase}/${totalForRarity}` : null;

        // Pour le nom, on privilégie extendedInfos.name si dispo
        const name = data.extendedInfos?.name
            ? `${data.extendedInfos.name} - ${data.extendedInfos.title}`
            : traits.Name?.[0] || 'Unknown';

        // L’image doit être reconstruite car elle n’est plus directement fournie
        // Exemple d’URL basée sur ton ancien format d’image :
        const rarityType = rarity || 'Limited';
        const edition = traits.Edition?.[0] || '1';
        const image = `https://cardsdata.dolz.io/iStripper/${cardNumber}/${edition}/${rarityType}/${serialBase}_lgx.png`;

        const listingPrice = data.marketInfos?.listing?.price || null;
        const owner = data.marketInfos?.owner || null;
        let floorPrice = null;
        if (cardNumber && rarity && withFloorPrice) {
            floorPrice = await getFloorPriceByModelAndRarity(cardNumber, rarity);
        }

        return {
            tokenId,
            name,
            image,
            rarity,
            rarity_color: getRarityColor(rarity),
            season,
            card_number: cardNumber,
            serial_number: serialNumber,
            listing_price: listingPrice,
            floor_price: floorPrice,
            owner: owner,
        };
    } catch (error) {
        console.error(`Erreur lors de la récupération du token ${tokenId}:`, error);
        return {};
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

export async function searchCardsByCriteriasV2({
    attributes = [],
    limit = 1,
    sort = 'priceLowToHigh',
    status = 'All',
    walletAddress = null,
    listingOnly = false,
    returnOnlyTotal = false,
} = {}) {
    try {
        console.log(`🔍 searchCardsByCriteriasV2 lancé à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
        console.log(`🧪 Paramètres : ${JSON.stringify({ attributes, limit, sort, status, walletAddress, listingOnly, returnOnlyTotal })}`);

        const baseBody = {
            contractAddress: process.env.NFT_CONTRACT_ADDRESS,
            command: 'getNFTsForAttributes',
            limit,
            sort,
            status,
        };

        if (attributes && attributes.length > 0) {
            baseBody.attributes = btoa(JSON.stringify(attributes));
        }
        if (walletAddress) {
            baseBody.walletAddress = walletAddress.toLowerCase();
        }

        // 🔹 Cas simple : on veut juste le total
        if (returnOnlyTotal || limit === 1) {
            const response = await fetch('https://back.dolz.io/apiMarket.php', {
                method: 'POST',
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...baseBody, page: 1 }),
            });

            const data = await response.json();
            return returnOnlyTotal ? (data.total ?? 0) : data;
        }

        // 🔹 Sinon, on boucle sur toutes les pages
        let allResults = [];
        let currentPage = 1;
        let total = 0;

        while (true) {
            const body = { ...baseBody, page: currentPage };

            const response = await fetch('https://back.dolz.io/apiMarket.php', {
                method: 'POST',
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!data.results || data.results.length === 0) break;

            allResults = allResults.concat(data.results);
            total = data.total ?? allResults.length;

            console.log(`📄 Page ${currentPage} récupérée (${data.results.length} résultats)`);

            if (allResults.length == data.total) break;

            currentPage++;
        }

        if (listingOnly) {
            allResults = allResults.filter(item => item.listing !== null);
            total = allResults.length;
        }

        return { results: allResults, total };
    } catch (error) {
        console.error('❌ Erreur dans searchCardsByCriteriasV2:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur dans searchCardsByCriteriasV2 - Rejection : \`${error}\``,
        );
        return { results: [], total: 0 };
    }
}
