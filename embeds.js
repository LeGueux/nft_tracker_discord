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
    const [totalAssetsSeller, babyDolzBalanceSeller, dolzBalanceSeller, sellerUsernameData] = await Promise.all([
        getTotalAssetsForWallet(from),
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
                    `Total Assets: ${totalAssetsSeller}\n` +
                    `Total DOLZ: ${formatNumber(dolzBalanceSeller)}\n` +
                    `Total BabyDOLZ: ${formatNumber(babyDolzBalanceSeller)}\n`,
            }
        );
    if (['sale', 'offer'].includes(type)) {
        const [totalAssetsBuyer, babyDolzBalanceBuyer, dolzBalanceBuyer, buyerUsernameData] = await Promise.all([
            getTotalAssetsForWallet(to),
            getBabyDolzBalance(to),
            getDolzBalance(to),
            getDolzUsername(to),
        ]);
        const buyerUsername = (buyerUsernameData[0]?.duUsername ?? "").split("#")[0];

        embed.addFields({
            name: `🙋‍♂️ Buyer: ${getWhaleEmoji(totalAssetsBuyer, dolzBalanceBuyer)} ${buyerUsername}`,
            value:
                `🔗 [${to}](https://dolz.io/marketplace/profile/${to})\n` +
                `Total Assets: ${totalAssetsBuyer}\n` +
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

            const lines = [];
            if (index < 15) {
                lines.push(`[🔗LINK](https://dolz.io/marketplace/nfts/${process.env.NFT_CONTRACT_ADDRESS}?isOnSale=true&orderBy=PRICE&direction=ASC&Card+Number=${item.modelId})`);
            }
            lines.push(
                `FP Limited ${item.floor}`,
                `FP Rare ${item.floorRare ?? '-'}`,
                `**Prices (${item.countLimitedBeforeRare})** ${item.prices.join(', ')}`,
                '**Gaps:**',
                `${item.priceGapPercent?.toFixed(1) ?? '-'}% ${simulatedGaps.length > 0 ? ` | ${simulatedGaps.join(' | ')}` : ''}` // Ajoute les simulated gaps seulement s'il y en a au moins un
            );

            // ➕ Ajouter au total si saison < 100
            if (season < 100) {
                if (typeof item.floor === 'number') totalFloorLimited += item.floor;
                if (typeof item.floorRare === 'number') totalFloorRare += item.floorRare;
            }

            embed.addFields({
                name: `${getPrefixNameEmojiBySeason(getNFTSeasonByCardNumber(item.modelId))} ${item.isFragileLevel1 ? '✅' : '❌'}${item.isFragileLevel2 ? '⚠️' : '❌'} ${item.name}`,
                value: `${lines.join('\n')}\u200B`,
                inline: true,
            });
        }

        // 🦶 Footer avec ou sans total
        if (season < 100) {
            embed.setFooter({
                text: `Total Floor Limited: ${totalFloorLimited} | Rare: ${totalFloorRare}`
            });
        }

        // console.log(`Embed length: ${embed.length} characters`);
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
        "Limited": "L",
        "Rare": "R",
        "Epic": "E",
        "Legendary": "LG",
        "Not Revealed": "NR"
    };

    const embed = new EmbedBuilder()
        .setTitle(`🐋 Top Whales Saison ${season}`)
        .setColor(0x00ffcc)
        .setTimestamp()
        .setFooter({ text: `✅ Saison complète : ${numberOfFullCollectors} wallets` });

    try {
        for (const [modelId, topList] of Object.entries(topWalletsPerModel)) {
            const lines = [];

            const nbWallets = walletsPerModel[modelId] || 0;
            const nbCards = cardsPerModel[modelId] || 0;
            const avg = nbWallets > 0 ? (nbCards / nbWallets).toFixed(1) : '0.0';

            lines.push(`📦 ${nbCards} cartes | 🪪 ${nbWallets} wallets | 📊 Moy: ${avg}`);

            for (const [i, holder] of topList.entries()) {
                const holderUsernameData = await getDolzUsername(holder.wallet);
                const holderUsername = (holderUsernameData[0]?.duUsername ?? "").split("#")[0];
                const percent = holder.percentOwned;
                const total = holder.total;

                const rarityStr = RARITY_ORDER
                    .filter(r => (holder[r] ?? 0) > 0) // ✅ Supprime les 0
                    .map(r => `${rarityShort[r]}: ${holder[r]}`)
                    .join(' | ');

                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

                lines.push(`${medal} [${holderUsername}](https://dolz.io/marketplace/profile/${holder.wallet}) ${total} | ${percent}%`);
                lines.push(`🎖️ ${rarityStr}\n`);
            }

            embed.addFields({
                name: `${getPrefixNameEmojiBySeason(season)} ${modelNames?.[modelId]} ${modelId}`,
                value: lines.join('\n') + '\u200B',
                inline: true,
            });
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

export async function buildNftTrackingEmbed(nftHoldersStats, snipeStats, modelId) {
    const {
        modelNames,
        cardsPerModel,
        topWalletsPerModel,
        walletsPerModel,
    } = nftHoldersStats;

    const rarityShort = {
        "Limited": "L",
        "Rare": "R",
        "Epic": "E",
        "Legendary": "LG",
        "Not Revealed": "NR"
    };

    const embed = new EmbedBuilder()
        .setTitle(`<:snipe:1310218808123723829> Tracking card ${modelId}`)
        .setColor(0x00ffcc)
        .setTimestamp();

    try {
        for (const [index, item] of snipeStats.entries()) {
            // Filtrer uniquement les gaps valides
            const simulatedGaps = item.simulatedGaps
                .map((g, i) => {
                    const gap = g?.priceGapPercent;
                    return gap !== null && gap !== undefined ? `${gap.toFixed(1)}%` : null;
                })
                .filter(Boolean); // Retire les nulls

            const snipeLines = [];
            snipeLines.push(`[🔗LINK](https://dolz.io/marketplace/nfts/${process.env.NFT_CONTRACT_ADDRESS}?isOnSale=true&orderBy=PRICE&direction=ASC&Card+Number=${item.modelId})`);
            snipeLines.push(
                `FP Limited ${item.floor}`,
                `FP Rare ${item.floorRare ?? '-'}`,
                `**Prices (${item.countLimitedBeforeRare})** ${item.prices.join(', ')}`,
                '**Gaps:**',
                `${item.priceGapPercent?.toFixed(1) ?? '-'}% ${simulatedGaps.length > 0 ? ` | ${simulatedGaps.join(' | ')}` : ''}` // Ajoute les simulated gaps seulement s'il y en a au moins un
            );

            embed.addFields({
                name: `Snipe ${item.isFragileLevel1 ? '✅' : '❌'}${item.isFragileLevel2 ? '⚠️' : '❌'} ${item.name}`,
                value: `${snipeLines.join('\n')}\u200B`,
                inline: false,
            });
        }

        for (const [modelId, topList] of Object.entries(topWalletsPerModel)) {
            const holdersLines = [];

            const nbWallets = walletsPerModel[modelId] || 0;
            const nbCards = cardsPerModel[modelId] || 0;
            const avg = nbWallets > 0 ? (nbCards / nbWallets).toFixed(1) : '0.0';

            holdersLines.push(`📦 ${nbCards} cartes | 🪪 ${nbWallets} wallets | 📊 Moy: ${avg}`);

            for (const [i, holder] of topList.entries()) {
                const holderUsernameData = await getDolzUsername(holder.wallet);
                const holderUsername = (holderUsernameData[0]?.duUsername ?? "").split("#")[0];
                const percent = holder.percentOwned;
                const total = holder.total;

                const rarityStr = RARITY_ORDER
                    .filter(r => (holder[r] ?? 0) > 0) // ✅ Supprime les 0
                    .map(r => `${rarityShort[r]}: ${holder[r]}`)
                    .join(' | ');

                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

                holdersLines.push(`${medal} ${holderUsername} | ${total} assets | ${percent}%`);
                holdersLines.push(`🎖️ ${rarityStr}\n`);
            }

            embed.addFields({
                name: 'Holders',
                value: holdersLines.join('\n') + '\u200B',
                inline: false,
            });
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

export async function buildWalletDataEmbed(from) {
    const [totalAssetsWallet, babyDolzBalanceWallet, dolzBalanceWallet, usernameData] = await Promise.all([
        getTotalAssetsForWallet(from),
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
                `Total Assets: ${totalAssetsWallet}\n` +
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
        const sortedRatios = [...assetStats].map(a => a.ratio).sort((a, b) => b - a); // trié du plus grand au plus petit

        function getColorEmojiFromRatio(ratio) {
            const rank = sortedRatios.findIndex(r => r === ratio) / sortedRatios.length;
            if (rank < 0.2) return '🟩';
            if (rank < 0.5) return '🟨';
            if (rank < 0.8) return '🟧';
            return '🟥';
        }

        const assetsLines = assetStats.map(item => {
            const { nftData, priceDolz, bbdRewardNft, ratio } = item;
            const emoji = getColorEmojiFromRatio(ratio);
            const ratioFormatted = formatNumber(ratio * 10000);
            return `${emoji} ${nftData.rarity} ${nftData.serial_number}: ${bbdRewardNft} BBD | 💵 ${priceDolz} DOLZ | 📊 Ratio: ${ratioFormatted}`;
        });


        const maxFieldLength = 1024;
        let currentChunk = '';
        const fields = [];

        for (const line of assetsLines) {
            if ((currentChunk + line + '\n').length > maxFieldLength) {
                fields.push({ name: 'Assets', value: currentChunk, inline: false });
                currentChunk = '';
            }
            currentChunk += line + '\n';
        }

        if (currentChunk) {
            fields.push({ name: 'Assets', value: currentChunk, inline: false });
        }

        if (fields.length > 25) {
            // Trop de champs, on tronque
            fields.splice(24);
            fields.push({
                name: 'Warning',
                value: 'Too many assets to display. Truncated.',
                inline: false,
            });
        }

        embed.addFields(fields);

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
