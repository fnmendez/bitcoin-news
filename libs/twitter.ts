import axios from "axios";
import dedent from "dedent";
import moment from "moment";
import qs from "qs";

import { Tweet } from "~/src/types";
import { TIMESTAMP } from "~/src/utils";

const usernames = ["michael_saylor", "jack", "APompliano", "BTC_Archive", "DocumentingBTC", "_francomendez"];

const bearer =
  "AAAAAAAAAAAAAAAAAAAAAGnCNQEAAAAAMgPuzRN2bItHVM%2BkoIT%2FtDAsBAA%3DANuSy5zBTcsMZPuIVyPEDlGj2vxXvWqzW2VIgxHZBNoTVMqzOw";
const client = axios.create({
  baseURL: `https://api.twitter.com/2`,
  headers: { ["authorization"]: `Bearer ${bearer}` },
});

type TweetsSearchRecentResponse = {
  data: { id: string; author_id: string; created_at: string; text: string }[];
  includes: { users: { name: string; id: string; username: string }[] };
  meta: { newest_id: string; oldest_id: string; result_count: number; next_token: string };
};

export const getRecentTweets = async (): Promise<Tweet[]> => {
  const startTime = moment();
  startTime.add(-6, "hours");
  try {
    const res = await client.get(
      `tweets/search/recent?${qs.stringify({
        ["query"]: usernames.map((u) => `from:${u}`).join(" OR "),
        ["tweet.fields"]: "created_at",
        ["expansions"]: "author_id",
        ["user.fields"]: "created_at",
        ["max_results"]: "24",
        ["start_time"]: startTime.format(),
      })}`,
    );
    const {
      data: tweets,
      includes: { users },
    } = res.data as TweetsSearchRecentResponse;
    const userMap = users.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.id]: { ["name"]: cur.name, ["username"]: cur.username },
      }),
      {},
    );
    const parsedTweets = tweets.map((tweet) => ({
      ["tweet_id"]: tweet.id,
      ["author"]: userMap[tweet.author_id]["name"],
      ["username"]: userMap[tweet.author_id]["username"],
      ["text"]: tweet.text,
      ["link"]: `https://twitter.com/${userMap[tweet.author_id]["username"]}/status/${tweet.id}`,
      ["date"]: tweet.created_at,
      ["timestamp"]: TIMESTAMP(tweet.created_at),
    }));

    return parsedTweets;
  } catch (err) {
    console.log(`Error getting tweets: ${err}`);
    throw new Error(`Error getting tweets: ${err}`);
  }
};

export const tweetToMessage = (tweet: Tweet): string => {
  const message = dedent`
    <b>${tweet.author}</b>
    ${tweet.text}
    ${tweet.date} - <a href='${tweet.link}'>See on Twitter</a>
  `;
  return message;
};