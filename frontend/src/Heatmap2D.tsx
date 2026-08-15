import * as THREE from 'three'
import type { LandscapeResult, TrajectoryPoint } from './types'

const WIDTH = 400
const HEIGHT = 400

export interface TrajectoryOverlay {
  label: string
  color: string
  points: TrajectoryPoint[]
}

interface Heatmap2DProps {
  landscape: LandscapeResult
  trajectories?: TrajectoryOverlay[]
  startPoint?: { gamma: number; beta: number }
  onSelectPoint?: (gamma: number, beta: number) => void
}

const LOW_COLOR = new THREE.Color('#64748b')
const HIGH_COLOR = new THREE.Color('#22c55e')

function toScreenX(gamma: number) {
  return (gamma / (Math.PI * 2)) * WIDTH
}
function toScreenY(beta: number) {
  return HEIGHT - (beta / Math.PI) * HEIGHT
}

export function Heatmap2D({ landscape, trajectories = [], startPoint, onSelectPoint }: Heatmap2DProps) {
  const { gammaValues, betaValues, expectedCutValues, bestOnGrid } = landscape
  const flat = expectedCutValues.flat()
  const minV = Math.min(...flat)
  const maxV = Math.max(...flat)
  const range = maxV - minV || 1

  const cellW = WIDTH / gammaValues.length
  const cellH = HEIGHT / betaValues.length

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WIDTH + 40} ${HEIGHT + 30}`}
      style={{ maxWidth: 420, cursor: onSelectPoint ? 'crosshair' : undefined }}
      onClick={(e) => {
        if (!onSelectPoint) return
        const svg = e.currentTarget
        const rect = svg.getBoundingClientRect()
        const px = ((e.clientX - rect.left) / rect.width) * (WIDTH + 40) - 30
        const py = ((e.clientY - rect.top) / rect.height) * (HEIGHT + 30)
        const gamma = Math.min(Math.max((px / WIDTH) * Math.PI * 2, 0), Math.PI * 2)
        const beta = Math.min(Math.max(((HEIGHT - py) / HEIGHT) * Math.PI, 0), Math.PI)
        onSelectPoint(gamma, beta)
      }}
    >
      <g transform="translate(30, 0)">
        {gammaValues.map((_, i) =>
          betaValues.map((_, j) => {
            const value = expectedCutValues[i][j]
            const t = (value - minV) / range
            const color = LOW_COLOR.clone().lerp(HIGH_COLOR, t)
            const y = HEIGHT - (j + 1) * cellH
            return (
              <rect
                key={`${i}-${j}`}
                x={i * cellW}
                y={y}
                width={cellW + 0.5}
                height={cellH + 0.5}
                fill={`rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})`}
              />
            )
          }),
        )}

        {trajectories.map((traj) => (
          <g key={traj.label}>
            <polyline
              points={traj.points.map((p) => `${toScreenX(p.gamma)},${toScreenY(p.beta)}`).join(' ')}
              fill="none"
              stroke={traj.color}
              strokeWidth={2}
              opacity={0.9}
            />
            {traj.points.map((p, i) => (
              <circle
                key={i}
                cx={toScreenX(p.gamma)}
                cy={toScreenY(p.beta)}
                r={i === traj.points.length - 1 ? 4 : 1.5}
                fill={traj.color}
              />
            ))}
          </g>
        ))}

        {startPoint && (
          <circle
            cx={toScreenX(startPoint.gamma)}
            cy={toScreenY(startPoint.beta)}
            r={5}
            fill="none"
            stroke="#1f2937"
            strokeWidth={2}
          />
        )}

        <circle
          cx={toScreenX(bestOnGrid.gamma)}
          cy={toScreenY(bestOnGrid.beta)}
          r={5}
          fill="#ef4444"
          stroke="white"
          strokeWidth={1.5}
        />
        <text x={0} y={HEIGHT + 20} fontSize={11} fill="#6b7280">
          γ=0
        </text>
        <text x={WIDTH - 24} y={HEIGHT + 20} fontSize={11} fill="#6b7280">
          γ=2π
        </text>
        <text x={-24} y={HEIGHT} fontSize={11} fill="#6b7280">
          β=0
        </text>
        <text x={-24} y={10} fontSize={11} fill="#6b7280">
          β=π
        </text>
      </g>
    </svg>
  )
}
