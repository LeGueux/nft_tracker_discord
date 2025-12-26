import { sendStatusMessage } from '../shared/error-handler.js';

export async function getPolymarketPositionsBalance(address) {
    console.log(`getPolymarketPositionsBalance à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    // https://docs.polymarket.com/api-reference/core/get-total-value-of-a-users-positions
    var apiUrl = `https://data-api.polymarket.com/value?user=${address}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
        });

        const data = await response.json();
        if (data.length == 1 && data[0].value) {
            var balance = parseFloat(data[0].value);
            return balance;
        } else {
            return "Erreur getPolymarketPositionsBalance: Pas de données";
        }
    } catch (e) {
        console.error('Erreur API getPolymarketPositionsBalance:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur API getPolymarketPositionsBalance : \`${error}\``,
        );
    }
}

export async function getUserPositions(address) {
    console.log(`getUserPositions à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    // https://docs.polymarket.com/api-reference/core/get-current-positions-for-a-user
    var apiUrl = `https://data-api.polymarket.com/positions?sortBy=CURRENT&sortDirection=DESC&user=${address}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
        });

        const data = await response.json();
        return data;
    } catch (e) {
        console.error('Erreur API getUserPositions:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur API getUserPositions : \`${error}\``,
        );
    }
}
