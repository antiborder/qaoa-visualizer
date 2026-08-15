import { motion } from 'framer-motion'
import type { DistributionEntry } from './types'

const WIDTH = 700
const HEIGHT = 160
const BAR_GAP = 2

interface HistogramProps {
  distribution: DistributionEntry[]
  optimalCutValue: number
}

export function Histogram({ distribution, optimalCutValue }: HistogramProps) {
  const barWidth = WIDTH / distribution.length - BAR_GAP
  const maxProbability = Math.max(
    ...distribution.map((d) => d.probability),
    1 / distribution.length,
  )

  return (
    <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT + 4}`}>
      {distribution.map((entry, i) => {
        const barHeight = (entry.probability / maxProbability) * HEIGHT
        const x = i * (barWidth + BAR_GAP)
        const isOptimal = entry.cutValue === optimalCutValue
        return (
          <motion.rect
            key={entry.bitstring}
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
        )
      })}
      <line x1={0} y1={HEIGHT} x2={WIDTH} y2={HEIGHT} stroke="#374151" strokeWidth={1} />
    </svg>
  )
}
