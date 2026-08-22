import { Fragment } from 'react'
import type { GraphData, PartitionEntry } from './types'

const GROUP_COLORS = ['#4f8cff', '#ff6f61']

// Group 0 (A, blue) <-> sigma=+1, group 1 (B, red) <-> sigma=-1. This is the
// one place that mapping is defined; edgeValue callbacks receive these
// sigma values (not raw group indices) so callers can just write the plain
// math (sigma_i * sigma_j, etc.) without re-deriving the sign convention.
function sigmaOf(group: 0 | 1): 1 | -1 {
  return group === 0 ? 1 : -1
}

interface GraphViewProps {
  graph: GraphData
  partition?: PartitionEntry[]
  showLegend?: boolean
  // Shows a small "+1"/"-1" label under each node, for Steps that build up
  // the cost-Hamiltonian derivation node-by-node before introducing H_C.
  showNodeSigma?: boolean
  // When provided, renders this computed value at each edge's midpoint
  // (e.g. sigma_i*sigma_j, or the cut(i,j) indicator) instead of/alongside
  // the plain cut mark.
  edgeValue?: (sigmaSource: number, sigmaTarget: number) => string
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
    </div>
  )
}

export function GraphView({
  graph,
  partition = [],
  showLegend = true,
  showNodeSigma = false,
  edgeValue,
}: GraphViewProps) {
  const groupByNode = new Map(partition.map((p) => [p.node, p.group]))
  const positionByNode = new Map(graph.nodes.map((n) => [n.id, { x: n.x, y: n.y }]))

  return (
    <div>
      <svg viewBox="0 0 400 300" width="100%" role="img" aria-label="Max-Cut graph">
        {graph.edges.map((edge, i) => {
          const from = positionByNode.get(edge.source)!
          const to = positionByNode.get(edge.target)!
          const groupSource = groupByNode.get(edge.source) ?? 0
          const groupTarget = groupByNode.get(edge.target) ?? 0
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2
          const label = edgeValue ? edgeValue(sigmaOf(groupSource), sigmaOf(groupTarget)) : null
          const labelBadge = label !== null && (
            <g>
              <circle cx={midX} cy={midY} r={11} fill="white" stroke="#94a3b8" strokeWidth={1} />
              <text
                x={midX}
                y={midY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#1e293b"
                fontSize={12}
                fontWeight="bold"
              >
                {label}
              </text>
            </g>
          )

          if (groupSource === groupTarget) {
            return (
              <Fragment key={i}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={GROUP_COLORS[groupSource]}
                  strokeWidth={4}
                />
                {labelBadge}
              </Fragment>
            )
          }

          // Different groups: draw the edge as two half-segments meeting at
          // a small gap in the middle, each colored by its own endpoint's
          // group, so the cut is visible without a separate edge legend.
          const dx = to.x - from.x
          const dy = to.y - from.y
          const len = Math.hypot(dx, dy)
          const ux = dx / len
          const uy = dy / len
          const gapHalf = 6
          // Perpendicular to the edge, so the mark reads as a "cut" slash
          // across the gap rather than just an empty break.
          const perpX = -uy
          const perpY = ux
          const tickHalf = 8
          return (
            <Fragment key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={midX - ux * gapHalf}
                y2={midY - uy * gapHalf}
                stroke={GROUP_COLORS[groupSource]}
                strokeWidth={4}
              />
              <line
                x1={midX + ux * gapHalf}
                y1={midY + uy * gapHalf}
                x2={to.x}
                y2={to.y}
                stroke={GROUP_COLORS[groupTarget]}
                strokeWidth={4}
              />
              {labelBadge || (
                <line
                  x1={midX - perpX * tickHalf}
                  y1={midY - perpY * tickHalf}
                  x2={midX + perpX * tickHalf}
                  y2={midY + perpY * tickHalf}
                  stroke="#dc2626"
                  strokeWidth={1.2}
                />
              )}
            </Fragment>
          )
        })}
        {graph.nodes.map((node) => {
          const pos = node
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
              {showNodeSigma && (
                <text
                  x={pos.x}
                  y={pos.y + 36}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={GROUP_COLORS[group]}
                  fontSize={14}
                  fontWeight="bold"
                >
                  {sigmaOf(group) > 0 ? '+1' : '−1'}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {showLegend && <GraphLegend />}
    </div>
  )
}
