export const chunkArray = (arr: any[], n): any[][] => {
  let i = 0;
  const ret: any[] = [];
  while (i < arr.length) {
    ret.push(arr.slice(i, i + n));
    i += n;
  }
  return ret;
};
