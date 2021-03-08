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
  author: string;
  username: string;
  text: string;
  date: string;
  link: string;
  timestamp: number;
};
