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

/**
 * Retourne l'ID de thread Discord correspondant à une action (listing, vente, offre) ou à un utilisateur spécifique.
 *
 * Priorité à l'adresse `from` si elle est définie. Sinon, `type` est utilisé pour déterminer l’ID du thread.
 *
 * @param {string} type - Type d'action ou adresse (ex: "listing", "sale", "offer", ou une adresse wallet).
 * @param {string} [from] - Adresse de l'utilisateur à l'origine de l'action, si connue.
 * @returns {string} L'identifiant du thread Discord correspondant.
 */
export function getThreadIdForToken(type, from) {
  if (from) {
    // Cas où from correspond à un utilisateur spécifique
    if (from.toLowerCase() === process.env.FRANCK_ADDRESS.toLowerCase()) {
      return process.env.THREAD_ID_FRANCK;
    } else if (from.toLowerCase() === process.env.NICO_ADDRESS.toLowerCase()) {
      return process.env.THREAD_ID_NICO;
    }
  }

  switch (type) {
    case "listing":
      return process.env.THREAD_ID_1;
    case "sale":
      return process.env.THREAD_ID_2;
    case "offer":
      return process.env.THREAD_ID_3;
    default:
      return process.env.STATUS_THREAD_ID;
  }
}

// Discord bot ready
export function eventBotReady(discordClient) {
  discordClient.once("ready", async () => {
    console.log(`✅ Bot démarré à ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`);
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
        process.env.NICO_ADDRESS,
        process.env.FRANCK_ADDRESS,
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
      console.log(`🟢 Alive - ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`);
      await sendStatusMessage(
        discordClient,
        `🟢 Alive - ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
      );
    }, ALIVE_PING_INTERVAL);
  });

  // Slash commands from Discord
  discordClient.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'snipe') {
    const season = interaction.options.getInteger('season');
    console.log('Season:', season);
    await interaction.deferReply();
    setInterval(async (interaction) => {
      console.log('before editReply');
      await interaction.editReply(`📅 Saison sélectionnée : ${season + 1}`);
    }, 4000);
  }
});
}
