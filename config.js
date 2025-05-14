export const IS_TEST_MODE = process.env.MODE === "TEST";
export const DOLZ_PRICE = 0.0062;
export const COMETH_API_INTERVAL =
  parseInt(process.env.COMETH_API_INTERVAL || "10", 10) * 60 * 1000;
export const ALIVE_PING_INTERVAL =
  parseInt(process.env.ALIVE_PING_INTERVAL || "10", 10) * 60 * 1000;
