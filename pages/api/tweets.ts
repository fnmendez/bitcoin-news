import { NextApiRequest, NextApiResponse } from "next";

import * as dynamodb from "~/libs/dynamodb";
import { sendMessage } from "~/libs/telegram";
import { getRecentTweets, tweetToMessage } from "~/libs/twitter";
import { Tweet } from "~/src/types";
import { CHUNK_ARRAY } from "~/src/utils";

async function saveTweets(tweets: Tweet[]) {
  if (!tweets?.length) return;
  const batches = CHUNK_ARRAY(tweets, 25);
  for (const batch of batches) {
    const params = {
      RequestItems: {
        "bitcoin-tweets": batch.map((t) => ({
          PutRequest: {
            Item: {
              tweet_id: t.tweet_id,
              link: t.link,
              text: t.text,
              author: t.author,
              username: t.username,
              date: t.date,
              timestamp: t.timestamp,
            } as Tweet,
          },
        })),
      },
    };
    await dynamodb.batchWrite(params);
  }
}

async function getTweets(tweetIds: string[]) {
  if (!tweetIds?.length) return [];
  const params = {
    RequestItems: {
      "bitcoin-tweets": {
        Keys: tweetIds.map((tweetId) => ({ ["tweet_id"]: tweetId })),
      },
    },
  };
  const res = await dynamodb.batchGet(params);
  return res.Responses?.["bitcoin-tweets"] || [];
}

async function filterTweets(tweets: Tweet[]): Promise<Tweet[]> {
  const alreadyStoredTweetsIds = (await getTweets(tweets.map((t) => t["tweet_id"]))).map((t) => t["tweet_id"]);
  const filtered = tweets.filter((t) => !alreadyStoredTweetsIds.includes(t["tweet_id"]));
  console.log(`got: ${tweets.length}\nfresh: ${filtered.length}`);
  return filtered;
}

async function sendTweetsToTelegram(tweets: Tweet[]): Promise<boolean> {
  const ordered = tweets.sort((a, b) => a.timestamp - b.timestamp);
  const batches = CHUNK_ARRAY(ordered, 3);
  let success = true;
  for (const batch of batches) {
    const text = batch.map((t) => tweetToMessage(t)).join("\n\n");
    const ok = await sendMessage(text, false);
    success = success && ok;
    await saveTweets(batch);
    await new Promise((r) => setTimeout(r, 800));
  }
  return success;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const recentTweets: Tweet[] = await getRecentTweets();

    const filteredTweets = await filterTweets(recentTweets);

    if (filteredTweets && filteredTweets.length) {
      const success = await sendTweetsToTelegram(filteredTweets);
      if (success) {
        console.log("Successfully sent fresh tweets to registered chats");
      } else {
        console.log("Error sending tweets to registered chats");
        throw new Error("Error sending tweets to registered chats");
      }
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    return res.end("ok");
  } catch (e) {
    const err = e as Error;
    console.error(err);

    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html");
    return res.end(err.stack);
  }
}
