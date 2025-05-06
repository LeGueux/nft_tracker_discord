import { EmbedBuilder } from "discord.js";

export function buildSaleNFTEmbed(data, from, to, price, tokenId, type) {
  const embed = new EmbedBuilder()
    .setURL(
      `https://dolz.io/marketplace/nfts/${process.env.NFT_CONTRACT_ADDRESS}/${tokenId}`,
    )
    .setImage(data.image)
    .setColor(data.rarity_color)
    .setTimestamp()
    .setFooter({ text: "DOLZ marketplace Tracker" });
  if (type === "sale") {
    // sale type
    embed
      .setTitle(`Sale: ${data.name}`)
      .addFields(
        { name: "Price", value: price },
        { name: "Seller", value: from },
        { name: "Buyer", value: to },
        { name: "Season", value: data.season, inline: true },
        { name: "Rarity", value: data.rarity, inline: true },
        { name: "Serial Number", value: data.serial_number, inline: true },
      );
  } else {
    // Listing type
    embed
      .setTitle(`Listing: ${data.name}`)
      .addFields(
        { name: "Price", value: price },
        { name: "Seller", value: from },
        { name: "Season", value: data.season, inline: true },
        { name: "Rarity", value: data.rarity, inline: true },
        { name: "Serial Number", value: data.serial_number, inline: true },
      );
  }

  return embed;
}
