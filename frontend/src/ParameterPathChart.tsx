const WIDTH = 400
const HEIGHT = 400
const PADDING_LEFT = 34
const PADDING_BOTTOM = 24

function toScreenX(gamma: number) {
  return (gamma / (Math.PI * 2)) * WIDTH
}
function toScreenY(beta: number) {
  return HEIGHT - (beta / Math.PI) * HEIGHT
}

interface ParameterPathChartProps {
  actualGammas: number[]
  actualBetas: number[]
  adiabaticGammas: number[]
  adiabaticBetas: number[]
}

/**
 * Plots the (gamma_i, beta_i) path a p-layer QAOA circuit traces across its
 * layers on the same gamma-beta plane used elsewhere (Heatmap2D, Landscape3D),
 * so the actually-optimized path and the Trotterized-adiabatic schedule's
 * path can be compared by eye - same axes, same shape convention.
 */
export function ParameterPathChart({
  actualGammas,
  actualBetas,
  adiabaticGammas,
  adiabaticBetas,
}: ParameterPathChartProps) {
  const actualPoints = actualGammas.map((g, i) => ({ x: toScreenX(g), y: toScreenY(actualBetas[i]) }))
  const adiabaticPoints = adiabaticGammas.map((g, i) => ({ x: toScreenX(g), y: toScreenY(adiabaticBetas[i]) }))

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WIDTH + PADDING_LEFT} ${HEIGHT + PADDING_BOTTOM}`}
      style={{ maxWidth: 420, display: 'block', margin: '0 auto' }}
    >
      <g transform={`translate(${PADDING_LEFT}, 0)`}>
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#f8fafc" stroke="#cbd5e1" />

        <polyline
          points={adiabaticPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        {adiabaticPoints.map((p, i) => (
          <g key={`a-${i}`}>
            <circle cx={p.x} cy={p.y} r={4} fill="#f59e0b" />
            <text x={p.x + 6} y={p.y - 6} fontSize={10} fill="#b45309">
              {i + 1}
            </text>
          </g>
        ))}

        <polyline
          points={actualPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
        />
        {actualPoints.map((p, i) => (
          <g key={`b-${i}`}>
            <circle cx={p.x} cy={p.y} r={4} fill="#3b82f6" />
            <text x={p.x + 6} y={p.y + 12} fontSize={10} fill="#1d4ed8">
              {i + 1}
            </text>
          </g>
        ))}

        <text x={0} y={HEIGHT + 18} fontSize={11} fill="#6b7280">
          γ=0
        </text>
        <text x={WIDTH - 24} y={HEIGHT + 18} fontSize={11} fill="#6b7280">
          γ=2π
        </text>
        <text x={-26} y={HEIGHT} fontSize={11} fill="#6b7280">
          β=0
        </text>
        <text x={-26} y={10} fontSize={11} fill="#6b7280">
          β=π
        </text>
      </g>
    </svg>
  )
}
