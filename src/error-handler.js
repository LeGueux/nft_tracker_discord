import { getThreadIdForToken } from "./discord.js";

export async function sendStatusMessage(discordClient, content) {
  try {
    const thread = await discordClient.channels.fetch(
      getThreadIdForToken("default"),
    );
    if (thread?.isTextBased()) {
      await thread.send(content);
    }
  } catch (e) {
    console.error("Erreur d'envoi du message de statut :", e);
  }
}

export function setupErrorHandlers(discordClient) {
  process.on("uncaughtException", async (err) => {
    console.error("Uncaught Exception:", err);
    await sendStatusMessage(discordClient, `💥 Exception : \`${err.message}\``);
    process.exit(1);
  });

  process.on("unhandledRejection", async (reason) => {
    console.error("Unhandled Rejection:", reason);
    await sendStatusMessage(discordClient, `💥 Rejection : \`${reason}\``);
    process.exit(1);
  });
}
