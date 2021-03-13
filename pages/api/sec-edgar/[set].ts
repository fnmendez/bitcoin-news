import dedent from "dedent";
import { NextApiRequest, NextApiResponse } from "next";

import { getBrowser } from "~/libs/browser";
import { sendLog, sendMessage } from "~/libs/telegram";
import { CompanyResult, CompanySearch, ResultToTextInput } from "~/src/types";
import { CHILE_TIME, CHUNK_ARRAY } from "~/src/utils";

const TIMEOUT_FOR_EACH_RESULT = 1500; // ms
const CONCURRENCY = 2;
const LOCAL = false; // !process.env.VERCEL;

const getSecEdgarResults = async ({ name, url }): Promise<CompanyResult> => {
  try {
    const browser = await getBrowser(LOCAL);
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

const resultsToText = ({ cd, cq, shouldAlert }: ResultToTextInput): string => {
  if (!shouldAlert) {
    return dedent`
      <b>SEC CHECK</B>: No disclosure found
      ${cq.length ? cq.map(TEXTIFY).join(" ") : "-"}
      ${CHILE_TIME()} - <a href='https://www.sec.gov/about.shtml'>SEC EDGAR</a>
    `.trim();
  } else {
    return dedent`
      🚨 <b>SEC CHECK 🚨 ATTENTION</b>
      🏆 ${cd.map(TEXTIFY).join(" ")}

      (found \`bitcoin\` in reports)
      ${CHILE_TIME()} - <a href='https://www.sec.gov/about.shtml'>SEC EDGAR</a>

      ${shouldAlert ? "<b>always verify</b>" : ""}
    `.trim();
  }
};

async function sendResultsToTelegram(companiesResults: CompanyResult[]) {
  const compDiscl = companiesResults.filter((cr) => cr.status === "disclosed") || [];
  const compQuiet = companiesResults.filter((cr) => cr.status === "quiet") || [];
  const compError = companiesResults.filter((cr) => cr.status === "error") || [];

  // SET ALERT MODE
  const ALERT_ACTIVATED = Boolean(compDiscl.length); // (unknown disclosure occurred)

  const text = resultsToText({ cd: compDiscl, cq: compQuiet, ce: compError, shouldAlert: ALERT_ACTIVATED });
  let success = false;
  if (ALERT_ACTIVATED) {
    for (let i = 0; i < 8; i++) {
      const ok = await sendMessage({ text: text, silent: false });
      success = success || ok;
      await new Promise((r) => setTimeout(r, 1500));
    }
  } else {
    success = await sendLog({ text: text, silent: true });
  }
  if (!success) {
    await sendLog({ text: "[sec-edgar] Error sending message", silent: false });
    throw new Error("Error sending message");
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { set } = req.query;
    let companies: CompanySearch[];
    if (set === "1") {
      companies = companies1;
    } else if (set === "2") {
      companies = companies2;
    } else if (set === "3") {
      companies = companies3;
    } else {
      console.log("Invalid company type");
      throw new Error("Invalid company type");
    }

    let results: CompanyResult[] = [];
    const companiesBatches = CHUNK_ARRAY(companies, CONCURRENCY);
    for (const companyBatch of companiesBatches) {
      const promises: Promise<CompanyResult>[] = [];
      for (const company of companyBatch) {
        promises.push(getSecEdgarResults(company));
      }
      results = [...results, ...(await Promise.all(promises))];
    }

    await sendResultsToTelegram(results);

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

const companies1: CompanySearch[] = [
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
];

const companies2: CompanySearch[] = [
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
  {
    name: "MSFT",
    url:
      "https://www.sec.gov/edgar/search/#/q=bitcoin&dateRange=30d&ciks=0000789019&entityName=MICROSOFT%2520CORP%2520(MSFT)%2520(CIK%25200000789019)",
  },
];

const companies3: CompanySearch[] = [
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
