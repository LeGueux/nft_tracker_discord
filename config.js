export const IS_TEST_MODE = process.env.MODE === 'TEST';
export const DOLZ_API_INTERVAL_SEC = parseInt(process.env.DOLZ_API_INTERVAL || '10', 10) * 60; // en secondes
export const DOLZ_API_INTERVAL_MS = DOLZ_API_INTERVAL_SEC * 1000; // en ms
export const ALIVE_PING_INTERVAL = parseInt(process.env.ALIVE_PING_INTERVAL || '10', 10) * 60 * 1000;
export const NFT_LIST_BY_SEASON = {
    1: new Set(['g0001', 'g0003', 'g0004', 'g0029', 'g0024', 'g0007', 'g0009', 'g0011', 'g0012', 'g0074', 'g0015', 'g0013']),
    2: new Set(['g0062', 'g0083', 'g0088', 'g0017', 'g0049', 'g0056', 'g0087', 'g0040', 'g0082', 'g0078', 'g0030', 'g0071']),
    3: new Set(['g0113', 'g0092', 'g0077', 'g0103', 'g0100', 'g0089', 'g0115', 'g0075', 'g0099', 'g0106', 'g0079', 'g0002']),
    4: new Set(['g0021', 'g0020', 'g0005', 'g0014', 'g0019', 'g0050', 'g0111', 'g0073', 'g0090', 'g0109', 'g0016', 'g0108']),
    5: new Set(['g0043', 'g0095', 'g0102', 'g0076', 'g0031', 'g0114', 'g0064', 'g0026', 'g0081', 'g0044', 'g0048', 'g0033']),
    6: new Set(['g0065', 'g0051', 'g0052', 'g0063', 'g0104', 'g0058', 'g0118', 'g0061', 'g0066', 'g0116', 'g0053', 'g0119']),
    7: new Set(['g0125', 'g0047', 'g0105', 'g0126', 'g0067', 'g0128', 'g0122', 'g0129', 'g0123', 'g0127', 'g0121', 'g0130']),
    8: new Set(['g0137', 'g0124', 'g0143', 'g0141', 'g0140', 'g0144', 'g0132', 'g0133', 'g0138', 'g0139', 'g0142', 'g0134']),
    'Off-Season': new Set(['g0034', 'g0039', 'g0028', 'g0054', 'g0096', 'g0091']),
};
export const RARITY_ORDER = ['Limited', 'Rare', 'Epic', 'Legendary', 'Not Revealed'];