import moment, { Moment } from "moment";

import { SOURCE_NAME_BLACKLIST, TITLE_BLACKLIST, TITLE_BLACKLIST_SETS } from "~/src/constants";

export const CHUNK_ARRAY = (arr: any[], n): any[][] => {
  let i = 0;
  const ret: any[] = [];
  while (i < arr.length) {
    ret.push(arr.slice(i, i + n));
    i += n;
  }
  return ret;
};

export const SAFE_HTML = (text: string) => {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&/g, "&amp;");
};

export const UTC = () => {
  return moment().utc();
};

export const HUMAN_DATE = (time: string | undefined, td?: number): string => {
  if (!time) return "?";
  const datetime = moment(time);
  if (td) datetime.add(td, "hours");
  return datetime.format("YYYY/MM/DD");
};

export const HUMAN_TIME = (time: string | undefined, td?: number): string => {
  if (!time) return "?";
  const datetime = moment(time);
  if (td) datetime.add(td, "hours");
  return datetime.format("YYYY/MM/DD, HH:mm:ss");
};

export const TODAY_TIME = (time: string | undefined, td?: number): string => {
  if (!time) return "?";
  const datetime = moment(time);
  if (td) datetime.add(td, "hours");
  return datetime.format("HH:mm:ss");
};

export const CHILE_TIME = (raw = false) => {
  const datetime = moment().utc();
  datetime.add(-4, "hours");
  return raw ? datetime : datetime.format("YYYY/MM/DD, HH:mm:ss");
};

export const DATABASE_TIME = (time: string | undefined): string =>
  time ? moment(time).format("dddd D MMMM, HH:mm:ss") : "?";

export const TIMESTAMP = (time: string | undefined): number => (time ? new Date(time).getTime() : new Date().getTime()); // fake

export const SAFE_TITLE_KEY = (key: string) => key.substr(0, 330);

export const SILENT_TIME = (): boolean => {
  const chileTime = CHILE_TIME(true);
  const hours = (chileTime as Moment).hours();
  if (hours < 8 || 22 < hours) {
    return true;
  } else {
    return false;
  }
};

export const BLACKLISTED = (sourceName: string, title: string): boolean => {
  const titleLowerCased = title.toLowerCase();
  return (
    SOURCE_NAME_BLACKLIST.includes(sourceName.toLowerCase()) ||
    TITLE_BLACKLIST.some((bannedWord) => titleLowerCased.includes(bannedWord)) ||
    TITLE_BLACKLIST_SETS.some((set) => set.every((w) => titleLowerCased.includes(w)))
  );
};
