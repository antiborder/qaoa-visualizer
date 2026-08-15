import type { GraphData, PartitionEntry } from './types'

// Fixed layout for the 5-node bowtie graph (two triangles sharing node 2).
// Hand-placed rather than force-directed: the graph is small and fixed, and
// an explicit layout keeps the bowtie shape and cut-edge highlighting legible.
export const NODE_POSITIONS: Record<number, { x: number; y: number }> = {
  0: { x: 80, y: 80 },
  1: { x: 80, y: 220 },
  2: { x: 200, y: 150 },
  3: { x: 320, y: 80 },
  4: { x: 320, y: 220 },
}

const GROUP_COLORS = ['#4f8cff', '#ff6f61']

interface GraphViewProps {
  graph: GraphData
  partition: PartitionEntry[]
}

function GraphLegend() {
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
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: GROUP_COLORS[0],
            display: 'inline-block',
          }}
        />
        グループA
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: GROUP_COLORS[1],
            display: 'inline-block',
          }}
        />
        グループB
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="24" height="12">
          <line x1={0} y1={6} x2={24} y2={6} stroke="#ff6f61" strokeWidth={3} />
        </svg>
        カットされた辺（両端が異なるグループ）
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="24" height="12">
          <line x1={0} y1={6} x2={24} y2={6} stroke="#4b5563" strokeWidth={2} strokeDasharray="4 4" />
        </svg>
        カットされていない辺（両端が同じグループ）
      </span>
    </div>
  )
}

export function GraphView({ graph, partition }: GraphViewProps) {
  const groupByNode = new Map(partition.map((p) => [p.node, p.group]))

  return (
    <div>
      <svg viewBox="0 0 400 300" width="100%" role="img" aria-label="Max-Cut graph">
        {graph.edges.map((edge, i) => {
          const from = NODE_POSITIONS[edge.source]
          const to = NODE_POSITIONS[edge.target]
          const isCut = groupByNode.get(edge.source) !== groupByNode.get(edge.target)
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isCut ? '#ff6f61' : '#4b5563'}
              strokeWidth={isCut ? 4 : 2}
              strokeDasharray={isCut ? undefined : '4 4'}
            />
          )
        })}
        {graph.nodes.map((node) => {
          const pos = NODE_POSITIONS[node.id]
          const group = groupByNode.get(node.id) ?? 0
          return (
            <g key={node.id}>
              <circle cx={pos.x} cy={pos.y} r={22} fill={GROUP_COLORS[group]} />
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
      <GraphLegend />
    </div>
  )
}
