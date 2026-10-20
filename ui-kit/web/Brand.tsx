// Approved Mmusic wordmark: "Mmusic" + five coral bars. Presentational only; the app decides what wraps it (e.g. a link).
const BARS: Array<[height: number, durationMs: number, delayMs: number]> = [
  [0.45, 1100, 0],
  [0.75, 900, 180],
  [1, 1300, 90],
  [0.7, 1000, 320],
  [0.4, 1200, 140],
];

export function Brand() {
  return (
    <>
      <span className="t-headline-md">Mmusic</span>
      <span className="brand-bars" aria-hidden="true">
        {BARS.map(([h, d, delay], i) => (
          <i key={i} style={{ height: h * 20, ['--d' as string]: `${d}ms`, ['--delay' as string]: `${delay}ms` }} />
        ))}
      </span>
    </>
  );
}
