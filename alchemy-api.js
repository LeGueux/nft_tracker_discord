export async function getDolzBalance(address) {
    const ALCHEMY_URL = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const rpcData = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
            {
                to: process.env.TOKEN_DOLZ_POL_CONTRACT_ADDRESS,
                data: `0x70a08231000000000000000000000000${address.toLowerCase().replace(/^0x/, "")}`,
            },
            "latest",
        ],
    };

    try {
        const response = await fetch(ALCHEMY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rpcData),
        });

        const json = await response.json();
        const hex = json.result;
        const rawBalance = parseInt(hex, 16);
        const formattedBalance = rawBalance / 1e18; // DOLZ a 18 décimales

        // console.log(`Solde DOLZ pour ${address} : ${formattedBalance}`);
        return parseInt(formattedBalance);
    } catch (error) {
        console.error("Erreur lors de la récupération du solde DOLZ :", error);
        return 0;
    }
};