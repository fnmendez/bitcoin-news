import dedent from "dedent";
import moment from "moment";
import qs from "qs";

import { headers } from "~/src/constants";
import { Tweet } from "~/src/types";
import { TIMESTAMP, TODAY_TIME } from "~/src/utils";

const bearer = process.env.TWITTER_BEARER_TOKEN;

// https://developer.twitter.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-recent
// https://developer.twitter.com/en/docs/twitter-api/tweets/search/integrate/build-a-query

const usernames = [
  "michael_saylor",
  "jack",
  "APompliano",
  "BTC_Archive",
  "DocumentingBTC",
  "Bloqport",
  "danheld",
  "saifedean",
  "elonmusk",
  "100trillionUSD",
  "nobsbitcoin",
  "SenLummis",
  "dergigi",
  "BitcoinMagazine",
];
const custom = [
  "from:whale_alert #BTC",
  "from:zerohedge bitcoin",
  "from:nayibbukele bitcoin",
  "from:RicardoBSalinas bitcoin",
];
const query = `(-is:reply (${usernames.map((u) => `from:${u}`).join(" OR ")})) OR ${custom.join(" OR ")}`;

type TweetsSearchRecentResponse = {
  data: { id: string; author_id: string; created_at: string; text: string }[];
  includes: { users: { name: string; id: string; username: string }[] };
  meta: { newest_id: string; oldest_id: string; result_count: number; next_token: string };
};

export const getRecentTweets = async (): Promise<Tweet[]> => {
  const startTime = moment();
  startTime.add(-20, "minutes");
  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${qs.stringify({
        ["query"]: query,
        ["tweet.fields"]: "created_at",
        ["expansions"]: "author_id",
        ["user.fields"]: "created_at",
        ["max_results"]: "50",
        ["start_time"]: startTime.format(),
      })}`,
      { method: "GET", headers: { ["authorization"]: `Bearer ${bearer}`, ...headers } },
    );
    const body = await res.json();
    if (!body?.data || !body.includes?.users) {
      return [];
    }
    const {
      data: tweets,
      includes: { users },
    } = body as TweetsSearchRecentResponse;
    const userMap = users.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.id]: { ["name"]: cur.name, ["username"]: cur.username },
      }),
      {},
    );
    const parsedTweets = tweets.map((tweet) => ({
      ["uid"]: tweet.id,
      ["author"]: userMap[tweet.author_id]["name"],
      ["username"]: userMap[tweet.author_id]["username"],
      ["text"]: tweet.text,
      ["link"]: `https://twitter.com/${userMap[tweet.author_id]["username"]}/status/${tweet.id}`,
      ["date"]: tweet.created_at,
      ["timestamp"]: TIMESTAMP(tweet.created_at),
    }));

    return parsedTweets;
  } catch (err: any) {
    console.log(`[tweets] Error getting tweets: <pre>${err}</pre>`);
    throw new Error(`Error getting tweets: ${err}`);
  }
};

export const tweetToMessageTelegram = (tweet: Tweet): string => {
  const message = dedent`
    🐦 <b>${tweet.author}</b> @${tweet.username}
    ${tweet.text.replace(/\n\n/g, "\n")}
    ${TODAY_TIME(tweet.date, -3)} - <a href='${tweet.link}'>See on Twitter</a>
  `;
  return message;
};

export const tweetToMessageSlack = (tweet: Tweet): string => {
  const message = dedent`
    🐦 *${tweet.author}* @${tweet.username}
    ${tweet.text.replace(/\n\n/g, "\n")}
    ${TODAY_TIME(tweet.date, -3)} - <${tweet.link}|See on Twitter>
  `;
  return message;
};
