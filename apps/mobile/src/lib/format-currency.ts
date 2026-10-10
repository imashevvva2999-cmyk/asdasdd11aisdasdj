/** Thousands-separated KGS amount, no currency unit — every call site appends its own "сом". */
export function formatKgsAmount(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}
