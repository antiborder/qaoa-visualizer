import type { ReactNode } from 'react'

/** A proper stacked fraction: numerator, horizontal bar, denominator. */
export function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        verticalAlign: 'middle',
        margin: '0 5px',
        lineHeight: 1.3,
        fontStyle: 'normal',
      }}
    >
      <span style={{ padding: '0 3px', borderBottom: '1.5px solid currentColor' }}>{num}</span>
      <span style={{ padding: '0 3px' }}>{den}</span>
    </span>
  )
}

/** A 2-component column vector: (top; bottom), stacked and bracketed. */
export function ColVec({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        margin: '0 3px',
        fontStyle: 'normal',
      }}
    >
      <span style={{ fontSize: '1.9em', fontWeight: 300, lineHeight: 1 }}>(</span>
      <span
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 3px',
          lineHeight: 1.35,
          fontSize: '0.9em',
        }}
      >
        <span>{top}</span>
        <span>{bottom}</span>
      </span>
      <span style={{ fontSize: '1.9em', fontWeight: 300, lineHeight: 1 }}>)</span>
    </span>
  )
}

/** A supplementary/definition callout box, set apart from the main flow of prose. */
export function Callout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderLeft: '4px solid #94a3b8',
        borderRadius: 8,
        padding: '16px 20px',
        margin: '20px 0',
      }}
    >
      <h4
        style={{
          fontSize: 13,
          margin: '0 0 10px',
          color: '#64748b',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </h4>
      {children}
    </div>
  )
}

/** A centered, larger-font display line for a single formula. */
export function FormulaBlock({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        textAlign: 'center',
        fontStyle: 'italic',
        fontSize: 19,
        lineHeight: 2.2,
        margin: '14px 0',
      }}
    >
      {children}
    </p>
  )
}
