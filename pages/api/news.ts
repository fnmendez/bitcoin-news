import { NextApiRequest, NextApiResponse } from "next";

import * as dynamodb from "~/libs/dynamodb";
import { sendLog, sendMessage } from "~/libs/telegram";
import { headers } from "~/src/constants";
import { GOOGLE_NEWS } from "~/src/instructions";
import { News } from "~/src/types";
import { CHUNK_ARRAY, SAFE_TITLE_KEY } from "~/src/utils";

const DEV = process.env.VERCEL_ENV !== "production";

async function saveBitcoinNews(news: News[]) {
  if (!news?.length || DEV) return;
  const batches = CHUNK_ARRAY(news, 25);
  const promises: Promise<any>[] = [];
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
  sendLog({
    text: `[news] got: ${news.length} link filter: ${filteredByLink.length} title filter: ${filteredByTitleAndLink.length}`,
    silent: false,
  });
  return filteredByTitleAndLink;
}

async function sendNewsToTelegram(news: News[]): Promise<boolean> {
  const ordered = news.sort((a, b) => a.timestamp - b.timestamp);
  const batches = CHUNK_ARRAY(ordered, 8);
  let success = true;
  for (const batch of batches) {
    const text = batch.map((n) => n.text).join("\n\n");
    const ok = await sendMessage({ text: text, silent: true });
    success = success && ok;
    await saveBitcoinNews(batch);
    await new Promise((r) => setTimeout(r, 800));
  }
  return success;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const raw = await fetch(GOOGLE_NEWS.link, { method: "GET", headers });
    const html = await raw.text();
    const news = GOOGLE_NEWS.cheerioProcess(html);
    const filteredNews = await filterNews(news);
    if (filteredNews && filteredNews.length) {
      await sendNewsToTelegram(filteredNews);
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    return res.end("ok");
  } catch (err) {
    sendLog({ text: `[news] Error on handler: ${err.name}\n\`\`\`${err.stack}\`\`\``, silent: false });
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html");
    return res.end(err.stack);
  }
}
