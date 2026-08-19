interface BarChartProps {
  labels: string[]
  values: number[]
  color: string
  yMax?: number
  referenceLine?: { value: number; label: string }
  valueFormat?: (v: number) => string
}

const WIDTH = 400
const HEIGHT = 180
const PADDING = 32
// Extra headroom above the plot area itself, reserved for the reference
// line's label - keeping that label at a fixed row here (rather than
// hugging the line's own height) means it never collides with a bar's
// value label even when that bar's value sits right next to the line.
const TOP_PADDING = 26

export function BarChart({ labels, values, color, yMax, referenceLine, valueFormat }: BarChartProps) {
  const max = yMax ?? Math.max(...values, referenceLine?.value ?? 0) * 1.05
  const barWidth = (WIDTH - PADDING * 2) / values.length - 8
  const plotBottom = HEIGHT - PADDING
  const toY = (v: number) => plotBottom - (v / max) * (plotBottom - TOP_PADDING)
  const fmt = valueFormat ?? ((v: number) => v.toFixed(3))

  return (
    <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ maxWidth: 700, display: 'block' }}>
      <line x1={PADDING} y1={plotBottom} x2={WIDTH - PADDING} y2={plotBottom} stroke="#374151" />
      {referenceLine && (
        <>
          <line
            x1={PADDING}
            y1={toY(referenceLine.value)}
            x2={WIDTH - PADDING}
            y2={toY(referenceLine.value)}
            stroke="#ef4444"
            strokeDasharray="4 4"
          />
          <text x={WIDTH - PADDING} y={12} fontSize={10} fill="#ef4444" textAnchor="end">
            {referenceLine.label}
          </text>
        </>
      )}
      {values.map((v, i) => {
        const x = PADDING + i * ((WIDTH - PADDING * 2) / values.length) + 4
        const y = toY(v)
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={plotBottom - y} fill={color} />
            <text x={x + barWidth / 2} y={y - 4} fontSize={10} fill="#374151" textAnchor="middle">
              {fmt(v)}
            </text>
            <text x={x + barWidth / 2} y={HEIGHT - PADDING + 14} fontSize={11} fill="#6b7280" textAnchor="middle">
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
