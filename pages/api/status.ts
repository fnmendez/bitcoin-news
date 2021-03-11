import { NextApiRequest, NextApiResponse } from "next";

import { CHILE_TIME, SILENT_TIME } from "~/src/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html");
  return res.end(`${CHILE_TIME()} : silent? ${SILENT_TIME()}`);
}
