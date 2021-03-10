import cheerio from "cheerio";
import dedent from "dedent";

import { News } from "~/src/types";
import { DATABASE_TIME, HUMAN_TIME, SAFE_HTML as SH, TIMESTAMP } from "~/src/utils";

const sourceNameBlacklist = ["CoinGeek"];

function blacklistedSource(sourceName: string) {
  return sourceNameBlacklist.includes(sourceName);
}

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
      if (title.match(/(Bitcoin|bitcoin|BTC|btc)/g) && !blacklistedSource(sourceName)) {
        news.push({
          title,
          sourceName,
          link: sourceUrl,
          publishedAt: DATABASE_TIME(time),
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

// export const SEC_GOV: Instruction = {
//   links: [
//     {
//       name: "SEC:TSLA",
//       url:
//         "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001318605&entityName=Tesla%252C%2520Inc.%2520(TSLA)%2520(CIK%25200001318605)",
//     },
//     {
//       name: "SEC:AAPL",
//       url:
//         "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0000320193&entityName=Apple%2520Inc.%2520(AAPL)%2520(CIK%25200000320193)",
//     },
//     {
//       name: "SEC:GOOG",
//       url:
//         "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001652044&entityName=Alphabet%2520Inc.%2520(GOOG%252C%2520GOOGL)%2520(CIK%25200001652044)",
//     },
//   ],
//   cheerioProcess: console.log,
// };
