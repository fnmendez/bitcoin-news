import cheerio from "cheerio";
import dedent from "dedent";

import { News } from "~/src/types";
import { HUMAN_TIME, SAFE_HTML as SH, TIMESTAMP, BLACKLISTED } from "~/src/utils";

type Instruction = {
  links: { name: string; url: string; keywords: string[] }[];
  cheerioProcess: any;
};

export const GOOGLE_NEWS: Instruction = {
  links: [
    {
      name: "GOOGLE:BITCOIN:1h",
      url: "https://news.google.com/search?q=Bitcoin%20when%3A1h&hl=en-US&gl=US&ceid=US%3Aen",
      keywords: ["bitcoin"],
    },
  ],
  cheerioProcess: (html: string, keywords: string[]): News[] => {
    const news: News[] = [];
    const $ = cheerio.load(html);
    $("h3").each(function (this: any) {
      const title = $(this)?.text()?.trim();
      const sourceName = $(this).next("div").next("div").children("div").children("a").text().trim();
      const sourceUrl = `https://news.google.com${$(this).children("a").attr("href")?.slice(1)}`;
      const time = $(this).next("div").next("div").children("div").children("time").attr("datetime");
      const humanTime = HUMAN_TIME(time, -3);
      if (title.match(/(Bitcoin|bitcoin|BTC|btc)/g) && !BLACKLISTED(sourceName, title)) {
        news.push({
          title,
          sourceName,
          link: sourceUrl,
          publishedAt: humanTime,
          timestamp: TIMESTAMP(time),
          text: dedent`
          <b>${SH(title)}</b>
          ${SH(sourceName)}
          ${SH(humanTime)} - <a href='${sourceUrl}'>Read more</a>`,
          keywords,
        });
      }
    });
    return news;
  },
};
