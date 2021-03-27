export const headers = {
  ["Accept"]: "text/html,application/xhtml+xml,application/xml",
  ["Cache-Control"]: "no-cache",
  ["Pragma"]: "no-cache",
  ["User-Agent"]:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36",
};

// must match
export const SOURCE_NAME_BLACKLIST = [
  "coingeek",
  "fintech zoom",
  "ambcrypto",
  "ambcrypto news",
  "beincrypto",
  "btcmanager",
  "cointelegraph",
  "inside bitcoins",
  "obn",
  "cryptonewsz",
];

// must match any of the words to be omitted
export const TITLE_BLACKLIST = [
  "ripple",
  "xrp",
  "cointelegraph",
  "nft",
  "price analysis",
  "price prediction",
  "bitcoin cash",
  "bitcoin sv",
  "scam",
  "gambling",
  "argo blockchain",
  "quantum comp",
  "stolen",
];

// must match every word on the set to be omitted
export const TITLE_BLACKLIST_SETS = [
  ["tesla", "accept", "bitcoin"],
  ["ethereum", "overtake", "bitcoin"],
  ["bitcoin", "ban", "could", "be"],
];
