import { EmbedBuilder } from "discord.js";
import {
    getTotalAssetsForWallet,
    getDolzUsername,
    getBabyDolzBalance,
} from "./cometh-api.js";
import { getDolzBalance } from "./alchemy-api.js";
import {
    getNFTSeasonByCardNumber,
    getNFTData,
    weiToDolz,
    calculateBBDRewardNftByNFTData,
} from "./utils.js";
import { RARITY_ORDER } from "./config.js";

const formatNumber = (num) => new Intl.NumberFormat('fr-FR').format(num);

function getPriceStringFormatted(price) {
    const dolzPrice = parseFloat(process.env.DOLZ_PRICE ?? "0");
    const priceInDollars = price * dolzPrice;
    return `${formatNumber(parseInt(price))} DOLZ ($ ${priceInDollars.toFixed(2)})`;
}

function getTitle(type, name) {
    if (type === "sale") return `🛒 Sale: ${name}`;
    if (type === "offer") return `📩 Received Offer: ${name}`;
    return `📢 Listing: ${name}`;
}

function getWhaleEmoji(totalAssets, dolzBalance) {
    const isDolzWhale = dolzBalance >= 100000;
    const isCardWhale = totalAssets >= 150;

    if (isDolzWhale && isCardWhale) return "🐋 🔴";
    if (isDolzWhale) return "🐋 🟣";
    if (isCardWhale) return "🐋 🟡";
    return "";
}

function getPrefixNameEmojiBySeason(season) {
    const emojiMap = {
        "1": "1️⃣",
        "2": "2️⃣",
        "3": "3️⃣",
        "4": "4️⃣",
        "5": "5️⃣",
        "6": "6️⃣",
        "7": "7️⃣",
    };

    return emojiMap[season] || "🃏";
}

export async function buildSaleListingNFTEmbed(data, from, to, price, tokenId, type) {
    const [totalAssetsSeller, totalAssetsOnSaleSeller, babyDolzBalanceSeller, dolzBalanceSeller, sellerUsernameData] = await Promise.all([
        getTotalAssetsForWallet(from),
        getTotalAssetsForWallet(from, true),
        getBabyDolzBalance(from),
        getDolzBalance(from),
        getDolzUsername(from),
    ]);

    const sellerUsername = (sellerUsernameData[0]?.duUsername ?? "").split("#")[0];

    const embed = new EmbedBuilder()
        .setTitle(getTitle(type, data.name))
        .setURL(`https://dolz.io/marketplace/nfts/${process.env.NFT_CONTRACT_ADDRESS}/${tokenId}`)
        .setImage(data.image)
        .setColor(data.rarity_color)
        .setTimestamp()
        .setFooter({ text: "DOLZ marketplace Tracker" })
        .addFields(
            { name: "💰 Price:", value: getPriceStringFormatted(price) },
            {
                name: `🙋‍♂️ Seller: ${getWhaleEmoji(totalAssetsSeller, dolzBalanceSeller)} ${sellerUsername}`,
                value:
                    `🔗 [${from}](https://dolz.io/marketplace/profile/${from})\n` +
                    `Total Assets: ${totalAssetsSeller}🔒 ${totalAssetsOnSaleSeller}🛒\n` +
                    `Total DOLZ: ${formatNumber(dolzBalanceSeller)}\n` +
                    `Total BabyDOLZ: ${formatNumber(babyDolzBalanceSeller)}\n`,
            }
        );
    if (['sale', 'offer'].includes(type)) {
        const [totalAssetsBuyer, totalAssetsOnSaleBuyer, babyDolzBalanceBuyer, dolzBalanceBuyer, buyerUsernameData] = await Promise.all([
            getTotalAssetsForWallet(to),
            getTotalAssetsForWallet(to, true),
            getBabyDolzBalance(to),
            getDolzBalance(to),
            getDolzUsername(to),
        ]);
        const buyerUsername = (buyerUsernameData[0]?.duUsername ?? "").split("#")[0];

        embed.addFields({
            name: `🙋‍♂️ Buyer: ${getWhaleEmoji(totalAssetsBuyer, dolzBalanceBuyer)} ${buyerUsername}`,
            value:
                `🔗 [${to}](https://dolz.io/marketplace/profile/${to})\n` +
                `Total Assets: ${totalAssetsBuyer}🔒 ${totalAssetsOnSaleBuyer}🛒\n` +
                `Total DOLZ: ${formatNumber(dolzBalanceBuyer)}\n` +
                `Total BabyDOLZ: ${formatNumber(babyDolzBalanceBuyer)}\n`,
        });
    }

    embed.addFields({ name: "Season:", value: data.season, inline: true });
    embed.addFields({ name: "Rarity:", value: data.rarity, inline: true });
    embed.addFields({ name: "Serial Number:", value: data.serial_number, inline: true });

    return embed;
}

export async function buildSnipeEmbed(dataFormatted, season = 0) {
    const embed = new EmbedBuilder()
        .setTitle(`💹 Sniping`)
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

            const labelPad = 7; // longueur max des libellés (pour aligner les ":")
            const lines = [];

            lines.push(
                `${"FP L".padEnd(labelPad)}: ${item.floor ?? '-'}`,
                `${"FP R".padEnd(labelPad)}: ${item.floorRare ?? '-'}`,
                `${`$$ (${item.countLimitedBeforeRare})`.padEnd(labelPad)}: ${item.prices.join(', ')}`,
                `${"Gaps".padEnd(labelPad)}: ${item.priceGapPercent?.toFixed(1) ?? '-'}%` +
                (simulatedGaps.length > 0 ? `, ${simulatedGaps.join(', ')}` : '')
            );

            // ➕ Ajouter au total si saison < 100
            if (season < 100) {
                if (typeof item.floor === 'number') totalFloorLimited += item.floor;
                if (typeof item.floorRare === 'number') totalFloorRare += item.floorRare;
            }

            let blocTitle = `${getPrefixNameEmojiBySeason(getNFTSeasonByCardNumber(item.modelId))} ${item.isFragileLevel1 ? '🔥' : '🧊'}${item.isFragileLevel2 ? '🔥' : '🧊'} `;
            if (season < 100) {
                blocTitle += `[${item.name}](https://dolz.io/marketplace/nfts/${process.env.NFT_CONTRACT_ADDRESS}?isOnSale=true&orderBy=PRICE&direction=ASC&Card+Number=${item.modelId})`;
            } else {
                blocTitle += `${item.name}`;
            }

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
            console.warn("Embed too large, truncating...");
            embed.setFields({
                name: "Warning",
                value: `The embed content was too large and has been truncated. Please check the logs for details. ${embed.length} characters`,
            });
        }
        return embed;
    } catch (error) {
        console.warn("Embed builder error...");
        embed.setFields({
            name: "Warning",
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

    const rarityShort = {
        "Limited": `🟢L`,
        "Rare": "🟡R",
        "Epic": "💎E",
        "Legendary": "👑LG",
        "Not Revealed": "❔ NR"
    };

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
                const holderUsername = (holderUsernameData[0]?.duUsername ?? '').split("#")[0];
                const percent = holder.percentOwned;
                const totalStr = `${holder.total}🔒 ${holder.listed}🛒`;

                const rarityStr = RARITY_ORDER
                    .filter(r => (holder[r] ?? 0) > 0)
                    .map(r => `${rarityShort[r]}${holder[r]}`)
                    .join(' ');

                // Ajouter le lien cliquable si dans le top 3
                if (i < 3) {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                    top3Links.push(`${medal} [${holderUsername}](https://dolz.io/marketplace/profile/${holder.wallet})`);
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
            console.warn("Embed too large, truncating...");
            embed.setFields({
                name: "Warning",
                value: `The embed content was too large and has been truncated. Please check les logs. ${embed.length} characters`,
            });
        }

        return embed;
    } catch (error) {
        console.warn("Embed builder error...", error);
        embed.setFields({
            name: "Warning",
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

export async function buildNftTrackingEmbed(nftHoldersStats, snipeStats, modelId) {
    const {
        modelNames,
        cardsPerModel,
        topWalletsPerModel,
        walletsPerModel,
    } = nftHoldersStats;

    const rarityEmojis = {
        "Limited": `🟢L`,
        "Rare": "🟡R",
        "Epic": "💎E",
        "Legendary": "👑LG",
        "Not Revealed": "❔ NR"
    };

    const embed = new EmbedBuilder()
        .setTitle(`<:snipe:1310218808123723829> Tracking card ${modelId}`)
        .setColor(0x00ffcc)
        .setTimestamp();

    try {
        // Ajout des champs snipeStats (probablement pas très longs, mais chunk si besoin)
        for (const item of snipeStats) {
            const simulatedGaps = item.simulatedGaps
                .map(g => (g?.priceGapPercent != null ? `${g.priceGapPercent.toFixed(1)}%` : null))
                .filter(Boolean);

            const snipeLines = [];
            snipeLines.push(`[🔗LINK](https://dolz.io/marketplace/nfts/${process.env.NFT_CONTRACT_ADDRESS}?isOnSale=true&orderBy=PRICE&direction=ASC&Card+Number=${item.modelId})`);
            snipeLines.push(
                `FP Limited ${item.floor}`,
                `FP Rare ${item.floorRare ?? '-'}`,
                `**Prices (${item.countLimitedBeforeRare})** ${item.prices.join(', ')}`,
                '**Gaps:**',
                `${item.priceGapPercent?.toFixed(1) ?? '-'}%${simulatedGaps.length > 0 ? ` | ${simulatedGaps.join(' | ')}` : ''}`
            );

            const chunks = chunkText(snipeLines.join('\n'));
            for (const chunk of chunks) {
                embed.addFields({
                    name: `Snipe ${item.isFragileLevel1 ? '🔥' : '🧊'}${item.isFragileLevel2 ? '🔥' : '🧊'} ${item.name}`,
                    value: chunk + '\u200B',
                    inline: false,
                });
            }
        }

        // Ajout des champs topWalletsPerModel (chunk obligatoire car potentiellement très long)
        for (const [modelId, topList] of Object.entries(topWalletsPerModel)) {
            const holdersLines = [];
            const nbWallets = walletsPerModel[modelId] || 0;
            const nbCards = cardsPerModel[modelId] || 0;
            const avg = nbWallets > 0 ? (nbCards / nbWallets).toFixed(1) : '0.0';

            holdersLines.push(`📦 ${nbCards} cartes | 🪪 ${nbWallets} wallets | 📊 Moy: ${avg}`);
            holdersLines.push('');
            holdersLines.push(
                `Rank Name          | 📦  | %     | Détail`,
                `----------------------------------------------`
            );

            for (const [i, holder] of topList.entries()) {
                const holderUsernameData = await getDolzUsername(holder.wallet);
                const holderUsername = (holderUsernameData[0]?.duUsername ?? "").split("#")[0];

                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`.padEnd(4);
                const totalStr = `${holder.total}🔒 ${holder.listed}🛒`;
                const percentStr = `${parseFloat(holder.percentOwned).toFixed(1)}%`.padEnd(5);
                const rarityStr = RARITY_ORDER
                    .filter(r => (holder[r] ?? 0) > 0)
                    .map(r => `${rarityEmojis[r]}:${holder[r]}`)
                    .join(' ');

                holdersLines.push(`${medal.padEnd(4)} ${holderUsername.padEnd(13)} | ${totalStr.padStart(8)}  | ${percentStr} | ${rarityStr}`);
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

        // Sécurité : éviter débordement Discord
        console.log(`Embed length: ${embed.length} characters`);
        if (embed.length > 6000) {
            console.warn("Embed too large, truncating...");
            embed.setFields({
                name: "Warning",
                value: `The embed content was too large and has been truncated. Please check les logs. ${embed.length} characters`,
            });
        }

        return embed;
    } catch (error) {
        console.warn("Embed builder error...", error);
        embed.setFields({
            name: "Warning",
            value: `Embed builder error. Please check the logs for details. ${error}`,
        });
        return embed;
    }
}

export async function buildWalletDataEmbed(from) {
    const [totalAssetsWallet, totalAssetsOnSaleWallet, babyDolzBalanceWallet, dolzBalanceWallet, usernameData] = await Promise.all([
        getTotalAssetsForWallet(from),
        getTotalAssetsForWallet(from, true),
        getBabyDolzBalance(from),
        getDolzBalance(from),
        getDolzUsername(from),
    ]);

    const username = (usernameData[0]?.duUsername ?? "").split("#")[0];

    const embed = new EmbedBuilder()
        .setURL(`https://dolz.io/marketplace/profile/${from}`)
        .setTimestamp()
        .addFields({
            name: `🙋‍♂️ Wallet: ${getWhaleEmoji(totalAssetsWallet, dolzBalanceWallet)} ${username}`,
            value:
                `🔗 [${from}](https://dolz.io/marketplace/profile/${from})\n` +
                `Total Assets: ${totalAssetsWallet}🔒 ${totalAssetsOnSaleWallet}🛒\n` +
                `Total DOLZ: ${formatNumber(dolzBalanceWallet)}\n` +
                `Total BabyDOLZ: ${formatNumber(babyDolzBalanceWallet)}\n`,
        });

    return embed;
}

export async function buildNftBBDRewardCalculatorEmbed(modelId, data) {
    const embed = new EmbedBuilder()
        .setTitle(`<:snipe:1310218808123723829> BBD Calculator card ${modelId}`)
        .setColor(0x00ffcc)
        .setTimestamp();

    try {
        // Étape 1 : préparer toutes les lignes dans un tableau temporaire
        const assetStats = [];

        for (const asset of data) {
            const priceWei = asset.orderbookStats?.lowestListingPrice;
            const priceDolz = parseInt(weiToDolz(priceWei));
            const nftData = await getNFTData(asset.tokenId);
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
            console.warn("Embed too large, truncating...");
            embed.setFields({
                name: "Warning",
                value: `The embed content was too large and has been truncated. Please check les logs. ${embed.length} characters`,
            });
        }

        return embed;
    } catch (error) {
        console.warn("Embed builder error...");
        embed.setFields({
            name: "Warning",
            value: `Embed builder error. Please check the logs for details. ${error}`,
        });
        return embed;
    }
}
