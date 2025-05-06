export const IS_TEST_MODE = process.env.MODE === "TEST";
export const MAX_NOTIFICATIONS = 3;
export const ALIVE_PING_INTERVAL =
  parseInt(process.env.ALIVE_PING_INTERVAL || "10", 10) * 60 * 1000;
