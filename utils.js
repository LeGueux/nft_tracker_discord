import { COMETH_API_INTERVAL } from "./config.js";

function getRarityColor(rarity) {
  switch (rarity) {
    case "Rare":
      return "#FFFFFF";
    case "Epic":
      return "#D1AC09";
    case "Legendary":
      return "#BF55EC";
    default:
      return "#000000";
  }
}

export function checkDateIsValidSinceLastOneInterval(date) {
  return date >= new Date(new Date().getTime() - COMETH_API_INTERVAL);
}

export async function getNFTData(tokenId) {
  try {
    // Exemple: https://cardsdata.dolz.io/jsons/51690.json
    const response = await fetch(`https://cardsdata.dolz.io/jsons/${tokenId}.json`);
    if (!response.ok) return;

    const data = await response.json();
    return {
      name: data.name,
      image: data.image,
      rarity: data.attributes.find((attr) => attr.trait_type === "Rarity") ?.value,
      rarity_color: getRarityColor(data.attributes.find((attr) => attr.trait_type === "Rarity")?.value),
      season: data.attributes.find((attr) => attr.trait_type === "Season") ?.value,
      card_number: data.attributes.find((attr) => attr.trait_type === "Card Number")?.value,
      serial_number: data.attributes.find((attr) => attr.trait_type === "Serial Number")?.value,
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération du token ${tokenId}:`, error);
    return {};
  }
}

export function getContentTagsDependsOnNFT(data, price, type) {
  // Exemple DATA: https://cardsdata.dolz.io/jsons/51690.json
  // console.log(data, price);
  // Listing / Price < 900
  if (price < 900 && type === "listings") {
    return `<@${process.env.FRANCK_DISCORD_USER_ID}>`;
  }
  // Listing / Price < 9000 / Epic
  if (price < 9000 && data.rarity === "Epic" && type === "listings") {
    return `<@${process.env.FRANCK_DISCORD_USER_ID}>`;
  }
  // Listing / Octokuro
  if (data.card_number === "g0065" && type === "listings") {
    return `<@${process.env.FRANCK_DISCORD_USER_ID}>`;
  }
  // Sale / Georgia / Limited
  if (data.card_number === "g0116" && data.rarity === "Limited" && type === "sales") {
    return `<@${process.env.NICO_DISCORD_USER_ID}>`;
  }
  // Sale / Ashby Winter / Limited
  if (data.card_number === "g0053" && data.rarity === "Limited" && type === "sales") {
    return `<@${process.env.NICO_DISCORD_USER_ID}>`;
  }
  // Sale / Sakura / Limited / Rare
  if (data.card_number === "g0119" && ["Limited", "Rare"].includes(data.rarity) && type === "sales") {
    return `<@${process.env.NICO_DISCORD_USER_ID}>`;
  }
  return "";
}
