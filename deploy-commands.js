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
        .toJSON(),
    new SlashCommandBuilder()
        .setName('nft_holders')
        .setDescription('Affiche les 🐋 holders de NFT pour une saison donnée')
        .addIntegerOption(option =>
            option.setName('season')
                .setDescription('Numéro de la saison')
                .setRequired(true)
                .addChoices(
                    { name: 'Saison 1', value: 1 },
                    { name: 'Saison 2', value: 2 },
                    { name: 'Saison 3', value: 3 },
                    { name: 'Saison 4', value: 4 },
                    { name: 'Saison 5', value: 5 },
                    { name: 'Saison 6', value: 6 },
                    { name: 'Saison 7', value: 7 },
                ))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('nft_tracking')
        .setDescription('Affiche les listings et les holders pour une carte donnée (ex: g0100)')
        .addStringOption(option =>
            option.setName('modelid')
                .setDescription('L\'identifiant du modèle de la carte (ex: g0100)')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('get_wallet_data')
        .setDescription('Affiche les détails d\'un wallet spécifique')
        .addStringOption(option =>
            option.setName('address')
                .setDescription('L\'adresse du wallet (ex: 0x1234567890abcdef1234567890abcdef12345678)')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('nft_bbd_reward_calculator')
        .setDescription('Affiche le ratio BBD/DOLZ pour les cartes listées d\'un modèle donné (ex: g0100)')
        .addStringOption(option =>
            option.setName('modelid')
                .setDescription('L\'identifiant du modèle de la carte (ex: g0100)')
                .setRequired(true)
        )
        .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

try {
    console.log('💾 Enregistrement des commandes slash...');
    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
    );
    console.log('✅ Commandes slash enregistrées avec succès');
} catch (error) {
    console.error('Erreur lors des enregistrements :', error);
}
