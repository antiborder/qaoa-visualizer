import { useEffect, useState } from 'react'
import { BarChart } from './BarChart'
import { Histogram } from './Histogram'
import { MISGraphView } from './MISGraphView'
import type {
  DistributionEntry,
  GraphData,
  MISDepthScanResult,
  MISOptimalResult,
  MISP1Result,
} from './types'

const API_BASE = 'http://localhost:8000'
const DEBOUNCE_MS = 150

interface MISStepProps {
  graph: GraphData
}

export function MISStep({ graph }: MISStepProps) {
  const [optimal, setOptimal] = useState<MISOptimalResult | null>(null)
  const [selectionIndex, setSelectionIndex] = useState(0)
  const [gamma, setGamma] = useState(0)
  const [beta, setBeta] = useState(0)
  const [p1, setP1] = useState<MISP1Result | null>(null)
  const [depthScan, setDepthScan] = useState<MISDepthScanResult | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/mis/optimal`)
      .then((res) => res.json())
      .then(setOptimal)
    fetch(`${API_BASE}/api/mis/depth-scan`)
      .then((res) => res.json())
      .then(setDepthScan)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/mis/p1?gamma=${gamma}&beta=${beta}`)
        .then((res) => res.json())
        .then(setP1)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [gamma, beta])

  // Histogram.tsx only cares that entries carry {bitstring, probability,
  // cutValue} and compares cutValue to optimalCutValue - reused as-is here
  // by mapping MIS's objectiveValue into that same shape.
  const histogramDistribution: DistributionEntry[] | undefined = p1?.distribution.map((d) => ({
    bitstring: d.bitstring,
    probability: d.probability,
    cutValue: d.objectiveValue,
  }))

  return (
    <section style={{ marginTop: 48, marginBottom: 64 }}>
      <h1>Step 8: 別の組合せ最適化問題への一般化 — 最大独立集合</h1>
      <p>
        同じ手順がMax-Cut以外にも通用することを、最大独立集合（Maximum Independent
        Set, MIS）問題で確認します。同じbowtieグラフで「辺で結ばれた2ノードを同時に
        選ばない」という制約のもとで、できるだけ多くのノードを選ぶ問題です。ペナルティ法で
        QUBOに変換し（違反した辺1本につき-2点）、コストハミルトニアンH_Cを導出し、
        Max-Cutと同じRZZ+RZ+RXの枠組みでQAOA回路を構成します。
      </p>

      {optimal && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 32 }}>問題設定と総当たり結果</h2>
          <MISGraphView graph={graph} selection={optimal.selections[selectionIndex]} />
          <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>
            <li>
              最大独立集合のサイズ: <strong>{optimal.size}</strong>
            </li>
            <li>
              同点で最適な解: {optimal.selections.length}通り中 {selectionIndex + 1}通り目を表示中
              <button
                onClick={() => setSelectionIndex((i) => (i + 1) % optimal.selections.length)}
                style={{ marginLeft: 8 }}
              >
                次の最適解を見る
              </button>
            </li>
          </ul>
        </>
      )}

      <h2 style={{ fontSize: 18, marginTop: 32 }}>p=1 QAOA回路で探索</h2>
      <p>
        Max-Cutと同じくγ・βスライダーで探索できますが、下の近似比グラフで見るように、
        MISはp=1では約52%しか最適値に届きません。
      </p>

      <img
        src="/circuits/step8_mis_p1.png"
        alt="Step 8 MIS quantum circuit: H, per-node RZ gates, RZZ gates, then RX gates"
        style={{ width: '100%', maxWidth: 800, display: 'block', margin: '16px auto' }}
      />
      <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
        Max-Cutの回路との違いは、RZZの前にノードごとのRZゲートが追加されている点です。
        次数4のハブ（q2）はRZ(−3γ)、次数2の葉ノードはRZ(−γ)と、係数がノードごとに
        異なることに注目してください——これがグラフ構造をH_Cに反映させる部分です。
      </p>
      <label style={{ display: 'block', margin: '16px 0' }}>
        γ = {gamma.toFixed(2)}
        <input
          type="range"
          min={0}
          max={Math.PI * 2}
          step={0.01}
          value={gamma}
          onChange={(e) => setGamma(Number(e.target.value))}
          style={{ display: 'block', width: '100%', maxWidth: 400 }}
        />
      </label>
      <label style={{ display: 'block', margin: '16px 0' }}>
        β = {beta.toFixed(2)}
        <input
          type="range"
          min={0}
          max={Math.PI}
          step={0.01}
          value={beta}
          onChange={(e) => setBeta(Number(e.target.value))}
          style={{ display: 'block', width: '100%', maxWidth: 400 }}
        />
      </label>
      {p1 && optimal && (
        <p>
          期待目的関数値 = <strong>{p1.expectedObjectiveValue.toFixed(3)}</strong> / 最適値{' '}
          {optimal.size}（緑のバーが最適な独立集合に対応するビット列）
        </p>
      )}
      {histogramDistribution && optimal && (
        <Histogram distribution={histogramDistribution} optimalCutValue={optimal.size} />
      )}

      <h2 style={{ fontSize: 18, marginTop: 32 }}>層数pごとの近似比</h2>
      {depthScan ? (
        <>
          <BarChart
            labels={depthScan.pValues.map((p) => `p=${p}`)}
            values={depthScan.approximationRatios}
            color="#3b82f6"
            yMax={1.05}
            referenceLine={{ value: 1.0, label: '真の最適解' }}
          />
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Max-Cutはp=1で約98%に達しましたが、MISは同じp=1で約
            {(depthScan.approximationRatios[0] * 100).toFixed(0)}%止まりで、p=4でも約
            {(depthScan.approximationRatios[depthScan.approximationRatios.length - 1] * 100).toFixed(0)}
            %までしか届きません。これはペナルティ法による制約の表現が、Max-Cutの
            「隣接ノードを分ける」という単純な構造よりも最適化しづらいランドスケープを
            作り出すためです。同じQAOAという手法でも、問題ごとに得意・不得意がある——
            という一般化の教訓です。
          </p>
        </>
      ) : (
        <p>計算中...</p>
      )}
    </section>
  )
}
