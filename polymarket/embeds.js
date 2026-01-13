import { EmbedBuilder } from 'discord.js';
import { sendStatusMessage } from '../shared/error-handler.js';
import { getUserPositions } from './polymarket-api.js';
import { getPolymarketUsdcBalance } from '../shared/alchemy-api.js';

function buildPositionDescription(pos) {
    const sideEmoji = pos.outcome === 'Yes' ? '🟢' : '🔴';
    const pnlEmoji = pos.cashPnl >= 10 ? '🚀' : pos.cashPnl >= 0 ? '📈' : '📉';
    const sizeEmoji = pos.currentValue >= 300 ? '🐳' : pos.currentValue >= 100 ? '🦈' : '🐟';

    return [
        `${sideEmoji} **${pos.outcome.toUpperCase()} @ ${(pos.curPrice * 100).toFixed(1)}¢**`,
        `${pnlEmoji} **${pos.cashPnl.toFixed(2)}$ (${pos.percentPnl.toFixed(2)}%)**`,
        `${sizeEmoji} ${pos.size.toFixed(1)} sh | Avg ${(pos.avgPrice * 100).toFixed(1)}%`,
        `💰 Value ${pos.currentValue.toFixed(2)}$ | 🕒 ${new Date(pos.endDate).toLocaleDateString('fr-FR')}`
    ].join('\n');
}

export async function buildPolymarketPositionsEmbed(discordClient) {
    console.log('Building Polymarket Positions Embed... | buildPolymarketPositionsEmbed');
    try {
        const franckPositions = await getUserPositions(process.env.FRANCK_POLYMARKET_ADDRESS);
        const NicoPositions = await getUserPositions(process.env.NICO_POLYMARKET_ADDRESS);
        const BobPositions = await getUserPositions(process.env.BOB_POLYMARKET_ADDRESS);
        const franckCash = await getPolymarketUsdcBalance(process.env.FRANCK_POLYMARKET_ADDRESS);
        const nicoCash = await getPolymarketUsdcBalance(process.env.NICO_POLYMARKET_ADDRESS);
        const bobCash = await getPolymarketUsdcBalance(process.env.BOB_POLYMARKET_ADDRESS);
        let embed = new EmbedBuilder()
            .setTitle('📈 Polymarket - Actives Positions')
            .setColor(0x00ff00)
            .setTimestamp();

        embed = await buildPolymarketPositionsEmbedForUser(discordClient, embed, BobPositions, bobCash, 'Bob');
        embed = await buildPolymarketPositionsEmbedForUser(discordClient, embed, NicoPositions, nicoCash, 'Nico');
        embed = await buildPolymarketPositionsEmbedForUser(discordClient, embed, franckPositions, franckCash, 'Franck');

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

async function buildPolymarketPositionsEmbedForUser(discordClient, embed, positions, cash, userName) {
    console.log(`Building positions for ${userName}... | buildPolymarketPositionsEmbedForUser`);
    try {
        embed.addFields({
            name: '━━━━━━━━━━━━━━━━━━━━━━',
            value: `👤 **${userName.toUpperCase()}**`,
            inline: false,
        });
        const totalPositions = positions.length;
        const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
        const totalPnL = positions.reduce((sum, pos) => sum + pos.cashPnl, 0);
        console.log(`Total Positions: ${totalPositions}, Total Value: $${totalValue.toFixed(2)}, Total PnL: $${totalPnL.toFixed(2)}`);

        embed.addFields({
            name: '📊 Summary',
            value: [
                `💰 Cash: **${cash}$**`,
                `📌 Positions: **${totalPositions}**`,
                `💰 Value: **${totalValue.toFixed(2)}$**`,
                `${totalPnL >= 0 ? '📈' : '📉'} PnL: **${totalPnL.toFixed(2)}$**`,
            ].join('\n'),
            inline: false,
        });

        for (const pos of positions.slice(0, 10)) {  // Limiter à 10 positions pour éviter l'overflow
            embed.addFields({
                name: pos.title.substring(0, 100),
                value: buildPositionDescription(pos),
                inline: false,
            });
        }

        return embed;
    } catch (error) {
        console.error(`Error building positions for ${userName}:`, error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Error building Polymarket Positions Embed : \`${error}\``,
        );
    }
}
