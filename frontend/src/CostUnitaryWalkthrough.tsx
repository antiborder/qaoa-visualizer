import { useEffect, useState } from 'react'
import { BlochSphere } from './BlochSphere'
import { Callout, Frac, FormulaBlock } from './Formula'
import { GraphView } from './GraphView'
import { Histogram } from './Histogram'
import type { CostOnlyResult, GraphData, Lang, PartitionEntry, WalkthroughStep } from './types'

// Local dev talks to the backend on :8000; in production the frontend
// is served by the backend itself, so the same origin ('' base) is used.
const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : '')
const DEBOUNCE_MS = 150

interface CostUnitaryArgs {
  graphId: string
  graph: GraphData
  partition: PartitionEntry[]
  gamma1: number
  onGamma1Change: (gamma1: number) => void
  lang: Lang
}

const ch = (lang: Lang) => (lang === 'en' ? 'Cost Unitary' : 'コストユニタリ')
const secNodeSigma = (lang: Lang) => (lang === 'en' ? 'Representing Groups as Numbers' : 'ノードのグループを数で表す')
const secEdgeStatus = (lang: Lang) => (lang === 'en' ? 'Computing Edge State' : '辺の状態を計算する')
const secCutCount = (lang: Lang) => (lang === 'en' ? 'Computing the Cut Count' : 'カット数を計算する')
const secWhyQuantum = (lang: Lang) =>
  lang === 'en' ? 'Why a Quantum Computer Can Solve This' : 'この問題がなぜ量子コンピュータで解けるのか'
const secOverview = (lang: Lang) => (lang === 'en' ? 'The Big Picture of QAOA' : 'QAOAの全体像')
const secCostUnitary = (lang: Lang) => (lang === 'en' ? 'The Cost Unitary' : 'コストユニタリ')
const secProcedure = (lang: Lang) => (lang === 'en' ? 'Implementation Procedure' : '実装の手順')
const secInitCircuit = (lang: Lang) =>
  lang === 'en' ? 'Decomposing the Initial State into a Circuit' : '初期状態を回路に分解する'
const secCostCircuit = (lang: Lang) =>
  lang === 'en' ? 'Decomposing the Cost Unitary into a Circuit' : 'コストユニタリを回路に分解する'
const secCircuit = (lang: Lang) => (lang === 'en' ? "The Cost Unitary's Quantum Circuit" : 'コストユニタリの量子回路')
const secResult = (lang: Lang) => (lang === 'en' ? "The Cost Unitary's Computed Result" : 'コストユニタリの計算結果')

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
  lang,
}: {
  graphId: string
  optimalCutValue: number
  gamma1: number
  onGamma1Change: (gamma1: number) => void
  lang: Lang
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
      {lang === 'en' ? (
        <>
          <p>
            The answer is <strong>no</strong> — the probability of bitstrings corresponding to good
            cuts does not increase from the cost unitary alone. Since the cost unitary is a diagonal
            operator with respect to the Z basis, the probability |amplitude|² of each computational
            basis state doesn't move at all, so the measured probability distribution doesn't
            actually change (only the phase changes). In the histogram below too, no matter how you
            move γ₁, the bar heights don't change for any bitstring.
          </p>
          <p>
            However, although you can't see it from this graph, a change is in fact occurring — in
            phase, not probability. Extracting this change as a probability bias visible in
            measurement is the job of the next Step, the mixer unitary.
          </p>
          <p>
            Meanwhile, qubits connected by an edge become entangled, and the arrow on each
            individual qubit's Bloch sphere shrinks toward the center of the sphere. Notice that
            nodes with higher degree shrink more (for a graph where every node has the same degree,
            the shrinkage is the same for every node).
          </p>
        </>
      ) : (
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
        </>
      )}

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

      {result &&
        (lang === 'en' ? (
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Maximum deviation of the probability distribution (difference from a uniform
            distribution): {result.maxProbabilityDeviation.toExponential(2)} (close to 0 means no
            change). Notice that the histogram below stays exactly uniform (every bar the same
            height) no matter how you move γ₁. The green bars correspond to optimal-cut bitstrings,
            but the point is that they're exactly the same height as the rest — phase alone doesn't
            give "good solutions" any advantage.
          </p>
        ) : (
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            確率分布の最大偏差（一様分布との差）: {result.maxProbabilityDeviation.toExponential(2)}
            （ほぼ0 = 変化なしを意味する）。下のヒストグラムがγ₁を動かしても完全に一様
            （全バー同じ高さ）のままであることに注目してください。緑のバーは最適カットに
            対応するビット列ですが、他と全く同じ高さなことがポイントです——位相だけでは
            「良い解」が有利にはならない、ということです。
          </p>
        ))}

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
  lang,
}: CostUnitaryArgs & { optimalCutValue: number }): WalkthroughStep[] {
  const CH = ch(lang)

  return [
    // --- Step 5: ノードのグループを数で表す ---
    {
      chapter: CH,
      section: secNodeSigma(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              From here on, we'll look at how to search for this optimal partition using a quantum
              circuit (QAOA) instead of brute force.
            </p>
            <p>First, we assign each node a number (state) representing which group it belongs to.</p>
            <CaseFormula lines={['Group A: σ = +1', 'Group B: σ = −1']} />
            <GraphView graph={graph} partition={partition} showNodeSigma />
          </>
        ) : (
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
      section: secEdgeStatus(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>Next, we define an edge's state simply as the product of its two endpoint nodes' states.</p>
            <FormulaBlock>Edge state = σᵢ × σⱼ</FormulaBlock>
            <p>The edge state is then determined as follows.</p>
            <CaseFormula lines={['Connected edge (not cut): +1', 'Cut edge: −1']} />
            <GraphView graph={graph} partition={partition} showNodeSigma edgeValue={(a, b) => String(a * b)} />
          </>
        ) : (
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
      section: secCutCount(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              Using this product, we define a value cut(i,j) that represents, as 0 or 1, whether
              edge (i,j) is cut.
            </p>
            <FormulaBlock>cut(i,j) = (1 − σᵢσⱼ) / 2</FormulaBlock>
            <p>cut(i,j) is then determined as follows.</p>
            <CaseFormula lines={['Connected edge: 0', 'Cut edge: +1']} />
            <GraphView
              graph={graph}
              partition={partition}
              showNodeSigma
              edgeValue={(a, b) => String((1 - a * b) / 2)}
            />
            <p>Summing this over all edges gives the total cut count.</p>
            <FormulaBlock>
              Cut = Σ<sub>(i,j)∈E</sub> cut(i,j) = Σ<sub>(i,j)∈E</sub> (1 − σᵢσⱼ) / 2
            </FormulaBlock>
          </>
        ) : (
          <>
            <p>この積を使って、辺(i,j)が「カットされているかどうか」を0/1で表す値cut(i,j)を定めます。</p>
            <FormulaBlock>cut(i,j) = (1 − σᵢσⱼ) / 2</FormulaBlock>
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
      section: secWhyQuantum(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              This ±1 value σᵢ actually coincides exactly with the eigenvalues of the
              quantum-mechanical <strong>Pauli Z operator</strong> Zᵢ (Zᵢ has eigenvalue +1 on the
              computational basis state |0⟩, and −1 on |1⟩). So if we substitute Zᵢ directly for σᵢ
              in Step 7's formula, the total cut count can be written using the Hamiltonian
            </p>
            <FormulaBlock>
              H<sub>C</sub> = Σ<sub>(i,j)∈E</sub> Z<sub>i</sub>Z<sub>j</sub>
            </FormulaBlock>
            <p>as follows (|E| is the number of edges).</p>
            <FormulaBlock>
              Cut(A,B) = (|E| − H<sub>C</sub>) / 2
            </FormulaBlock>
            <p>
              A quantum computer can directly manipulate Hermitian operators like H<sub>C</sub> (via
              the unitary they generate) as a circuit. If we can design a quantum circuit so that
              computational basis states with a smaller H<sub>C</sub> eigenvalue (i.e. a larger cut
              count) become more likely to be measured, we will have solved the Max-Cut problem —
              this is why a quantum computer can tackle this problem. This relationship also holds,
              by linearity, for expectation values: the same form of relationship holds between the
              expected cut value ⟨cut⟩ used in later Steps and the expectation value ⟨H
              <sub>C</sub>⟩ of H<sub>C</sub>,
            </p>
            <FormulaBlock>
              ⟨cut⟩ = (|E| − ⟨H<sub>C</sub>⟩) / 2
            </FormulaBlock>
            <p>
              Therefore, minimizing the expectation value of H<sub>C</sub> and maximizing ⟨cut⟩ are
              exactly equivalent.
            </p>
          </>
        ) : (
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
      section: secOverview(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              So far, we've translated the Max-Cut problem into the language of the
              quantum-mechanical Hamiltonian H<sub>C</sub>. From here, we'll look closely at the cost
              unitary and mixer unitary one piece at a time — but before that, let's get a rough
              picture of the overall flow by which QAOA solves the problem.
            </p>

            <h3 style={{ fontSize: 17 }}>The overall flow</h3>
            <ol style={{ paddingLeft: 22, lineHeight: 1.9 }}>
              <li>Build the quantum circuit (decide which gates go on which qubits)</li>
              <li>Run the circuit (actually apply the sequence of gates to the initial state, producing a quantum state)</li>
              <li>Measure all qubits in the computational (Z) basis, obtaining one bitstring</li>
            </ol>
            <p>
              Repeating ①②③ many times with the same γ,β gives the measurement probability for each
              bitstring — what you've seen displayed as a histogram in earlier Steps.
            </p>

            <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>
              <li>
                <strong>Search for good γ,β themselves</strong> — The parameters γ,β used in ①
                aren't known in advance. They themselves must be determined by search, through
                repeating ①②③ (in the later Classical Optimization Loop Step).
              </li>
              <li>
                <strong>Raise the probability of good solutions, relatively</strong> — Once suitable
                γ,β are found, the quantum operation in ② (cost unitary + mixer unitary) can make
                the measurement probability of good solutions (large cut counts) relatively higher
                than other combinations (though the optimal solution alone won't necessarily stand
                out sharply).
              </li>
              <li>
                <strong>Repeat ③ many times and take the best result</strong> — Measuring ③
                repeatedly in this state and taking the best bitstring obtained (the one with the
                largest cut count) lets us probabilistically find a good solution to the Max-Cut
                problem.
              </li>
            </ul>

            <p>
              <strong>An example of the answer you get:</strong> if you actually repeat measurements
              on this bowtie graph, a particular bitstring (e.g. 00100 — the partition that places
              only the central node 2 in the other group, with cut=4) starts appearing more often
              than the others. From this observation, we judge that "00100 (cut=4) looks good" and
              adopt it as the answer. Whether this value is truly the maximum is something QAOA
              itself cannot tell us — in this app we can cross-check against brute force (the
              Brute-Force Answer Step) and confirm it happens to be the true optimum, but for the
              large-scale problems where QAOA is actually used, no such check is available, and we
              simply adopt the best candidate found within the computational resources we have.
            </p>

            <Callout label="Note: this method doesn't guarantee an answer">
              <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                QAOA is not a method that, like brute force, is guaranteed to reach the correct
                answer. It's a probabilistic <strong>heuristic</strong> (a technique that, rather
                than guaranteeing the correct answer, efficiently searches for a good one using an
                approach that tends to work well empirically) that biases the measurement
                probability toward good solutions. In the Steps that follow, we'll go through the
                contents of this ①②③ flow — especially how the cost unitary and mixer unitary
                concretely change the probabilities — one at a time, with actual circuits and
                formulas.
              </p>
            </Callout>
          </>
        ) : (
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
                </strong>（正解を保証する代わりに、経験的にうまくいきやすい方法で効率よく
                良い答えを探す工夫・手法）です。この後の各Stepでは、この①②③の
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
      section: secCostUnitary(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              The unitary operator generated by H<sub>C</sub>
            </p>
            <FormulaBlock>
              U<sub>C</sub>(γ<sub>1</sub>) = exp(−iγ<sub>1</sub>H<sub>C</sub>)
            </FormulaBlock>
            <p>
              is called the <strong>cost unitary</strong>. We incorporate this into the circuit.
            </p>
            <Callout label="Note: what is γ₁ (gamma)?">
              <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                The strength of the cost unitary — a rotation angle that determines how strongly
                the eigenvalue of H<sub>C</sub> (a quantity corresponding to how good or bad a cut
                is) gets written into the phase. It ranges over 0 to 2π as a tunable parameter,
                which we'll optimize in a later Step. The subscript "1" indicates it's the γ of the
                first layer, for later Steps where multiple layers are stacked — this Step's slider
                and the mixer unitary Step's slider share γ₁, so moving either one updates the same
                value.
              </p>
            </Callout>
            <p>
              By the same idea as how Deutsch's algorithm's oracle converts "information
              distinguishing 0 from 1" into phase via phase kickback, the cost unitary writes H
              <sub>C</sub>'s eigenvalue into each computational basis state as a{' '}
              <strong>relative phase</strong>.
            </p>
          </>
        ) : (
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
      section: secProcedure(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <h3 style={{ fontSize: 17 }}>Procedure</h3>
            <ol style={{ paddingLeft: 22, lineHeight: 1.9 }}>
              <li>
                Prepare the initial state |+⟩^⊗n (n is the number of qubits — the state obtained by
                applying an H gate to every qubit, an equal superposition of all 2ⁿ bitstrings)
              </li>
              <li>
                Apply U<sub>C</sub>(γ₁)
              </li>
              <li>
                Measure and check the probability distribution — is the probability of bitstrings
                corresponding to good cuts already higher, just from this?
              </li>
            </ol>
          </>
        ) : (
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
      section: secInitCircuit(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <h3 style={{ fontSize: 17 }}>Decomposing the initial state |+⟩^⊗n into a circuit</h3>
            <p>
              If left alone, qubits all start in |0⟩. The H gate (Hadamard gate) transforms a
              single qubit as follows.
            </p>
            <FormulaBlock>
              H|0⟩ = |+⟩ = <Frac num="1" den="√2" /> (|0⟩ + |1⟩)
            </FormulaBlock>
            <p>
              Applying this independently to each of n qubits (written H<sup>⊗n</sup>), and since
              the product distributes,
            </p>
            <FormulaBlock>
              H<sup>⊗n</sup>|0⟩<sup>⊗n</sup> = |+⟩<sup>⊗n</sup> = <Frac num="1" den="√2ⁿ" />{' '}
              Σ<sub>x</sub> |x⟩
            </FormulaBlock>
            <p>
              This means that simply applying one H gate to each qubit exactly produces a
              superposition where all 2ⁿ possible bitstrings x (for n qubits) have an equal
              amplitude of 1/√2ⁿ. The n H gates lined up at the very left of the circuit diagram
              are exactly this operation.
            </p>
          </>
        ) : (
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
      section: secCostCircuit(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <h3 style={{ fontSize: 17 }}>
              Decomposing U<sub>C</sub>(γ₁) into a circuit
            </h3>
            <p>
              U<sub>C</sub>(γ₁) is a single abstract unitary spanning all n qubits, but it can't be
              implemented directly as a single gate as-is. Recalling the contents of H<sub>C</sub>
            </p>
            <FormulaBlock>
              H<sub>C</sub> = Σ<sub>(i,j)∈E</sub> Z<sub>i</sub>Z<sub>j</sub>
            </FormulaBlock>
            <p>
              , each term Z<sub>i</sub>Z<sub>j</sub> is a diagonal operator with respect to the
              computational basis, so they all commute with each other (the order of multiplication
              doesn't change the result). The exponential of a sum of commuting operators
              decomposes, exactly and without error, into a product of the exponentials of each
              term, so
            </p>
            <FormulaBlock>
              U<sub>C</sub>(γ₁) = exp(−iγ<sub>1</sub>H<sub>C</sub>) = Π<sub>(i,j)∈E</sub> exp(−iγ<sub>1</sub>Z<sub>i</sub>Z<sub>j</sub>)
            </FormulaBlock>
            <p>
              this can be rewritten as above. Each factor exp(−iγ<sub>1</sub>Z<sub>i</sub>Z<sub>j</sub>)
              is exactly the standard quantum circuit gate RZZ(2γ₁) (a rotation gate acting on the
              two qubits of edge (i,j)). In other words,
            </p>
            <FormulaBlock>
              U<sub>C</sub>(γ₁) = Π<sub>(i,j)∈E</sub> RZZ(2γ<sub>1</sub>)<sub>i,j</sub>
            </FormulaBlock>
            <p>
              — simply lining up as many RZZ gates as there are edges in the graph exactly
              implements U<sub>C</sub>(γ₁). Let's check this in the actual circuit diagram.
            </p>
          </>
        ) : (
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
      section: secCircuit(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              Let's trace how this circuit changes the quantum state, in ket notation, using the
              formulas we confirmed in Steps 13 and 14. First, applying an H gate to every qubit on
              the initial state |0⟩<sup>⊗n</sup> (Step 13) gives,
            </p>
            <FormulaBlock>
              H<sup>⊗n</sup>: |0⟩<sup>⊗n</sup> ⟶ |+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>Next, applying the cost unitary U_C(γ₁) to this state gives,</p>
            <FormulaBlock>
              U<sub>C</sub>(γ₁): |+⟩<sup>⊗n</sup> ⟶ U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>This is the state change implemented by the whole circuit. Writing both as a single arrow,</p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              As we saw in Step 14, U<sub>C</sub>(γ₁) decomposes into a product of RZZ(2γ₁) gates
              over each edge, Π<sub>(i,j)∈E</sub> RZZ(2γ<sub>1</sub>)<sub>i,j</sub>, so in the circuit
              diagram below, the second arrow (applying U<sub>C</sub>(γ₁)) is actually carried out
              concretely as a series of individual RZZ gates, one per edge in the graph.
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
              The circuit diagram is generated dynamically with Qiskit to match the selected graph.
              After the H gates, an RZZ(2γ₁) gate for each edge of the selected graph follows.
            </p>
          </>
        ) : (
          <>
            <p>
              この回路が量子状態をどう変化させていくかを、Step 13・Step 14で確認した式を
              使ってケット記法でたどると、次のようになります。まず初期状態|0⟩<sup>⊗n</sup>に
              全量子ビットへHゲートをかけると（Step 13）、
            </p>
            <FormulaBlock>
              H<sup>⊗n</sup>: |0⟩<sup>⊗n</sup> ⟶ |+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>続けて、コストユニタリU<sub>C</sub>(γ₁)をこの状態に作用させると、</p>
            <FormulaBlock>
              U<sub>C</sub>(γ₁): |+⟩<sup>⊗n</sup> ⟶ U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>これが、この回路全体が実装している状態変化です。2つをまとめて1本の矢印で書くと、</p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              となります。Step 14で見た通りU<sub>C</sub>(γ₁)は各辺のRZZ(2γ₁)ゲートの積
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
      section: secResult(lang),
      title: '',
      content: (
        <CostUnitaryResultStep
          graphId={graphId}
          optimalCutValue={optimalCutValue}
          gamma1={gamma1}
          onGamma1Change={onGamma1Change}
          lang={lang}
        />
      ),
    },
  ]
}
