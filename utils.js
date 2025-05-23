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
  const isRare = data.rarity === "Rare";
  const isEpic = data.rarity === "Epic";
  const isRareOrLimited = ["Limited", "Rare"].includes(data.rarity);

  if (isListing && isStandardSeason) {
    // FRANCK ONLY
    // Listing | All seasons                          | Price <= 800
    // Listing | All seasons                          | Price <= 8000 | Epic
    // Listing | S1                                   | Price <= 6000
    // Listing | S2                                   | Price <= 5000
    // Listing | S2 Alissa Foxy & Kelly Collins g0056 | Price <= 9000
    // Listing | S5 Alissa Foxy g0026                 | Price <= 4000 | Rare
    // Listing | S5 Mathilda Scorpy g0044             | Price <= 4000 | Rare
    // Listing | S5 Shelena g0048                     | Price <= 4000 | Rare
    // Listing | S5 Sirena Milano g0076               | Price <= 4000 | Rare
    // Listing | S6                                   | Price <= 1000
    // Listing | S6 Octokuro g0065                    | Price <= 7000
    // Listing | S7                                   | Price <= 1000
    if (price <= 800 ||
      (isEpic && price <= 8000) ||
      (data.season === "1" && price <= 6000) ||
      (data.season === "2" && price <= 5000) ||
      (["g0056"].includes(data.card_number) && price <= 9000) ||
      (["g0026", "g0044", "g0048", "g0076"].includes(data.card_number) && price <= 4000 && isRare) ||
      (data.season === "6" && price <= 1000) ||
      (["g0065"].includes(data.card_number) && price <= 7000) ||
      (data.season === "7" && price <= 1000)
    ) {
      return FRANCK;
    }

    // FRANCK + NICO
    // Listing | S7 Emiri Momota g0125 | Price <= 3000
    // Listing | S7 Emiri Momota g0125 | Price <= 6000 | Rare
    if (["g0125"].includes(data.card_number) &&
      (price <= 4000 || (isRare && price <= 6000))
    ) {
      return `${FRANCK} ${NICO}`;
    }
  }
  // NICO ONLY
  // Sale | S6 Georgia g0116      | Limited
  // Sale | S6 Ashby Winter g0053 | Limited
  // Sale | S6 Sakura g0119       | Limited,Rare
  if (isSale &&
    (isLimited && ["g0116", "g0053"].includes(data.card_number)) ||
    (isRareOrLimited && ["g0119"].includes(data.card_number))) {
    return NICO;
  }
  return "";
}
