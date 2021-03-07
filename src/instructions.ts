import cheerio from "cheerio";
import moment from "moment";

import { News } from "~/src/types";

type Instruction = {
  links: { name: string; url: string; keywords: ["bitcoin"] }[];
  cheerioProcess: any;
};

export const CNBC: Instruction = {
  links: [
    {
      name: "GOOGLE:BITCOIN:6h",
      url: "https://news.google.com/search?q=bitcoin%20when%3A6h&hl=en-US&gl=US&ceid=US%3Aen",
      keywords: ["bitcoin"],
    },
  ],
  cheerioProcess: (html: string, keywords: string[]): News[] => {
    const news: News[] = [];
    const $ = cheerio.load(html);
    $("h3").each(function (this: any) {
      const title = $(this)?.text()?.trim();
      const sourceName = $(this).next("div").next("div").children("div").children("a").text().trim();
      const sourceUrl = `https://news.google.com${$(this).children("a").attr("href")}`;
      const time = $(this).next("div").next("div").children("div").children("time").attr("datetime");
      news.push({
        title,
        sourceName,
        link: sourceUrl,
        publishedAt: time ? moment(time).format("dddd D MMMM, HH:mm:ss") : "?",
        timestamp: time ? new Date(time).getTime() : NaN,
        text: `${title}\n${sourceName}\n${sourceUrl}\n${moment(time).format("dddd D MMMM, HH:mm:ss")}`,
        keywords,
      });
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
