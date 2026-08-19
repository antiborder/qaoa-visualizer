import * as THREE from 'three'
import { SURFACE_HUE } from './Landscape3D'
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

// The 3D surface's vertex colors go through Three.js lighting (ambient +
// directional) and tone mapping before they reach the screen, which mutes
// and darkens them well below the raw HSL values fed into setHSL there.
// This flat SVG has no lighting pass, so matching those raw values made it
// look far more saturated than the 3D scene actually renders. These
// constants are tuned to the 3D scene's ON-SCREEN look instead, so the two
// views read as the same muted sage-green palette.
const HEATMAP_LIGHTNESS = 0.66
const HEATMAP_SAT_LOW = 0.08
const HEATMAP_SAT_HIGH = 0.32
const cellColor = new THREE.Color()

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
            cellColor.setHSL(SURFACE_HUE, HEATMAP_SAT_LOW + t * (HEATMAP_SAT_HIGH - HEATMAP_SAT_LOW), HEATMAP_LIGHTNESS)
            const y = HEIGHT - (j + 1) * cellH
            return (
              <rect
                key={`${i}-${j}`}
                x={i * cellW}
                y={y}
                width={cellW + 0.5}
                height={cellH + 0.5}
                fill={`rgb(${Math.round(cellColor.r * 255)},${Math.round(cellColor.g * 255)},${Math.round(cellColor.b * 255)})`}
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
          <>
            {/* White halo first so the dark ring stays visible over the
                heatmap's own dark-valley regions, not just the light ones. */}
            <circle
              cx={toScreenX(startPoint.gamma)}
              cy={toScreenY(startPoint.beta)}
              r={6}
              fill="none"
              stroke="white"
              strokeWidth={4}
            />
            <circle
              cx={toScreenX(startPoint.gamma)}
              cy={toScreenY(startPoint.beta)}
              r={6}
              fill="none"
              stroke="#1f2937"
              strokeWidth={2}
            />
          </>
        )}

        <circle
          cx={toScreenX(bestOnGrid.gamma)}
          cy={toScreenY(bestOnGrid.beta)}
          r={5}
          fill="#f87171"
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
