/** Nepali digit + compact count formatting (port of the reference utils). */
export const toNepaliDigits = (n: number | string): string =>
  n.toString().replace(/\d/g, (d) => "०१२३४५६७८९"[Number(d)]);

export const formatCompactNepaliCount = (n: number): string => {
  if (n < 1000) return toNepaliDigits(n);

  const kValue = n / 1000;
  const kFormatted = Number.isInteger(kValue)
    ? kValue.toFixed(0)
    : kValue.toFixed(1);
  if (Number(kFormatted) < 1000) {
    return `${toNepaliDigits(kFormatted)}K`;
  }

  const mValue = n / 1_000_000;
  return `${toNepaliDigits(mValue.toFixed(1))}M`;
};
