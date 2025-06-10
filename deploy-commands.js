// deploy-commands.mjs
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

const commands = [
    new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Affiche les opportunités de snipe pour une saison donnée')
        .addIntegerOption(option =>
            option.setName('season')
                .setDescription('Numéro de la saison')
                .setRequired(true)
                .addChoices(
                    { name: 'ALL', value: 100 },
                    { name: 'S1-S7', value: 110 },
                    { name: 'Saison 1', value: 1 },
                    { name: 'Saison 2', value: 2 },
                    { name: 'Saison 3', value: 3 },
                    { name: 'Saison 4', value: 4 },
                    { name: 'Saison 5', value: 5 },
                    { name: 'Saison 6', value: 6 },
                    { name: 'Saison 7', value: 7 },
                    { name: 'SPE-S', value: 120 },
                    { name: 'OFF-S', value: 130 },
                ))
        .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

try {
    console.log('💾 Enregistrement de la commande slash...');
    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
    );
    console.log('✅ Commande slash enregistrée avec succès');
} catch (error) {
    console.error('Erreur lors de l’enregistrement :', error);
}
