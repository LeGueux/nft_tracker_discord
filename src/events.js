import { getNFTData } from "./utils.js";
import { getThreadIdForToken } from "./discord.js";
import { IS_TEST_MODE, MAX_NOTIFICATIONS } from "./config.js";
import { sendStatusMessage } from "./error-handler.js";

let notificationCount = 0;

export function setupTransferListener(discordClient, contract) {
  return;

  // contract.on("Transfer", async (from, to, tokenId) => {
  //   if (from === to || from === "0x0000000000000000000000000000000000000000")
  //     return;

  //   if (IS_TEST_MODE && notificationCount >= MAX_NOTIFICATIONS) {
  //     await sendStatusMessage(
  //       discordClient,
  //       `🛑 Max notifications atteintes (TEST MODE)`,
  //     );
  //     process.exit(0);
  //   }

  //   const data = await getNFTData(tokenId);
  //   const embed = buildSaleNFTEmbed(
  //     data,
  //     from,
  //     to,
  //     "price123",
  //     tokenId,
  //     "sale",
  //   );
  //   try {
  //     const threadId = getThreadIdForToken(from);
  //     const thread = await discordClient.channels.fetch(threadId);
  //     if (thread?.isTextBased()) {
  //       await thread.send({ embeds: [embed] });
  //       notificationCount++;
  //     }
  //   } catch (err) {
  //     console.error("❌ Erreur d'envoi :", err);
  //     await sendStatusMessage(
  //       discordClient,
  //       `❌ Erreur Discord : \`${err.message}\``,
  //     );
  //   }
  // });
}
