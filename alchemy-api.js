export async function getDolzBalance(address) {
    const dolzBalance = await getEvmTokenAccountBalance(
        process.env.POLYGON_CHAIN_ID,
        process.env.TOKEN_DOLZ_POL_CONTRACT_ADDRESS,
        address
    );
    return dolzBalance || 0;
};

export async function getEvmTokenAccountBalance(chainId, contractaddress, address) {
    // Get ERC20-Token Account Balance for TokenContractAddress
    // https://docs.etherscan.io/api-reference/endpoint/tokenbalance
    const apiUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=tokenbalance&contractaddress=${contractaddress}&address=${address}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY}`;
    console.log(apiUrl);

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (data.status && data.status == '1' && data.result) {
            return parseInt(parseInt(data.result) / 1e18);
        } else {
            console.error('API getEvmTokenAccountBalance Pas de données:');
            return 0;
        }
    } catch (e) {
        console.error(e.message);
        console.error('API getEvmTokenAccountBalance Erreur:');
        return 0;
    }
}
