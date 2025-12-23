import 'dotenv/config';
// import express from 'express';
import { discordClient, eventBotReady } from './discord.js';
import { setupErrorHandlers } from './shared/error-handler.js';

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


eventBotReady(discordClient);
// Setup listeners and error handling
// setupTransferListener(discordClient, contract);
setupErrorHandlers(discordClient);
discordClient.login(process.env.DISCORD_BOT_TOKEN);
