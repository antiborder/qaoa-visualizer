import { useEffect, useState } from 'react'
import { BlochSphere } from './BlochSphere'
import { Callout, Frac, FormulaBlock } from './Formula'
import { GraphView } from './GraphView'
import { Histogram } from './Histogram'
import type { CostOnlyResult, GraphData, PartitionEntry, WalkthroughStep } from './types'

const API_BASE = 'http://localhost:8000'
const DEBOUNCE_MS = 150

interface CostUnitaryArgs {
  graphId: string
  graph: GraphData
  partition: PartitionEntry[]
  gamma1: number
  onGamma1Change: (gamma1: number) => void
}

const CH = 'コストユニタリ'
const SEC_NODE_SIGMA = 'ノードのグループを数で表す'
const SEC_EDGE_STATUS = '辺の状態を計算する'
const SEC_CUT_COUNT = 'カット数を計算する'
const SEC_WHY_QUANTUM = 'この問題がなぜ量子コンピュータで解けるのか'
const SEC_OVERVIEW = 'QAOAの全体像'
const SEC_COST_UNITARY = 'コストユニタリ'
const SEC_PROCEDURE = '実装の手順'
const SEC_INIT_CIRCUIT = '初期状態を回路に分解する'
const SEC_COST_CIRCUIT = 'コストユニタリを回路に分解する'
const SEC_CIRCUIT = 'コストユニタリの量子回路'
const SEC_RESULT = 'コストユニタリの計算結果'

// A two-line "case" formula block: e.g. "X = +1 (...)" / "X = -1 (...)",
// the same visual pattern used throughout this app for edge/value casework.
function CaseFormula({ lines }: { lines: string[] }) {
  return (
    <FormulaBlock>
      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
        {lines.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </span>
    </FormulaBlock>
  )
}

// Step 15's interactive part (gamma1 slider -> Qiskit fetch -> histogram +
// Bloch spheres). Kept as its own small stateful component so the other ten
// steps in this chapter can stay plain, static content.
function CostUnitaryResultStep({
  graphId,
  optimalCutValue,
  gamma1,
  onGamma1Change,
}: {
  graphId: string
  optimalCutValue: number
  gamma1: number
  onGamma1Change: (gamma1: number) => void
}) {
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
    <>
      <p>
        答えは<strong>いいえ</strong>です——良いカットに対応するビット列の確率は、コスト
        ユニタリだけでは高くなりません。コストユニタリはZ基底に対して対角な演算子なので、
        各計算基底状態の確率|振幅|²はまったく動かず、実際に測定確率分布は変化しません
        （変わるのは位相だけです）。以下のヒストグラムでも、γ₁をどう動かしても、
        どのビット列でもバーの高さに変化がありません。
      </p>
      <p>
        ただし、このグラフからは見えませんが、実は確率ではなく位相で変化が出ています。
        この変化を、測定で見える確率の偏りとして取り出すのが次のミキサーユニタリのStepです。
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
    </>
  )
}

// Steps 5-11: what used to be one monolithic "コストユニタリ単体による
// マーキング" page, now built up gradually - classical node/edge bookkeeping
// (Steps 5-7) before the leap to quantum operators (Step 8), then the
// cost unitary itself (Steps 9-11). All seven share one progress-bar
// chapter/pill. Each Step is exactly one slide.
export function buildCostUnitarySteps({
  graphId,
  graph,
  partition,
  optimalCutValue,
  gamma1,
  onGamma1Change,
}: CostUnitaryArgs & { optimalCutValue: number }): WalkthroughStep[] {
  return [
    // --- Step 5: ノードのグループを数で表す ---
    {
      chapter: CH,
      section: SEC_NODE_SIGMA,
      title: '',
      content: (
        <>
          <p>ここからは、この最適な分割を総当たりではなく、量子回路（QAOA）でどう探索するかを見ていきます。</p>
          <p>まず、各ノードに、どちらのグループかを表す数（状態）を割り当てます。</p>
          <CaseFormula lines={['グループA: σ = +1', 'グループB: σ = −1']} />
          <GraphView graph={graph} partition={partition} showNodeSigma />
        </>
      ),
    },

    // --- Step 6: 辺の状態を計算する ---
    {
      chapter: CH,
      section: SEC_EDGE_STATUS,
      title: '',
      content: (
        <>
          <p>次に、辺の状態を、両端のノードの状態の積として単純に定めます。</p>
          <FormulaBlock>辺の状態 = σᵢ × σⱼ</FormulaBlock>
          <p>すると、辺の状態は次のように決まります。</p>
          <CaseFormula lines={['つながっている辺（カットされていない）: +1', 'カットされた辺: −1']} />
          <GraphView graph={graph} partition={partition} showNodeSigma edgeValue={(a, b) => String(a * b)} />
        </>
      ),
    },

    // --- Step 7: カット数を計算する ---
    {
      chapter: CH,
      section: SEC_CUT_COUNT,
      title: '',
      content: (
        <>
          <p>この積を使って、辺(i,j)が「カットされているかどうか」を0/1で表す値cut(i,j)を定めます。</p>
          <FormulaBlock>
            cut(i,j) = (1 − σᵢσⱼ) / 2
          </FormulaBlock>
          <p>すると、cut(i,j)は次のように決まります。</p>
          <CaseFormula lines={['つながっている辺: 0', 'カットされた辺: +1']} />
          <GraphView
            graph={graph}
            partition={partition}
            showNodeSigma
            edgeValue={(a, b) => String((1 - a * b) / 2)}
          />
          <p>これを全ての辺について足し合わせると、カット数の合計が求まります。</p>
          <FormulaBlock>
            Cut = Σ<sub>(i,j)∈E</sub> cut(i,j) = Σ<sub>(i,j)∈E</sub> (1 − σᵢσⱼ) / 2
          </FormulaBlock>
        </>
      ),
    },

    // --- Step 8: この問題がなぜ量子コンピュータで解けるのか ---
    {
      chapter: CH,
      section: SEC_WHY_QUANTUM,
      title: '',
      content: (
        <>
          <p>
            実はこのσᵢという±1の値は、量子力学の<strong>パウリZ演算子</strong>Zᵢの固有値と
            ちょうど一致します（Zᵢは計算基底|0⟩で固有値+1、|1⟩で固有値−1を取ります）。そこで
            Step 7の式のσᵢをそのままZᵢに置き換えると、カット数の合計はハミルトニアン
          </p>
          <FormulaBlock>
            H<sub>C</sub> = Σ<sub>(i,j)∈E</sub> Z<sub>i</sub>Z<sub>j</sub>
          </FormulaBlock>
          <p>を使って次のように書けます（|E|は辺の本数）。</p>
          <FormulaBlock>
            Cut(A,B) = (|E| − H<sub>C</sub>) / 2
          </FormulaBlock>
          <p>
            量子コンピュータは、H<sub>C</sub>のようなエルミート演算子（の生成するユニタリ）を回路として
            直接操作できます。H<sub>C</sub>の固有値が小さい（＝カット数が大きい）計算基底状態ほど測定で
            得られやすくなるように量子回路を設計できれば、Max-Cut問題を解いたことになります
            ——これが量子コンピュータでこの問題を扱える理由です。この関係は期待値についても
            線形性からそのまま成り立ち、以降のStepで使う期待カット値⟨cut⟩とH<sub>C</sub>の期待値
            ⟨H<sub>C</sub>⟩の間にも同じ形の関係式
          </p>
          <FormulaBlock>
            ⟨cut⟩ = (|E| − ⟨H<sub>C</sub>⟩) / 2
          </FormulaBlock>
          <p>
            が成り立ちます。
            したがって、H<sub>C</sub>の期待値を最小化することと⟨cut⟩を最大化することは完全に同値です。
          </p>
        </>
      ),
    },

    // --- Step 9: QAOAの全体像 ---
    {
      chapter: CH,
      section: SEC_OVERVIEW,
      title: '',
      content: (
        <>
          <p>
            ここまでで、Max-Cut問題を量子力学のハミルトニアンH<sub>C</sub>の言葉に翻訳できました。
            ここから先は、コストユニタリ・ミキサーユニタリの中身を1つずつ細かく見ていきますが、
            その前に、QAOA全体がどういう流れで問題を解いていくのか、大まかな全体像を
            先に押さえておきます。
          </p>

          <h3 style={{ fontSize: 17 }}>全体の流れ</h3>
          <ol style={{ paddingLeft: 22, lineHeight: 1.9 }}>
            <li>量子回路を構築する（どのゲートをどの量子ビットに置くかを決める）</li>
            <li>その回路を実行する（初期状態にゲート列を実際に作用させ、量子状態を作る）</li>
            <li>全ての量子ビットを計算基底（Z基底）で測定し、1本のビット列を得る</li>
          </ol>
          <p>
            この①②③を、同じγ・βのまま何度も繰り返すことで、ビット列ごとの測定確率——
            これまでのStepのヒストグラムに表れていたもの——が求まります。
          </p>

          <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>
            <li>
              <strong>良いγ・β自体も探索して見つける</strong> —
              ①で使うパラメータγ・βは、最初から分かっているわけではありません。
              それ自体を①②③の繰り返し（後の古典最適化ループのStep）によって、
              探索的に決めていく必要があります。
            </li>
            <li>
              <strong>良い解の確率を相対的に高くする</strong> —
              適切なγ・βが見つかれば、②の量子操作（コストユニタリ＋ミキサーユニタリ）
              により、カット数の大きい良い解の測定確率を、他の組み合わせに比べて
              相対的に高くすることができます（ただし最適解だけが突出して高くなるとは
              限りません）。
            </li>
            <li>
              <strong>③を複数回行い、一番良かったものを採用する</strong> —
              この状態で③の測定を複数回行い、得られたビット列の中から最も良いもの
              （カット数が最大のもの）を採用することで、Max-Cut問題の良い解を
              確率的に見つけ出します。
            </li>
          </ul>

          <p>
            <strong>得られる答えの例：</strong>
            このbowtieグラフで実際に測定を繰り返すと、あるビット列（例えば00100——
            中心のノード2だけをもう一方のグループに置く分割で、cut=4）が、他のビット列
            より高い頻度で観測されるようになります。この観測結果から、「00100（cut=4）が
            良さそうだ」と判断してこれを答えとして採用します。この値が本当に最大かどうかは、
            QAOA自身からは分かりません——このアプリでは総当たり（総当たりでの答えのStep）
            と照らし合わせて、たまたまこれが真の最適解だったと確認できていますが、
            実際に使われる大規模な問題ではその確認手段自体がなく、持ちうる計算資源の中で
            得られた最良の候補として採用することになります。
          </p>

          <Callout label="補足：これは答えを保証する手法ではない">
            <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
              QAOAは、総当たりのように必ず正しい答えにたどり着く手法ではありません。
              良い解が出やすくなるよう測定確率を偏らせる、確率的な<strong>ヒューリスティック
              </strong>——正解を保証する代わりに、経験的にうまくいきやすい方法で効率よく
              良い答えを探す工夫・手法のこと——です。この後の各Stepでは、この①②③の
              流れの中身——特にコストユニタリ・
              ミキサーユニタリが具体的に確率をどう変化させるか——を、実際の回路と数式で
              1つずつ確認していきます。
            </p>
          </Callout>
        </>
      ),
    },

    // --- Step 10: コストユニタリ ---
    {
      chapter: CH,
      section: SEC_COST_UNITARY,
      title: '',
      content: (
        <>
          <p>
            H<sub>C</sub>が生成するユニタリ演算子
          </p>
          <FormulaBlock>
            U<sub>C</sub>(γ<sub>1</sub>) = exp(−iγ<sub>1</sub>H<sub>C</sub>)
          </FormulaBlock>
          <p>
            を<strong>コストユニタリ</strong>と呼びます。これを回路に組み込みます。
          </p>
          <Callout label="補足：γ₁（ガンマ）とは">
            <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
              コストユニタリの強さ——H<sub>C</sub>の固有値（カットの良し悪しに対応する量）を位相に
              どれだけ強く刻み込むかを決める回転角です。範囲は0〜2πの調整可能なパラメータで、
              後のStepで最適化していきます。添字の「1」は、後のStep（層を複数重ねる場合）で
              1層目のγであることを表します——このStepとミキサーユニタリのStepのスライダーは
              γ₁を共有しており、どちらで動かしても同じ値が反映されます。
            </p>
          </Callout>
          <p>
            Deutschのアルゴリズムのオラクルが「0と1を区別する情報」を
            位相キックバックによって位相に変換していたのと同じ発想で、コストユニタリはH<sub>C</sub>の
            固有値を、各計算基底状態への<strong>相対位相</strong>として刻み込みます。
          </p>
        </>
      ),
    },

    // --- Step 11: 実装の手順 ---
    {
      chapter: CH,
      section: SEC_PROCEDURE,
      title: '',
      content: (
        <>
          <h3 style={{ fontSize: 17 }}>手順</h3>
          <ol style={{ paddingLeft: 22, lineHeight: 1.9 }}>
            <li>
              初期状態|+⟩^⊗n（nは量子ビット数。全量子ビットにHゲートをかけた、2ⁿ通りのビット列
              すべてを均等に重ね合わせた状態）を用意する
            </li>
            <li>
              U<sub>C</sub>(γ₁)を適用する
            </li>
            <li>
              測定して確率分布を確認する——良いカットに対応するビット列の確率は、これだけで
              高くなっているでしょうか？
            </li>
          </ol>
        </>
      ),
    },

    // --- Step 12: 初期状態を回路に分解する ---
    {
      chapter: CH,
      section: SEC_INIT_CIRCUIT,
      title: '',
      content: (
        <>
          <h3 style={{ fontSize: 17 }}>初期状態|+⟩^⊗nを回路に分解する</h3>
          <p>
            量子ビットは何もしなければ全て|0⟩から始まります。Hゲート（アダマールゲート）は
            1量子ビットを次のように変換します。
          </p>
          <FormulaBlock>
            H|0⟩ = |+⟩ = <Frac num="1" den="√2" /> (|0⟩ + |1⟩)
          </FormulaBlock>
          <p>
            これをn量子ビットそれぞれに独立にかけると（H<sup>⊗n</sup>と書きます）、積は分配できるので
          </p>
          <FormulaBlock>
            H<sup>⊗n</sup>|0⟩<sup>⊗n</sup> = |+⟩<sup>⊗n</sup> = <Frac num="1" den="√2ⁿ" />{' '}
            Σ<sub>x</sub> |x⟩
          </FormulaBlock>
          <p>
            となります。全ての量子ビットに1つずつHゲートをかけるだけで、n量子ビット分の
            2ⁿ通りのビット列xすべてに均等な振幅1/√2ⁿを持つ重ね合わせ状態が厳密に作れる、
            ということです。回路図の一番左に並ぶn個のHゲートが、まさにこの操作です。
          </p>
        </>
      ),
    },

    // --- Step 13: コストユニタリを回路に分解する ---
    {
      chapter: CH,
      section: SEC_COST_CIRCUIT,
      title: '',
      content: (
        <>
          <h3 style={{ fontSize: 17 }}>
            U<sub>C</sub>(γ₁)を回路に分解する
          </h3>
          <p>
            U<sub>C</sub>(γ₁)はn量子ビット全体にまたがる1つの抽象的なユニタリですが、これを
            そのまま1つのゲートとして実装することはできません。H<sub>C</sub>の中身
          </p>
          <FormulaBlock>
            H<sub>C</sub> = Σ<sub>(i,j)∈E</sub> Z<sub>i</sub>Z<sub>j</sub>
          </FormulaBlock>
          <p>
            を思い出すと、各項Z<sub>i</sub>Z<sub>j</sub>はどれも計算基底に対して対角な演算子どうしなので、
            互いに可換です（掛ける順序を変えても結果は変わりません）。可換な演算子の和のexpは、
            各項ごとのexpの積に誤差なく厳密に分解できるため、
          </p>
          <FormulaBlock>
            U<sub>C</sub>(γ₁) = exp(−iγ<sub>1</sub>H<sub>C</sub>) = Π<sub>(i,j)∈E</sub> exp(−iγ<sub>1</sub>Z<sub>i</sub>Z<sub>j</sub>)
          </FormulaBlock>
          <p>
            と書き直せます。この各因子exp(−iγ<sub>1</sub>Z<sub>i</sub>Z<sub>j</sub>)が、ちょうど量子回路の
            標準ゲートであるRZZ(2γ₁)（辺(i,j)の2量子ビットに作用する回転ゲート）そのものです。つまり
          </p>
          <FormulaBlock>
            U<sub>C</sub>(γ₁) = Π<sub>(i,j)∈E</sub> RZZ(2γ<sub>1</sub>)<sub>i,j</sub>
          </FormulaBlock>
          <p>
            ——グラフの辺の数だけRZZゲートを並べれば、それだけでU<sub>C</sub>(γ₁)を厳密に実装できる
            ことになります。これを実際の回路図で確認してみましょう。
          </p>
        </>
      ),
    },

    // --- Step 14: コストユニタリの量子回路 ---
    {
      chapter: CH,
      section: SEC_CIRCUIT,
      title: '',
      content: (
        <>
          <p>
            この回路が量子状態をどう変化させていくかを、Step 12・Step 13で確認した式を
            使ってケット記法でたどると、次のようになります。まず初期状態|0⟩<sup>⊗n</sup>に
            全量子ビットへHゲートをかけると（Step 12）、
          </p>
          <FormulaBlock>
            H<sup>⊗n</sup>: |0⟩<sup>⊗n</sup> ⟶ |+⟩<sup>⊗n</sup>
          </FormulaBlock>
          <p>
            続けて、コストユニタリU<sub>C</sub>(γ₁)をこの状態に作用させると、
          </p>
          <FormulaBlock>
            U<sub>C</sub>(γ₁): |+⟩<sup>⊗n</sup> ⟶ U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
          </FormulaBlock>
          <p>
            これが、この回路全体が実装している状態変化です。2つをまとめて1本の矢印で
            書くと、
          </p>
          <FormulaBlock>
            |0⟩<sup>⊗n</sup> ⟶ U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
          </FormulaBlock>
          <p>
            となります。Step 13で見た通りU<sub>C</sub>(γ₁)は各辺のRZZ(2γ₁)ゲートの積
            Π<sub>(i,j)∈E</sub> RZZ(2γ<sub>1</sub>)<sub>i,j</sub>に分解されるので、下の回路図で
            2本目の矢印（U<sub>C</sub>(γ₁)を作用させる部分）は、実際にはグラフの辺の数だけ
            並んだRZZゲート1本1本として具体的に実行されます。
          </p>

          <div style={{ overflowX: 'auto', margin: '16px 0' }}>
            <img
              key={graphId}
              src={`${API_BASE}/api/circuit-diagram?graphId=${graphId}&kind=cost_only`}
              alt="Cost-unitary quantum circuit: H gates followed by RZZ gates for each edge"
              style={{ width: '100%', minWidth: 500, maxWidth: 700, display: 'block', margin: '0 auto' }}
            />
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
            回路図は選択中のグラフに合わせてQiskitで動的に生成しています。Hゲートの後、
            選択中のグラフの各辺に対応するRZZ(2γ₁)ゲートが並びます。
          </p>
        </>
      ),
    },

    // --- Step 15: コストユニタリの計算結果 ---
    {
      chapter: CH,
      section: SEC_RESULT,
      title: '',
      content: (
        <CostUnitaryResultStep
          graphId={graphId}
          optimalCutValue={optimalCutValue}
          gamma1={gamma1}
          onGamma1Change={onGamma1Change}
        />
      ),
    },
  ]
}
