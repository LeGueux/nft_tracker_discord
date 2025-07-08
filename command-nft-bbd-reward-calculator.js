import { buildNftBBDRewardCalculatorEmbed } from "./embeds.js";
import { getAllCardsByModelId } from "./cometh-api.js";

export async function handleGetBBDRewardCalculatorForModel(modelId) {
    console.log(`handleGetBBDRewardCalculatorForModel for modelId ${modelId}`);
    const dataCard = await getAllCardsByModelId(modelId ,true);
    console.log(`handleGetBBDRewardCalculatorForModel for modelId ${modelId} - Cards found: ${dataCard.total}`);

    return await buildNftBBDRewardCalculatorEmbed(modelId, dataCard.assets);
}