import { useEffect, useState } from 'react'
import { BlochSphere } from './BlochSphere'
import { Callout, FormulaBlock } from './Formula'
import { Histogram } from './Histogram'
import type { Lang, P1Result, WalkthroughStep } from './types'

// Local dev talks to the backend on :8000; in production the frontend
// is served by the backend itself, so the same origin ('' base) is used.
const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : '')
const DEBOUNCE_MS = 150

interface MixerUnitaryArgs {
  graphId: string
  optimalCutValue: number
  gamma1: number
  beta1: number
  onGamma1Change: (gamma1: number) => void
  onBeta1Change: (beta1: number) => void
  lang: Lang
}

const ch = (lang: Lang) => (lang === 'en' ? 'Mixer Unitary' : 'ミキサーユニタリ')
const secMixerDef = (lang: Lang) => (lang === 'en' ? 'The Mixer Unitary' : 'ミキサーユニタリ')
const secCircuit = (lang: Lang) =>
  lang === 'en' ? 'Adding the Mixer Unitary to the Circuit' : '量子回路にミキサーユニタリを追加'
const secResult = (lang: Lang) => (lang === 'en' ? "The Mixer Unitary's Computed Result" : 'ミキサーユニタリの計算結果')

function MixerResultStep({
  graphId,
  optimalCutValue,
  gamma1,
  beta1,
  onGamma1Change,
  onBeta1Change,
  lang,
}: MixerUnitaryArgs) {
  const [result, setResult] = useState<P1Result | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/qaoa/p1?gamma=${gamma1}&beta=${beta1}&graphId=${graphId}`)
        .then((res) => res.json())
        .then(setResult)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [gamma1, beta1, graphId])

  return (
    <>
      {lang === 'en' ? (
        <p>
          There's no single fixed correct combination, so try moving the sliders below and see how
          much probability you can concentrate on the optimal cut (the green bar, cutValue=
          {optimalCutValue}).
        </p>
      ) : (
        <p>
          決まった正解の組み合わせがあるわけではないので、下のスライダーを実際に
          動かして、最適カット（緑色のバー、cutValue={optimalCutValue}）に
          どれだけ確率を集められるか探してみてください。
        </p>
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
      <label style={{ display: 'block', margin: '16px 0' }}>
        β₁ = {beta1.toFixed(2)}
        <input
          type="range"
          min={0}
          max={Math.PI}
          step={0.01}
          value={beta1}
          onChange={(e) => onBeta1Change(Number(e.target.value))}
          style={{ display: 'block', width: '100%', maxWidth: 400 }}
        />
      </label>

      {result &&
        (lang === 'en' ? (
          <p>
            Expected cut value ⟨cut⟩ = <strong>{result.expectedCutValue.toFixed(3)}</strong> /
            optimal value {optimalCutValue}
          </p>
        ) : (
          <p>
            期待カット値 ⟨cut⟩ = <strong>{result.expectedCutValue.toFixed(3)}</strong> /
            最適値 {optimalCutValue}
          </p>
        ))}

      {result && <Histogram distribution={result.distribution} optimalCutValue={optimalCutValue} />}

      {lang === 'en' ? (
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          It's a success if the green (optimal-cut) bars are higher than the rest, but notice that
          the gray bars don't drop to zero. QAOA isn't a method that makes only the optimal solution
          stand out — it just makes the measurement probability of good solutions relatively higher.
          To actually obtain an answer, we measure this state repeatedly and adopt the best
          bitstring obtained (the one with the largest cut count).
        </p>
      ) : (
        <p style={{ fontSize: 13, color: '#6b7280' }}>
          緑（最適カット）のバーが他より高くなっていれば成功ですが、灰色のバーが0になる
          わけではない点に注目してください。QAOAは最適解だけを突出させる手法ではなく、
          良い解の測定確率を相対的に高くするだけです。実際に答えを得るには、この状態で
          測定を複数回行い、得られたビット列の中から最も良いもの（cut数が最大のもの）を
          採用します。
        </p>
      )}

      {lang === 'en' ? (
        <Callout label="Note: this check only works because we know the answer">
          <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
            Here we can see at a glance whether "the green bar is higher," but that's only possible
            because we already computed the true optimum by brute force (the Brute-Force Answer
            Step) — this is, in effect, an answer-key check. In the large-scale problems where QAOA
            is actually worth using, brute force is impossible, so nobody knows which bitstring is
            optimal — you can neither check every bitstring's P(b) one by one nor compare it against
            a known answer. The only clue available in real use is the expected cut value ⟨cut⟩
            estimated from sampling. In practice, you judge indirectly — "this looks like it's
            working" — from how high this value is relative to what's reasonable for the graph's
            size, and adopt the best bitstring actually obtained as the answer.
          </p>
        </Callout>
      ) : (
        <Callout label="補足：この判定は答えを知っているからできる">
          <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
            ここでは「緑のバーが高くなっているか」を一目で確認できていますが、これは
            総当たり（総当たりでの答えのStep）で真の最適値をあらかじめ求めてあるからこそ
            できる、いわば答え合わせ済みの確認です。実際にQAOAを使う意義がある大規模な
            問題では、総当たりが不可能なので、どのビット列が最適かは誰にも分かりません
            ——全ビット列のP(b)を1本ずつ確認することも、正解と照らし合わせることも
            できません。実際の運用で使える手がかりは、サンプリングで推定した期待カット値
            ⟨cut⟩だけです。この値がグラフの規模から見て妥当な範囲でどれだけ高いかを見て
            「うまくいっていそうだ」と間接的に判断し、実際に得られたビット列の中で最も
            良かったものを答えとして採用する、というのが現実の進め方になります。
          </p>
        </Callout>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 24 }}>
        {(result?.blochVectors ?? []).map((v) => (
          <BlochSphere key={v.node} target={v} label={`node ${v.node}`} color="#4f8cff" />
        ))}
      </div>
    </>
  )
}

export function buildMixerUnitarySteps({
  graphId,
  optimalCutValue,
  gamma1,
  beta1,
  onGamma1Change,
  onBeta1Change,
  lang,
}: MixerUnitaryArgs): WalkthroughStep[] {
  const CH = ch(lang)

  return [
    // --- Step 17: ミキサーユニタリ ---
    {
      chapter: CH,
      section: secMixerDef(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <h3 style={{ fontSize: 17 }}>The problem left by the cost unitary alone</h3>
            <p>
              With just the cost unitary, qubits become entangled and the information about good
              solutions gets written into the "phase" of the state, but the measurement probability
              stayed perfectly uniform (all bitstrings equal) no matter how γ₁ was changed. Since
              phase isn't directly visible even when measured, this alone gives us no way to know
              "which bitstring is a good solution."
            </p>

            <h3 style={{ fontSize: 17 }}>The mixer unitary's solution</h3>
            <p>
              To convert this hidden phase information into a "probability bias" visible in
              measurement, we add one more gate right after the cost unitary — the{' '}
              <strong>mixer unitary</strong>. First, we define the <strong>mixer Hamiltonian</strong>{' '}
              it's built from, as follows.
            </p>
            <FormulaBlock>
              H<sub>B</sub> = Σ<sub>i</sub> X<sub>i</sub>
            </FormulaBlock>
            <p>
              Xᵢ is the <strong>Pauli X operator</strong> acting on the i-th qubit. Whereas the cost
              unitary's H<sub>C</sub> was entirely made of Z<sub>i</sub>Z<sub>j</sub> terms (diagonal
              with respect to the Z basis), H<sub>B</sub> is <em>not</em> diagonal with respect to
              the Z basis — this difference is the key that converts phase into probability bias.
              Using this H<sub>B</sub>, we define the mixer unitary as follows.
            </p>
            <FormulaBlock>
              U<sub>B</sub>(β<sub>1</sub>) = exp(−iβ<sub>1</sub>H<sub>B</sub>)
            </FormulaBlock>
            <p>
              Because the mixer is not diagonal with respect to the measurement basis (the Z basis),
              it has the effect (interference) of converting phase differences into probability
              differences.
            </p>

            <Callout label="Note: what is β₁?">
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
                In this Step, we apply the cost-unitary → mixer-unitary pair exactly once (increasing
                this count is covered from the Extending to a Second Layer Step onward). The
                subscript "1" indicates it's the first layer's parameter, and the β₁ slider is shared
                across the cost unitary, mixer unitary, and Extending to a Second Layer Steps —
                moving it anywhere updates it everywhere (for γ₁, see the Cost Unitary Step).
              </p>
              <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: '#334155', margin: 0 }}>
                <li>
                  <strong>β₁ (beta)</strong>: the strength of the mixer unitary — a rotation angle
                  determining how much of the written-in phase gets converted into probability bias.
                  It ranges over 0 to π (since the eigenvalues of H<sub>B</sub>'s generator X are ±1,
                  and at β₁=π only a global phase, physically meaningless, is added, so its period is
                  π).
                </li>
              </ul>
            </Callout>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 17 }}>コストユニタリまでの問題</h3>
            <p>
              コストユニタリだけでは、量子ビット同士は
              もつれ、良い解の情報は状態の「位相」の中に書き込まれるものの、測定確率は
              γ₁をどう変えても常に完全に一様（全ビット列が均等）のままでした。位相は測定しても
              直接は見えないため、これだけでは「どのビット列が良い解か」を知る手立てが
              ありません。
            </p>

            <h3 style={{ fontSize: 17 }}>ミキサーユニタリによる解決策</h3>
            <p>
              この隠れた位相情報を、測定で見える「確率の偏り」に変換するため、
              コストユニタリの直後にもう1つのゲート——<strong>ミキサーユニタリ</strong>
              ——を追加します。まず、その元になる<strong>ミキサーハミルトニアン</strong>を
              次のように定義します。
            </p>
            <FormulaBlock>
              H<sub>B</sub> = Σ<sub>i</sub> X<sub>i</sub>
            </FormulaBlock>
            <p>
              Xᵢはi番目の量子ビットに作用する<strong>パウリX演算子</strong>です。コストユニタリの
              H<sub>C</sub>が全てZᵢZⱼ（Z基底に対して対角）だったのに対し、H<sub>B</sub>はZ基底に対して対角では
              ありません——この違いが、位相を確率の偏りに変換する鍵になります。このH<sub>B</sub>を使って、
              ミキサーユニタリを次のように定義します。
            </p>
            <FormulaBlock>
              U<sub>B</sub>(β<sub>1</sub>) = exp(−iβ<sub>1</sub>H<sub>B</sub>)
            </FormulaBlock>
            <p>
              ミキサーは測定の基底（Z基底）に対して対角ではないため、位相の違いを確率の違いへと
              変換する働き（干渉）を持ちます。
            </p>

            <Callout label="補足：β₁とは">
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
                このStepでは、コストユニタリ→ミキサーユニタリのペアを1回だけ適用します
                （この回数を増やすことは2層目への拡張のStep以降で扱います）。添字の「1」は1層目の
                パラメータであることを表し、コストユニタリ・ミキサーユニタリ・2層目への拡張の
                各Stepのβ₁スライダーはすべて同じ値を共有しています——どこで動かしても、
                他のStepに反映されます（γ₁についてはコストユニタリのStepを参照してください）。
              </p>
              <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: '#334155', margin: 0 }}>
                <li>
                  <strong>β₁（ベータ）</strong>：ミキサーユニタリの強さ——刻まれた位相をどれだけ
                  確率の偏りに変換するか——を決める回転角。範囲は0〜π（H<sub>B</sub>の生成子Xの固有値が
                  ±1で、β₁=πでは大域位相（物理的に無意味）がつくだけになるため、周期はπ）
                </li>
              </ul>
            </Callout>
          </>
        ),
    },

    // --- Step 18: 量子回路にミキサーユニタリを追加 ---
    {
      chapter: CH,
      section: secCircuit(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              Let's trace how this circuit changes the quantum state, in ket notation. By the end of
              the Cost Unitary's Quantum Circuit Step, the state has already changed to
            </p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              Applying the mixer unitary U<sub>B</sub>(β₁) to this state gives,
            </p>
            <FormulaBlock>
              U<sub>B</sub>(β₁): U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>Writing the whole thing as a single arrow,</p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              H<sub>B</sub>=Σᵢ Xᵢ is likewise a sum of mutually commuting terms (here, Xᵢ acting on
              each individual qubit), just as H<sub>C</sub> was, so by exactly the same reasoning it
              decomposes as
            </p>
            <FormulaBlock>
              U<sub>B</sub>(β₁) = exp(−iβ₁H<sub>B</sub>) = Π<sub>i</sub> exp(−iβ₁X<sub>i</sub>) = Π<sub>i</sub> RX(2β₁)<sub>i</sub>
            </FormulaBlock>
            <p>
              The n RX(2β₁) gates lined up at the end of the circuit diagram below are exactly this
              implementation of U<sub>B</sub>(β₁).
            </p>

            <div style={{ overflowX: 'auto', margin: '16px 0' }}>
              <img
                key={graphId}
                src={`${API_BASE}/api/circuit-diagram?graphId=${graphId}&kind=p1`}
                alt="Quantum circuit with mixer: H gates, RZZ gates, then RX gates"
                style={{ width: '100%', minWidth: 500, maxWidth: 700, display: 'block', margin: '0 auto' }}
              />
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              The circuit diagram is generated dynamically with Qiskit to match the selected graph.
              It's simply the Cost Unitary Step's circuit (H + RZZ) with a final column of RX(2β₁)
              gates (the mixer) added to every qubit. The circuit "depth" increases by one stage.
            </p>
          </>
        ) : (
          <>
            <p>この回路が量子状態をどう変化させるかをケット記法でたどります。コストユニタリの量子回路のStepまでで、状態はすでに</p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              まで変化しています。ここにミキサーユニタリU<sub>B</sub>(β₁)を作用させると、
            </p>
            <FormulaBlock>
              U<sub>B</sub>(β₁): U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>全体をまとめて1本の矢印で書くと、</p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              となります。H<sub>B</sub>=Σᵢ Xᵢも、H<sub>C</sub>のときと同様に互いに可換な項
              （ここでは各量子ビット単体に作用するXᵢ）の和なので、全く同じ理屈で
            </p>
            <FormulaBlock>
              U<sub>B</sub>(β₁) = exp(−iβ₁H<sub>B</sub>) = Π<sub>i</sub> exp(−iβ₁X<sub>i</sub>) = Π<sub>i</sub> RX(2β₁)<sub>i</sub>
            </FormulaBlock>
            <p>
              と分解できます。下の回路図で最後に並ぶn個のRX(2β₁)ゲートが、まさにこの
              U<sub>B</sub>(β₁)の実装です。
            </p>

            <div style={{ overflowX: 'auto', margin: '16px 0' }}>
              <img
                key={graphId}
                src={`${API_BASE}/api/circuit-diagram?graphId=${graphId}&kind=p1`}
                alt="Quantum circuit with mixer: H gates, RZZ gates, then RX gates"
                style={{ width: '100%', minWidth: 500, maxWidth: 700, display: 'block', margin: '0 auto' }}
              />
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              回路図は選択中のグラフに合わせてQiskitで動的に生成しています。コストユニタリのStepの回路
              （H + RZZ）に、最後の列としてRX(2β₁)ゲート（ミキサー）が全量子ビットに追加されただけです。
              回路の「深さ」が1段増えます。
            </p>
          </>
        ),
    },

    // --- Step 19: ミキサーユニタリの計算結果 ---
    {
      chapter: CH,
      section: secResult(lang),
      title: '',
      content: (
        <MixerResultStep
          graphId={graphId}
          optimalCutValue={optimalCutValue}
          gamma1={gamma1}
          beta1={beta1}
          onGamma1Change={onGamma1Change}
          onBeta1Change={onBeta1Change}
          lang={lang}
        />
      ),
    },
  ]
}
