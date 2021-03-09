import moment from "moment";

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

export const HUMAN_TIME = (time: string | undefined): string =>
  time ? moment(time).format("YYYY/MM/DD, HH:mm:ss") : "?";

export const DATABASE_TIME = (time: string | undefined): string =>
  time ? moment(time).format("dddd D MMMM, HH:mm:ss") : "?";

export const TIMESTAMP = (time: string | undefined): number => (time ? new Date(time).getTime() : new Date().getTime()); // fake

export const SAFE_TITLE_KEY = (key: string) => key.substr(0, 330);
