import type { WalkthroughStep } from './types'

interface SegmentedProgressBarProps {
  steps: WalkthroughStep[]
  stepIndex: number
  onJump: (index: number) => void
}

// One pill per chapter (consecutive steps sharing the same `chapter` -
// several numbered sections, e.g. Step 2/3/4, can share one pill). The pill
// for the chapter currently being read fills left-to-right by progress
// through that chapter's own steps; earlier chapters are full, later ones
// empty. Clicking a pill jumps to that chapter's first step.
export function SegmentedProgressBar({ steps, stepIndex, onJump }: SegmentedProgressBarProps) {
  const pills: { chapter: string; start: number; length: number }[] = []
  steps.forEach((s, i) => {
    const last = pills[pills.length - 1]
    if (last && last.chapter === s.chapter) {
      last.length += 1
    } else {
      pills.push({ chapter: s.chapter, start: i, length: 1 })
    }
  })

  return (
    <div style={{ display: 'flex', gap: 6, margin: '16px 0', flexWrap: 'wrap' }}>
      {pills.map((p) => {
        const indexWithinChapter = stepIndex - p.start
        const fillRatio =
          indexWithinChapter < 0
            ? 0
            : indexWithinChapter >= p.length - 1
              ? 1
              : (indexWithinChapter + 1) / p.length
        return (
          <button
            key={p.chapter}
            onClick={() => onJump(p.start)}
            title={p.chapter}
            style={{
              flex: 1,
              minWidth: 24,
              height: 8,
              padding: 0,
              border: 'none',
              borderRadius: 4,
              background: '#e2e8f0',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 0,
                width: `${fillRatio * 100}%`,
                background: '#3b82f6',
                borderRadius: 4,
                transition: 'width 0.2s',
              }}
            />
          </button>
        )
      })}
    </div>
  )
}
