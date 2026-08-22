import { SegmentedProgressBar } from './SegmentedProgressBar'
import type { WalkthroughStep } from './types'

interface WalkthroughProps {
  steps: WalkthroughStep[]
  stepIndex: number
  onStepChange: (index: number) => void
}

// The list of distinct section names, in first-appearance order. A
// section's 1-based position in this list IS its displayed "Step N" number
// - nothing anywhere hardcodes a number, so inserting/removing/reordering
// sections in the flat `steps` array renumbers everything automatically.
function sectionOrder(steps: WalkthroughStep[]): string[] {
  const sections: string[] = []
  for (const s of steps) {
    if (sections[sections.length - 1] !== s.section) sections.push(s.section)
  }
  return sections
}

interface NavRowProps {
  stepIndex: number
  total: number
  go: (index: number) => void
}

// Previous/Next + counter, rendered both above the progress bar and below
// the content - long steps (e.g. Step 4, whose reused GraphTypePicker sits
// at the bottom) shouldn't force a scroll back to the top just to advance.
function NavRow({ stepIndex, total, go }: NavRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        margin: '24px 0',
      }}
    >
      <button onClick={() => go(stepIndex - 1)} disabled={stepIndex === 0}>
        ← Previous
      </button>
      <span style={{ fontSize: 14, color: '#6b7280', minWidth: 90, textAlign: 'center' }}>
        Step {stepIndex + 1} / {total}
      </span>
      <button onClick={() => go(stepIndex + 1)} disabled={stepIndex === total - 1}>
        Next →
      </button>
    </div>
  )
}

// Shell for the flat, atomic-step walkthrough: Back/Next + counter, progress
// bar, the section heading (with its number computed from array position),
// the current step's own content, then Back/Next + counter again at the
// bottom. Content components must NOT render their own "Step N: ..."
// heading - this shell is the single place that number gets printed.
export function Walkthrough({ steps, stepIndex, onStepChange }: WalkthroughProps) {
  const current = steps[stepIndex]
  const sections = sectionOrder(steps)
  const sectionNumber = sections.indexOf(current.section) + 1
  const go = (index: number) => {
    onStepChange(Math.min(Math.max(index, 0), steps.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <NavRow stepIndex={stepIndex} total={steps.length} go={go} />
      <SegmentedProgressBar steps={steps} stepIndex={stepIndex} onJump={go} />
      <h1>
        Step {sectionNumber}: {current.section}
      </h1>
      {current.title && <h2 style={{ fontSize: 17, color: '#6b7280', margin: '0 0 12px' }}>{current.title}</h2>}
      {current.content}
      <NavRow stepIndex={stepIndex} total={steps.length} go={go} />
    </div>
  )
}
