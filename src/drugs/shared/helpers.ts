// 共用的數字處理小工具
// 因為很多藥物的 calculate 函數都會用到，拉出來共用

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
