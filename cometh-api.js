import { buildSaleNFTEmbed } from "./embeds.js";
import { getThreadIdForToken } from "./discord.js";
import {
  getNFTData,
  checkDateIsValidSinceLastOneInterval,
  getContentTagsDependsOnNFT,
} from "./utils.js";

export async function callComethApiForLastSales(discordClient) {
  try {
    console.log(
      `callComethApiForLastSales à ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
    );
    const response = await fetch(
      "https://api.marketplace.cometh.io/v1/orders/filled-events/search",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          apikey: process.env.COMETH_API_KEY,
        },
        body: JSON.stringify({
          tokenAddress: process.env.NFT_CONTRACT_ADDRESS,
          limit: 10,
        }),
      },
    );

    const data = await response.json();
    // console.log(data);
    data.filledEvents.forEach(async (item) => {
      console.log(item.tokenId, item.direction, checkDateIsValidSinceLastOneInterval(new Date(item.blockTimestamp)));
      if (checkDateIsValidSinceLastOneInterval(new Date(item.blockTimestamp))) {
        const tokenId = item.tokenId;
        const data = await getNFTData(tokenId);
        const price = parseInt(item.erc20FillAmount) / 1000000000000000000 / 0.9803;
        const seller = item.direction === "sell" ? item.maker : item.taker;
        const buyer = item.direction === "sell" ? item.taker : item.maker;
        const embed = await buildSaleNFTEmbed(
          data,
          seller,
          buyer,
          price,
          tokenId,
          "sale",
        );
        const threadId = getThreadIdForToken("sale", item.maker);
        const thread = await discordClient.channels.fetch(threadId);
        if (thread?.isTextBased()) {
          await thread.send({
            content: getContentTagsDependsOnNFT(data, price, "sale"),
            embeds: [embed],
            allowedMentions: {
              users: [
                process.env.FRANCK_DISCORD_USER_ID,
                process.env.NICO_DISCORD_USER_ID,
              ],
            },
          });
        }
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des cartes:", error);
  }
}

export async function callComethApiForLastListings(discordClient) {
  try {
    console.log(
      `callComethApiForLastListings à ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
    );
    // https://api.marketplace.cometh.io/v1/doc#tag/order/operation/searchOrders
    const response = await fetch(
      "https://api.marketplace.cometh.io/v1/orders/search",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          apikey: process.env.COMETH_API_KEY,
        },
        body: JSON.stringify({
          tokenAddress: process.env.NFT_CONTRACT_ADDRESS,
          statuses: ["open"],
          limit: 50,
          orderBy: "UPDATED_AT",
          orderByDirection: "DESC",
        }),
      },
    );

    const data = await response.json();
    // console.log(data);
    data.orders.forEach(async (item) => {
      console.log(item.tokenId, item.direction, checkDateIsValidSinceLastOneInterval(new Date(item.signedAt)));
      if (checkDateIsValidSinceLastOneInterval(new Date(item.signedAt))) {
        if (item.direction == "sell") {
          const tokenId = item.tokenId;
          const data = await getNFTData(tokenId);
          const price = parseInt(item.totalPrice) / 1000000000000000000;
          const embed = await buildSaleNFTEmbed(
            data,
            item.maker,
            null,
            price,
            tokenId,
            "listing",
          );
          const threadId = getThreadIdForToken("listing");
          const thread = await discordClient.channels.fetch(threadId);
          if (thread?.isTextBased()) {
            await thread.send({
              content: getContentTagsDependsOnNFT(data, price, "listing"),
              embeds: [embed],
              allowedMentions: {
                users: [
                  process.env.FRANCK_DISCORD_USER_ID,
                  process.env.NICO_DISCORD_USER_ID,
                ],
              },
            });
          }
        } else if (
          item.direction == "buy" &&
          [
            process.env.FRANCK_ADDRESS.toLowerCase(),
            process.env.NICO_ADDRESS.toLowerCase(),
          ].includes(item.asset?.owner.toLowerCase())
        ) {
          const isForFranck =
            item.asset.owner.toLowerCase() ===
            process.env.FRANCK_ADDRESS.toLowerCase();
          const tokenId = item.tokenId;
          const data = await getNFTData(tokenId);
          const price = parseInt(item.totalPrice) / 1000000000000000000;
          const embed = await buildSaleNFTEmbed(
            data,
            item.asset.owner,
            item.asset.owner,
            price,
            tokenId,
            "offer",
          );
          const threadId = getThreadIdForToken("offer");
          const thread = await discordClient.channels.fetch(threadId);
          const contentTag = isForFranck
            ? `<@${process.env.FRANCK_DISCORD_USER_ID}>`
            : `<@${process.env.NICO_DISCORD_USER_ID}>`;
          if (thread?.isTextBased()) {
            await thread.send({
              content: contentTag,
              embeds: [embed],
              allowedMentions: {
                users: [
                  process.env.FRANCK_DISCORD_USER_ID,
                  process.env.NICO_DISCORD_USER_ID,
                ],
              },
            });
          }
        }
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des cartes:", error);
  }
}

/**
 * Récupère le nombre total d'actifs (NFTs) appartenant à une adresse donnée.
 *
 * Cette fonction effectue une requête POST à l'API marketplace de Cometh afin d'obtenir
 * le nombre total d'actifs associés à une adresse de portefeuille spécifique,
 * filtrés par contrat et triés selon la date de mise en vente.
 *
 * @param {string} address - L'adresse du portefeuille à interroger.
 * @returns {Promise<number>} - Une promesse qui résout au nombre total d'actifs.
 *                              Retourne 0 en cas d'erreur ou si aucun actif n'est trouvé.
 */
export async function getTotalAssetsForWallet(address) {
  try {
    // Envoi de la requête POST à l'API Cometh avec les paramètres de recherche
    const response = await fetch(
      "https://api.marketplace.cometh.io/v1/assets/search",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          apikey: process.env.COMETH_API_KEY, // Clé API sécurisée depuis les variables d'environnement
        },
        body: JSON.stringify({
          contractAddress: process.env.NFT_CONTRACT_ADDRESS, // Filtrage par contrat NFT
          owner: address,
          limit: 1, // On ne récupère qu'un seul résultat car seul le total nous intéresse
          orderBy: "LISTING_DATE",
          direction: "DESC"
        }),
      },
    );

    // Parsing de la réponse JSON
    const data = await response.json();

    // Retourne le nombre total d'actifs appartenant au wallet
    return data.total;
  } catch (error) {
    // Gestion des erreurs (réseau, parsing, etc.)
    console.error(
      `Erreur lors de la récupération du nombre de cartes de ${address}:`,
      error,
    );

    // Retourne 0 par défaut en cas d'erreur
    return 0;
  }
}

/**
 * Récupère le nom d'utilisateur Dolz associé à une adresse de portefeuille.
 *
 * Cette fonction effectue une requête POST à l'API de dolz.io afin de récupérer
 * le nom d'utilisateur lié à une adresse donnée sur la blockchain.
 *
 * @param {string} address - L'adresse du portefeuille à interroger.
 * @returns {Promise<string>} - Une promesse qui résout au nom d'utilisateur (chaîne de caractères).
 *                              Retourne une chaîne vide en cas d'erreur.
 */
export async function getDolzUsername(address) {
  try {
    // Envoi de la requête POST à l'API avec l'adresse du wallet
    const response = await fetch("https://back.dolz.io/api.php", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        command: "getDolzUsername",
        userAddress: address,
      }),
    });

    // Parsing de la réponse JSON
    const data = await response.json();

    // Retourne le nom d'utilisateur tel que renvoyé par l'API
    return data;
  } catch (error) {
    // Affichage de l'erreur dans la console en cas d'échec
    console.error(
      `Erreur lors de la récupération du username de ${address}:`,
      error,
    );

    // Retourne une chaîne vide par défaut si une erreur survient
    return "";
  }
}

/**
 * Récupère le solde de BabyDolz pour une adresse de portefeuille donnée.
 *
 * Cette fonction effectue une requête POST à l'API de dolz.io pour obtenir
 * le nombre de jetons BabyDolz associés à une adresse de wallet spécifique.
 *
 * @param {string} address - L'adresse du portefeuille à interroger.
 * @returns {Promise<number>} - Une promesse qui résout à un entier représentant le solde.
 *                              Retourne 0 en cas d'erreur ou si aucune donnée valide n'est reçue.
 */
export async function getBabyDolzBalance(address) {
  try {
    // Envoi de la requête POST à l'API avec le corps contenant le type de commande et l'adresse du portefeuille
    const response = await fetch("https://back.dolz.io/api.php", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        command: "getBabyDolzBalance",
        wallet: address,
      }),
    });

    // Parsing de la réponse JSON
    const data = await response.json();

    // Conversion de la donnée retournée en entier
    return parseInt(data);
  } catch (error) {
    // Affichage de l'erreur en cas d'échec de la requête ou de parsing
    console.error(
      `Erreur lors de la récupération du nombre de BabyDolz de ${address}:`,
      error,
    );
    // Retourne 0 par défaut en cas d'erreur
    return 0;
  }
}
