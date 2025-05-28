import { EmbedBuilder } from "discord.js";
import { WALLETS } from "./config.js";

function getPriceStringFormatted(price) {
  const priceInDollars = price * parseFloat(process.env.DOLZ_PRICE);
  return `${parseInt(price)} DOLZ ($ ${priceInDollars.toFixed(2)})`;
}

export function buildSaleNFTEmbed(data, from, to, price, tokenId, type) {
  const embed = new EmbedBuilder()
    .setURL(
      `https://dolz.io/marketplace/nfts/${process.env.NFT_CONTRACT_ADDRESS}/${tokenId}`,
    )
    .setImage(data.image)
    .setColor(data.rarity_color)
    .setTimestamp()
    .setFooter({ text: "DOLZ marketplace Tracker" })
    .addFields({ name: "Price", value: getPriceStringFormatted(price) })
    .addFields({
      name: `Seller: ${WALLETS.get(from.toLowerCase()) || ''}`,
      value: "[" + from + "](https://dolz.io/marketplace/profile/" + from + ")",
    });
  if (type === "sale") {
    // sale type
    embed.setTitle(`Sale: ${data.name}`);
    embed.addFields({
      name: `Buyer: ${WALLETS.get(to.toLowerCase()) || ''}`,
      value: "[" + to + "](https://dolz.io/marketplace/profile/" + to + ")",
    });
  } else if (type === "offer") {
    // Listing type
    embed.setTitle(`Received Offer: ${data.name}`);
  } else {
    // Listing type
    embed.setTitle(`Listing: ${data.name}`);
  }
  embed.addFields({ name: "Season", value: data.season, inline: true });
  embed.addFields({ name: "Rarity", value: data.rarity, inline: true });
  embed.addFields({
    name: "Serial Number",
    value: data.serial_number,
    inline: true,
  });

  return embed;
}
