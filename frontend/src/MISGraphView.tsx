import { NODE_POSITIONS } from './GraphView'
import type { GraphData, MISSelectionEntry } from './types'

interface MISGraphViewProps {
  graph: GraphData
  selection: MISSelectionEntry[]
}

function MISLegend() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        justifyContent: 'center',
        fontSize: 13,
        color: '#374151',
        marginTop: 8,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}
        />
        選択されたノード（独立集合に含む）
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{ width: 12, height: 12, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }}
        />
        選択されていないノード
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="24" height="12">
          <line x1={0} y1={6} x2={24} y2={6} stroke="#ef4444" strokeWidth={3} />
        </svg>
        違反した辺（両端が選択され、独立集合の条件に反する）
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="24" height="12">
          <line x1={0} y1={6} x2={24} y2={6} stroke="#9ca3af" strokeWidth={2} />
        </svg>
        違反していない辺
      </span>
    </div>
  )
}

export function MISGraphView({ graph, selection }: MISGraphViewProps) {
  const selectedByNode = new Map(selection.map((s) => [s.node, s.selected]))

  return (
    <div>
      <svg viewBox="0 0 400 300" width="100%" role="img" aria-label="Independent set graph">
        {graph.edges.map((edge, i) => {
          const from = NODE_POSITIONS[edge.source]
          const to = NODE_POSITIONS[edge.target]
          const violated =
            selectedByNode.get(edge.source) === 1 && selectedByNode.get(edge.target) === 1
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={violated ? '#ef4444' : '#9ca3af'}
              strokeWidth={violated ? 4 : 2}
            />
          )
        })}
        {graph.nodes.map((node) => {
          const pos = NODE_POSITIONS[node.id]
          const selected = selectedByNode.get(node.id) === 1
          return (
            <g key={node.id}>
              <circle cx={pos.x} cy={pos.y} r={22} fill={selected ? '#22c55e' : '#94a3b8'} />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={14}
                fontWeight="bold"
              >
                {node.id}
              </text>
            </g>
          )
        })}
      </svg>
      <MISLegend />
    </div>
  )
}
