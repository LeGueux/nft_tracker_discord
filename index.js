import 'dotenv/config';
import express from 'express';
import { discordClient, eventBotReady } from './discord.js';
import { setupErrorHandlers } from './shared/error-handler.js';
import { IS_TEST_MODE } from './dolz/config.js';

// Logs de démarrage très précoces
console.log(`✅ index.js | Boot at ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
console.log({
    node: process.version,
    platform: process.platform,
});

// Handlers globaux
process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED_REJECTION', reason);
});
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT_EXCEPTION', err);
});

if (!IS_TEST_MODE) {
    const app = express();
    const PORT = process.env.PORT || 3000;

    // Route HTTP simple
    app.get('/', (req, res) => {
        console.log(
            `APP GET '/' - ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
        );
        res.send('Hello from Koyeb!');
    });

    // Démarrage du serveur Express
    app.listen(PORT, () => {
        console.log(
            `Server running on port ${PORT} - ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
        );
    });
}

console.log(`✅ index.js | Bot started at ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
console.log({
    node: process.version,
    discordJs: (await import('discord.js')).version,
    platform: process.platform,
});

// eventBotReady(discordClient);
// setupErrorHandlers(discordClient);
// discordClient.login(process.env.DISCORD_BOT_TOKEN);

// Boot Discord dans un async IIFE
(async () => {
    try {
        console.log('Discord | init handlers');
        eventBotReady(discordClient);
        setupErrorHandlers(discordClient);

        console.log('Discord | login...');
        await discordClient.login(process.env.DISCORD_BOT_TOKEN);
        console.log('Discord | login OK');
    } catch (err) {
        console.error('Discord | login FAILED', err);
    }
})();