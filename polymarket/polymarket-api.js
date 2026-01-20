import { sendStatusMessage } from '../shared/error-handler.js';

export async function getPolymarketTraderLeaderboard(address, orderBy = 'PNL') {
    console.log(`getPolymarketTraderLeaderboard à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    // https://docs.polymarket.com/api-reference/core/get-trader-leaderboard-rankings
    var apiUrl = `https://data-api.polymarket.com/v1/leaderboard?timePeriod=ALL&orderBy=${orderBy}&user=${address}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
        });

        const data = await response.json();
        // Example response:
        // [{
        //     "rank": "100000",
        //     "proxyWallet": "REPLACE_ME",
        //     "userName": "REPLACE_ME",
        //     "xUsername": "REPLACE_ME",
        //     "verifiedBadge": false,
        //     "vol": 8214.957908,
        //     "pnl": 156.57999995700402,
        //     "profileImage": "https://polymarket-upload.s3.us-east-2.amazonaws.com/profile-image-1809969-cdc9e161-8e13-4975-9f02-a62dc29cdfa9.jpg"
        // }]

        if (data.length == 1 && data[0].hasOwnProperty('rank')) {
            return data[0];
        } else {
            return "Erreur getPolymarketTraderLeaderboard: Pas de données";
        }
    } catch (e) {
        console.error('Erreur API getPolymarketTraderLeaderboard:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur API getPolymarketTraderLeaderboard : \`${error}\``,
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

export async function getPolymarketAnalytics() {
    console.log(`getPolymarketAnalytics à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    var apiUrl = `https://polymarketanalytics.com/api/overall-counts`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
        });

        const data = await response.json();
        return data;
    } catch (e) {
        console.error('Erreur API getPolymarketAnalytics:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur API getPolymarketAnalytics : \`${error}\``,
        );
    }
}