// Shared icon set, ported from the mockup's inline SVG sprite.
// Usage: <Icon name="box" />
const PATHS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  box: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  down: "M12 4v14M6 12l6 6 6-6",
  up: "M12 20V6M6 12l6-6 6 6",
  swap: "M4 8h14l-4-4M20 16H6l4 4",
  sliders: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0",
  search: "M20 20l-4-4",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0",
  plus: "M12 5v14M5 12h14",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  kanban: "",
  user: "M4 21a8 8 0 0 1 16 0",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  check: "M5 12l5 5L20 7",
  x: "M6 6l12 12M18 6L6 18",
  alert: "M12 3l10 18H2zM12 10v4M12 17.5v.01",
  chev: "M6 9l6 6 6-6",
  right: "M9 6l6 6-6 6",
  mail: "M3 7l9 6 9-6",
  lock: "M8 11V7a4 4 0 0 1 8 0v4",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z",
  edit: "M4 20h4L19 9l-4-4L4 16z",
  filter: "M3 5h18l-7 8v6l-4 2v-8z",
  clock: "M12 7v5l3 2",
};

const CIRCLES = {
  search: { cx: 11, cy: 11, r: 7 },
  user: { cx: 12, cy: 8, r: 4 },
  eye: { cx: 12, cy: 12, r: 3 },
  clock: { cx: 12, cy: 12, r: 9 },
};

const RECTS = {
  mail: { x: 3, y: 5, width: 18, height: 14, rx: 2 },
  lock: { x: 4, y: 11, width: 16, height: 10, rx: 2 },
};

export default function Icon({ name, size = 16, style, className = "i" }) {
  const c = CIRCLES[name];
  const r = RECTS[name];
  return (
    <svg
      className={className}
      style={{ width: size, height: size, flex: "none", ...style }}
      viewBox="0 0 24 24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {r && <rect x={r.x} y={r.y} width={r.width} height={r.height} rx={r.rx} />}
      {c && <circle cx={c.cx} cy={c.cy} r={c.r} />}
      {PATHS[name] && <path d={PATHS[name]} />}
    </svg>
  );
}
