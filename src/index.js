import "dotenv/config";
import { discordClient, eventBotReady } from "./discord.js";
import { setupErrorHandlers } from "./error-handler.js";
// import { WebSocketProvider, Contract } from "ethers";
// import { setupTransferListener } from "./events.js";

// ETH setup
// const provider = new WebSocketProvider(process.env.INFURA_WSS);
// const abi = [
//   "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
// ];
// const contract = new Contract(process.env.NFT_CONTRACT_ADDRESS, abi, provider);

eventBotReady(discordClient);
// Setup listeners and error handling
// setupTransferListener(discordClient, contract);
setupErrorHandlers(discordClient);
discordClient.login(process.env.DISCORD_BOT_TOKEN);
