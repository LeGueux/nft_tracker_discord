import { Client, GatewayIntentBits } from "discord.js";
import { buildSaleNFTEmbed } from "./embeds.js";
import { getNFTData } from "./utils.js";
import {
  IS_TEST_MODE,
  ALIVE_PING_INTERVAL,
  COMETH_API_INTERVAL,
} from "./config.js";
import { sendStatusMessage } from "./error-handler.js";
import {
  callComethApiForLastListings,
  callComethApiForLastSales,
} from "./cometh-api.js";

export const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

export function getThreadIdForToken(from) {
  switch (from) {
    case process.env.FRANCK_ADDRESS:
      return process.env.THREAD_ID_FRANCK;
    case process.env.NICO_ADDRESS:
      return process.env.THREAD_ID_NICO;
    case "listings":
      return process.env.THREAD_ID_1;
    case "sales":
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
        50000,
        "51690",
        "sale",
      );

      try {
        const thread = await discordClient.channels.fetch(
          getThreadIdForToken("default"),
        );
        if (thread?.isTextBased()) {
          await thread.send({
            content: `TEST <@${process.env.FRANCK_DISCORD_USER_ID}>`,
            embeds: [embed],
            allowedMentions: {
              users: [
                process.env.FRANCK_DISCORD_USER_ID,
                process.env.NICO_DISCORD_USER_ID,
              ],
            },
          });
        }
      } catch (e) {
        console.error("Erreur envoi test embed :", e);
      }
    }
    // Start calling Cometh API with interval
    await callComethApiForLastListings(discordClient);
    await callComethApiForLastSales(discordClient);
    setInterval(async () => {
      await callComethApiForLastListings(discordClient);
      await callComethApiForLastSales(discordClient);
    }, COMETH_API_INTERVAL);

    // Alive ping
    setInterval(async () => {
      await sendStatusMessage(
        discordClient,
        `🟢 Alive - ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
      );
    }, ALIVE_PING_INTERVAL);
  });
}
