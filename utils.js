import { COMETH_API_INTERVAL } from "./config.js";

/**
 * Retourne une couleur hexadécimale correspondant à la rareté donnée.
 *
 * @param {string} rarity - Niveau de rareté du NFT ("Rare", "Epic", "Legendary", etc.).
 * @returns {string} Code couleur hex correspondant à la rareté.
 */
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

/**
 * Vérifie si une date est suffisamment récente par rapport à l'intervalle défini.
 *
 * @param {Date} date - Date à comparer avec l'intervalle de temps passé.
 * @returns {boolean} `true` si la date est postérieure à l'heure actuelle moins l'intervalle, sinon `false`.
 */
export function checkDateIsValidSinceLastOneInterval(date) {
  return date >= new Date(new Date().getTime() - COMETH_API_INTERVAL);
}

/**
 * Récupère les données d'un NFT via son `tokenId`, depuis l'API Dolz.
 *
 * @param {string|number} tokenId - ID unique du token (ex: "51690").
 * @returns {Promise<Object>} Un objet contenant les informations du NFT (nom, image, rareté, etc.).
 */
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

/**
 * Retourne une mention Discord basée sur les conditions du NFT listé ou vendu.
 *
 * @param {NFTData} data - Données du NFT.
 * @param {number} price - Prix du NFT (en DOLZ).
 * @param {string} type - Type d'événement ("listing" ou "sale").
 * @returns {string} Mention Discord si une condition est remplie, sinon une chaîne vide.
 */
export function getContentTagsDependsOnNFT(data, price, type) {
  // Exemple DATA: https://cardsdata.dolz.io/jsons/51690.json
  // console.log(data, price);
  const FRANCK = `<@${process.env.FRANCK_DISCORD_USER_ID}>`;
  const NICO = `<@${process.env.NICO_DISCORD_USER_ID}>`;

  // Listing | Price < 900
  if (price < 900 && type === "listing") {
    return FRANCK;
  }
  // Listing | Price < 9000 | Epic
  if (price < 9000 && data.rarity === "Epic" && type === "listing") {
    return FRANCK;
  }
  // Listing | Octokuro
  if (data.card_number === "g0065" && type === "listing") {
    return FRANCK;
  }
  // Listing | Emiri S7 | Price < 2000
  if (data.card_number === "g0125" && type === "listing" && price < 2000) {
    return `${FRANCK} ${NICO}`;
  }
  // Sale | Georgia | Limited
  if (data.card_number === "g0116" && data.rarity === "Limited" && type === "sale") {
    return NICO;
  }
  // Sale | Ashby Winter | Limited
  if (data.card_number === "g0053" && data.rarity === "Limited" && type === "sale") {
    return NICO;
  }
  // Sale | Sakura | Limited | Rare
  if (data.card_number === "g0119" && ["Limited", "Rare"].includes(data.rarity) && type === "sale") {
    return NICO;
  }
  return "";
}
