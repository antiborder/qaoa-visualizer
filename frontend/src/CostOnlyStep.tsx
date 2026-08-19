import { useEffect, useState } from 'react'
import { BlochSphere } from './BlochSphere'
import { Callout, Frac, FormulaBlock } from './Formula'
import { Histogram } from './Histogram'
import type { CostOnlyResult } from './types'

const API_BASE = 'http://localhost:8000'
const DEBOUNCE_MS = 150

interface CostOnlyStepProps {
  graphId: string
  optimalCutValue: number
  gamma1: number
  onGamma1Change: (gamma1: number) => void
}

export function CostOnlyStep({ graphId, optimalCutValue, gamma1, onGamma1Change }: CostOnlyStepProps) {
  const [result, setResult] = useState<CostOnlyResult | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/qaoa/cost-only?gamma=${gamma1}&graphId=${graphId}`)
        .then((res) => res.json())
        .then(setResult)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [gamma1, graphId])

  return (
    <section style={{ marginTop: 48 }}>
      <h1>Step 2: コストユニタリ単体によるマーキング</h1>

      <p>
        ここからは、この最適な分割を総当たりではなく、量子回路（QAOA）でどう探索するかを見ていきます。
      </p>
      <p>
        Max-Cut問題「Cut(A,B)を最大化する分割を探す」は、
        各ノードiにσᵢ=+1またはσᵢ=−1（どちらのグループか）を対応させ、パウリZ演算子Zᵢに
        置き換えることで、<strong>コストハミルトニアン</strong>
      </p>
      <FormulaBlock>
        H<sub>C</sub> = Σ<sub>(i,j)∈E</sub> Z<sub>i</sub>Z<sub>j</sub>
      </FormulaBlock>
      <p>
        を最小化する計算基底状態（量子ビット数分の長さのビット列）を見つける問題に変換できます。
        Zᵢの固有値σᵢ=±1（どちらのグループか）を代入すると、各辺のZᵢZⱼはカットされているか
        どうかだけで次のように決まります。
      </p>
      <FormulaBlock>
        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
          <span>
            Z<sub>i</sub>Z<sub>j</sub> = −1　（辺(i,j)がカットされている：σᵢ≠σⱼ）
          </span>
          <span>
            Z<sub>i</sub>Z<sub>j</sub> = +1　（辺(i,j)がカットされていない：σᵢ=σⱼ）
          </span>
        </span>
      </FormulaBlock>
      <p>
        つまり辺が多く切れているビット列ほど、Σの中の−1の項が増えてH<sub>C</sub>の固有値は
        小さくなります。
      </p>
      <p>
        cut = −H<sub>C</sub>と単純には書けません——H<sub>C</sub>の固有値は辺の合計本数|E|との
        差も含むためです。正確には、各辺で[i,jが異なるグループ]=(1−σᵢσⱼ)/2であることから
        Σを取ると、次の厳密な関係式が成り立ちます。
      </p>
      <FormulaBlock>
        Cut(A,B) = <Frac num={<>|E| − H<sub>C</sub></>} den="2" />
      </FormulaBlock>
      <p>
        この関係は期待値についても線形性からそのまま成り立ち、以降のStepで使う期待カット値
        ⟨cut⟩とH<sub>C</sub>の期待値⟨H<sub>C</sub>⟩の間にも同じ形の関係式
      </p>
      <FormulaBlock>
        ⟨cut⟩ = <Frac num={<>|E| − ⟨H<sub>C</sub>⟩</>} den="2" />
      </FormulaBlock>
      <p>
        が成り立ちます。傾き−1/2の1次関数（アフィン変換）でつながっているだけなので、
        H<sub>C</sub>の期待値を最小化することと⟨cut⟩を最大化することは完全に同値です。
      </p>

      <h3 style={{ fontSize: 17 }}>このStepで試すこと</h3>
      <p>H<sub>C</sub>が生成するユニタリ演算子</p>
      <FormulaBlock>
        U<sub>C</sub>(γ<sub>1</sub>) = exp(−iγ<sub>1</sub>H<sub>C</sub>)
      </FormulaBlock>
      <p>
        を<strong>コストユニタリ</strong>と呼びます。これを回路に組み込みます。
      </p>
      <Callout label="補足：γ₁（ガンマ）とは">
        <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
          コストユニタリの強さ——H_Cの固有値（カットの良し悪しに対応する量）を位相に
          どれだけ強く刻み込むかを決める回転角です。範囲は0〜2πの調整可能なパラメータで、
          後のStepで最適化していきます。添字の「1」は、後のStep（層を複数重ねる場合）で
          1層目のγであることを表します——このStepとStep 3のスライダーはγ₁を共有しており、
          どちらで動かしても同じ値が反映されます。
        </p>
      </Callout>
      <p>
        Deutschのアルゴリズムのオラクルが「0と1を区別する情報」を
        位相キックバックによって位相に変換していたのと同じ発想で、コストユニタリはH_Cの
        固有値を、各計算基底状態への<strong>相対位相</strong>として刻み込みます。
      </p>

      <h3 style={{ fontSize: 17 }}>手順</h3>

      <ol style={{ paddingLeft: 22, lineHeight: 1.9 }}>
        <li>初期状態|+⟩^⊗n（nは量子ビット数。全量子ビットにHゲートをかけた、2ⁿ通りのビット列すべてを均等に重ね合わせた状態）を用意する</li>
        <li>U_C(γ₁)を適用する</li>
        <li>測定して確率分布を確認する——良いカットに対応するビット列の確率は、これだけで高くなっているでしょうか？</li>
      </ol>

      <div style={{ overflowX: 'auto', margin: '16px 0' }}>
        <img
          src="/circuits/step2_cost_only.png"
          alt="Step 2 quantum circuit: H gates followed by RZZ gates for each edge"
          style={{ width: '100%', minWidth: 500, maxWidth: 700, display: 'block', margin: '0 auto' }}
        />
      </div>
      <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
        回路図はbowtieグラフでの例です（Qiskitで実際に生成）。Hゲートの後、
        選択中のグラフの各辺に対応するRZZ(2γ₁)ゲートが並びます。
      </p>

      <h3 style={{ fontSize: 17 }}>結果</h3>
      <p>
        答えは<strong>いいえ</strong>です——良いカットに対応するビット列の確率は、コスト
        ユニタリだけでは高くなりません。コストユニタリはZ基底に対して対角な演算子なので、
        各計算基底状態の確率|振幅|²はまったく動かず、実際に測定確率分布は変化しません
        （変わるのは位相だけです）。以下のヒストグラムでも、γ₁をどう動かしても、
        どのビット列でもバーの高さに変化がありません。
      </p>
      <p>
        ただし、このグラフからは見えませんが、実は確率ではなく位相で変化が出ています。
        この変化を、測定で見える確率の偏りとして取り出すのが次のStep 3です。
      </p>
      <p>
        一方で、辺で結ばれた量子ビット同士はもつれ、各量子ビット単体のBloch球上の矢印は
        球の中心方向へ縮みます。次数が高いノードほど縮み方が大きいことに注目してください
        （全ノードの次数が同じグラフでは、縮み方も全ノードで同じになります）。
      </p>

      <label style={{ display: 'block', margin: '16px 0' }}>
        γ₁ = {gamma1.toFixed(2)}
        <input
          type="range"
          min={0}
          max={Math.PI * 2}
          step={0.01}
          value={gamma1}
          onChange={(e) => onGamma1Change(Number(e.target.value))}
          style={{ display: 'block', width: '100%', maxWidth: 400 }}
        />
      </label>

      {result && (
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          確率分布の最大偏差（一様分布との差）: {result.maxProbabilityDeviation.toExponential(2)}
          （ほぼ0 = 変化なしを意味する）。下のヒストグラムがγ₁を動かしても完全に一様
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
