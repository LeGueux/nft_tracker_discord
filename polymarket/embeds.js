import { EmbedBuilder } from 'discord.js';
import { sendStatusMessage } from '../shared/error-handler.js';
import { getUserPositions, getPolymarketTraderLeaderboard, getPolymarketAnalytics } from './polymarket-api.js';
import { getPolymarketUsdcBalance } from '../shared/alchemy-api.js';
import { POLYMARKET_USERS } from './config.js';

const EMOJIS = {
    pnl: value => value >= 10 ? '🚀' : value >= 0 ? '📈' : '📉',
    side: outcome => outcome === 'Yes' ? '🟢' : '🔴',
    size: value => value >= 300 ? '🐳' : value >= 100 ? '🦈' : '🐟',
};

const formatNumber = (num) => new Intl.NumberFormat('fr-FR').format(num);

function getTopTraderPercent(rank, totalTraders) {
    if (totalTraders === 0) return 'N/A';
    const percent = (rank / totalTraders) * 100;
    return percent.toFixed(2);
}

function formatEndDate(endDate) {
    if (!endDate || new Date(endDate).getFullYear() <= 1971) return null;
    return new Date(endDate).toLocaleDateString('fr-FR');
}

function buildPositionDescription(pos) {
    const endDate = formatEndDate(pos.endDate);

    return [
        `**[${pos.title.substring(0, 100)}](https://polymarket.com/event/${pos.eventSlug}/${pos.slug})**`,
        `${EMOJIS.side(pos.outcome)} **${pos.outcome.toUpperCase()} @ ${(pos.curPrice * 100).toFixed(1)}¢** • ${EMOJIS.pnl(pos.cashPnl)} **${pos.cashPnl >= 0 ? '+' : ''}${pos.cashPnl.toFixed(2)}$** (${pos.percentPnl.toFixed(2)}%)`,
        `${EMOJIS.size(pos.currentValue)} Value ${pos.currentValue.toFixed(2)}$ • ${pos.size.toFixed(1)} shares at ${(pos.avgPrice * 100).toFixed(1)}¢`,
        endDate ? `⏳ Ends ${endDate}` : null
    ].filter(Boolean).join('\n');
}

async function buildPolymarketPositionsEmbedForUser(discordClient, embed, positions, cash, traderLeaderboardPnL, traderLeaderboardVol, polymarketanalytics) {
    console.log(`Building positions for ${traderLeaderboardPnL.userName}... | buildPolymarketPositionsEmbedForUser`);
    try {
        embed.addFields({
            name: '━━━━━━━━━━━━━━━━━━━━━━',
            value: `👤 **[${traderLeaderboardPnL.userName}](https://polymarket.com/@${traderLeaderboardPnL.userName})**`,
            inline: false,
        });
        const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
        const totalPnL = positions.reduce((sum, pos) => sum + pos.cashPnl, 0);

        embed.addFields({
            name: '💼 Portfolio',
            value: [
                `💼 **Total:** ${(cash + totalValue).toFixed(2)}$`,
                `💵 **Cash:** ${cash.toFixed(2)}$`,
                `📌 **Positions:** ${totalValue.toFixed(2)}$`,
            ].join('\n'),
        });

        embed.addFields({
            name: '📈 Performance',
            value: [
                `${EMOJIS.pnl(traderLeaderboardPnL.pnl)} **PnL Total:** ${traderLeaderboardPnL.pnl.toFixed(2)}$`,
                `${EMOJIS.pnl(totalPnL)} **PnL Positions:** ${totalPnL.toFixed(2)}$`,
            ].join('\n'),
        });

        embed.addFields({
            name: '🏆 Classement',
            value: [
                `🥇 **PnL:** ${formatNumber(traderLeaderboardPnL.rank)} / ${formatNumber(parseInt(polymarketanalytics.trader_count))} • Top ${getTopTraderPercent(traderLeaderboardPnL.rank, polymarketanalytics.trader_count)}%`,
                `📦 **Volume:** ${formatNumber(traderLeaderboardVol.rank)} / ${formatNumber(parseInt(polymarketanalytics.trader_count))} • Top ${getTopTraderPercent(traderLeaderboardVol.rank, polymarketanalytics.trader_count)}%`,
            ].join('\n'),
        });

        for (const pos of positions.slice(0, 20)) {  // Limiter à 20 positions pour éviter l'overflow
            embed.addFields({
                name: '',
                value: buildPositionDescription(pos),
                inline: false,
            });
        }

        return embed;
    } catch (error) {
        console.error(`Error building positions for ${traderLeaderboardPnL.userName}:`, error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Error building Polymarket Positions Embed : \`${error}\``,
        );
    }
}

export async function buildPolymarketPositionsEmbed(discordClient, userName) {
    console.log(`Building Polymarket Positions Embed for ${userName}... | buildPolymarketPositionsEmbed`);
    try {
        const address = POLYMARKET_USERS[userName];
        const [positions, cash, leaderboardPnL, franckLeaderboardVol, polymarketanalytics] = await Promise.all([
            await getUserPositions(address),
            await getPolymarketUsdcBalance(address),
            await getPolymarketTraderLeaderboard(address),
            await getPolymarketTraderLeaderboard(address, 'VOL'),
            await getPolymarketAnalytics(),
        ]);

        let embed = new EmbedBuilder()
            .setTitle('📈 Polymarket - Actives Positions')
            .setColor(0x00ff00)
            .setTimestamp();

        embed = await buildPolymarketPositionsEmbedForUser(discordClient, embed, positions, cash, leaderboardPnL, franckLeaderboardVol, polymarketanalytics);

        console.log(`Embed length: ${embed.length} characters`);
        if (embed.length > 6000) {
            console.warn('Embed too large, truncating...');
            embed.setFields({
                name: 'Warning',
                value: `The embed content was too large and has been truncated. Please check the logs for details. ${embed.length} characters`,
            });
        }

        return embed;
    } catch (error) {
        console.error('Error building Polymarket Positions Embed:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Error building Polymarket Positions Embed : \`${error}\``,
        );
    }
}
