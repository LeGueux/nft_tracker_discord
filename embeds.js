import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import {
    searchCardsByCriteriasV2,
    getDolzUsername,
    getBabyDolzBalance,
    getDolzPrice,
} from './api-service.js';
import { getDolzBalance } from './alchemy-api.js';
import {
    getNFTSeasonByCardNumber,
    calculateBBDRewardNftByNFTData,
    getFloorPricesByModelAndRarity,
} from './utils.js';
import { IS_TEST_MODE, RARITY_ORDER, NFT_LIST_BY_SEASON } from './config.js';

const formatNumber = (num) => new Intl.NumberFormat('fr-FR').format(num);

const rarityShort = {
    'Limited': `🟢L`,
    'Rare': '🟡R',
    'Epic': '💎E',
    'Legendary': '👑LG',
    'Not Revealed': '❔ NR'
};

function getPriceStringFormatted(price, dolzPrice) {
    const priceInDollars = price * dolzPrice;
    return `${formatNumber(parseInt(price))} DOLZ ($ ${priceInDollars.toFixed(2)})`;
}

function getTitle(type, name) {
    if (type === 'sale') return `🛒 Sale: ${name}`;
    if (type === 'offer') return `📩 Received Offer: ${name}`;
    return `📢 Listing: ${name}`;
}

function getWhaleEmoji(totalAssets, dolzBalance) {
    const isDolzWhale = dolzBalance >= 100000;
    const isCardWhale = totalAssets >= 150;

    if (isDolzWhale && isCardWhale) return '🐋 🔴';
    if (isDolzWhale) return '🐋 🟣';
    if (isCardWhale) return '🐋 🟡';
    return '';
}

function getPrefixNameEmojiBySeason(season) {
    const emojiMap = {
        '1': '1️⃣',
        '2': '2️⃣',
        '3': '3️⃣',
        '4': '4️⃣',
        '5': '5️⃣',
        '6': '6️⃣',
        '7': '7️⃣',
        '8': '8️⃣',
        '9': '9️⃣',
        '10': '🔟',
    };

    return emojiMap[season] || '🃏';
}

export async function buildSaleListingNFTEmbed(data, from, to, price, type) {
    console.log('DATA: ', data);
    const [allAssetsSeller, babyDolzBalanceSeller, dolzBalanceSeller, dolzPrice, sellerUsernameData] = await Promise.all([
        searchCardsByCriteriasV2({
            limit: 10000,
            status: 'Owned',
            walletAddress: from,
        }),
        getBabyDolzBalance(from),
        getDolzBalance(from),
        getDolzPrice(),
        getDolzUsername(from),
    ]);
    console.log('Exemple:', allAssetsSeller.results[0]);
    const totalListedAssetsSeller = structuredClone(allAssetsSeller).results.filter(item => item.listing !== null).length;
    const assetsSellerForThisModel = structuredClone(allAssetsSeller).results.filter(item => item.cardNumber === data.card_number);

    const sellerUsername = (sellerUsernameData[0]?.duUsername ?? '').split('#')[0];
    // Cas où from correspond à un utilisateur spécifique
    let priceString = getPriceStringFormatted(price, dolzPrice);
    if ([
        process.env.FRANCK_ADDRESS_1.toLowerCase(),
        process.env.FRANCK_ADDRESS_2.toLowerCase(),
    ].includes(from.toLowerCase())) {
        const tpInDolz = price * parseFloat(process.env.FRANCK_TP_RATIO) / 100;
        priceString += `\nTP ${process.env.FRANCK_TP_RATIO}%: ${getPriceStringFormatted(tpInDolz, dolzPrice)}\n`;
    } else if ([
        process.env.NICO_ADDRESS_1.toLowerCase(),
        process.env.NICO_ADDRESS_2.toLowerCase(),
    ].includes(from.toLowerCase())) {
        const tpInDolz = price * parseFloat(process.env.NICO_TP_RATIO) / 100;
        priceString += `\nTP ${process.env.NICO_TP_RATIO}%: ${getPriceStringFormatted(tpInDolz, dolzPrice)}\n`;
    } else if ([
        process.env.BOB_ADDRESS_1.toLowerCase(),
    ].includes(from.toLowerCase())) {
        const tpInDolz = price * parseFloat(process.env.BOB_TP_RATIO) / 100;
        priceString += `\nTP ${process.env.BOB_TP_RATIO}%: ${getPriceStringFormatted(tpInDolz, dolzPrice)}\n`;
    } else if ([
        process.env.COCH_ADDRESS_1.toLowerCase(),
    ].includes(from.toLowerCase())) {
        const tpInDolz = price * parseFloat(process.env.COCH_TP_RATIO) / 100;
        priceString += `\nTP ${process.env.COCH_TP_RATIO}%: ${getPriceStringFormatted(tpInDolz, dolzPrice)}\n`;
    }

    const totalListedAssetsSellerForThisModel = structuredClone(assetsSellerForThisModel).filter(item => item.listing !== null).length;
    // Comptage des raretés dans ton tableau
    const rarityCount = {};
    for (const asset of assetsSellerForThisModel) {
        const rarity = asset.rarity || 'Not Revealed';
        rarityCount[rarity] = (rarityCount[rarity] || 0) + 1;
    }
    // Création des chaînes finales
    const totalStr = `${assetsSellerForThisModel.length}🃏 ${totalListedAssetsSellerForThisModel}🛒`;
    const rarityStr = RARITY_ORDER
        .filter(r => rarityCount[r] > 0)
        .map(r => `${rarityShort[r]}${rarityCount[r]}`)
        .join(' ');

    // Chaîne finale avec détails
    const assetsSellerForThisModelDetailStr = `${totalStr} ${rarityStr}`;

    const embed = new EmbedBuilder()
        .setTitle(getTitle(type, data.name))
        .setURL(`https://dolz.io/market/asset/${process.env.NFT_CONTRACT_ADDRESS}/${data.tokenId}`)
        .setImage(data.image)
        .setColor(data.rarity_color)
        .setTimestamp()
        .addFields(
            { name: '💰 Price:', value: priceString },
            { name: '⬇️ FP de la rareté:', value: getPriceStringFormatted(data.floor_price, dolzPrice) },
            {
                name: `🙋‍♂️ Seller: ${getWhaleEmoji(allAssetsSeller.total, dolzBalanceSeller)} ${sellerUsername}`,
                value:
                    `🔗 [${from}](https://dolz.io/market/profile/${from})\n` +
                    `Total Assets: ${allAssetsSeller.total}🃏 ${totalListedAssetsSeller}🛒\n` +
                    `Asset ${data.card_number}: ${assetsSellerForThisModelDetailStr}\n` +
                    `Total DOLZ: ${formatNumber(dolzBalanceSeller)}\n` +
                    `Total BabyDOLZ: ${formatNumber(babyDolzBalanceSeller)}\n`,
            }
        );
    if (['sale', 'offer'].includes(type)) {
        const [allAssetsBuyer, babyDolzBalanceBuyer, dolzBalanceBuyer, dolzPrice, buyerUsernameData] = await Promise.all([
            searchCardsByCriteriasV2({
                limit: 10000,
                status: 'Owned',
                walletAddress: to,
            }),
            getBabyDolzBalance(to),
            getDolzBalance(to),
            getDolzPrice(),
            getDolzUsername(to),
        ]);
        const totalListedAssetsBuyer = structuredClone(allAssetsBuyer).results.filter(item => item.listing !== null).length;
        const assetsBuyerForThisModel = structuredClone(allAssetsBuyer).results.filter(item => item.cardNumber === data.card_number);
        const buyerUsername = (buyerUsernameData[0]?.duUsername ?? '').split('#')[0];

        if (data.listing_price) {
            embed.addFields({ name: '💰 Listing Price:', value: `${getPriceStringFormatted(data.listing_price, dolzPrice)} DOLZ` });
        }

        const totalListedAssetsBuyerForThisModel = structuredClone(assetsBuyerForThisModel).filter(item => item.listing !== null).length;
        // Comptage des raretés dans ton tableau
        const rarityCount = {};
        for (const asset of assetsBuyerForThisModel) {
            const rarity = asset.rarity || 'Not Revealed';
            rarityCount[rarity] = (rarityCount[rarity] || 0) + 1;
        }
        // Création des chaînes finales
        const totalStr = `${assetsBuyerForThisModel.length}🃏 ${totalListedAssetsBuyerForThisModel}🛒`;
        const rarityStr = RARITY_ORDER
            .filter(r => rarityCount[r] > 0)
            .map(r => `${rarityShort[r]}${rarityCount[r]}`)
            .join(' ');

        // Chaîne finale avec détails
        const assetsBuyerForThisModelDetailStr = `${totalStr} ${rarityStr}`;

        embed.addFields({
            name: `🙋‍♂️ Buyer: ${getWhaleEmoji(allAssetsBuyer.total, dolzBalanceBuyer)} ${buyerUsername}`,
            value:
                `🔗 [${to}](https://dolz.io/market/profile/${to})\n` +
                `Total Assets: ${allAssetsBuyer.total}🃏 ${totalListedAssetsBuyer}🛒\n` +
                `Asset ${data.card_number}: ${assetsBuyerForThisModelDetailStr}\n` +
                `Total DOLZ: ${formatNumber(dolzBalanceBuyer)}\n` +
                `Total BabyDOLZ: ${formatNumber(babyDolzBalanceBuyer)}\n`,
        });
    }

    embed.addFields({ name: 'Season:', value: data.season, inline: true });
    embed.addFields({ name: 'Rarity:', value: data.rarity, inline: true });
    embed.addFields({ name: 'Serial Number:', value: data.serial_number, inline: true });

    return embed;
}

export async function buildSnipeEmbed(dataFormatted, season = 0) {
    const embedTitle = `💹 Sniping ${season < 100 ? 'S' + season : ''}`;
    const embed = new EmbedBuilder()
        .setTitle(embedTitle)
        .setTimestamp()
        .setColor(0x00ff99);

    try {
        // 🧮 Initialisation des totaux
        let totalFloorLimited = 0;
        let totalFloorRare = 0;

        for (const [index, item] of dataFormatted.slice(0, 25).entries()) {
            // Filtrer uniquement les gaps valides
            const simulatedGaps = item.simulatedGaps
                .map((g, i) => {
                    const gap = g?.priceGapPercent;
                    return gap !== null && gap !== undefined ? `${gap.toFixed(1)}%` : null;
                })
                .filter(Boolean); // Retire les nulls

            const labelPad = 7; // longueur max des libellés (pour aligner les ':')
            const lines = [];

            lines.push(
                `${'FP L'.padEnd(labelPad)}: ${item.floor ?? '-'}`,
                `${'FP R'.padEnd(labelPad)}: ${item.floorRare ?? '-'}`,
                `${`$$ (${item.countLimitedBeforeRare})`.padEnd(labelPad)}: ${item.prices.join(', ')}`,
                `${'Gaps'.padEnd(labelPad)}: ${item.priceGapPercent?.toFixed(1) ?? '-'}%` +
                (simulatedGaps.length > 0 ? `, ${simulatedGaps.join(', ')}` : '')
            );

            // ➕ Ajouter au total si saison < 100
            if (season < 100) {
                if (typeof item.floor === 'number') totalFloorLimited += item.floor;
                if (typeof item.floorRare === 'number') totalFloorRare += item.floorRare;
            }

            let blocTitle = `${getPrefixNameEmojiBySeason(getNFTSeasonByCardNumber(item.modelId))} ${item.isFragileLevel1 ? '🔥' : '🧊'}${item.isFragileLevel2 ? '🔥' : '🧊'} `;
            blocTitle += `${item.name}`;

            embed.addFields({
                name: '',
                value: blocTitle + ' ' + '```text\n' + lines.join('\n') + '\n```',
                inline: false,
            });
        }

        // 🦶 Footer avec ou sans total
        if (season < 100) {
            embed.setFooter({
                text: `Total Floor Limited: ${totalFloorLimited} | Rare: ${totalFloorRare}`
            });
        }

        console.log(`Embed length: ${embed.length} characters`);
        if (embed.length > 6000) {
            console.warn('Embed too large, truncating...');
            embed.setFields({
                name: 'Warning',
                value: `The embed content was too large and has been truncated. Please check the logs for details. ${embed.length} characters`,
            });
        }
        return embed;
    } catch (error) {
        console.warn('Embed builder error...');
        embed.setFields({
            name: 'Warning',
            value: `Embed builder error. Please check the logs for details. ${error}`,
        });
        return embed;
    }
}

export async function buildNftHoldersEmbed(analysisResult, season) {
    const {
        modelNames,
        cardsPerModel,
        topWalletsPerModel,
        numberOfFullCollectors,
        walletsPerModel,
    } = analysisResult;

    const embed = new EmbedBuilder()
        .setTitle(`🐋 Top Whales Saison ${season}`)
        .setColor(0x00ffcc)
        .setTimestamp()
        .setFooter({ text: `✅ Full season : ${numberOfFullCollectors}` });

    try {
        for (const [modelId, topList] of Object.entries(topWalletsPerModel)) {
            const lines = [];

            const nbWallets = walletsPerModel[modelId] || 0;
            const nbCards = cardsPerModel[modelId] || 0;
            const avg = nbWallets > 0 ? (nbCards / nbWallets).toFixed(1) : '0.0';

            const linkCards = `${getPrefixNameEmojiBySeason(season)} ${modelNames?.[modelId]} ${modelId}`;
            const top3Links = [];
            lines.push(`📦${nbCards} 🪪${nbWallets} 📊Moy: ${avg}`);

            for (const [i, holder] of topList.entries()) {
                const holderUsernameData = await getDolzUsername(holder.wallet);
                const holderUsername = (holderUsernameData[0]?.duUsername ?? '').split('#')[0];
                const percent = holder.percentOwned;
                const totalStr = `${holder.total}🃏 ${holder.listed}🛒`;

                const rarityStr = RARITY_ORDER
                    .filter(r => (holder[r] ?? 0) > 0)
                    .map(r => `${rarityShort[r]}${holder[r]}`)
                    .join(' ');

                // Ajouter le lien cliquable si dans le top 3
                if (i < 3) {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                    top3Links.push(`${medal} [${holderUsername}](https://dolz.io/market/profile/${holder.wallet})`);
                }

                lines.push(`${holderUsername.padEnd(10)} ${totalStr.padStart(8)}${percent.toString().padStart(4)}% ${rarityStr}`);
            }

            embed.addFields({
                name: ``,
                value: linkCards + ' ' + top3Links.join('') + '```text\n' + lines.join('\n') + '\n```',
                inline: false,
            });
        }

        // Sécurité : vérifier la taille de l'embed
        console.log(`Embed length: ${embed.length} characters`);
        if (embed.length > 6000) {
            console.warn('Embed too large, truncating...');
            embed.setFields({
                name: 'Warning',
                value: `The embed content was too large and has been truncated. Please check les logs. ${embed.length} characters`,
            });
        }

        return embed;
    } catch (error) {
        console.warn('Embed builder error...', error);
        embed.setFields({
            name: 'Warning',
            value: `Embed builder error. Please check the logs for details. ${error}`,
        });
        return embed;
    }
}

// Helper pour chunker un texte en morceaux <= maxLength sans couper au milieu d'une ligne
function chunkText(text, maxLength = 1000) {
    const lines = text.split('\n');
    const chunks = [];
    let currentChunk = '';

    for (const line of lines) {
        if ((currentChunk + line + '\n').length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = '';
        }
        currentChunk += line + '\n';
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

export async function buildNftTrackingEmbed(nftHoldersStats, nftResults, modelId, isUnrevealed = false, nbHolders = 15, withAddress = false) {
    const {
        modelNames,
        cardsPerModel,
        topWalletsPerModel,
        walletsPerModel,
    } = nftHoldersStats;

    const rarityEmojis = {
        'Limited': `🟢L`,
        'Rare': '🟡R',
        'Epic': '💎E',
        'Legendary': '👑LG',
        'Not Revealed': '❔ NR'
    };

    let embed = new EmbedBuilder()
        .setTitle(`<:snipe:1310218808123723829> Tracking card ${modelId}`)
        .setColor(0x00ffcc)
        .setTimestamp();

    try {
        // Ajout des champs topWalletsPerModel (chunk obligatoire car potentiellement très long)
        for (const [modelId, topList] of Object.entries(topWalletsPerModel)) {
            const holdersLines = [];
            const nbWallets = walletsPerModel[modelId] || 0;
            const nbCards = cardsPerModel[modelId] || 0;
            const avg = nbWallets > 0 ? (nbCards / nbWallets).toFixed(1) : '0.0';

            // Comptage du nombre de wallets distincts par rareté
            const rarityWalletsCount = {};
            for (const rarity of Object.keys(rarityEmojis)) {
                rarityWalletsCount[rarity] = topList.filter(holder => (holder[rarity] ?? 0) > 0).length;
            }

            holdersLines.push(`📦 ${nbCards} cartes | 🪪 ${nbWallets} wallets | 📊 Moy: ${avg}`);
            holdersLines.push(
                Object.entries(rarityWalletsCount)
                    .filter(([r, count]) => count > 0)
                    .map(([r, count]) => `${rarityEmojis[r]}: ${count} wallet${count > 1 ? 's' : ''}`)
                    .join(' | ')
            );

            holdersLines.push('');
            holdersLines.push(
                `Rank Name          | 📦  | %     | Détail`,
                `----------------------------------------------`
            );

            for (const [i, holder] of topList.entries()) {
                if (i >= nbHolders) break; // 🔥 stoppe après nbHolders lignes

                const holderUsernameData = await getDolzUsername(holder.wallet);
                const holderUsername = (holderUsernameData[0]?.duUsername ?? '').split('#')[0];

                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`.padEnd(4);
                const totalStr = `${holder.total}🃏 ${holder.listed}🛒`;
                const percentStr = `${parseFloat(holder.percentOwned).toFixed(1)}%`.padEnd(5);
                const rarityStr = RARITY_ORDER
                    .filter(r => (holder[r] ?? 0) > 0)
                    .map(r => `${rarityEmojis[r]}${holder[r]}`)
                    .join(' ');

                holdersLines.push(`${medal.padEnd(4)} ${holderUsername.padEnd(13)} ${totalStr.padStart(8)} ${percentStr} ${rarityStr}`);
                if (withAddress) {
                    holdersLines.push(`${holder.wallet}\n`);
                }
            }

            const chunks = chunkText(holdersLines.join('\n'));
            for (const chunk of chunks) {
                embed.addFields({
                    name: 'Holders',
                    value: '```text\n' + chunk + '\n```',
                    inline: false,
                });
            }
        }

        // Ajout du calculateur de BBD Reward si revealed card
        if (!isUnrevealed) {
            embed = buildNftBBDRewardCalculatorEmbedField(nftResults, modelId, embed);
        }

        // Sécurité : éviter débordement Discord
        console.log(`Embed total length: ${embed.length} characters`);
        if (embed.length > 6000) {
            console.warn('Embed too large, truncating...');
            embed.setFields({
                name: 'Warning',
                value: `The embed content was too large and has been truncated. Please check les logs. ${embed.length} characters`,
            });
        }

        return embed;
    } catch (error) {
        console.warn('Embed builder error...', error);
        embed.setFields({
            name: 'Warning',
            value: `Embed builder error. Please check the logs for details. ${error}`,
        });
        return embed;
    }
}

export async function buildWalletDataEmbed(from, withFullDetails = false) {
    const embed = new EmbedBuilder()
        .setURL(`https://dolz.io/market/profile/${from}`)
        .setTimestamp();

    const [
        allS1AssetsWallet,
        allS2AssetsWallet,
        allS3AssetsWallet,
        allS4AssetsWallet,
        allS5AssetsWallet,
        allS6AssetsWallet,
        allS7AssetsWallet,
        allS8AssetsWallet,
        allHighRarityAssetsWallet,
        allNotSeasonAssetsWallet,
        babyDolzBalanceWallet,
        dolzBalanceWallet,
        usernameData,
    ] = await Promise.all([
            searchCardsByCriteriasV2({
                attributes: [
                    { 'name': 'Rarity', 'value': 'Limited' },
                    { 'name': 'Rarity', 'value': 'Rare' },
                    { 'name': 'Season', 'value': '1' },
                ],
                limit: 100,
                status: 'Owned',
                walletAddress: from,
            }),
            searchCardsByCriteriasV2({
                attributes: [
                    { 'name': 'Rarity', 'value': 'Limited' },
                    { 'name': 'Rarity', 'value': 'Rare' },
                    { 'name': 'Season', 'value': '2' },
                ],
                limit: 100,
                status: 'Owned',
                walletAddress: from,
            }),
            searchCardsByCriteriasV2({
                attributes: [
                    { 'name': 'Rarity', 'value': 'Limited' },
                    { 'name': 'Rarity', 'value': 'Rare' },
                    { 'name': 'Season', 'value': '3' },
                ],
                limit: 100,
                status: 'Owned',
                walletAddress: from,
            }),
            searchCardsByCriteriasV2({
                attributes: [
                    { 'name': 'Rarity', 'value': 'Limited' },
                    { 'name': 'Rarity', 'value': 'Rare' },
                    { 'name': 'Season', 'value': '4' },
                ],
                limit: 100,
                status: 'Owned',
                walletAddress: from,
            }),
            searchCardsByCriteriasV2({
                attributes: [
                    { 'name': 'Rarity', 'value': 'Limited' },
                    { 'name': 'Rarity', 'value': 'Rare' },
                    { 'name': 'Season', 'value': '5' },
                ],
                limit: 100,
                status: 'Owned',
                walletAddress: from,
            }),
            searchCardsByCriteriasV2({
                attributes: [
                    { 'name': 'Rarity', 'value': 'Limited' },
                    { 'name': 'Rarity', 'value': 'Rare' },
                    { 'name': 'Season', 'value': '6' },
                ],
                limit: 100,
                status: 'Owned',
                walletAddress: from,
            }),
            searchCardsByCriteriasV2({
                attributes: [
                    { 'name': 'Rarity', 'value': 'Limited' },
                    { 'name': 'Rarity', 'value': 'Rare' },
                    { 'name': 'Season', 'value': '7' },
                ],
                limit: 100,
                status: 'Owned',
                walletAddress: from,
            }),
            searchCardsByCriteriasV2({
                attributes: [
                    { 'name': 'Rarity', 'value': 'Limited' },
                    { 'name': 'Rarity', 'value': 'Rare' },
                    { 'name': 'Season', 'value': '8' },
                ],
                limit: 100,
                status: 'Owned',
                walletAddress: from,
            }),
            searchCardsByCriteriasV2({
                attributes: [
                    { 'name': 'Rarity', 'value': 'Epic' },
                    { 'name': 'Rarity', 'value': 'Legendary' },
                    { 'name': 'Season', 'value': '8' },
                ],
                limit: 100,
                status: 'Owned',
                walletAddress: from,
            }),
            searchCardsByCriteriasV2({
                attributes: [
                    { 'name': 'Season', 'value': 'Off-Season' },
                    { 'name': 'Season', 'value': 'Special Edition' },
                ],
                limit: 100,
                status: 'Owned',
                walletAddress: from,
            }),
            getBabyDolzBalance(from),
            getDolzBalance(from),
            getDolzUsername(from),
        ]);
    // Fusionner tous les tableaux de cartes en un seul
    const allAssetsWallet = [
        ...allS1AssetsWallet.results,
        ...allS2AssetsWallet.results,
        ...allS3AssetsWallet.results,
        ...allS4AssetsWallet.results,
        ...allS5AssetsWallet.results,
        ...allS6AssetsWallet.results,
        ...allS7AssetsWallet.results,
        ...allS8AssetsWallet.results,
        ...allHighRarityAssetsWallet.results,
        ...allNotSeasonAssetsWallet.results,
    ];
    const totalListedAssetsWallet = structuredClone(allAssetsWallet).filter(item => item.listing !== null).length;
    // console.log(structuredClone(allAssetsWallet).filter(item => item.cardNumber === 'g0065'));
    // console.log(structuredClone(allAssetsWallet).filter(item => item.cardNumber === 'g0065').length);
    // process.exit(0);
    const username = (usernameData[0]?.duUsername ?? '').split('#')[0];
    const grouped = {}; // { [modelId]: { [rarity]: count } }
    const others = [];

    for (const asset of allAssetsWallet) {
        // Extraire rarity et modelId depuis animation_url
        const rarity = asset.rarity;
        const modelId = asset.cardNumber;

        if (['Limited', 'Rare'].includes(rarity)) {
            grouped[modelId] ??= {};
            grouped[modelId][rarity] ??= { count: 0, listed: 0 };
            grouped[modelId][rarity].count += 1;
            if (asset.listing?.price) {
                grouped[modelId][rarity].listed += 1;
            }
        } else {
            others.push({ modelId, rarity });
        }
    }
    console.log('Grouped data:', grouped);

    const uniqueModelRarityPairs = [];
    for (const modelId in grouped) {
        for (const rarity in grouped[modelId]) {
            uniqueModelRarityPairs.push({ modelId, rarity });
        }
    }
    console.log('Unique model-rarity pairs:', uniqueModelRarityPairs);

    const floorPrices = await getFloorPricesByModelAndRarity(uniqueModelRarityPairs);
    let totalDolzEstimated = dolzBalanceWallet;
    const groupedBySeason = {}; // { [season]: [ { modelId, count, listed, rarity, floor, value } ] }

    for (const modelId in grouped) {
        const rarityMap = grouped[modelId];
        for (const rarity of Object.keys(rarityMap)) {
            const { count, listed } = rarityMap[rarity];
            const floor = floorPrices[`${modelId}-${rarity}`] ?? 0;
            const value = count * floor;
            totalDolzEstimated += value;

            const season = getNFTSeasonByCardNumber(modelId);
            groupedBySeason[season] ??= [];
            groupedBySeason[season].push({ modelId, count, listed, rarity, floor, value });
        }
    }

    // --- Résumé global du wallet
    embed.addFields([
        {
            name: `🙋‍♂️ Wallet: ${getWhaleEmoji(allAssetsWallet.total, dolzBalanceWallet)} ${username}`,
            value:
                `🔗 [${from}](https://dolz.io/market/profile/${from})\n` +
                `Total Assets: ${allAssetsWallet.total}🃏 ${totalListedAssetsWallet}🛒\n` +
                `Total DOLZ: ${formatNumber(dolzBalanceWallet)}\n` +
                `Total BabyDOLZ: ${formatNumber(babyDolzBalanceWallet)}\n`,
        },
        {
            name: '💰 Estimée en DOLZ (Rare/Limited évaluées)',
            value: `${formatNumber(totalDolzEstimated)} DOLZ (au floor)\n` +
                `📦 Epic/Legendary/Not Revealed ignorées : ${others.length} cartes`,
        }
    ]);

    // --- Résumé par saison
    const displayOrder = [
        '1', '2', '3', '4', '5', '6', '7', '8', 'Off-Season', 'Special Edition'
    ];

    for (const season of displayOrder) {
        const models = groupedBySeason[season];
        if (!models?.length) continue;

        const modelOrder = NFT_LIST_BY_SEASON[season] ? [...NFT_LIST_BY_SEASON[season]] : [];
        models.sort((a, b) => {
            const iA = modelOrder.indexOf(a.modelId);
            const iB = modelOrder.indexOf(b.modelId);
            return iA !== -1 && iB !== -1 ? iA - iB : a.modelId.localeCompare(b.modelId);
        });

        let seasonTotal = 0;
        let seasonCount = 0;
        const detailsByModel = {};

        for (const { modelId, count, listed, rarity, floor, value } of models) {
            seasonTotal += value;
            seasonCount += count;

            if (withFullDetails) {
                if (!detailsByModel[modelId]) {
                    detailsByModel[modelId] = [];
                }
                const rarityDisplay = rarityShort[rarity] || rarity;
                detailsByModel[modelId].push({
                    count,
                    listed,
                    rarity: rarityDisplay,
                    floor,
                    value
                });
            }
        }

        let totalListed = models.reduce((sum, m) => sum + m.listed, 0);
        const listedInfo = totalListed > 0 ? ` • ${totalListed}🛒` : '';

        const details = [];
        if (withFullDetails) {
            for (const modelId of Object.keys(detailsByModel).sort((a, b) => {
                const iA = modelOrder.indexOf(a);
                const iB = modelOrder.indexOf(b);
                return iA !== -1 && iB !== -1 ? iA - iB : a.localeCompare(b);
            })) {
                const entries = detailsByModel[modelId];
                if (entries.length === 1) {
                    const { count, listed, rarity, floor, value } = entries[0];
                    const listedInfo = listed > 0 ? ` ${listed}🛒` : '';
                    details.push(
                        `${modelId} ${count}${rarity}${listedInfo} @${formatNumber(floor)} = ${formatNumber(value)}`
                    );
                } else {
                    const parts = entries.map(e => {
                        const listedInfo = e.listed > 0 ? ` ${e.listed}🛒` : '';
                        return `${e.count}${e.rarity}${listedInfo} @${formatNumber(e.floor)}`;
                    }).join(' + ');
                    const totalValue = entries.reduce((sum, e) => sum + e.value, 0);
                    details.push(
                        `${modelId} ${parts} = ${formatNumber(totalValue)}`
                    );
                }
            }
        }

        // ✅ Complétude
        let seasonCompleteness = "";
        if (NFT_LIST_BY_SEASON[season]?.size) {
            const expectedModels = NFT_LIST_BY_SEASON[season].size;
            const ownedModels = new Set(models.map(m => m.modelId)).size;
            const missing = expectedModels - ownedModels;

            seasonCompleteness = missing === 0
                ? "✅ Complète"
                : `❌ ${missing} modèle${missing > 1 ? "s" : ""} manquant${missing > 1 ? "s" : ""}`;
        }

        // Ajout du champ résumé
        embed.addFields({
            name: `🧾 Saison ${season}`,
            value: `${seasonCount} cartes${listedInfo}, ${formatNumber(seasonTotal)} DOLZ\n${seasonCompleteness}`
        });

        // Ajout du champ détails si demandé
        if (withFullDetails && details.length) {
            const detailsText = details.join("\n");
            for (let i = 0; i < detailsText.length; i += 1024) {
                embed.addFields({
                    name: `📋 Détails ${season.startsWith('S') ? season : 'S' + season}`,
                    value: "```text\n" + detailsText.slice(i, i + 1024) + "\n```"
                });
            }
        }
    }

    return embed;
}

function buildNftBBDRewardCalculatorEmbedField(nftResults, modelId, embed) {
    console.log(`buildNftBBDRewardCalculatorEmbedField for modelId ${modelId}`);
    try {
        // Étape 1 : préparer toutes les lignes dans un tableau temporaire
        const assetStats = [];

        for (const { asset, nftData } of nftResults) {
            if (!nftData.listing_price) continue;

            const priceDolz = nftData.listing_price;
            const bbdRewardNft = calculateBBDRewardNftByNFTData(nftData);
            const ratio = bbdRewardNft / priceDolz;

            assetStats.push({
                nftData,
                priceDolz,
                bbdRewardNft,
                ratio,
            });
        }

        // Étape 2 : classement des ratios sans toucher à l’ordre
        const filteredRatios = assetStats
            .filter(a => a.nftData.rarity === 'Limited' || a.nftData.rarity === 'Rare')
            .map(a => a.ratio)
            .sort((a, b) => b - a); // tri décroissant

        function getColorEmojiFromRatio(ratio) {
            const index = filteredRatios.findIndex(r => r === ratio);
            const rank = index / filteredRatios.length;

            if (index === -1) return ''; // Cas de sécurité si le ratio ne fait pas partie du classement
            if (rank < 0.2) return '🟩';
            if (rank < 0.5) return '🟨';
            if (rank < 0.8) return '🟧';
            return '🟥';
        }

        // Formatage en monospace avec alignement manuel
        const formattedLines = assetStats.map(item => {
            const { nftData, priceDolz, bbdRewardNft, ratio } = item;

            let emoji = '';
            if (nftData.rarity === 'Limited' || nftData.rarity === 'Rare') {
                emoji = getColorEmojiFromRatio(ratio);
            }
            if (nftData.rarity === 'Epic') emoji = '💎';
            if (nftData.rarity === 'Legendary') emoji = '👑';

            const ratioFormatted = formatNumber(ratio * 10000, 3); // Ex: 1.242

            const rarity = nftData.rarity.padEnd(9);                // Limited  
            const serial = nftData.serial_number.padStart(7);       // 006/370
            const bbdStr = `${bbdRewardNft.toFixed(2)}`.padStart(5); //    1.23 BBD
            const priceStr = `${priceDolz}`.padStart(5);      //   9900 DOLZ
            const ratioStr = `${ratioFormatted}`;            // Ratio: 1.242

            return `${emoji} ${rarity} ${serial} ${bbdStr} 💵 ${priceStr} 📊 ${ratioStr}`;
        });
        formattedLines.unshift(`   Rarity        S/N   BBD      DOLZ    Ratio`);

        // Construction des champs embed avec blocs de code Discord
        const codeBlock = '```' + formattedLines.join('\n') + '```';

        if (codeBlock.length <= 1024) {
            embed.addFields([{
                name: `Assets - total: ${assetStats.length} - model ${modelId}`,
                value: codeBlock,
                inline: false,
            }]);
        } else {
            // Si trop long, on split intelligemment en blocs < 1024
            let currentChunk = '';
            const chunks = [];

            for (const line of formattedLines) {
                if ((currentChunk + line + '\n').length > 1000) {
                    chunks.push('```' + currentChunk.trimEnd() + '```');
                    currentChunk = '';
                }
                currentChunk += line + '\n';
            }
            if (currentChunk) {
                chunks.push('```' + currentChunk.trimEnd() + '```');
            }

            chunks.slice(0, 25).forEach((chunk, index) => {
                embed.addFields([{ name: index === 0 ? 'Assets' : '\u200B', value: chunk, inline: false }]);
            });

            if (chunks.length > 25) {
                embed.addFields([{ name: 'Warning', value: 'Too many assets to display. Truncated.', inline: false }]);
            }
        }

        // Sécurité : éviter débordement Discord
        console.log(`Embed length: ${embed.length} characters`);
        if (embed.length > 6000) {
            console.warn('Embed too large, truncating...');
            embed.setFields({
                name: 'Warning',
                value: `The embed content was too large and has been truncated. Please check les logs. ${embed.length} characters`,
            });
        }

        return embed;
    } catch (error) {
        console.warn('Embed builder error...');
        embed.setFields({
            name: 'Warning',
            value: `Embed builder error. Please check the logs for details. ${error}`,
        });
        return embed;
    }
}

export async function buildChartSalesVolume(imageBuffer) {
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'sales_chart.png' });

    const embed = new EmbedBuilder()
        .setTitle('📊 30-Day Sales Volume')
        .setImage('attachment://sales_chart.png')
        .setTimestamp();

    return { embeds: [embed], files: [attachment] };
}
