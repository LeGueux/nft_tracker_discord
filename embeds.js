import { EmbedBuilder } from "discord.js";
import {
    getTotalAssetsForWallet,
    getDolzUsername,
    getBabyDolzBalance,
} from "./cometh-api.js";
import { getDolzBalance } from "./alchemy-api.js";
import { getNFTSeasonByCardNumber } from "./utils.js";

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
    if (type === "sale") {
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
        .setTitle(`💹 Sniping du (${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })})`)
        .setFooter({ text: `Sniping du (${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })})` })
        .setColor(0x00ff99);

    for (const [index, item] of dataFormatted.entries()) {
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

        embed.addFields({
            name: `${getPrefixNameEmojiBySeason(getNFTSeasonByCardNumber(item.modelId))} ${item.isFragileLevel1 ? '✅' : '❌'}${item.isFragileLevel2 ? '⚠️' : '❌'} ${item.name}`,
            value: `${lines.join('\n')}\u200B`,
            inline: true,
        });
    }

    // console.log(embed.length);
    if (embed.length > 6000) {
        console.warn("Embed too large, truncating...");
        embed.setFields({
            name: "Warning",
            value: `The embed content was too large and has been truncated. Please check the logs for details. ${embed.length} characters`,
        });
    }
    return embed;
}