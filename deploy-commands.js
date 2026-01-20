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
                    { name: 'S1-S9', value: 110 },
                    { name: 'Saison 1', value: 1 },
                    { name: 'Saison 2', value: 2 },
                    { name: 'Saison 3', value: 3 },
                    { name: 'Saison 4', value: 4 },
                    { name: 'Saison 5', value: 5 },
                    { name: 'Saison 6', value: 6 },
                    { name: 'Saison 7', value: 7 },
                    { name: 'Saison 8', value: 8 },
                    { name: 'Saison 9', value: 9 },
                    { name: 'SPE-S', value: 120 },
                    { name: 'OFF-S', value: 130 },
                ))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('nft_tracking')
        .setDescription('Affiche les listings, les holders et le ratio BBD/DOLZ pour une carte donnée (ex: g0100)')
        .addStringOption(option =>
            option.setName('modelid')
                .setDescription('L\'identifiant du modèle de la carte (ex: g0100)')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('nb_holders')
                .setDescription('Le nombre de holders à afficher (défaut: 15)')
        )
        .addBooleanOption(option =>
            option.setName('with_address')
                .setDescription('Affiche les adresses des holders (défaut: false)')
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('get_wallet_data')
        .setDescription('Affiche les détails d\'un wallet spécifique')
        .addStringOption(option =>
            option.setName('address')
                .setDescription('L\'adresse du wallet (ex: 0x1234567890abcdef1234567890abcdef12345678)')
        )
        .addStringOption(option =>
            option
                .setName('person')
                .setDescription('Sélectionne une personne')
                .addChoices(
                    { name: 'Franck', value: process.env.FRANCK_ADDRESS_1 },
                    { name: 'Nico', value: process.env.NICO_ADDRESS_1 },
                    { name: 'Bob', value: process.env.BOB_ADDRESS_1 },
                    { name: 'Coch', value: process.env.COCH_ADDRESS_1 },
                )
        )
        .addBooleanOption(option =>
            option.setName('with_full_details')
                .setDescription('Affiche le détail complet du wallet (défaut: false)')
        )
        .addBooleanOption(option =>
            option.setName('basic_data_only')
                .setDescription('Affiche le uniquement le minimum de data du wallet (défaut: false)')
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('pm_actives_positions')
        .setDescription('Affiche les positions actives sur Polymarket pour Franck, Nico et Bob')
        .addStringOption(option =>
            option
                .setName('person')
                .setDescription('Sélectionne une personne')
                .addChoices(
                    { name: 'FnarckPalloin', value: process.env.FRANCK_POLYMARKET_ADDRESS },
                    { name: 'SebastienFastoche', value: process.env.NICO_POLYMARKET_ADDRESS },
                    { name: 'BobyLaPointe', value: process.env.BOB_POLYMARKET_ADDRESS },
                )
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
