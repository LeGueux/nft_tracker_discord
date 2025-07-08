import { buildWalletDataEmbed } from "./embeds.js";

export async function handleGetDataForWallet(address) {
    return await buildWalletDataEmbed(address);
}