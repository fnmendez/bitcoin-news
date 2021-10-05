import { NextApiRequest, NextApiResponse } from "next";

import * as dynamodb from "~/libs/dynamodb";
import { sendLog, sendMessage } from "~/libs/telegram";
import { getRecentTweets, tweetToMessageTelegram } from "~/libs/twitter";
import { Tweet } from "~/src/types";
import { CHUNK_ARRAY } from "~/src/utils";

const DEV = false; // process.env.VERCEL_ENV !== "production";

async function saveTweets(tweets: Tweet[]) {
  if (!tweets?.length || DEV) return;
  const batches = CHUNK_ARRAY(tweets, 25);
  for (const batch of batches) {
    const params = {
      RequestItems: {
        "bitcoin-blacklist-2": batch.map((t) => ({
          PutRequest: {
            Item: { uid: t.uid, timestamp: t.timestamp } as Tweet,
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
      "bitcoin-blacklist-2": {
        Keys: tweetIds.map((tweetId) => ({ ["uid"]: tweetId })),
      },
    },
  };
  const res = await dynamodb.batchGet(params);
  return res.Responses?.["bitcoin-blacklist-2"] || [];
}

async function filterTweets(tweets: Tweet[]): Promise<Tweet[]> {
  const alreadyStoredTweetsIds = (await getTweets(tweets.map((t) => t["uid"]))).map((t) => t["uid"]);
  const filtered = tweets.filter((t) => !alreadyStoredTweetsIds.includes(t["uid"]));
  // sendLog({ text: `[tweets] got: ${tweets.length} fresh: ${filtered.length}`, silent: true });
  return filtered;
}

async function sendTweetsToTelegram(tweets: Tweet[]): Promise<boolean> {
  const ordered = tweets.sort((a, b) => a.timestamp - b.timestamp);
  const batches = CHUNK_ARRAY(ordered, 3);
  let success = true;
  for (const batch of batches) {
    const text = batch.map((t) => tweetToMessageTelegram(t)).join("\n\n");
    const ok = await sendMessage({ text: text, silent: true });
    if (ok) {
      await saveTweets(batch);
      await new Promise((r) => setTimeout(r, 800));
    }
    success = success && ok;
  }
  return success;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const recentTweets: Tweet[] = await getRecentTweets();

    const filteredTweets = await filterTweets(recentTweets);

    if (filteredTweets && filteredTweets.length) {
      await sendTweetsToTelegram(filteredTweets);
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    return res.end("ok");
  } catch (err: any) {
    sendLog({ text: `[tweets] Error on handler: ${err.name}\n<pre>${err.stack}</pre>`, silent: false });
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html");
    return res.end(err.stack);
  }
}
