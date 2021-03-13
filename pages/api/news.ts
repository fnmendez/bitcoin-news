import { NextApiRequest, NextApiResponse } from "next";

import { batchWrite as dynamodbBatchWrite, batchGet as dynamodbBatchGet } from "~/libs/dynamodb";
import { sendLog, sendMessage } from "~/libs/telegram";
import { headers } from "~/src/constants";
import { GOOGLE_NEWS } from "~/src/instructions";
import { News } from "~/src/types";
import { CHUNK_ARRAY, SAFE_TITLE_KEY } from "~/src/utils";

async function saveBitcoinNews(news: News[]) {
  if (!news?.length) return;
  const batches = CHUNK_ARRAY(news, 25);
  const promises: Promise<any>[] = [];
  for (const batch of batches) {
    const params = {
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
    promises.push(dynamodbBatchWrite(params));
  }
  await Promise.all(promises.map((p) => p.catch(console.log)));
}

async function getBitcoinNews(news: News[]) {
  if (!news?.length) return [];
  const params = {
    RequestItems: {
      "bitcoin-news-titles": { Keys: news.map((n) => ({ ["title"]: SAFE_TITLE_KEY(n.title) })) },
    },
  };
  const res = await dynamodbBatchGet(params);
  return res.Responses?.["bitcoin-news-titles"] || [];
}

async function filterNews(news: News[]): Promise<News[]> {
  const storedNews = await getBitcoinNews(news);
  const toFilter = storedNews.map((n) => n["title"]);
  const filtered = news.filter((n) => !toFilter.includes(n.link) && !toFilter.includes(n.title));
  sendLog({
    text: `[news] got: ${news.length} fresh: ${filtered.length}`,
    silent: false,
  });
  return filtered;
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
