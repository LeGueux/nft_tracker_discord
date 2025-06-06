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
  if (type === "sale") return `Sale: ${name}`;
  if (type === "offer") return `Received Offer: ${name}`;
  return `Listing: ${name}`;
}

export async function buildSaleNFTEmbed(data, from, to, price, tokenId, type) {
  const [totalAssetsSeller, babyDolzBalanceSeller, dolzBalanceSeller, sellerUsernameData] = await Promise.all([
    getTotalAssetsForWallet(from),
    getBabyDolzBalance(from),
    getDolzBalance(from),
    getDolzUsername(from),
  ]);

  const sellerUsername = (sellerUsernameData[0]?.duUsername ?? "").split("#")[0];
  const isSellerWhale = totalAssetsSeller >= 150 || dolzBalanceSeller >= 100000;

  const embed = new EmbedBuilder()
    .setTitle(getTitle(type, data.name))
    .setURL(`https://dolz.io/marketplace/nfts/${process.env.NFT_CONTRACT_ADDRESS}/${tokenId}`)
    .setImage(data.image)
    .setColor(data.rarity_color)
    .setTimestamp()
    .setFooter({ text: "DOLZ marketplace Tracker" })
    .addFields(
      { name: "Price:", value: getPriceStringFormatted(price) },
      {
        name: `Seller: ${isSellerWhale ? "🐋 " : ""} ${sellerUsername}`,
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
    const isBuyerWhale = totalAssetsBuyer >= 150 || dolzBalanceBuyer >= 100000;

    embed.addFields({
      name: `Buyer: ${isBuyerWhale ? "🐋 " : ""} ${buyerUsername}`,
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
