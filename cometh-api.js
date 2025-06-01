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
          limit: 100,
        }),
      },
    );

    const data = await response.json();
    // console.log(data);
    data.filledEvents.forEach(async (item) => {
      // console.log(
      //   item.tokenId,
      //   item.direction,
      //   checkDateIsValidSinceLastOneInterval(new Date(item.blockTimestamp)),
      // );
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
          limit: 200,
          orderBy: "UPDATED_AT",
          orderByDirection: "DESC",
        }),
      },
    );

    const data = await response.json();
    // console.log(data);
    data.orders.forEach(async (item) => {
      // console.log(item.tokenId, item.direction, checkDateIsValidSinceLastOneInterval(new Date(item.signedAt)));
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

export async function getTotalAssetsForWallet(address) {
  try {
    const response = await fetch(
      "https://api.marketplace.cometh.io/v1/assets/search",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          apikey: process.env.COMETH_API_KEY,
        },
        body: JSON.stringify({
          contractAddress: process.env.NFT_CONTRACT_ADDRESS,
          owner: address,
          limit: 1,
        }),
      },
    );

    const data = await response.json();
    return data.total;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du nombre de cartes de ${address}:`,
      error,
    );
    return 0;
  }
}

export async function getDolzUsername(address) {
  try {
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

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du username de ${address}:`,
      error,
    );
    return "";
  }
}

export async function getBabyDolzBalance(address) {
  try {
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

    const data = await response.json();
    return parseInt(data);
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du nombre de BabyDolz de ${address}:`,
      error,
    );
    return 0;
  }
}
