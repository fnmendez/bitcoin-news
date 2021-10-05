import moment from "moment";
import qs from "qs";

import { headers } from "~/src/constants";
import { HUMAN_DATE, HUMAN_TIME } from "~/src/utils";

const bearer = process.env.TWITTER_BEARER_TOKEN;

// https://developer.twitter.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-recent
// https://developer.twitter.com/en/docs/twitter-api/tweets/search/integrate/build-a-query

// from exchanges to cold storage
// const query = `from:whale_alert #BTC -"from unknown wallet" ("to unknown wallet" OR "to #Xapo")`;

// from unknown to unknown
const query = `from:whale_alert #BTC "from unknown wallet to unknown wallet"`;

type TweetsSearchRecentResponse = {
  data: { id: string; author_id: string; created_at: string; text: string }[];
  includes: { users: { name: string; id: string; username: string }[] };
  meta: { newest_id: string; oldest_id: string; result_count: number; next_token: string };
};

export const getWithdrawalAmount = async (index: number, daysInterval = 5): Promise<number> => {
  const startTime = moment();
  const endTime = moment();
  startTime.add(-3, "days");
  // endTime.add(-3, "days");
  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${qs.stringify({
        ["query"]: query,
        ["tweet.fields"]: "created_at",
        ["expansions"]: "author_id",
        ["user.fields"]: "created_at",
        ["max_results"]: "50",
        ["start_time"]: startTime.format(),
        // ["end_time"]: endTime.format(),
      })}`,
      { method: "GET", headers: { ["authorization"]: `Bearer ${bearer}`, ...headers } },
    );
    const body = await res.json();
    if (!body?.data || !body.includes?.users) return NaN;
    const { data: tweets } = body as TweetsSearchRecentResponse;
    const withdrawals = tweets.map((tweet) => ({
      ["bitcoins"]: Number(tweet.text.match(/[0-9]+,?[0-9]+/)?.[0]?.replace(/,/g, "")),
      ["date"]: HUMAN_DATE(tweet.created_at),
    }));
    console.log("withdrawals");
    console.log(withdrawals);
    const lessInExchanges = withdrawals.reduce((acc, cur) => acc + cur["bitcoins"], 0);
    return lessInExchanges;
  } catch (err: any) {
    console.log(`[tweets] Error getting tweets: <pre>${err}</pre>`);
    throw new Error(`Error getting tweets: ${err}`);
  }
};

export const run = async () => {
  const a = await getWithdrawalAmount(0);
  console.log(a);
};
