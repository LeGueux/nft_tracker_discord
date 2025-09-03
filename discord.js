import {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { buildSaleListingNFTEmbed } from './embeds.js';
import { getNFTData } from './utils.js';
import { IS_TEST_MODE, ALIVE_PING_INTERVAL, COMETH_API_INTERVAL } from './config.js';
import { sendStatusMessage } from './error-handler.js';
import { callComethApiForLastListings, callComethApiForLastSales } from './cometh-api.js';
import { handleSnipeForSeason } from './command-snipe.js';
import { handleNftHoldersForSeason } from './command-nft-holders.js';
import { handleNftTrackingForModel } from './command-nft-tracking.js';
import { handleGetDataForWallet } from './command-wallet-data.js';
import { handleGetChartSalesVolume, handleGetChartSalesVolumeBywallet } from './command-chart-sales-volume.js';

export const discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

function buildSeasonButtons(suffix, currentSeason, includeAllRecap = true, includeOffSeason = true, includeSpecialEdition = true) {
    const rows = [];
    let currentRow = new ActionRowBuilder();

    if (includeAllRecap) {
        // All Season Snipe ONLY Buttons ID=100
        const buttonAll = new ButtonBuilder()
            .setCustomId(`select_season_100_${suffix}`)
            .setLabel(`All cards`)
            .setStyle(100 === currentSeason ? ButtonStyle.Primary : ButtonStyle.Secondary);

        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(buttonAll);

        // All Season Snipe ONLY Buttons ID=110
        const buttonAllSeasonsOnly = new ButtonBuilder()
            .setCustomId(`select_season_110_${suffix}`)
            .setLabel(`S1-S8`)
            .setStyle(110 === currentSeason ? ButtonStyle.Primary : ButtonStyle.Secondary);

        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(buttonAllSeasonsOnly);
    }

    for (let i = 1; i <= 8; i++) {
        const button = new ButtonBuilder()
            .setCustomId(`select_season_${i}_${suffix}`)
            .setLabel(`S${i}`)
            .setStyle(i === currentSeason ? ButtonStyle.Primary : ButtonStyle.Secondary);

        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }

        currentRow.addComponents(button);
    }

    if (includeSpecialEdition) {
        // Special Edition Button ID=120
        const buttonOffSeason = new ButtonBuilder()
            .setCustomId(`select_season_120_${suffix}`)
            .setLabel(`Spe-E`)
            .setStyle(120 === currentSeason ? ButtonStyle.Primary : ButtonStyle.Secondary);

        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(buttonOffSeason);
    }

    if (includeOffSeason) {
        // Off-Season Button ID=130
        const buttonSpecialEdition = new ButtonBuilder()
            .setCustomId(`select_season_130_${suffix}`)
            .setLabel(`OFF-S`)
            .setStyle(130 === currentSeason ? ButtonStyle.Primary : ButtonStyle.Secondary);

        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(buttonSpecialEdition);
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
        if ([process.env.FRANCK_ADDRESS_1.toLowerCase(), process.env.FRANCK_ADDRESS_2.toLowerCase()].includes(from.toLowerCase())) {
            return process.env.THREAD_ID_FRANCK;
        } else if (from.toLowerCase() === process.env.NICO_ADDRESS_1.toLowerCase()) {
            return process.env.THREAD_ID_NICO_1;
        } else if (from.toLowerCase() === process.env.NICO_ADDRESS_2.toLowerCase()) {
            return process.env.THREAD_ID_NICO_2;
        } else if (from.toLowerCase() === process.env.BOB_ADDRESS_1.toLowerCase()) {
            return process.env.THREAD_ID_BOB;
        } else if (from.toLowerCase() === process.env.COCH_ADDRESS_1.toLowerCase()) {
            return process.env.THREAD_ID_COCH;
        }
    }

    switch (type) {
        case 'main':
            return process.env.MAIN_THREAD_ID;
        case 'listing':
            return process.env.THREAD_ID_1;
        case 'sale':
            return process.env.THREAD_ID_2;
        case 'offer':
            return process.env.THREAD_ID_3;
        default:
            return process.env.STATUS_THREAD_ID;
    }
}

// Discord bot ready
export function eventBotReady(discordClient) {
    discordClient.once('ready', async () => {
        console.log(`✅ Bot démarré à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
        await sendStatusMessage(
            discordClient,
            `✅ Bot démarré à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
        );

        if (IS_TEST_MODE) {
            try {
                // const snipeEmbed1 = await handleSnipeForSeason(1);
                // const snipeEmbed2 = await handleSnipeForSeason(2);
                // const snipeEmbed3 = await handleSnipeForSeason(3);
                // const snipeEmbed4 = await handleSnipeForSeason(4);
                // const snipeEmbed5 = await handleSnipeForSeason(5);
                // const snipeEmbed6 = await handleSnipeForSeason(6);
                // const snipeEmbed7 = await handleSnipeForSeason(7);
                // const snipeEmbed8 = await handleSnipeForSeason(8);
                // const snipeEmbedAll = await handleSnipeForSeason(100);
                // const snipeEmbedAllSeasons = await handleSnipeForSeason(110);
                // const snipeEmbedSE = await handleSnipeForSeason(120);
                // const snipeEmbedOS = await handleSnipeForSeason(130);
                // const nftHoldersEmbed = await handleNftHoldersForSeason(6);
                const nftTrackingEmbed = await handleNftTrackingForModel('g0143', 30, true);
                // const tokenId = '51623';  // Limited
                // const tokenId = '51520';  // Rare
                // const tokenId = '51495';  // Epic
                // const tokenId = '51490';  // Legendary
                // const data = await getNFTData(tokenId);
                // const embedSale = await buildSaleListingNFTEmbed(
                //     data,
                //     process.env.BOB_ADDRESS_1,
                //     process.env.COCH_ADDRESS_1,
                //     1000,
                //     tokenId,
                //     'sale',
                // );
                // const walletFranckEmbed = await handleGetDataForWallet(process.env.FRANCK_ADDRESS_1);
                // const chartSalesVolumeEmbed = await handleGetChartSalesVolume(false);
                // const chartSalesVolumeByWalletEmbed = await handleGetChartSalesVolumeBywallet(process.env.FRANCK_ADDRESS_1);

                const thread = await discordClient.channels.fetch(getThreadIdForToken('default'));
                if (thread?.isTextBased()) {
                    // await thread.send({ embeds: [snipeEmbed1] });
                    // await thread.send({ embeds: [snipeEmbed2] });
                    // await thread.send({ embeds: [snipeEmbed3] });
                    // await thread.send({ embeds: [snipeEmbed4] });
                    // await thread.send({ embeds: [snipeEmbed5] });
                    // await thread.send({ embeds: [snipeEmbed6] });
                    // await thread.send({ embeds: [snipeEmbed7] });
                    // await thread.send({ embeds: [snipeEmbed8] });
                    // await thread.send({ embeds: [snipeEmbedAll] });
                    // await thread.send({ embeds: [snipeEmbedAllSeasons] });
                    // await thread.send({ embeds: [snipeEmbedSE] });
                    // await thread.send({ embeds: [snipeEmbedOS] });
                    // await thread.send({ embeds: [nftHoldersEmbed] });
                    await thread.send({ embeds: [nftTrackingEmbed] });
                    // await thread.send({ embeds: [walletFranckEmbed] });
                    // await thread.send(chartSalesVolumeEmbed);
                    // await thread.send(chartSalesVolumeByWalletEmbed);
                    // await thread.send({
                    //     content: `TEST <@${process.env.FRANCK_DISCORD_USER_ID}>`,
                    //     embeds: [embedSale],
                    //     allowedMentions: {
                    //         users: [
                    //             process.env.FRANCK_DISCORD_USER_ID,
                    //             process.env.NICO_DISCORD_USER_ID,
                    //             process.env.BOB_DISCORD_USER_ID,
                    //             process.env.COCH_DISCORD_USER_ID,
                    //         ],
                    //     },
                    // });
                    process.exit(0);
                }
            } catch (e) {
                console.error('Erreur envoi test embed :', e);
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
            console.log(`🟢 Alive - ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
            await sendStatusMessage(
                discordClient,
                `🟢 Alive - ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
            );
        }, ALIVE_PING_INTERVAL);
    });

    // Slash commands from Discord
    discordClient.on('interactionCreate', async interaction => {
        if (interaction.isChatInputCommand()) {
            await interaction.deferReply();
            if (interaction.commandName === 'snipe') {
                const season = interaction.options.getInteger('season');
                const embed = await handleSnipeForSeason(season);
                const row = buildSeasonButtons('snipe', season, true, true, true);
                await interaction.editReply({
                    embeds: [embed],
                    components: row,
                });
            } else if (interaction.commandName === 'nft_holders') {
                const season = interaction.options.getInteger('season');
                const embed = await handleNftHoldersForSeason(season);
                const row = buildSeasonButtons('nft_holders', season, false, true, false);
                await interaction.editReply({
                    embeds: [embed],
                    components: row,
                });
            } else if (interaction.commandName === 'nft_tracking') {
                const modelId = interaction.options.getString('modelid');
                const nbHolders = interaction.options.getString('nb_holders');
                const withAddress = interaction.options.getString('with_address');
                const embed = await handleNftTrackingForModel(modelId, parseInt(nbHolders, 15), withAddress === 'true');
                await interaction.editReply({ embeds: [embed] });
            } else if (interaction.commandName === 'get_wallet_data') {
                const address = interaction.options.getString('address');
                const embed = await handleGetDataForWallet(address);
                await interaction.editReply({ embeds: [embed] });
            } else if (interaction.commandName === 'get_chart_sales_volume') {
                const embedWithChart = await handleGetChartSalesVolume(false);
                await interaction.editReply(embedWithChart);
            } else if (interaction.commandName === 'get_chart_sales_volume_by_wallet') {
                const address = interaction.options.getString('address');
                const embedWithChart = await handleGetChartSalesVolumeBywallet(address);
                await interaction.editReply(embedWithChart);
            }
        } else if (interaction.isButton()) {
            const match = interaction.customId.match(/select_season_(\d+)_(snipe|nft_holders)/);
            if (!match) return;

            const season = parseInt(match[1]);
            const context = match[2]; // 'snipe' ou 'nft_holders'
            console.log('interaction.customId Match', match, context, season);
            await interaction.deferUpdate(); // Important pour éviter "Échec de l'interaction"
            if (context === 'snipe') {
                const snipeEmbedSeason = await handleSnipeForSeason(season);
                const row = buildSeasonButtons(context, season, true, true, true);

                await interaction.editReply({
                    embeds: [snipeEmbedSeason],
                    components: row
                });
            } else if (context === 'nft_holders') {
                const snipeEmbedSeason = await handleNftHoldersForSeason(season);
                const row = buildSeasonButtons(context, season, false, true, false);

                await interaction.editReply({
                    embeds: [snipeEmbedSeason],
                    components: row
                });
            }
        }
    });
}
