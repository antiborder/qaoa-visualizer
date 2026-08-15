import { useEffect, useState } from 'react'
import { BarChart } from './BarChart'
import type { DepthScanResult } from './types'

const API_BASE = 'http://localhost:8000'

export function DepthScanStep() {
  const [result, setResult] = useState<DepthScanResult | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/qaoa/depth-scan`)
      .then((res) => res.json())
      .then(setResult)
  }, [])

  return (
    <section style={{ marginTop: 48 }}>
      <h1>Step 6: 層数pへの一般化</h1>
      <p>
        ここまではp=1（コスト→ミキサーを1回だけ）でしたが、この繰り返しをp層に増やすと
        断熱定理に沿った経路に近づき、理論上はより良い解に収束しやすくなります。
        各pごとにランダムな初期値からCOBYLAで複数回最適化し、最良の近似比を記録します。
      </p>

      <img
        src="/circuits/step6_p_layers.png"
        alt="Step 6 quantum circuit: two repeated layers of H, RZZ, RX with barrier between them"
        style={{ width: '100%', maxWidth: 700, display: 'block', margin: '16px auto' }}
      />
      <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
        p=2の場合の回路例（点線がレイヤーの区切り）。(γ₁,β₁)の層と(γ₂,β₂)の層で
        パラメータが独立していることに注目してください——p層あれば2p個の独立した
        パラメータを最適化することになります。
      </p>

      {result ? (
        <>
          <h3 style={{ fontSize: 17 }}>測定結果</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div>
              <h2 style={{ fontSize: 16, textAlign: 'center' }}>近似比（最良解 / 真の最適値）</h2>
              <BarChart
                labels={result.pValues.map((p) => `p=${p}`)}
                values={result.approximationRatios}
                color="#22c55e"
                yMax={1.05}
                referenceLine={{ value: 1.0, label: '真の最適解' }}
              />
            </div>
            <div>
              <h2 style={{ fontSize: 16, textAlign: 'center' }}>
                勾配分散 Var[∂⟨cut⟩/∂γ₀]（ランダム初期値40点）
              </h2>
              <BarChart
                labels={result.pValues.map((p) => `p=${p}`)}
                values={result.gradientVariances}
                color="#f59e0b"
                valueFormat={(v) => v.toFixed(2)}
              />
            </div>
          </div>
          <ul style={{ fontSize: 13, color: '#6b7280', paddingLeft: 22, lineHeight: 1.8 }}>
            <li>
              近似比はp=1（{result.approximationRatios[0].toFixed(3)}）からp≧2でほぼ1に近づき、
              層を増やす効果がはっきり見える
            </li>
            <li>
              一方で勾配分散はこの5量子ビットのグラフでは明確な単調減少になっていない——
              バレンプラトー（勾配消失）は主に量子ビット数の増加によって顕著になる現象で、
              深さpだけを増やしてもこの規模では強くは現れない、という正直な結果
            </li>
            <li>量子ビット数を増やすグラフに変えると、より明確な傾向が観測できると予想される（Step 8で発展させる余地がある）</li>
          </ul>
        </>
      ) : (
        <p>計算中（数秒かかります）...</p>
      )}
    </section>
  )
}
