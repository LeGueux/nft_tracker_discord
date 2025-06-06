import { EmbedBuilder } from "discord.js";
import {
  getTotalAssetsForWallet,
  getDolzUsername,
  getBabyDolzBalance,
} from "./cometh-api.js";
import { getDolzBalance } from "./alchemy-api.js";

function getPriceStringFormatted(price) {
  const priceInDollars = price * parseFloat(process.env.DOLZ_PRICE);
  return `${parseInt(price)} DOLZ ($ ${priceInDollars.toFixed(2)})`;
}

export async function buildSaleNFTEmbed(data, from, to, price, tokenId, type) {
  const totalAssetsSeller = await getTotalAssetsForWallet(from);
  const babyDolzBalanceSeller = await getBabyDolzBalance(from);
  const dolzBalanceSeller = await getDolzBalance(from);
  const embed = new EmbedBuilder()
    .setURL(
      `https://dolz.io/marketplace/nfts/${process.env.NFT_CONTRACT_ADDRESS}/${tokenId}`,
    )
    .setImage(data.image)
    .setColor(data.rarity_color)
    .setTimestamp()
    .setFooter({ text: "DOLZ marketplace Tracker" })
    .addFields({ name: "Price:", value: getPriceStringFormatted(price) })
    .addFields({
      name: `Seller: ${totalAssetsSeller > 200 ? "🐋 " : ""} ${((await getDolzUsername(from))[0]?.duUsername ?? "").split("#")[0]}`,
      value: "[" + from + "](https://dolz.io/marketplace/profile/" + from + ")",
      value:
        `🔗 [${from}](https://dolz.io/marketplace/profile/${from})\n` +
        `Total Assets: ${totalAssetsSeller}\n` +
        `Total DOLZ: ${dolzBalanceSeller}\n` +
        `Total BabyDOLZ: ${babyDolzBalanceSeller}\n`,
    });
  if (type === "sale") {
    // sale type
    embed.setTitle(`Sale: ${data.name}`);
    const totalAssetsBuyer = await getTotalAssetsForWallet(to);
    const babyDolzBalanceBuyer = await getBabyDolzBalance(to);
    const dolzBalanceBuyer = await getDolzBalance(to);
    embed.addFields({
      name: `Buyer: ${totalAssetsBuyer > 200 ? "🐋 " : ""} ${((await getDolzUsername(to))[0]?.duUsername ?? "").split("#")[0]}`,
      value:
        `🔗 [${to}](https://dolz.io/marketplace/profile/${to})\n` +
        `Total Assets: ${totalAssetsBuyer}\n` +
        `Total DOLZ: ${dolzBalanceBuyer}\n` +
        `Total BabyDOLZ: ${babyDolzBalanceBuyer}\n`,
    });
  } else if (type === "offer") {
    // Listing type
    embed.setTitle(`Received Offer: ${data.name}`);
  } else {
    // Listing type
    embed.setTitle(`Listing: ${data.name}`);
  }
  embed.addFields({ name: "Season:", value: data.season, inline: true });
  embed.addFields({ name: "Rarity:", value: data.rarity, inline: true });
  embed.addFields({
    name: "Serial Number:",
    value: data.serial_number,
    inline: true,
  });

  return embed;
}
