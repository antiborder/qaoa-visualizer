import { useEffect, useState } from 'react'
import { ConceptsPage } from './ConceptsPage'
import { CostOnlyStep } from './CostOnlyStep'
import { DepthScanStep } from './DepthScanStep'
import { Callout, FormulaBlock } from './Formula'
import { GraphIconButton } from './GraphIconButton'
import { GraphTypePicker } from './GraphTypePicker'
import { GraphView } from './GraphView'
import { LandscapeStep } from './LandscapeStep'
import { MISStep } from './MISStep'
import { NoiseStep } from './NoiseStep'
import { OptimizeStep } from './OptimizeStep'
import { P1Step } from './P1Step'
import { TwoLayerStep } from './TwoLayerStep'
import type { GraphData, GraphInfo, LandscapeResult, OptimalResult } from './types'

const API_BASE = 'http://localhost:8000'

function App() {
  const [graphs, setGraphs] = useState<GraphInfo[]>([])
  const [graphId, setGraphId] = useState('bowtie')
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [optimal, setOptimal] = useState<OptimalResult | null>(null)
  const [landscape, setLandscape] = useState<LandscapeResult | null>(null)
  const [partitionIndex, setPartitionIndex] = useState(0)
  // Shared "layer 1" parameters: Step 2 (cost-only) only uses gamma1, but
  // Step 3 and Step 6 both build on the exact same first cost+mixer layer,
  // so all three steps read/write this one pair rather than keeping their
  // own separate copies.
  const [gamma1, setGamma1] = useState(0)
  const [beta1, setBeta1] = useState(0)
  // Minimal hash-based navigation - just enough to link out to a separate
  // "concepts" reference page without pulling in a routing library for a
  // single-user learning app with one extra page.
  const [page, setPage] = useState(() => (window.location.hash === '#concepts' ? 'concepts' : 'main'))

  useEffect(() => {
    const onHashChange = () => setPage(window.location.hash === '#concepts' ? 'concepts' : 'main')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/graphs`)
      .then((res) => res.json())
      .then(setGraphs)
  }, [])

  useEffect(() => {
    setGraph(null)
    setOptimal(null)
    setLandscape(null)
    setPartitionIndex(0)
    fetch(`${API_BASE}/api/graph?graphId=${graphId}`)
      .then((res) => res.json())
      .then(setGraph)
    fetch(`${API_BASE}/api/maxcut/optimal?graphId=${graphId}`)
      .then((res) => res.json())
      .then(setOptimal)
    fetch(`${API_BASE}/api/qaoa/landscape?graphId=${graphId}`)
      .then((res) => res.json())
      .then(setLandscape)
  }, [graphId])

  // Re-seed (gamma1, beta1) with the new graph's best p=1 point whenever the
  // landscape changes (initial load, or a graph switch) - a point tuned for
  // one graph isn't meaningful for another. The sliders in Step 2/3/6 can
  // still be freely readjusted afterward.
  useEffect(() => {
    if (landscape) {
      setGamma1(landscape.bestOnGrid.gamma)
      setBeta1(landscape.bestOnGrid.beta)
    }
  }, [landscape])

  if (page === 'concepts') {
    return <ConceptsPage />
  }

  if (!graph || !optimal) {
    return <p>Loading...</p>
  }

  const partition = optimal.partitions[partitionIndex]
  const currentGraphLabel = graphs.find((g) => g.id === graphId)?.label ?? graphId

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <h1>QAOAビジュアライザ</h1>
      <p>
        このアプリは、QAOA（量子近似最適化アルゴリズム）が実際に何をしているのかを、数式を
        追うだけでなく手を動かしながら理解するための、Step形式のビジュアライザです。Max-Cut
        問題を題材に、コストユニタリ・ミキサーユニタリの回路構成、パラメータランドスケープ、
        古典最適化ループ、層数pを増やす効果、実機ノイズの影響までを、実際に動く回路とグラフで
        1つずつ確認していきます。
      </p>

      <h1>Step 1: Max-Cut 問題設定</h1>

      <p>まずは取り組むグラフを選んでください。</p>
      <GraphTypePicker graphs={graphs} graphId={graphId} onSelect={setGraphId} />

      <h3 style={{ fontSize: 17 }}>解く問題</h3>
      <p>
        グラフ G=(V,E) の頂点をグループA・Bの2つに分け、
        両端が異なるグループに属する辺（カットされた辺）の本数
      </p>
      <FormulaBlock>
        Cut(A,B) = Σ<sub>(i,j)∈E</sub> [ i と j が異なるグループ ]
      </FormulaBlock>
      <p>を最大化する分割 (A,B) を求めます。これがMax-Cut問題です。</p>

      <h3 style={{ fontSize: 17 }}>総当たり計算の結果</h3>
      <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>
        <li>
          最大カット値: <strong>{optimal.cutValue}</strong> / {optimal.totalEdges} 辺
        </li>
        <li>同点で最適な分割: {optimal.partitions.length}通り（下のアイコンから選べます）</li>
        <li>
          Goemans-Williamson近似保証: 期待値で最適値の
          {(optimal.gwApproximationRatio * 100).toFixed(1)}%以上（
          {optimal.gwGuaranteedCutValue}辺相当）。この小規模グラフでは総当たりで
          真の最適解が求まっているため、あくまで理論上の目安として表示。
        </li>
      </ul>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', margin: '16px 0' }}>
        {optimal.partitions.map((p, i) => (
          <GraphIconButton
            key={i}
            graph={graph}
            partition={p}
            label={`解 ${i + 1}`}
            selected={i === partitionIndex}
            onClick={() => setPartitionIndex(i)}
          />
        ))}
      </div>

      <GraphView graph={graph} partition={partition} />

      <Callout label="補足：なぜこのようなグラフを選んだか">
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
          これは{currentGraphLabel}のグラフです。
        </p>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: '#334155', margin: 0 }}>
          <li>
            三角形のような奇数長の閉路を含むグラフでは、どんな分割を選んでも辺を全部同時に
            カットすることはできない——選べるグラフはすべてこの性質を持つように選定している
          </li>
          <li>
            偶閉路だけの二部グラフだと全辺カットの自明な分割が存在してしまい、最適化する
            面白みがなくなるため、あえて避けている
          </li>
          <li>
            総当たり計算の結果、このグラフの最大カット値は{optimal.cutValue}辺（全
            {optimal.totalEdges}辺中）になる——グラフを変えると、この値やランドスケープの
            形がどう変わるか比べてみてください
          </li>
        </ul>
      </Callout>

      <CostOnlyStep
        graphId={graphId}
        optimalCutValue={optimal.cutValue}
        gamma1={gamma1}
        onGamma1Change={setGamma1}
      />
      <P1Step
        graphId={graphId}
        optimalCutValue={optimal.cutValue}
        gamma1={gamma1}
        beta1={beta1}
        onGamma1Change={setGamma1}
        onBeta1Change={setBeta1}
      />
      <LandscapeStep
        landscape={landscape}
        optimalCutValue={optimal.cutValue}
        gamma1={gamma1}
        beta1={beta1}
        onGamma1Change={setGamma1}
        onBeta1Change={setBeta1}
      />
      <OptimizeStep graphId={graphId} landscape={landscape} optimalCutValue={optimal.cutValue} />
      <TwoLayerStep
        graphId={graphId}
        optimalCutValue={optimal.cutValue}
        gamma1={gamma1}
        beta1={beta1}
        onGamma1Change={setGamma1}
        onBeta1Change={setBeta1}
      />
      <DepthScanStep graphId={graphId} />
      {landscape && (
        <NoiseStep
          graphId={graphId}
          optimalCutValue={optimal.cutValue}
          bestPoint={landscape.bestOnGrid}
        />
      )}
      <MISStep graphId={graphId} graph={graph} />
    </main>
  )
}

export default App
