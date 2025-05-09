import { buildSaleNFTEmbed } from "./embeds.js";
import { getThreadIdForToken } from "./discord.js";
import { getNFTData, checkDateIsValidSinceLastOneInterval } from "./utils.js";

export async function callComethApiForLastSales(discordClient) {
  try {
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
          attributes: [
            {
              "Card Number": ["g0065"],
            },
          ],
          limit: 2,
        }),
      },
    );

    const data = await response.json();
    console.log(data);
    data.filledEvents.forEach(async (item) => {
      if (
        item.direction == "sell" &&
        checkDateIsValidSinceLastOneInterval(new Date(item.blockTimestamp))
      ) {
        const tokenId = item.tokenId;
        const data = await getNFTData(tokenId);
        const embed = buildSaleNFTEmbed(
          data,
          item.maker,
          item.taker,
          parseInt(item.erc20FillAmount) / 1000000000000000000 / 0.9803,
          tokenId,
          "sale",
        );
        const threadId = getThreadIdForToken("sales");
        const thread = await discordClient.channels.fetch(threadId);
        if (thread?.isTextBased()) {
          await thread.send({ embeds: [embed] });
        }
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des cartes:", error);
  }
}

export async function callComethApiForLastListings(discordClient) {
  try {
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
          attributes: [
            {
              "Card Number": ["g0065"],
            },
          ],
          statuses: ["open"],
          direction: "sell",
          limit: 2,
          orderBy: "UPDATED_AT",
          orderByDirection: "DESC",
        }),
      },
    );

    const data = await response.json();
    console.log(data);
    data.orders.forEach(async (item) => {
      if (
        item.direction == "sell" &&
        checkDateIsValidSinceLastOneInterval(new Date(item.signedAt))
      ) {
        const tokenId = item.tokenId;
        const data = await getNFTData(tokenId);
        const embed = buildSaleNFTEmbed(
          data,
          item.maker,
          null,
          parseInt(item.totalPrice) / 1000000000000000000,
          tokenId,
          "listing",
        );
        const threadId = getThreadIdForToken("listings");
        const thread = await discordClient.channels.fetch(threadId);
        if (thread?.isTextBased()) {
          await thread.send({ embeds: [embed] });
        }
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des cartes:", error);
  }
}
