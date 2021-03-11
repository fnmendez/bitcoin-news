export type News = {
  timestamp: number;
  sourceName: string;
  publishedAt: string;
  link: string;
  title: string;
  text: string;
  keywords: string[];
};

export type Tweet = {
  tweet_id: string;
  author: string;
  username: string;
  text: string;
  date: string;
  link: string;
  timestamp: number;
};

export type OverallResult = {
  disclosed: number;
  quiet: number;
  error: number;
  total: number;
};

export type CompanySearch = {
  name: string;
  url: string;
};

export type CompanyStatus = "disclosed" | "quiet" | "error";

export type CompanyResult = CompanySearch & { status: CompanyStatus };

export type ResultToTextInput = {
  overall: OverallResult;
  cd: CompanyResult[];
  cq: CompanyResult[];
  ce: CompanyResult[];
  shouldAlert: boolean;
};
