import { sendStatusMessage } from '../shared/error-handler.js';
import dns from 'dns';

export async function getPolymarketTraderLeaderboard(discordClient, address, orderBy = 'PNL') {
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
    } catch (error) {
        console.error('Erreur API getPolymarketTraderLeaderboard:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur API getPolymarketTraderLeaderboard : \`${error}\``,
        );
    }
}

export async function getUserPositions(discordClient, address) {
    console.log(`getUserPositions à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    // https://docs.polymarket.com/api-reference/core/get-current-positions-for-a-user
    var apiUrl = `https://data-api.polymarket.com/positions?sortBy=CURRENT&sortDirection=DESC&user=${address}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erreur API getUserPositions:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur API getUserPositions : \`${error}\``,
        );
    }
}

export async function getPolymarketAnalytics(discordClient) {
    console.log(`getPolymarketAnalytics à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    var apiUrl = `https://polymarketanalytics.com/api/overall-counts`;
    dns.setDefaultResultOrder('ipv4first');

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erreur API getPolymarketAnalytics:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur API getPolymarketAnalytics : \`${error}\``,
        );
    }
}

export async function getPolymarketAthAtlPnL(discordClient, address) {
    console.log(`getPolymarketAthAtlPnL à ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    var apiUrl = `https://user-pnl-api.polymarket.com/user-pnl?user_address=${address}&interval=all&fidelity=12h`;
    dns.setDefaultResultOrder('ipv4first');

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
        });

        const data = await response.json();
        // data is expected to be an array of objects with a 'p' field
        if (Array.isArray(data) && data.length > 0) {
            // compute max and min PnL values
            let maxP = -Infinity;
            let minP = Infinity;
            data.forEach(item => {
                if (item && typeof item.p === 'number') {
                    if (item.p > maxP) maxP = item.p;
                    if (item.p < minP) minP = item.p;
                }
            });

            const n = data.length;
            let diffLastDay = null;
            let diffLastWeek = null;
            let diffLastMonth = null;
            if (n >= 1) {
                const last = data[n - 1];
                const tenthDailyFromEnd = n >= 2 ? data[n - 3] : null;
                if (last && typeof last.p === 'number' && tenthDailyFromEnd && typeof tenthDailyFromEnd.p === 'number') {
                    diffLastDay = last.p - tenthDailyFromEnd.p;
                }
                const tenthWeeklyFromEnd = n >= 14 ? data[n - 15] : null;
                if (last && typeof last.p === 'number' && tenthWeeklyFromEnd && typeof tenthWeeklyFromEnd.p === 'number') {
                    diffLastWeek = last.p - tenthWeeklyFromEnd.p;
                }
                const tenthMonthlyFromEnd = n >= 60 ? data[n - 60] : null;
                if (last && typeof last.p === 'number' && tenthMonthlyFromEnd && typeof tenthMonthlyFromEnd.p === 'number') {
                    diffLastMonth = last.p - tenthMonthlyFromEnd.p;
                }
            }

            return {
                maxP,
                minP,
                diffLastDay,
                diffLastWeek,
                diffLastMonth,
                // original array included in case callers need raw data
                raw: data,
            };
        } else {
            // no data or unexpected format
            return { maxP: 0, minP: 0, diffLastDay: null, diffLastWeek: null, diffLastMonth: null, raw: data };
        }
    } catch (error) {
        console.error('Erreur API getPolymarketAthAtlPnL:', error);
        await sendStatusMessage(
            discordClient,
            `💥 <@${process.env.FRANCK_DISCORD_USER_ID}> Erreur API getPolymarketAthAtlPnL : \`${error}\``,
        );
    }
}