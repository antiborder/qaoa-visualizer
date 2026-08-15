import { useEffect, useState } from 'react'
import { CostOnlyStep } from './CostOnlyStep'
import { DepthScanStep } from './DepthScanStep'
import { FormulaBlock } from './Formula'
import { GraphView } from './GraphView'
import { LandscapeStep } from './LandscapeStep'
import { MISStep } from './MISStep'
import { NoiseStep } from './NoiseStep'
import { OptimizeStep } from './OptimizeStep'
import { P1Step } from './P1Step'
import type { GraphData, LandscapeResult, OptimalResult } from './types'

const API_BASE = 'http://localhost:8000'

function App() {
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [optimal, setOptimal] = useState<OptimalResult | null>(null)
  const [landscape, setLandscape] = useState<LandscapeResult | null>(null)
  const [partitionIndex, setPartitionIndex] = useState(0)

  useEffect(() => {
    fetch(`${API_BASE}/api/graph`)
      .then((res) => res.json())
      .then(setGraph)
    fetch(`${API_BASE}/api/maxcut/optimal`)
      .then((res) => res.json())
      .then(setOptimal)
    fetch(`${API_BASE}/api/qaoa/landscape`)
      .then((res) => res.json())
      .then(setLandscape)
  }, [])

  if (!graph || !optimal) {
    return <p>Loading...</p>
  }

  const partition = optimal.partitions[partitionIndex]

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Step 1: Max-Cut 問題設定</h1>

      <h3 style={{ fontSize: 17 }}>解く問題</h3>
      <p>
        グラフ G=(V,E) の頂点をグループA・Bの2つに分け、
        両端が異なるグループに属する辺（カットされた辺）の本数
      </p>
      <FormulaBlock>
        Cut(A,B) = Σ<sub>(i,j)∈E</sub> [ i と j が異なるグループ ]
      </FormulaBlock>
      <p>を最大化する分割 (A,B) を求めます。これがMax-Cut問題です。</p>

      <h3 style={{ fontSize: 17 }}>なぜこのグラフを選んだか</h3>
      <p>
        下図は三角形2つがノード2を共有する「bowtie（蝶ネクタイ）」型のグラフです。
      </p>
      <ul style={{ paddingLeft: 22, lineHeight: 1.8 }}>
        <li>
          三角形のような奇数長の閉路を含むグラフでは、どんな分割を選んでも辺を全部同時に
          カットすることはできない
        </li>
        <li>
          偶閉路だけの二部グラフだと全辺カットの自明な分割が存在してしまい、最適化する
          面白みがなくなるため、あえて避けている
        </li>
        <li>
          三角形1つにつき最大2辺までしかカットできないので、このグラフの最大カット値は
          2×2=4（6辺中4辺）になる——これが下の総当たり計算の結果と一致しているか
          確認してみてください
        </li>
      </ul>
      <p>
        Step 2以降では、この最適な分割を総当たりではなく、量子回路（QAOA）でどう探索するかを見ていきます。
      </p>

      <GraphView graph={graph} partition={partition} />

      <h3 style={{ fontSize: 17 }}>総当たり計算の結果</h3>
      <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>
        <li>
          最大カット値: <strong>{optimal.cutValue}</strong> / {optimal.totalEdges} 辺
        </li>
        <li>
          同点で最適な分割: {optimal.partitions.length}通り中{' '}
          {partitionIndex + 1}通り目を表示中
          <button
            onClick={() =>
              setPartitionIndex((i) => (i + 1) % optimal.partitions.length)
            }
            style={{ marginLeft: 8 }}
          >
            次の最適解を見る
          </button>
        </li>
        <li>
          Goemans-Williamson近似保証: 期待値で最適値の
          {(optimal.gwApproximationRatio * 100).toFixed(1)}%以上（
          {optimal.gwGuaranteedCutValue}辺相当）。この小規模グラフでは総当たりで
          真の最適解が求まっているため、あくまで理論上の目安として表示。
        </li>
      </ul>

      <CostOnlyStep optimalCutValue={optimal.cutValue} />
      <P1Step optimalCutValue={optimal.cutValue} />
      <LandscapeStep landscape={landscape} />
      <OptimizeStep landscape={landscape} optimalCutValue={optimal.cutValue} />
      <DepthScanStep />
      <NoiseStep optimalCutValue={optimal.cutValue} />
      <MISStep graph={graph} />
    </main>
  )
}

export default App
