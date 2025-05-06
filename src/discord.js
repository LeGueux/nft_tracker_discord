import { Client, GatewayIntentBits } from "discord.js";
import { buildSaleNFTEmbed } from "./embeds.js";
import { getNFTData } from "./nft-utils.js";
import { IS_TEST_MODE, ALIVE_PING_INTERVAL } from "./config.js";
import { sendStatusMessage } from "./error-handler.js";

export const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

export function getThreadIdForToken(from) {
  switch (from) {
    case process.env.FRANCK_ADDRESS:
      return process.env.THREAD_ID_FRANCK;
    case process.env.NICO_ADDRESS:
      return process.env.THREAD_ID_NICO;
    case "sales":
      return process.env.THREAD_ID_1;
    case "sales-snipe":
      return process.env.THREAD_ID_2;
    case "listings":
      return process.env.THREAD_ID_2;
    default:
      return process.env.STATUS_THREAD_ID;
  }
}

// Discord bot ready
export function eventBotReady(discordClient) {
  discordClient.once("ready", async () => {
    console.log(
      `✅ Bot connecté en tant que ${discordClient.user.tag} à ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
    );
    await sendStatusMessage(
      discordClient,
      `✅ Bot démarré à ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
    );

    if (IS_TEST_MODE) {
      // const data = await getNFTData("51618"); // Limited
      // const data = await getNFTData("51520"); // Rare
      // const data = await getNFTData("51495"); // Epic
      const data = await getNFTData("51490"); // Legendary
      const embed = buildSaleNFTEmbed(
        data,
        "0xFROM",
        "0xTO",
        "PRICE",
        "51690",
        "sale",
      );

      try {
        const thread = await discordClient.channels.fetch(
          getThreadIdForToken("default"),
        );
        if (thread?.isTextBased()) {
          await thread.send({ embeds: [embed] });
        }
      } catch (e) {
        console.error("Erreur envoi test embed :", e);
      }
    }
    setInterval(async () => {
      await sendStatusMessage(
        discordClient,
        `🟢 Alive - ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
      );
    }, ALIVE_PING_INTERVAL);
  });
}
