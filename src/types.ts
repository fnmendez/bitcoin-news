export type News = {
  timestamp: number;
  sourceName: string;
  publishedAt: string;
  link: string;
  title: string;
  text: string;
  textSlack: string;
  keywords: string[];
};

export type Tweet = {
  uid: string;
  author: string;
  username: string;
  text: string;
  date: string;
  link: string;
  timestamp: number;
};

export type CompanySearch = {
  name: string;
  url: string;
};

export type CompanyStatus = "disclosed" | "quiet" | "error";

export type CompanyResult = CompanySearch & { status: CompanyStatus };

export type ResultToTextInput = {
  cd: CompanyResult[];
  cq: CompanyResult[];
  ce: CompanyResult[];
  shouldAlert: boolean;
};

export type Instruction = {
  link: string;
  cheerioProcess: any;
};
