import { NextApiRequest, NextApiResponse } from "next";

import { run } from "~/libs/scarcity";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await run();

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    return res.end("ok");
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html");
    return res.end(err.stack);
  }
}
