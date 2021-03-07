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
