import { buildNftBBDRewardCalculatorEmbed } from "./embeds.js";
import { searchCardsByCriterias } from "./cometh-api.js";

export async function handleGetBBDRewardCalculatorForModel(modelId) {
    console.log(`handleGetBBDRewardCalculatorForModel for modelId ${modelId}`);
    const dataCard = await searchCardsByCriterias({
        attributes: [{ 'Card Number': [modelId] }],
        onSaleOnly: true,
        limit: 2000,
    });
    console.log(`handleGetBBDRewardCalculatorForModel for modelId ${modelId} - Cards found: ${dataCard.total}`);

    return await buildNftBBDRewardCalculatorEmbed(modelId, dataCard.assets);
}