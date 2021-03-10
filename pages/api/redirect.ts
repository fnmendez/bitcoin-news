import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = req.query["url"] as string;
  res.redirect(301, url);
}
