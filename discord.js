import {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from "discord.js";
import { buildSaleNFTEmbed } from "./embeds.js";
import { getNFTData } from "./utils.js";
import { IS_TEST_MODE, ALIVE_PING_INTERVAL, COMETH_API_INTERVAL } from "./config.js";
import { sendStatusMessage } from "./error-handler.js";
import { callComethApiForLastListings, callComethApiForLastSales } from "./cometh-api.js";
import { handleSnipeForSeason } from "./snipe.js";

export const discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

function buildSeasonButtons(currentSeason) {
    const rows = [];
    let currentRow = new ActionRowBuilder();

    for (let i = 1; i <= 7; i++) {
        const button = new ButtonBuilder()
            .setCustomId(`select_season_snipe_${i}`)
            .setLabel(`S${i}`)
            .setStyle(i === currentSeason ? ButtonStyle.Primary : ButtonStyle.Secondary);

        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }

        currentRow.addComponents(button);
    }

    // Push the last row if it has any buttons
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }

    return rows;
}

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
            try {
                const snipeEmbed1 = await handleSnipeForSeason(1);
                const snipeEmbed2 = await handleSnipeForSeason(2);
                const snipeEmbed3 = await handleSnipeForSeason(3);
                const snipeEmbed4 = await handleSnipeForSeason(4);
                const snipeEmbed5 = await handleSnipeForSeason(5);
                const snipeEmbed6 = await handleSnipeForSeason(6);
                // const data = await getNFTData("51618"); // Limited
                // const data = await getNFTData("51520"); // Rare
                // const data = await getNFTData("51495"); // Epic
                const data = await getNFTData("51490"); // Legendary
                const embed = await buildSaleNFTEmbed(
                    data,
                    process.env.NICO_ADDRESS,
                    process.env.FRANCK_ADDRESS,
                    50000,
                    "51690",
                    "sale",
                );

                const thread = await discordClient.channels.fetch(getThreadIdForToken("default"));
                if (thread?.isTextBased()) {
                    await thread.send({ embeds: [snipeEmbed1] });
                    await thread.send({ embeds: [snipeEmbed2] });
                    await thread.send({ embeds: [snipeEmbed3] });
                    await thread.send({ embeds: [snipeEmbed4] });
                    await thread.send({ embeds: [snipeEmbed5] });
                    await thread.send({ embeds: [snipeEmbed6] });
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
                await sendStatusMessage(
                    discordClient,
                    `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Rejection : \`${e}\``,
                );
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
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'snipe') {
                const season = interaction.options.getInteger('season');
                const snipeEmbedSeason = await handleSnipeForSeason(season);
                const row = buildSeasonButtons(season);
                await interaction.deferReply();
                await interaction.editReply({
                    embeds: [snipeEmbedSeason],
                    components: row,
                });
            }
        } else if (interaction.isButton()) {
            const match = interaction.customId.match(/select_season_snipe_(\d+)/);
            if (!match) return;

            let season = parseInt(match[1]);
            console.log(match, season);

            await interaction.deferUpdate(); // Important pour éviter "Échec de l'interaction"

            const snipeEmbedSeason = await handleSnipeForSeason(season);
            const row = buildSeasonButtons(season);

            await interaction.editReply({
                embeds: [snipeEmbedSeason],
                components: row
            });
        }
    });
}
