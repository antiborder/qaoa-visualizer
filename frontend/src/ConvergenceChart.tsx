import type { TrajectoryPoint } from './types'

const WIDTH = 500
const HEIGHT = 200
const PADDING = 30

interface Series {
  label: string
  color: string
  points: TrajectoryPoint[]
}

interface ConvergenceChartProps {
  series: Series[]
  optimalCutValue: number
}

export function ConvergenceChart({ series, optimalCutValue }: ConvergenceChartProps) {
  const maxIterations = Math.max(1, ...series.map((s) => s.points.length))
  const yMax = Math.max(optimalCutValue, ...series.flatMap((s) => s.points.map((p) => p.expectedCutValue)))
  const yMin = Math.min(0, ...series.flatMap((s) => s.points.map((p) => p.expectedCutValue)))

  const toX = (i: number) => PADDING + (i / (maxIterations - 1 || 1)) * (WIDTH - PADDING * 2)
  const toY = (v: number) => HEIGHT - PADDING - ((v - yMin) / (yMax - yMin || 1)) * (HEIGHT - PADDING * 2)

  return (
    <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ maxWidth: 520 }}>
      <line x1={PADDING} y1={toY(optimalCutValue)} x2={WIDTH - PADDING} y2={toY(optimalCutValue)}
        stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
      <text x={WIDTH - PADDING} y={toY(optimalCutValue) - 4} fontSize={10} fill="#ef4444" textAnchor="end">
        最適値 {optimalCutValue}
      </text>

      <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} stroke="#374151" />
      <line x1={PADDING} y1={PADDING} x2={PADDING} y2={HEIGHT - PADDING} stroke="#374151" />
      <text x={PADDING} y={HEIGHT - 8} fontSize={10} fill="#6b7280">0</text>
      <text x={WIDTH - PADDING} y={HEIGHT - 8} fontSize={10} fill="#6b7280" textAnchor="end">
        iteration {maxIterations}
      </text>

      {series.map((s) => (
        <polyline
          key={s.label}
          points={s.points.map((p, i) => `${toX(i)},${toY(p.expectedCutValue)}`).join(' ')}
          fill="none"
          stroke={s.color}
          strokeWidth={2}
        />
      ))}
    </svg>
  )
}
