/**
 * Catmull-Rom-to-Bezier smoothing for the Analytics trend chart — produces
 * the same kind of smooth curve the Stitch mockup hand-authored, from real
 * (mock) data points instead of a fixed path string.
 */
function toXY(values: number[], width: number, height: number): { x: number; y: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * (height * 0.85) - height * 0.08,
  }));
}

export function smoothAreaPath(values: number[], width: number, height: number): { linePath: string; areaPath: string } {
  const pts = toXY(values, width, height);
  if (pts.length === 0) return { linePath: '', areaPath: '' };
  if (pts.length === 1) {
    const p = pts[0]!;
    const linePath = `M ${p.x},${p.y} L ${p.x},${p.y}`;
    return { linePath, areaPath: `${linePath} L ${p.x},${height} L ${p.x},${height} Z` };
  }

  let d = `M ${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  const last = pts[pts.length - 1]!;
  const first = pts[0]!;
  return { linePath: d, areaPath: `${d} L ${last.x},${height} L ${first.x},${height} Z` };
}
