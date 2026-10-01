import { describeVisual, type VisualIcon } from "measure";
import styles from "./MeasureVisual.module.css";

interface Props {
  amount: number | null;
  unit: string | null;
  name: string;
  size?: number;
}

/**
 * Malzemenin renginde doldurulmuş SVG bardak/kaşık; kesirli miktarda kısmen dolu son ikon,
 * 6'dan fazlasında "× n". Katı malzemelerde terazi.
 */
export default function MeasureVisual({ amount, unit, name, size = 28 }: Props) {
  const v = describeVisual(amount, unit, name);
  if (v.icon === "none") return null;
  const icons = Array.from({ length: v.count }, (_, i) => (i === v.count - 1 ? v.lastFill : 1));
  return (
    <span className={styles.wrap} title={v.helper ?? undefined}>
      <span className={styles.icons} aria-hidden="true">
        {icons.map((fill, i) => (
          <Icon key={i} kind={v.icon} fill={fill} color={v.color} size={size} />
        ))}
        {v.multiplier != null && <span className={styles.mult}>× {String(v.multiplier).replace(".", ",")}</span>}
        <span className={styles.emoji}>{v.emoji}</span>
      </span>
      {v.helper && <span className={styles.helper}>{v.helper}</span>}
    </span>
  );
}

function Icon({ kind, fill, color, size }: { kind: VisualIcon; fill: number; color: string; size: number }) {
  const id = `clip-${kind}-${Math.round(fill * 100)}-${color.replace("#", "")}`;
  const common = { width: size, height: size, viewBox: "0 0 32 32", className: styles.svg };
  const stroke = "#6b5f57";

  switch (kind) {
    case "glass":
    case "teaglass":
    case "coffeecup": {
      // bardak gövdesi: üstü geniş altı dar yamuk
      const top = kind === "coffeecup" ? 10 : 4;
      const bottom = 29;
      const h = bottom - top;
      const fillY = bottom - h * fill;
      const path =
        kind === "teaglass"
          ? "M9 4 L23 4 L22 14 L24 20 L22 29 L10 29 L8 20 L10 14 Z"
          : kind === "coffeecup"
            ? "M6 10 L24 10 L22 29 L8 29 Z"
            : "M7 4 L25 4 L23 29 L9 29 Z";
      return (
        <svg {...common}>
          <defs>
            <clipPath id={id}>
              <path d={path} />
            </clipPath>
          </defs>
          <rect x="0" y={fillY} width="32" height={bottom - fillY} fill={color} clipPath={`url(#${id})`} />
          <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          {kind === "coffeecup" && <path d="M24 13 Q30 14 28 20 Q27 23 23 23" fill="none" stroke={stroke} strokeWidth="1.5" />}
        </svg>
      );
    }
    case "tablespoon":
    case "teaspoon": {
      const rx = kind === "tablespoon" ? 8 : 5.5;
      const ry = kind === "tablespoon" ? 6 : 4.5;
      const cy = 22;
      const topY = cy - ry;
      const fillY = cy + ry - 2 * ry * fill;
      return (
        <svg {...common}>
          <defs>
            <clipPath id={id}>
              <ellipse cx="14" cy={cy} rx={rx} ry={ry} />
            </clipPath>
          </defs>
          <rect x="0" y={fillY} width="32" height={cy + ry - fillY} fill={color} clipPath={`url(#${id})`} />
          <ellipse cx="14" cy={cy} rx={rx} ry={ry} fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d={`M${14 + rx - 1} ${topY + 2} L27 4`} stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    }
    case "scale":
      return (
        <svg {...common}>
          <rect x="4" y="18" width="24" height="10" rx="2" fill="#efe6d6" stroke={stroke} strokeWidth="1.5" />
          <path d="M8 18 Q16 8 24 18 Z" fill={color} stroke={stroke} strokeWidth="1.5" />
          <circle cx="16" cy="23" r="2.5" fill="#fff" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );
    case "piece":
      return (
        <svg {...common}>
          <defs>
            <clipPath id={id}>
              <circle cx="16" cy="16" r="11" />
            </clipPath>
          </defs>
          <rect x="0" y={27 - 22 * fill} width="32" height={22 * fill} fill={color} clipPath={`url(#${id})`} />
          <circle cx="16" cy="16" r="11" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "pack":
      return (
        <svg {...common}>
          <defs>
            <clipPath id={id}>
              <rect x="7" y="6" width="18" height="22" rx="2" />
            </clipPath>
          </defs>
          <rect x="0" y={28 - 22 * fill} width="32" height={22 * fill} fill={color} clipPath={`url(#${id})`} />
          <rect x="7" y="6" width="18" height="22" rx="2" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M7 11 L25 11" stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );
    case "pinch":
      return (
        <svg {...common}>
          <circle cx="12" cy="20" r="2" fill={color} stroke={stroke} strokeWidth="1" />
          <circle cx="18" cy="16" r="2" fill={color} stroke={stroke} strokeWidth="1" />
          <circle cx="21" cy="22" r="2" fill={color} stroke={stroke} strokeWidth="1" />
        </svg>
      );
    default:
      return null;
  }
}
