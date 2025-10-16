import { buildSaleListingNFTEmbed } from './embeds.js';
import { getThreadIdForToken } from './discord.js';
import {
    getRarityColor,
    checkDateIsValidSinceLastOneInterval,
    getContentTagsDependsOnNFT,
    getFloorPriceByModelAndRarity,
} from './utils.js';
import { sendStatusMessage } from './error-handler.js';
import { IS_TEST_MODE } from './config.js';

export async function callApiToHandleNFTEvents(discordClient) {
    try {
        console.log(`callApiToHandleNFTEvents à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
        const response = await fetch('https://back.dolz.io/apiMarket.php', {
            method: 'POST',
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                activityMode: true,
                attributes: btoa(JSON.stringify([])),
                command: 'getNFTEvents',
                contractAddress: process.env.NFT_CONTRACT_ADDRESS,
                limit: 100,
                nftId: null,
                page: 1,
                saleType: 'All',
                sort: 'recentlyListed',
                status: 'All',
                walletAddress: null,
            }),
        });

        const data = await response.json();
        for (const item of data.events) {
            console.log(item.nftId, item.type, item.typeFull, checkDateIsValidSinceLastOneInterval(item.date));
            if (checkDateIsValidSinceLastOneInterval(item.date)) {
                const tokenId = item.nftId;
                const data = await getNFTData(tokenId);
                const price = item.price;
                const seller = item.from;
                const buyer = item.to;
                const embed = await buildSaleListingNFTEmbed(
                    data,
                    seller,
                    buyer,
                    price,
                    item.type,
                );
                const threadId = getThreadIdForToken(item.type, seller);
                const thread = await discordClient.channels.fetch(threadId);
                if (thread?.isTextBased()) {
                    await thread.send({
                        content: getContentTagsDependsOnNFT(data, price, item.type),
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
            } else {
                break;
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
        let image = `https://cardsdata.dolz.io/iStripper/${cardNumber}/${edition}/${rarityType}/${serialBase}_lgx.png`;
        if (rarityType === 'Not revealed') {
            image = 'https://cardsdata.dolz.io/iStripper/hiddenDOLZ_smx.png';
        }

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
            attributes: btoa(JSON.stringify(attributes)),
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
