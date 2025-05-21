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
      rarity: data.attributes.find((attr) => attr.trait_type === "Rarity")?.value,
      rarity_color: getRarityColor(data.attributes.find((attr) => attr.trait_type === "Rarity")?.value),
      season: data.attributes.find((attr) => attr.trait_type === "Season")?.value,
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

  const isListing = type === "listing";
  const isSale = type === "sale";
  const isStandardSeason = !["Special Edition", "Off-Season"].includes(data.season);
  const isLimited = data.rarity === "Limited";
  const isEpic = data.rarity === "Epic";
  const isRareOrLimited = ["Limited", "Rare"].includes(data.rarity);

  if (isListing && isStandardSeason) {
    // FRANCK ONLY
    // Price < 900
    // Price < 9000 | Epic
    // Octokuro g0065
    if (price < 900 ||
      (price < 9000 && isEpic) ||
      ["g0065"].includes(data.card_number)
    ) {
      return FRANCK;
    }
    
    // FRANCK + NICO
    // Emiri S7 | Price < 2000
    if (data.card_number === "g0125" && price < 2000) {
      return `${FRANCK} ${NICO}`;
    }
  }
  // NICO ONLY
  // Sale | Georgia g0116      | Limited
  // Sale | Ashby Winter g0053 | Limited
  // Sale | Sakura g0119       | Limited/Rare
  if (isSale && 
    (isLimited && ["g0116", "g0053"].includes(data.card_number)) ||
    (isRareOrLimited && ["g0119"].includes(data.card_number))) {
    return NICO;
  }
  return "";
}
