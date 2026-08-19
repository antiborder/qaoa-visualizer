import { GraphIconButton } from './GraphIconButton'
import type { GraphInfo } from './types'

interface GraphTypePickerProps {
  graphs: GraphInfo[]
  graphId: string
  onSelect: (id: string) => void
}

export function GraphTypePicker({ graphs, graphId, onSelect }: GraphTypePickerProps) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', margin: '16px 0 24px' }}>
      {graphs.map((g) => (
        <GraphIconButton
          key={g.id}
          graph={g}
          label={g.label}
          selected={g.id === graphId}
          onClick={() => onSelect(g.id)}
        />
      ))}
    </div>
  )
}
