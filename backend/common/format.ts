export function formatNumber(n: number, digits = 0) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: digits,
  }).format(n);
}
export function formatMoney(n: number) {
  return `${formatNumber(n)} ₫`;
}
