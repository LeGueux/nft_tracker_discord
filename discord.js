import {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { buildSaleListingNFTEmbed, buildWalletDataEmbed } from './dolz/embeds.js';
import { buildPolymarketPositionsEmbed } from './polymarket/embeds.js';
import { IS_TEST_MODE, ALIVE_PING_INTERVAL, DOLZ_API_INTERVAL_MS } from './dolz/config.js';
import { sendStatusMessage } from './shared/error-handler.js';
import { callApiToHandleNFTEvents, getNFTData } from './dolz/api-service.js';
import { handleSnipeForSeason } from './dolz/command-snipe.js';
import { handleNftTrackingForModel } from './dolz/command-nft-tracking.js';
import { handleOffersForOurTeam } from './dolz/handle-offers.js';
import { handleGetChartSalesVolume, handleGetChartSalesVolumeBywallet } from './dolz/command-chart-sales-volume.js';
import { getDolzBalance } from './shared/alchemy-api.js';

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
            .setEmoji('🔥')
            .setLabel(`All`)
            .setStyle(100 === currentSeason ? ButtonStyle.Primary : ButtonStyle.Secondary);

        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(buttonAll);

        // All Season Snipe ONLY Buttons ID=110
        const buttonAllSeasonsOnly = new ButtonBuilder()
            .setCustomId(`select_season_110_${suffix}`)
            .setEmoji('🔥')
            .setLabel(`S1-S9`)
            .setStyle(110 === currentSeason ? ButtonStyle.Primary : ButtonStyle.Secondary);

        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(buttonAllSeasonsOnly);

        // Season 6 and more Snipe ONLY Buttons ID=111
        const buttonSeason6AndMoreOnly = new ButtonBuilder()
            .setCustomId(`select_season_111_${suffix}`)
            .setEmoji('🔥')
            .setLabel(`S6+`)
            .setStyle(111 === currentSeason ? ButtonStyle.Primary : ButtonStyle.Secondary);

        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(buttonSeason6AndMoreOnly);
    }

    for (let i = 1; i <= 9; i++) {
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

function buildPolymarketActivePositionsButtons() {
    const rows = [];
    let currentRow = new ActionRowBuilder();

    // Off-Season Button ID=130
    const buttonRefresh = new ButtonBuilder()
        .setCustomId(`refresh_pm_positions`)
        .setLabel(`Refresh`)
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary);

    if (currentRow.components.length === 5) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
    }
    currentRow.addComponents(buttonRefresh);

    // Push the last row if it has any buttons
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }

    return rows;
}

export function getThreadIdForToken(type, from) {
    if (type == 'sale' && from) {
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

// Discord bot clientReady
export function eventBotReady(discordClient) {
    discordClient.once('clientReady', async () => {
        console.log(`✅ Bot démarré à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
        await sendStatusMessage(
            discordClient,
            `✅ Bot démarré à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
        );

        if (IS_TEST_MODE) {
            try {
                // const dolzBalance = await getDolzBalance(process.env.FRANCK_ADDRESS_1);
                // console.log(`Solde DOLZ pour l'adresse de Franck : ${dolzBalance}`);
                // const snipeEmbed1 = await handleSnipeForSeason(1);
                // const snipeEmbed2 = await handleSnipeForSeason(2);
                // const snipeEmbed3 = await handleSnipeForSeason(3);
                // const snipeEmbed4 = await handleSnipeForSeason(4);
                // const snipeEmbed5 = await handleSnipeForSeason(5);
                // const snipeEmbed6 = await handleSnipeForSeason(6);
                // const snipeEmbed7 = await handleSnipeForSeason(7);
                // const snipeEmbed8 = await handleSnipeForSeason(8);
                // const snipeEmbed9 = await handleSnipeForSeason(9);
                // const snipeEmbedAll = await handleSnipeForSeason(100);
                // const snipeEmbedAllSeasons = await handleSnipeForSeason(110);
                // const snipeEmbedHotS6AndMore = await handleSnipeForSeason(111);
                // const snipeEmbedSE = await handleSnipeForSeason(120);
                // const snipeEmbedOS = await handleSnipeForSeason(130);
                // const nftTrackingEmbed = await handleNftTrackingForModel('g0053', 5, true);
                // const tokenId = '51729';  // Limited
                // const tokenId = '51565';  // Rare
                // const tokenId = '51495';  // Epic
                // const tokenId = '51490';  // Legendary
                // const data = await getNFTData(tokenId);
                // const embedSale = await buildSaleListingNFTEmbed(
                //     data,
                //     process.env.FRANCK_ADDRESS_1,
                //     process.env.NICO_ADDRESS_1,
                //     1000,
                //     'sale',
                // );
                // const walletDataEmbed = await buildWalletDataEmbed(process.env.FRANCK_ADDRESS_1, true);
                // const chartSalesVolumeEmbed = await handleGetChartSalesVolume(false);
                // const chartSalesVolumeByWalletEmbed = await handleGetChartSalesVolumeBywallet(process.env.FRANCK_ADDRESS_1);

                // POLYMARKET
                // const polymarketPositionsEmbed = await buildPolymarketPositionsEmbed(discordClient);

                const thread = await discordClient.channels.fetch(getThreadIdForToken('default'));
                if (thread?.isTextBased()) {
                    // DOLZ
                    // await thread.send({ embeds: [snipeEmbed1] });
                    // await thread.send({ embeds: [snipeEmbed2] });
                    // await thread.send({ embeds: [snipeEmbed3] });
                    // await thread.send({ embeds: [snipeEmbed4] });
                    // await thread.send({ embeds: [snipeEmbed5] });
                    // await thread.send({ embeds: [snipeEmbed6] });
                    // await thread.send({ embeds: [snipeEmbed7] });
                    // await thread.send({ embeds: [snipeEmbed8] });
                    // await thread.send({ embeds: [snipeEmbed9] });
                    // await thread.send({ embeds: [snipeEmbedAll] });
                    // await thread.send({ embeds: [snipeEmbedAllSeasons] });
                    // await thread.send({ embeds: [snipeEmbedHotS6AndMore] });
                    // await thread.send({ embeds: [snipeEmbedSE] });
                    // await thread.send({ embeds: [snipeEmbedOS] });
                    // await thread.send({ embeds: [nftTrackingEmbed] });
                    // await thread.send({ embeds: [walletDataEmbed] });
                    // await thread.send(chartSalesVolumeEmbed);
                    // await thread.send(chartSalesVolumeByWalletEmbed);
                    // await thread.send({
                    //     content: `TEST <@${process.env.FRANCK_DISCORD_USER_ID}>`,
                    //     embeds: [embedSale],
                    //     allowedMentions: {
                    //         users: [
                    //             process.env.FRANCK_DISCORD_USER_ID,
                    //         ],
                    //     },
                    // });

                    // POLYMARKET
                    // const row = buildPolymarketActivePositionsButtons();
                    // await interaction.editReply({
                    //     embeds: [polymarketPositionsEmbed],
                    //     components: row,
                    // });
                    // await thread.send({ embeds: [polymarketPositionsEmbed], components: row });

                    // process.exit(0);
                }
            } catch (error) {
                console.error('Erreur envoi test embed :', error);
                await sendStatusMessage(
                    discordClient,
                    `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Rejection : \`${error}\``,
                );
                process.exit(0);
            }
        }
        // Start calling Dolz API with interval
        await callApiToHandleNFTEvents(discordClient);
        await handleOffersForOurTeam(discordClient);
        setInterval(async () => {
            await callApiToHandleNFTEvents(discordClient);
            await handleOffersForOurTeam(discordClient);
        }, DOLZ_API_INTERVAL_MS);

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
            } else if (interaction.commandName === 'nft_tracking') {
                const modelId = interaction.options.getString('modelid');
                const nbHolders = interaction.options.getInteger('nb_holders') ?? 15;
                const withAddress = interaction.options.getBoolean('with_address') ?? false;
                const embed = await handleNftTrackingForModel(modelId, nbHolders, withAddress);
                await interaction.editReply({ embeds: [embed] });
            } else if (interaction.commandName === 'get_wallet_data') {
                const address = interaction.options.getString('address');
                const person = interaction.options.getString('person');
                const withFullDetails = interaction.options.getBoolean('with_full_details') ?? false;
                const basicDataOnly = interaction.options.getBoolean('basic_data_only') ?? false;
                let walletAddress;

                if (address) {
                    walletAddress = address;
                } else if (person) {
                    walletAddress = person;
                } else {
                    return interaction.reply({ content: '⚠️ Tu dois renseigner une adresse ou choisir une personne.', ephemeral: true });
                }
                const embed = await buildWalletDataEmbed(walletAddress, withFullDetails, basicDataOnly);
                await interaction.editReply({ embeds: [embed] });
            } else if (interaction.commandName === 'pm_actives_positions') {
                const embed = await buildPolymarketPositionsEmbed(discordClient);
                const row = buildPolymarketActivePositionsButtons();
                await interaction.editReply({
                    embeds: [embed],
                    components: row,
                });
            }
            // } else if (interaction.commandName === 'get_chart_sales_volume') {
            //     const embedWithChart = await handleGetChartSalesVolume(false);
            //     await interaction.editReply(embedWithChart);
            // } else if (interaction.commandName === 'get_chart_sales_volume_by_wallet') {
            //     const address = interaction.options.getString('address');
            //     const embedWithChart = await handleGetChartSalesVolumeBywallet(address);
            //     await interaction.editReply(embedWithChart);
        } else if (interaction.isButton()) {
            const match = interaction.customId.match(/select_season_(\d+)_(snipe)/);
            const isRefreshPmPositions = interaction.customId === 'refresh_pm_positions';

            // Aucun bouton reconnu
            if (!match && !isRefreshPmPositions) return;

            // 1️⃣ Toujours defer pour éviter timeout
            await interaction.deferUpdate();

            // 🔄 REFRESH POLYMARKET
            if (isRefreshPmPositions) {
                await interaction.editReply({
                    embeds: [
                        {
                            title: "🔄 Chargement...",
                            description: `Récupération des données en cours.`,
                            color: 0xcccccc,
                        }
                    ],
                    components: row,
                });
                const embed = await buildPolymarketPositionsEmbed(discordClient);
                const row = buildPolymarketActivePositionsButtons();
                await interaction.editReply({
                    embeds: [embed],
                    components: row,
                });
            } else {
                // 🎯 SNIPE
                const season = parseInt(match[1]);
                const context = match[2]; // 'snipe'

                if (context === 'snipe') {
                    const row = buildSeasonButtons(context, season, true, true, true);
                    await interaction.editReply({
                        embeds: [
                            {
                                title: "🔄 Chargement...",
                                description: `Récupération des données en cours.`,
                                color: 0xcccccc,
                            }
                        ],
                        components: row,
                    });

                    const snipeEmbedSeason = await handleSnipeForSeason(season);
                    await interaction.editReply({
                        embeds: [snipeEmbedSeason],
                        components: row
                    });
                } else if (isRefreshPmPositions) {
                    await interaction.editReply({
                        embeds: [
                            {
                                title: "🔄 Chargement...",
                                description: `Récupération des données en cours.`,
                                color: 0xcccccc,
                            }
                        ],
                        components: row,
                    });
                    const embed = await buildPolymarketPositionsEmbed(discordClient);
                    const row = buildPolymarketActivePositionsButtons();
                    await interaction.editReply({
                        embeds: [embed],
                        components: row,
                    });
                }
            }
        }
    });
}
