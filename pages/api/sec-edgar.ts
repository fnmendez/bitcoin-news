import dedent from "dedent";
import { NextApiRequest, NextApiResponse } from "next";
import puppeteer from "puppeteer";

import { sendMessage } from "~/libs/telegram";
import { CompanyResult, CompanySearch, OverallResult, ResultToTextInput } from "~/src/types";
import { CHILE_TIME, CHUNK_ARRAY } from "~/src/utils";

// companies at eof

const TIMEOUT_FOR_EACH_RESULT = 1200; // ms
const CONCURRENCY = 2;

const getSecEdgarResults = async ({ name, url }): Promise<CompanyResult> => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const selectors = "td.filetype a.preview-file";
    await page.waitForSelector(selectors, { timeout: TIMEOUT_FOR_EACH_RESULT });
    const docs = await page.evaluate((rs) => {
      const anchors = Array.from(document.querySelectorAll(rs));
      return anchors.map((anchor) => {
        const title = anchor.textContent.trim();
        return `${title} - ${anchor.href}`;
      });
    }, selectors);
    await browser.close();

    return { name, url, status: docs && docs.length ? "disclosed" : "quiet" };
  } catch (err) {
    console.log("err.name");
    console.log(err.name);
    if (err.name === "TimeoutError") {
      return { name, url, status: "quiet" };
    }
    console.log(`Error for company ${name}: ${err}`);
    return { name, url, status: "error" };
  }
};

const TEXTIFY = (c: CompanyResult) => `<a href='${c.url}'>${c.name}</a>`;
const resultsToText = ({ overall, cd, cq, ce, shouldAlert }: ResultToTextInput): string => {
  console.log("overall", overall);
  console.log("cd", cd);
  console.log("cq", cq);
  console.log("ce", ce);
  console.log("shouldAlert", shouldAlert);
  return dedent`
    ${shouldAlert ? "\xF0\x9F\x9A\xA8 ATTENTION \xF0\x9F\x9A\xA8 (read by yourself)" : ""}

    <a href='${known[0].url}'>SEC EDGAR CHECK</a>
    \xF0\x9F\x8F\x86  ${[...known.map(TEXTIFY), ...cd.map(TEXTIFY)].join(" ")}
    ??  ${cq.length && cq.map(TEXTIFY).join(" ")}
    err ${ce.length && ce.map(TEXTIFY).join(" ")}

    \xF0\x9F\x8F\x86 = found \`bitcoin\` in reports
    ${CHILE_TIME()} - SEC EDGAR</a>

    ${shouldAlert ? "\xF0\x9F\x9A\xA8 ATTENTION \xF0\x9F\x9A\xA8 (read by yourself)" : ""}
  `.trim();
};
async function sendResultsToTelegram(companiesResults: CompanyResult[], overall: OverallResult) {
  const companiesDisclosed = companiesResults.filter((cr) => cr.status === "disclosed") || [];
  const companiesQuiet = companiesResults.filter((cr) => cr.status === "quiet") || [];
  const companiesError = companiesResults.filter((cr) => cr.status === "error") || [];

  // SET ALERT MODE
  const ALERT_ACTIVATED = Boolean(companiesDisclosed.length); // (unknown disclosure occurred)

  const text = resultsToText({
    overall,
    cd: companiesDisclosed,
    cq: companiesQuiet,
    ce: companiesError,
    shouldAlert: ALERT_ACTIVATED,
  });
  let success = false;
  if (ALERT_ACTIVATED) {
    for (let i = 0; i < 3; i++) {
      const ok = await sendMessage(text, false, false);
      success = success || ok;
      await new Promise((r) => setTimeout(r, 1500));
    }
  } else {
    success = await sendMessage(text, false, true);
  }
  if (!success) {
    throw new Error("Error sending message");
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { t } = req.query;
    let companies: CompanySearch[];
    if (!t || t === "1") {
      companies = companiesHot;
    } else if (t === "2") {
      companies = companiesOther;
    } else {
      console.log("Invalid company type");
      throw new Error("Invalid company type");
    }

    const overall: OverallResult = { disclosed: 0, quiet: 0, error: 0, total: 0 };
    let results: CompanyResult[] = [];
    const companiesBatches = CHUNK_ARRAY(companies, CONCURRENCY);
    for (const companyBatch of companiesBatches) {
      const promises: Promise<CompanyResult>[] = [];
      for (const company of companyBatch) {
        promises.push(getSecEdgarResults(company));
      }
      results = [...results, ...(await Promise.all(promises))];
    }

    for (const result of results) {
      overall["total"] += 1;
      overall[result.status] += 1;
    }

    await sendResultsToTelegram(results, overall);

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

const known: CompanyResult[] = [
  {
    name: "TSLA",
    status: "disclosed",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001318605&entityName=Tesla%252C%2520Inc.%2520(TSLA)%2520(CIK%25200001318605)",
  },
];

const companiesHot: CompanySearch[] = [
  {
    name: "AAPL",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0000320193&entityName=Apple%2520Inc.%2520(AAPL)%2520(CIK%25200000320193)",
  },
  {
    name: "GOOG",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001652044&entityName=Alphabet%2520Inc.%2520(GOOG%252C%2520GOOGL)%2520(CIK%25200001652044)",
  },
  {
    name: "AMZN",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001018724&entityName=AMAZON%2520COM%2520INC%2520(AMZN)%2520(CIK%25200001018724)",
  },
  {
    name: "FB",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001326801&entityName=Facebook%2520Inc%2520(FB)%2520(CIK%25200001326801)",
  },
  {
    name: "ORCL",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001341439&entityName=ORACLE%2520CORP%2520(ORCL)%2520(CIK%25200001341439)",
  },
  {
    name: "TWTR",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001418091&entityName=TWITTER%252C%2520INC.%2520(TWTR)%2520(CIK%25200001418091)",
  },
  {
    name: "NFLX",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001065280&entityName=NETFLIX%2520INC%2520(NFLX)%2520(CIK%25200001065280)",
  },
];

const companiesOther: CompanySearch[] = [
  {
    name: "VISA",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001403161&entityName=VISA%2520INC.%2520(V)%2520(CIK%25200001403161)",
  },
  {
    name: "WMT",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0000104169&entityName=Walmart%2520Inc.%2520(WMT)%2520(CIK%25200000104169)",
  },
  {
    name: "DIS",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001744489&entityName=Walt%2520Disney%2520Co%2520(DIS)%2520(CIK%25200001744489)",
  },
  {
    name: "JNJ",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0000200406&entityName=JOHNSON%2520%2526%2520JOHNSON%2520(JNJ)%2520(CIK%25200000200406)",
  },
  {
    name: "MSFT",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0000789019&entityName=MICROSOFT%2520CORP%2520(MSFT)%2520(CIK%25200000789019)",
  },
  {
    name: "TENC",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001293451&entityName=Tencent%2520Holdings%2520Ltd%2520(TCTZF%252C%2520TCEHY)%2520(CIK%25200001293451)",
  },
  {
    name: "BABA",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0001577552&entityName=Alibaba%2520Group%2520Holding%2520Ltd%2520(BABA)%2520(CIK%25200001577552)",
  },
];
