import { GraphView } from './GraphView'
import type { GraphData, PartitionEntry } from './types'

interface GraphIconButtonProps {
  graph: GraphData
  partition?: PartitionEntry[]
  label: string
  selected: boolean
  onClick: () => void
}

export function GraphIconButton({ graph, partition, label, selected, onClick }: GraphIconButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: 8,
        border: selected ? '2px solid #4f8cff' : '2px solid transparent',
        borderRadius: 8,
        background: selected ? '#eef4ff' : 'transparent',
        cursor: 'pointer',
        width: 92,
      }}
    >
      <div style={{ width: 68 }}>
        <GraphView graph={graph} partition={partition} showLegend={false} />
      </div>
      <span style={{ fontSize: 12, color: '#374151', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </button>
  )
}
