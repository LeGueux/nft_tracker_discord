import { getThreadIdForToken } from '../discord.js';

export async function sendStatusMessage(discordClient, content) {
    try {
        const thread = await discordClient.channels.fetch(getThreadIdForToken('default'));
        if (thread?.isTextBased()) {
            await thread.send({
                content,
                allowedMentions: {
                    users: [
                        process.env.FRANCK_DISCORD_USER_ID,
                        process.env.NICO_DISCORD_USER_ID,
                        process.env.BOB_DISCORD_USER_ID,
                        process.env.COCH_DISCORD_USER_ID,
                        process.env.PORTOS_DISCORD_USER_ID,
                    ],
                },
            });
        }
    } catch (error) {
        console.error("Erreur d'envoi du message de statut :", error.message);
    }
}

export function setupErrorHandlers(discordClient) {
    process.on('uncaughtException', async (error) => {
        console.error('Uncaught Exception:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Exception : \`${error.message}\``,
        );
        process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
        console.error('Unhandled Rejection:', reason);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Rejection : \`${reason}\``,
        );
        process.exit(1);
    });
}
