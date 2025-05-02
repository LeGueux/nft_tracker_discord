import "dotenv/config";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { WebSocketProvider, Contract } from "ethers";

// ======== CONFIGURATION ========
const IS_TEST_MODE = process.env.MODE === "TEST";
const MAX_NOTIFICATIONS = 3;
let notificationCount = 0;

// ======== DISCORD CLIENT ========
const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Envoie un message dans le thread de statut
async function sendStatusMessage(content) {
  try {
    const statusThread = await discordClient.channels.fetch(
      process.env.STATUS_THREAD_ID,
    );
    if (statusThread?.isTextBased()) {
      await statusThread.send(content);
    }
  } catch (e) {
    console.error("❌ Impossible d'envoyer le message de statut :", e);
  }
}

// Démarrage du ping "alive"
discordClient.once("ready", async () => {
  console.log(`✅ Bot connecté en tant que ${discordClient.user.tag}`);
  await sendStatusMessage(`✅ Bot démarré à ${new Date().toLocaleString()}`);

  const intervalMinutes = parseInt(process.env.ALIVE_PING_INTERVAL || "10", 10);
  const intervalMs = intervalMinutes * 60 * 1000;

  setInterval(async () => {
    const now = new Date().toLocaleString();
    await sendStatusMessage(`🟢 Alive - ${now}`);
    console.log(`🔁 Ping alive envoyé à ${now}`);
  }, intervalMs);
});

// ======== ETHERS & CONTRACT SETUP ========
const provider = new WebSocketProvider(process.env.INFURA_WSS);

const abi = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

const nftContract = new Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  abi,
  provider,
);

// Choisir un thread selon le tokenId
function getThreadIdForToken(tokenId) {
  const id = parseInt(tokenId.toString());
  if (id % 3 === 0) return process.env.THREAD_ID_1;
  if (id % 3 === 1) return process.env.THREAD_ID_2;
  return process.env.THREAD_ID_3;
}

// ======== EVENT HANDLING ========
nftContract.on("Transfer", async (from, to, tokenId) => {
  if (IS_TEST_MODE && notificationCount >= MAX_NOTIFICATIONS) {
    console.log("🛑 Mode TEST : nombre max de notifications atteint.");
    await sendStatusMessage(
      `🛑 Bot arrêté (mode TEST : ${MAX_NOTIFICATIONS} transferts atteints)`,
    );
    process.exit(0);
  }

  console.log(`🔄 Transfert détecté : Token #${tokenId} de ${from} à ${to}`);

  const embed = new EmbedBuilder()
    .setTitle("📦 NFT Transféré")
    .addFields(
      { name: "De", value: from, inline: true },
      { name: "À", value: to, inline: true },
      { name: "Token ID", value: tokenId.toString(), inline: true },
    )
    .setColor("Purple")
    .setTimestamp()
    .setFooter({ text: "Réseau : Polygon" });

  try {
    const threadId = getThreadIdForToken(tokenId);
    const thread = await discordClient.channels.fetch(threadId);
    if (thread?.isTextBased()) {
      await thread.send({ embeds: [embed] });
      console.log(`✅ Notification envoyée dans le thread ${threadId}`);
      notificationCount++;
    }
  } catch (err) {
    console.error("❌ Erreur d'envoi Discord :", err);
    await sendStatusMessage(`❌ Erreur d'envoi Discord : \`${err.message}\``);
  }
});

// ======== ERROR HANDLING ========
process.on("uncaughtException", async (err) => {
  console.error("💥 Uncaught Exception:", err);
  await sendStatusMessage(
    `💥 Bot crash (exception) : \`\`\`${err.message}\`\`\``,
  );
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  await sendStatusMessage(`💥 Bot crash (rejection) : \`\`\`${reason}\`\`\``);
  process.exit(1);
});

// ======== START BOT ========
discordClient.login(process.env.DISCORD_BOT_TOKEN);
