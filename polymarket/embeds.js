import { EmbedBuilder } from 'discord.js';
import { sendStatusMessage } from '../shared/error-handler.js';

function buildPositionDescription(pos) {
    const lines = [];
    const pnlEmoji = pos.cashPnl >= 0 ? '📈' : '📉';

    lines.push(`🎯 ${pos.outcome} ${(pos.curPrice * 100).toFixed(1)}¢`);
    lines.push(`📊 ${pos.size.toFixed(1)} shares`);
    lines.push(`💵 Avg: ${(pos.avgPrice * 100).toFixed(1)}%`);
    lines.push(`💰 Current: $ ${pos.currentValue.toFixed(2)}`);
    lines.push(`${pnlEmoji} PnL: $ ${pos.cashPnl.toFixed(2)} (${pos.percentPnl.toFixed(2)}%)`);
    lines.push(`🕒 End: ${new Date(pos.endDate).toLocaleDateString('fr-FR')}`);

    return lines.join('\n');
}

export async function buildPolymarketPositionsEmbed(discordClient, franckPositions, NicoPositions, BobPositions) {
    console.log('Building Polymarket Positions Embed... | buildPolymarketPositionsEmbed');
    try {
        let embed = new EmbedBuilder()
            .setTitle('📈 Polymarket - Actives Positions')
            .setColor(0x00ff00)
            .setTimestamp();

        embed = await buildPolymarketPositionsEmbedForUser(discordClient, embed, franckPositions, 'Franck');
        embed = await buildPolymarketPositionsEmbedForUser(discordClient, embed, NicoPositions, 'Nico');
        embed = await buildPolymarketPositionsEmbedForUser(discordClient, embed, BobPositions, 'Bob');

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

async function buildPolymarketPositionsEmbedForUser(discordClient, embed, positions, userName) {
    console.log(`Building positions for ${userName}... | buildPolymarketPositionsEmbedForUser`);
    try {
        const totalPositions = positions.length;
        const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
        const totalPnL = positions.reduce((sum, pos) => sum + pos.cashPnl, 0);
        console.log(`Total Positions: ${totalPositions}, Total Value: $${totalValue.toFixed(2)}, Total PnL: $${totalPnL.toFixed(2)}`);

        embed.addFields({
            name: `📊 Summary - ${userName}`,
            value: `📈 Positions: ${totalPositions}\n💰 Current Value: $ ${totalValue.toFixed(2)}\n${totalPnL >= 0 ? '📈' : '📉'} PnL: $ ${totalPnL.toFixed(2)}`,
            inline: false,
        });

        for (const pos of positions.slice(0, 10)) {  // Limiter à 10 positions pour éviter l'overflow
            embed.addFields({
                name: pos.title.substring(0, 100),
                value: buildPositionDescription(pos),
                inline: true,
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
