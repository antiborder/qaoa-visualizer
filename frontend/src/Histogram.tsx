import { motion } from 'framer-motion'
import type { DistributionEntry } from './types'

const WIDTH = 700
const HEIGHT = 160
const BAR_GAP = 2
const LABEL_HEIGHT = 90

interface HistogramProps {
  distribution: DistributionEntry[]
  optimalCutValue: number
}

function HistogramLegend() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        justifyContent: 'center',
        fontSize: 13,
        color: '#374151',
        marginTop: 4,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 12, height: 12, background: '#22c55e', display: 'inline-block' }} />
        最適解に対応するビット列
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 12, height: 12, background: '#9ca3af', display: 'inline-block' }} />
        それ以外のビット列
      </span>
    </div>
  )
}

export function Histogram({ distribution, optimalCutValue }: HistogramProps) {
  const barWidth = WIDTH / distribution.length - BAR_GAP
  const maxProbability = Math.max(
    ...distribution.map((d) => d.probability),
    1 / distribution.length,
  )

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT + 4 + LABEL_HEIGHT}`}>
        {distribution.map((entry, i) => {
          const barHeight = (entry.probability / maxProbability) * HEIGHT
          const x = i * (barWidth + BAR_GAP)
          const isOptimal = entry.cutValue === optimalCutValue
          const labelX = x + barWidth / 2
          return (
            <g key={entry.bitstring}>
              <motion.rect
                x={x}
                width={barWidth}
                fill={isOptimal ? '#22c55e' : '#9ca3af'}
                initial={false}
                animate={{ y: HEIGHT - barHeight, height: barHeight }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              >
                <title>
                  {entry.bitstring} (cut={entry.cutValue}):{' '}
                  {(entry.probability * 100).toFixed(2)}%
                </title>
              </motion.rect>
              {/* Rotated so each bitstring stays legible even when there are
                  2^n narrow bars (n=5 -> 32 bars across a fixed-width chart). */}
              <text
                x={labelX}
                y={HEIGHT + 10}
                fontSize={18}
                fontFamily="monospace"
                fill="#6b7280"
                textAnchor="end"
                transform={`rotate(-90 ${labelX} ${HEIGHT + 10})`}
              >
                {entry.bitstring}
              </text>
            </g>
          )
        })}
        <line x1={0} y1={HEIGHT} x2={WIDTH} y2={HEIGHT} stroke="#374151" strokeWidth={1} />
      </svg>
      <HistogramLegend />
    </div>
  )
}
