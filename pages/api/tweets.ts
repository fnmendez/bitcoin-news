import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

import * as dynamodb from "~/libs/dynamodb";
import { sendMessage } from "~/libs/telegram";
import { headers } from "~/src/constants";
import * as instructions from "~/src/instructions";
import { Tweet } from "~/src/types";
import { CHUNK_ARRAY } from "~/src/utils";

async function saveTweets(tweets: Tweet[]) {
  const batches = CHUNK_ARRAY(tweets, 25);
  for (const batch of batches) {
    const params = {
      RequestItems: {
        "bitcoin-tweets": batch.map((t) => ({
          PutRequest: {
            Item: {
              tweet_id: t.id,
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

async function getTweets(tweets: Tweet[]) {
  const params = {
    RequestItems: {
      "bitcoin-tweets": {
        Keys: tweets.map((n) => ({ ["tweet_id"]: n.link })),
      },
    },
  };
  const res = await dynamodb.batchGet(params);
  return res.Responses?.["bitcoin-tweets"] || [];
}

async function filterTweet(tweets: Tweet[]): Promise<Tweet[]> {
  const alreadyStoredTweetLinks = (await getTweets(tweets)).map((n) => n["source_url"]);
  const filtered = tweets.filter((n) => !alreadyStoredTweetLinks?.includes(n.link));
  console.log(`got: ${tweets.length}\nfresh: ${filtered.length}`);
  return filtered;
}

async function sendTweetToTelegram(tweets: Tweet[]): Promise<boolean> {
  const ordered = tweets.sort((a, b) => a.timestamp - b.timestamp);
  const batches = CHUNK_ARRAY(ordered, 8);
  let success = true;
  for (const batch of batches) {
    const text = batch.map((n) => n.text).join("\n\n");
    const ok = await sendMessage(text);
    success = success && ok;
    await new Promise((r) => setTimeout(r, 800));
  }
  return success;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let tweets: Tweet[] = [];

    for (const sourceOfTweet of Object.values(instructions)) {
      let newsFromSource: Tweet[] = [];
      for (const link of sourceOfTweet.links) {
        const { data: html } = await axios.get(link.url, { headers });
        const newsFromLink = sourceOfTweet.cheerioProcess(html);
        newsFromSource = [...newsFromSource, ...newsFromLink];
      }
      tweets = [...tweets, ...newsFromSource];
    }

    const filteredTweet = await filterTweet(tweets);

    if (filteredTweet && filteredTweet.length) {
      await saveTweets(filteredTweet);
      const success = await sendTweetToTelegram(filteredTweet);
      if (success) {
        console.log("Successfully sent fresh tweets to registered chats");
      } else {
        console.log("Error sending tweets to registered chats");
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
