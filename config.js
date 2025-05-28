export const IS_TEST_MODE = process.env.MODE === "TEST";
export const COMETH_API_INTERVAL = parseInt(process.env.COMETH_API_INTERVAL || "10", 10) * 60 * 1000;
export const ALIVE_PING_INTERVAL = parseInt(process.env.ALIVE_PING_INTERVAL || "10", 10) * 60 * 1000;
export const WALLETS = new Map([
  [process.env.FRANCK_ADDRESS.toLowerCase(), 'Franck'],
  [process.env.NICO_ADDRESS.toLowerCase(), 'Nico'],
  ['0x1b07d3308123bfe02e84958742fb4ca26dc3119e'.toLowerCase(), 'Scaro'],
  ['0x67392C26F2CFB11e20e5492e6Fa791cD81a413B2'.toLowerCase(), 'arkenciel (1)'],
  ['0xd94298c2160ad8603216a3fa7a233ec609b2494d'.toLowerCase(), 'arkenciel (2)'],
  ['0x5dd217E92f8a4394D2781aC5B86CabCA23FC1214'.toLowerCase(), 'Alkasyn'],
  ['0xB37AE997d01E7E7bFE6E721c791c956DfC3cc856'.toLowerCase(), 'Norse'],
]);