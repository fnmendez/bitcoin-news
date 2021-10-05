import cheerio from "cheerio";
import { NextApiRequest, NextApiResponse } from "next";

import { batchWrite as dynamodbBatchWrite, batchGet as dynamodbBatchGet } from "~/libs/dynamodb";
// import * as slack from "~/libs/slack";
import * as telegram from "~/libs/telegram";
import { headers } from "~/src/constants";
import { Instruction, News } from "~/src/types";
import { HUMAN_TIME, SAFE_HTML as SH, TIMESTAMP, BLACKLISTED, TODAY_TIME } from "~/src/utils";
import { CHUNK_ARRAY, SAFE_TITLE_KEY } from "~/src/utils";

async function saveBitcoinNews(news: News[]) {
  if (!news?.length) return;
  const batches = CHUNK_ARRAY(news, 25);
  const promises: Promise<any>[] = [];
  for (const batch of batches) {
    const params = {
      RequestItems: {
        "bitcoin-news-titles-2": batch.map((n) => ({
          PutRequest: {
            Item: {
              title: SAFE_TITLE_KEY(n.title),
              source_url: n.link,
              keywords: n.keywords,
              source_name: n.sourceName,
              published_at: n.publishedAt,
              timestamp: n.timestamp,
              live_until: Number(String(new Date().getTime()).slice(0, -3)) + 86_400, // one day
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
      "bitcoin-news-titles-2": { Keys: news.map((n) => ({ ["title"]: SAFE_TITLE_KEY(n.title) })) },
    },
  };
  const res = await dynamodbBatchGet(params);
  return res.Responses?.["bitcoin-news-titles-2"] || [];
}

async function filterNews(news: News[]): Promise<News[]> {
  const storedNews = await getBitcoinNews(news);
  const toFilter = storedNews.map((n) => n["title"]);
  const filtered = news.filter((n) => !toFilter.includes(n.link) && !toFilter.includes(n.title));
  console.log(`[news] got: ${news.length} fresh: ${filtered.length}`);
  // telegram.sendLog({
  //   text: `[news] got: ${news.length} fresh: ${filtered.length}`,
  //   silent: false,
  // });
  return filtered;
}

async function sendNewsToTelegramAndSlack(news: News[]): Promise<boolean> {
  const ordered = news.sort((a, b) => a.timestamp - b.timestamp);
  const batches = CHUNK_ARRAY(ordered, 8);
  let success = true;
  for (const batch of batches) {
    const text = batch.map((n) => n.text).join("\n\n");
    // const textSlack = batch.map((n) => n.textSlack).join("\n\n");
    const okTelegram = await telegram.sendMessage({ text: text, silent: true });
    // const okSlack = await slack.sendMessage(textSlack);
    success = success && okTelegram; // && okSlack;
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
      await sendNewsToTelegramAndSlack(filteredNews);
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    return res.end("ok");
  } catch (err: any) {
    telegram.sendLog({ text: `[news] Error on handler: ${err.name}\n\`\`\`${err.stack}\`\`\``, silent: false });
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html");
    return res.end(err.stack);
  }
}

const GOOGLE_NEWS: Instruction = {
  link: "https://news.google.com/search?q=Bitcoin%20when%3A1h&hl=en-US&gl=US&ceid=US%3Aen",
  cheerioProcess: (html: string, keywords: string[]): News[] => {
    const news: News[] = [];
    const $ = cheerio.load(html);
    $("h3").each(function (this: any) {
      const title = $(this)?.text()?.trim();
      const sourceName = $(this).next("div").children("div").children("a").text().trim();
      const sourceUrl = `https://news.google.com${$(this).children("a").attr("href")?.slice(1)}`;
      const time = $(this).next("div").children("div").children("time").attr("datetime");
      const humanTime = HUMAN_TIME(time, -4);
      const todayTime = TODAY_TIME(time, -4);
      if (title.match(/(Bitcoin|bitcoin|BTC|btc)/g) && !BLACKLISTED(sourceName, title)) {
        news.push({
          title,
          sourceName,
          link: sourceUrl,
          publishedAt: humanTime,
          timestamp: TIMESTAMP(time),
          text: `📰 <b>${SH(title)}</b>\n${SH(sourceName)}\n${SH(todayTime)} - <a href='${sourceUrl}'>Read article</a>`,
          textSlack: `📰 *${SH(title)}*\n${SH(sourceName)}\n${SH(todayTime)} - <${sourceUrl}|Read article>`,
          keywords,
        });
      }
    });
    return news;
  },
};
