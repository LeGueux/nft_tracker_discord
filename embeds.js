import { EmbedBuilder } from "discord.js";
import {
    getTotalAssetsForWallet,
    getDolzUsername,
    getBabyDolzBalance,
} from "./cometh-api.js";
import { getDolzBalance } from "./alchemy-api.js";

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

export async function buildSaleNFTEmbed(data, from, to, price, tokenId, type) {
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
        .setTitle(`💹 Sniping Opportunities - Season ${season}`)
        .setFooter({ text: `💹 Sniping Opportunities - Season ${season}` })
        .setDescription(`Cartes fragiles ou sensibles au sniping (${new Date().toLocaleDateString()})`)
        .setColor(0x00ff99);

    for (const item of dataFormatted) {
        // Filtrer uniquement les gaps valides
        const simulatedGaps = item.simulatedGaps
            .map((g, i) => {
                const gap = g?.priceGapPercent;
                return gap !== null && gap !== undefined
                    ? `• After ${i + 1} buy: ${gap.toFixed(2)}%`
                    : null;
            })
            .filter(Boolean); // Retire les nulls

        const lines = [
            `• **Link MP**: [🔗 LINK](https://dolz.io/marketplace/nfts/${process.env.NFT_CONTRACT_ADDRESS}?isOnSale=true&orderBy=PRICE&direction=ASC&Card+Number=${item.modelId})`,
            `• **FP Limited**:  ${item.floor} DOLZ`,
            `• **Next**: ${item.next ?? '-'} (Gap: ${item.priceGapPercent?.toFixed(2) ?? '-'}%)`,
            `• **FP Rare**: ${item.floorRare ?? '-'} DOLZ`,
            `• **Prices**: ${item.prices.join(', ')}`,
            `• **Fragilité (+25%)**: ${item.isFragile ? '✅' : '❌'} ${item.isVeryFragileAfterBuy ? '⚠️' : '❌'}`,
        ];

        // Ajoute les simulated gaps seulement s'il y en a au moins un
        if (simulatedGaps.length > 0) {
            lines.push('', '**Simulated Gaps:**', ...simulatedGaps);
        }

        embed.addFields({
            name: `🔗 ${item.name}`,
            value: lines.join('\n'),
            inline: false,
        });
    }

    if (embed.length > 6000) {
        console.warn("Embed too large, truncating...");
        embed.setFields({
            name: "Warning",
            value: `The embed content was too large and has been truncated. Please check the logs for details. ${embed.length} characters`,
        });
    }
    return embed;
}