import "dotenv/config";
import { discordClient, eventBotReady } from "./discord.js";
import { setupErrorHandlers } from "./error-handler.js";
import express from "express";
const app = express();
const PORT = process.env.PORT || 3000;
// import { WebSocketProvider, Contract } from "ethers";
// import { setupTransferListener } from "./events.js";

// ETH setup
// const provider = new WebSocketProvider(process.env.INFURA_WSS);
// const abi = [
//   "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
// ];
// const contract = new Contract(process.env.NFT_CONTRACT_ADDRESS, abi, provider);

// Route HTTP simple
app.get("/", (req, res) => {
  console.log(
    `APP GET "/" - ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
  );
  res.send("Hello from Koyeb!");
});

// Démarrage du serveur Express
app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} - ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
  );
});

eventBotReady(discordClient);
// Setup listeners and error handling
// setupTransferListener(discordClient, contract);
setupErrorHandlers(discordClient);
discordClient.login(process.env.DISCORD_BOT_TOKEN);
