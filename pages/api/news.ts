import { AWSError } from "aws-sdk";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { PromiseResult } from "aws-sdk/lib/request";
import axios from "axios";
import dedent from "dedent";
import { NextApiRequest, NextApiResponse } from "next";

import * as dynamodb from "~/libs/dynamodb";
import { sendMessage } from "~/libs/telegram";
import { headers } from "~/src/constants";
import * as instructions from "~/src/instructions";
import { News } from "~/src/types";
import { CHUNK_ARRAY, SAFE_TITLE_KEY } from "~/src/utils";

async function saveBitcoinNews(news: News[]) {
  if (!news?.length) return;
  const batches = CHUNK_ARRAY(news, 25);
  const promises: Promise<PromiseResult<DocumentClient.BatchWriteItemOutput, AWSError>>[] = [];
  for (const batch of batches) {
    const paramsLink = {
      RequestItems: {
        "bitcoin-news": batch.map((n) => ({
          PutRequest: {
            Item: {
              source_url: n.link,
              title: n.title,
              keywords: n.keywords,
              source_name: n.sourceName,
              published_at: n.publishedAt,
              timestamp: n.timestamp,
            },
          },
        })),
      },
    };
    const paramsTitle = {
      RequestItems: {
        "bitcoin-news-titles": batch.map((n) => ({
          PutRequest: {
            Item: {
              title: SAFE_TITLE_KEY(n.title),
              source_url: n.link,
              keywords: n.keywords,
              source_name: n.sourceName,
              published_at: n.publishedAt,
              timestamp: n.timestamp,
            },
          },
        })),
      },
    };
    promises.push(dynamodb.batchWrite(paramsLink));
    promises.push(dynamodb.batchWrite(paramsTitle));
  }
  await Promise.all(promises.map((p) => p.catch(console.log)));
}

async function getBitcoinNewsByLink(news: News[]) {
  if (!news?.length) return [];
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

async function getBitcoinNewsByTitle(news: News[]) {
  if (!news?.length) return [];
  const params = {
    RequestItems: {
      "bitcoin-news-titles": {
        Keys: news.map((n) => ({ ["title"]: SAFE_TITLE_KEY(n.title) })),
      },
    },
  };
  const res = await dynamodb.batchGet(params);
  return res.Responses?.["bitcoin-news-titles"] || [];
}

async function filterNews(news: News[]): Promise<News[]> {
  const toFilterLink = (await getBitcoinNewsByLink(news)).map((n) => n["source_url"]);
  const filteredByLink = news.filter((n) => !toFilterLink.includes(n.link));
  const toFilterTitle = (await getBitcoinNewsByTitle(filteredByLink)).map((n) => n["title"]);
  const filteredByTitleAndLink = filteredByLink.filter((n) => !toFilterTitle.includes(n.title));
  console.log(dedent`
    got: ${news.length}
    link filter: ${filteredByLink.length}
    title filter: ${filteredByTitleAndLink.length}
    `);
  return filteredByTitleAndLink;
}

async function sendNewsToTelegram(news: News[]): Promise<boolean> {
  const ordered = news.sort((a, b) => a.timestamp - b.timestamp);
  const batches = CHUNK_ARRAY(ordered, 8);
  let success = true;
  for (const batch of batches) {
    const text = batch.map((n) => n.text).join("\n\n");
    const ok = await sendMessage(text);
    success = success && ok;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return success;
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
      const success = await sendNewsToTelegram(filteredNews);
      if (success) {
        console.log("Successfully sent fresh news to registered chats");
      } else {
        console.log("Error sending news to registered chats");
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
