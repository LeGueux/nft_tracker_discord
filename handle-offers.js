import { getEventsByWallet, getOffersByNFTId, getNFTData } from './api-service.js';
import { WALLETS_TEAM } from './config.js';
import { buildSaleListingNFTEmbed } from './embeds.js';
import { getThreadIdForToken } from './discord.js';
import { sendStatusMessage } from './error-handler.js';

export async function handleOffersForOurTeam(discordClient) {
    try {
        console.log(`handleOffersForOurTeam à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
        const allResults = await Promise.all(
            WALLETS_TEAM.map(addr => getEventsByWallet(addr.toLowerCase(), true, true))
        );

        // 🟢 Fusionne tous les tableaux retournés
        const allNftIdsWithEvents = allResults.flat();

        for (const nftId of allNftIdsWithEvents) {
            const dataOffers = await getOffersByNFTId(nftId);
            console.log('dataOffers:', dataOffers);
            if (!dataOffers || dataOffers.length < 1 || !dataOffers[0]) continue;
            const offer = dataOffers[0];
            console.log('OFFER to handle:', offer);
            const data = await getNFTData(nftId);
            const seller = offer.to;
            const buyer = offer.from;
            const embed = await buildSaleListingNFTEmbed(
                data,
                seller,
                buyer,
                offer.price,
                'offer',
            );
            const threadId = getThreadIdForToken('offer', seller);
            const thread = await discordClient.channels.fetch(threadId);
            if (thread?.isTextBased()) {
                await thread.send({
                    embeds: [embed],
                });
            }
        }
    } catch (error) {
        console.error('❌ Erreur dans handleOffersForOurTeam:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur dans handleOffersForOurTeam - Rejection : \`${error}\``,
        );
    }
}