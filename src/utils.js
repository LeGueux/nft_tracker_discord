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
    const response = await fetch(
      `https://cardsdata.dolz.io/jsons/${tokenId}.json`,
    );
    if (!response.ok) return;

    const data = await response.json();
    return {
      name: data.name,
      image: data.image,
      rarity: data.attributes.find((attr) => attr.trait_type === "Rarity")
        ?.value,
      rarity_color: getRarityColor(
        data.attributes.find((attr) => attr.trait_type === "Rarity")?.value,
      ),
      season: data.attributes.find((attr) => attr.trait_type === "Season")
        ?.value,
      card_number: data.attributes.find(
        (attr) => attr.trait_type === "Card Number",
      )?.value,
      serial_number: data.attributes.find(
        (attr) => attr.trait_type === "Serial Number",
      )?.value,
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération du token ${tokenId}:`, error);
    return {};
  }
}

export function getContentTagsDependsOnNFT(data) {
  if (data.card_number === "g0065") {
    return `<@${process.env.FRANCK_DISCORD_USER_ID}>`;
  }
  return '';
}
