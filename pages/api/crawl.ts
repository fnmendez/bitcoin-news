import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

import * as dynamodb from "~/libs/dynamodb";
import { headers } from "~/src/constants";
import * as instructions from "~/src/instructions";
import { News } from "~/src/types";
import { chunkArray } from "~/src/utils";

async function saveBitcoinNews(news: News[]) {
  const batches = chunkArray(news, 25);
  for (const batch of batches) {
    const params = {
      RequestItems: {
        "bitcoin-news": batch.map((n) => ({
          PutRequest: {
            Item: {
              source_url: n.link,
              title: n.title,
              source_name: n.sourceName,
              published_at: n.publishedAt,
              timestamp: n.timestamp,
            },
          },
        })),
      },
    };
    await dynamodb.batchWrite(params);
  }
}

async function getBitcoinNews(news: News[]) {
  const params = {
    RequestItems: {
      "bitcoin-news": {
        Keys: news.map((n) => ({ ["source_url"]: n.link })),
      },
    },
  };
  const res = await dynamodb.batchGet(params);
  return res.Responses?.["bitcoin-news"] || [];
}

async function filterNews(news: News[]): Promise<News[]> {
  const alreadyStoredNewsLinks = (await getBitcoinNews(news)).map((n) => n["source_url"]);
  const filtered = news.filter((n) => !alreadyStoredNewsLinks?.includes(n.link));
  console.log(`got: ${news.length}\nfresh: ${filtered.length}`);
  return filtered;
}

async function sendNewsToTelegram(news: News[]): Promise<boolean> {
  return Boolean(news);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let news: News[] = [];

    for (const sourceOfNews of Object.values(instructions)) {
      let newsFromSource: News[] = [];
      for (const link of sourceOfNews.links) {
        const { data: html } = await axios.get(link.url, { headers });
        const newsFromLink = sourceOfNews.cheerioProcess(html);
        newsFromSource = [...newsFromSource, ...newsFromLink];
      }
      news = [...news, ...newsFromSource];
    }

    const filteredNews = await filterNews(news);

    if (filteredNews && filteredNews.length) {
      await saveBitcoinNews(filteredNews);
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
