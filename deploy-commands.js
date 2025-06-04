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
    )
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
