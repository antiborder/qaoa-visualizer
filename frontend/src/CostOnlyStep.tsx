import { useEffect, useState } from 'react'
import { BlochSphere } from './BlochSphere'
import { FormulaBlock } from './Formula'
import { Histogram } from './Histogram'
import type { CostOnlyResult } from './types'

const API_BASE = 'http://localhost:8000'
const DEBOUNCE_MS = 150

interface CostOnlyStepProps {
  optimalCutValue: number
}

export function CostOnlyStep({ optimalCutValue }: CostOnlyStepProps) {
  const [gamma, setGamma] = useState(0)
  const [result, setResult] = useState<CostOnlyResult | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/qaoa/cost-only?gamma=${gamma}`)
        .then((res) => res.json())
        .then(setResult)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [gamma])

  return (
    <section style={{ marginTop: 48 }}>
      <h1>Step 2: コストユニタリ単体の効果</h1>

      <h3 style={{ fontSize: 17 }}>Step 1からの接続</h3>
      <p>
        Max-Cut問題「Cut(A,B)を最大化する分割を探す」は、
        各ノードiにσᵢ=+1またはσᵢ=−1（どちらのグループか）を対応させ、パウリZ演算子Zᵢに
        置き換えることで、<strong>コストハミルトニアン</strong>
      </p>
      <FormulaBlock>
        H<sub>C</sub> = Σ<sub>(i,j)∈E</sub> Z<sub>i</sub>Z<sub>j</sub>
      </FormulaBlock>
      <p>
        を最小化する計算基底状態（5量子ビットのビット列）を見つける問題に変換できます
        （カットされた辺ではZᵢZⱼ=−1、カットされない辺では+1になるので、辺が多く
        切れているビット列ほどH_Cの固有値は小さくなります）。
      </p>

      <h3 style={{ fontSize: 17 }}>このStepで試すこと</h3>
      <p>H_Cが生成するユニタリ演算子</p>
      <FormulaBlock>
        U<sub>C</sub>(γ) = exp(−iγH<sub>C</sub>)
      </FormulaBlock>
      <p>
        を回路に組み込みます。Deutschのアルゴリズムのオラクルが「0と1を区別する情報」を
        位相キックバックによって位相に変換していたのと同じ発想で、これはH_Cの固有値
        （＝カットの良し悪しに対応する量）を、各計算基底状態への<strong>相対位相</strong>として
        刻み込みます。<strong>γ</strong>は、この位相をどれだけ強くかけるかを決める
        0〜2πの回転角に相当する調整可能なパラメータで、後のStepで最適化していきます。
      </p>
      <ol style={{ paddingLeft: 22, lineHeight: 1.9 }}>
        <li>初期状態|+⟩^⊗5（全量子ビットにHゲートをかけた、32通りのビット列すべてを均等に重ね合わせた状態）を用意する</li>
        <li>U_C(γ)を適用する</li>
        <li>測定して確率分布を確認する——良いカットに対応するビット列の確率は、これだけで高くなっているでしょうか？</li>
      </ol>

      <img
        src="/circuits/step2_cost_only.png"
        alt="Step 2 quantum circuit: H gates followed by RZZ gates for each edge"
        style={{ width: '100%', maxWidth: 700, display: 'block', margin: '16px auto' }}
      />
      <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
        実際にこのアプリのバックエンドが構築している回路図（Qiskitで実際に生成）。
        Hゲートの後、bowtieグラフの6本の辺それぞれに対応するRZZ(2γ)ゲートが並びます。
      </p>

      <h3 style={{ fontSize: 17 }}>結果</h3>
      <p>
        実際に測定確率分布は変化しません（位相のみ変化）。
        一方で、辺で結ばれた量子ビット同士はもつれ、各量子ビット単体のBloch球上の矢印は
        球の中心方向へ縮みます。次数が高いノード（node 2）ほど縮み方が大きいことに注目してください。
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

      {result && (
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          確率分布の最大偏差（一様分布との差）: {result.maxProbabilityDeviation.toExponential(2)}
          （ほぼ0 = 変化なしを意味する）。下のヒストグラムがγを動かしても完全に一様
          （全バー同じ高さ）のままであることに注目してください。緑のバーは最適カットに
          対応するビット列ですが、他と全く同じ高さなことがポイントです——位相だけでは
          「良い解」が有利にはならない、ということです。
        </p>
      )}

      {result && <Histogram distribution={result.distribution} optimalCutValue={optimalCutValue} />}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
        {(result?.blochVectors ?? []).map((v) => (
          <BlochSphere key={v.node} target={v} label={`node ${v.node}`} />
        ))}
      </div>
    </section>
  )
}
