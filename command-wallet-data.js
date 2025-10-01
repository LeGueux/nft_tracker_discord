import { buildWalletDataEmbed } from './embeds.js';

export async function handleGetDataForWallet(address, withFullDetails = false) {
    console.log(`handleGetDataForWallet for wallet ${address}`);
    return await buildWalletDataEmbed(address, withFullDetails);
}