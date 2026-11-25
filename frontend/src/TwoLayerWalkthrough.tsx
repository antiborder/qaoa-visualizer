import { useEffect, useState } from 'react'
import { FormulaBlock } from './Formula'
import { Landscape3D, Landscape3DLegend, Skeleton } from './Landscape3D'
import type { Lang, LayerLandscapeResult, WalkthroughStep } from './types'

// Local dev talks to the backend on :8000; in production the frontend
// is served by the backend itself, so the same origin ('' base) is used.
const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : '')
const DEBOUNCE_MS = 200

interface TwoLayerArgs {
  graphId: string
  optimalCutValue: number
  gamma1: number
  beta1: number
  onGamma1Change: (gamma1: number) => void
  onBeta1Change: (beta1: number) => void
  lang: Lang
}

const ch = (lang: Lang) => (lang === 'en' ? 'Extending to a Second Layer' : '2層目への拡張')
const secCircuit = (lang: Lang) =>
  lang === 'en' ? 'Adding a Second Layer to the Circuit' : '量子回路へ2層目を追加する'
const secResult = (lang: Lang) => (lang === 'en' ? 'Results with the Two-Layer Circuit' : '2層回路での計算結果')

function TwoLayerResultStep({
  graphId,
  optimalCutValue,
  gamma1,
  beta1,
  onGamma1Change,
  onBeta1Change,
  lang,
}: TwoLayerArgs) {
  const [layerLandscape, setLayerLandscape] = useState<LayerLandscapeResult | null>(null)
  const [gamma2, setGamma2] = useState(0)
  const [beta2, setBeta2] = useState(0)
  const [pointValue, setPointValue] = useState<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLayerLandscape(null)
      fetch(`${API_BASE}/api/qaoa/layer-landscape?gamma1=${gamma1}&beta1=${beta1}&graphId=${graphId}`)
        .then((res) => res.json())
        .then(setLayerLandscape)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [gamma1, beta1, graphId])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPointValue(null)
      fetch(
        `${API_BASE}/api/qaoa/two-layer-point?gamma1=${gamma1}&beta1=${beta1}&gamma2=${gamma2}&beta2=${beta2}&graphId=${graphId}`,
      )
        .then((res) => res.json())
        .then((data) => setPointValue(data.expectedCutValue))
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [gamma1, beta1, gamma2, beta2, graphId])

  return (
    <>
      {lang === 'en' ? (
        <>
          <h3 style={{ fontSize: 17 }}>Fix γ₁,β₁ and see how far the second layer can push it</h3>
          <p>
            γ₁,β₁ are the sliders shared with the cost unitary and mixer unitary Steps (their
            initial values are the best p=1 point found in the Parameter Landscape Step). Moving
            them here also changes the values in those Steps. The real subject of this Step is
            γ₂,β₂ below — how the expected cut value changes as you move the second layer. Compare
            it against the single-layer value and notice how far adding just one more layer can
            push it.
          </p>
        </>
      ) : (
        <>
          <h3 style={{ fontSize: 17 }}>γ₁・β₁を固定して、2層目でどこまで伸ばせるか見る</h3>
          <p>
            γ₁・β₁はコストユニタリ・ミキサーユニタリの各Stepと共有しているスライダーです
            （初期値はパラメータランドスケープのStepで見つかったp=1の最良点）。ここで動かすと
            それらのStepの値も一緒に変わります。
            このStepの本題はその下のγ₂・β₂——2層目を動かしたときに期待カット値が
            どう変わるかです。1層だけの値と比べて、2層目を足すだけでどこまで伸ばせるかに
            注目してください。
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

      <label style={{ display: 'block', margin: '16px 0' }}>
        γ₂ = {gamma2.toFixed(2)}
        <input
          type="range"
          min={0}
          max={Math.PI * 2}
          step={0.01}
          value={gamma2}
          onChange={(e) => setGamma2(Number(e.target.value))}
          style={{ display: 'block', width: '100%', maxWidth: 400 }}
        />
      </label>
      <label style={{ display: 'block', margin: '16px 0' }}>
        β₂ = {beta2.toFixed(2)}
        <input
          type="range"
          min={0}
          max={Math.PI}
          step={0.01}
          value={beta2}
          onChange={(e) => setBeta2(Number(e.target.value))}
          style={{ display: 'block', width: '100%', maxWidth: 400 }}
        />
      </label>
      {pointValue !== null &&
        (lang === 'en' ? (
          <p>
            Expected cut value at this (γ₁,β₁,γ₂,β₂): <strong>{pointValue.toFixed(3)}</strong> /
            optimal value {optimalCutValue}
          </p>
        ) : (
          <p>
            この(γ₁,β₁,γ₂,β₂)での期待カット値: <strong>{pointValue.toFixed(3)}</strong> /
            最適値 {optimalCutValue}
          </p>
        ))}

      {layerLandscape ? (
        <>
          {lang === 'en' ? (
            <p>
              Expected cut value with just one layer (γ₁,β₁ fixed, no second layer):{' '}
              <strong>{layerLandscape.oneLayerValue.toFixed(3)}</strong>
              {' → '}
              best value after optimizing the second layer:{' '}
              <strong>{layerLandscape.bestOnGrid.expectedCutValue.toFixed(3)}</strong>
              {' '}(γ₂={layerLandscape.bestOnGrid.gamma.toFixed(2)}, β₂=
              {layerLandscape.bestOnGrid.beta.toFixed(2)})
            </p>
          ) : (
            <p>
              1層だけ（γ₁, β₁固定、層2なし）の期待カット値:{' '}
              <strong>{layerLandscape.oneLayerValue.toFixed(3)}</strong>
              {' → '}
              2層目を最適化したときの最良値:{' '}
              <strong>{layerLandscape.bestOnGrid.expectedCutValue.toFixed(3)}</strong>
              （γ₂={layerLandscape.bestOnGrid.gamma.toFixed(2)}, β₂=
              {layerLandscape.bestOnGrid.beta.toFixed(2)}）
            </p>
          )}
          {lang === 'en' ? (
            <p style={{ fontSize: 13, color: '#6b7280' }}>γ₁,β₁ are fixed to the slider values above.</p>
          ) : (
            <p style={{ fontSize: 13, color: '#6b7280' }}>γ₁・β₁は上のスライダーの値に固定されています。</p>
          )}
          <Landscape3D
            landscape={layerLandscape}
            showOriginReference
            gammaLabel="γ₂"
            betaLabel="β₂"
            maxCutValue={optimalCutValue}
            currentPoint={{ gamma: gamma2, beta: beta2 }}
            currentValue={pointValue ?? undefined}
          />
          <Landscape3DLegend
            landscape={layerLandscape}
            originValue={layerLandscape.oneLayerValue}
            gammaLabel="γ₂"
            betaLabel="β₂"
            currentValue={pointValue ?? undefined}
          />
          {lang === 'en' ? (
            <p style={{ fontSize: 12, color: '#6b7280' }}>
              The black ring is the current γ₂,β₂ position; the red dot is the best point on the
              grid. Note: this is the result of optimizing only γ₂,β₂ while keeping γ₁,β₁ fixed, so
              it does not match the p=2 approximation ratio shown in the next Step's "Measured
              Results" (the true best value with all four parameters optimized jointly). Even if
              γ₁,β₁ are optimal for p=1 alone, a different combination may be better for p=2 as a
              whole.
            </p>
          ) : (
            <p style={{ fontSize: 12, color: '#6b7280' }}>
              黒い輪がγ₂・β₂の現在地、赤い点が格子上の最良点です。
              注意：これはγ₁・β₁を固定したままγ₂・β₂だけを最適化した結果であり、
              次のStepの「測定結果」で示すp=2の近似比（4パラメータを同時に最適化した
              真の最良値）とは一致しません。γ₁・β₁がp=1単体では最良でも、p=2全体
              としては別の組み合わせの方が良い場合があるためです。
            </p>
          )}
        </>
      ) : (
        <Skeleton maxWidth={740} />
      )}

      {lang === 'en' ? (
        <p>
          We've seen that even adding just one more layer leaves room to push the expected cut
          value further. In the next Step, we generalize this idea of "repeating layers" from two
          layers to a general p layers, and look at how the approximation ratio changes as p
          increases.
        </p>
      ) : (
        <p>
          層を1つ足すだけでも、こうして期待カット値をさらに伸ばせる余地があることが
          分かりました。次のStepでは、この「層を繰り返す」という考え方を2層に
          限らず一般のp層に広げ、pを増やすほど近似比がどう変化するかを見ていきます。
        </p>
      )}
    </>
  )
}

export function buildTwoLayerSteps({
  graphId,
  optimalCutValue,
  gamma1,
  beta1,
  onGamma1Change,
  onBeta1Change,
  lang,
}: TwoLayerArgs): WalkthroughStep[] {
  const CH = ch(lang)

  return [
    // --- Step: 量子回路へ2層目を追加する ---
    {
      chapter: CH,
      section: secCircuit(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              Up to now, we've applied the cost-unitary → mixer-unitary pair exactly once. Let's see
              what happens if we repeat it one more time (making it two layers).
            </p>

            <p>
              Let's trace how this circuit changes the quantum state, in ket notation. By the end of
              the Mixer Unitary Step, the state has already changed to
            </p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              Applying one more layer's worth — the cost unitary U<sub>C</sub>(γ₂) followed by the
              mixer unitary U<sub>B</sub>(β₂) — to this state gives,
            </p>
            <FormulaBlock>
              <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span>U<sub>B</sub>(β₂)U<sub>C</sub>(γ₂): U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup></span>
                <span>
                  ⟶ U<sub>B</sub>(β₂)U<sub>C</sub>(γ₂)U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
                </span>
              </span>
            </FormulaBlock>
            <p>Writing the whole thing as a single arrow,</p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β₂)U<sub>C</sub>(γ₂)U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              The contents of U<sub>C</sub>(γ₂) and U<sub>B</sub>(β₂) each decompose exactly the same
              way as the first layer, into RZZ(2γ₂) and RX(2β₂) gates — only the parameters change
              from γ₁,β₁ to γ₂,β₂.
            </p>

            <div style={{ overflowX: 'auto', margin: '16px 0' }}>
              <img
                key={graphId}
                src={`${API_BASE}/api/circuit-diagram?graphId=${graphId}&kind=p_layers`}
                alt="Two-layer quantum circuit: two repeated layers of H, RZZ, RX with barrier between them"
                style={{ height: 260, display: 'block' }}
              />
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              The circuit diagram is generated dynamically with Qiskit for the two-layer case with
              the selected graph (the dashed line marks the boundary between layers). Notice that
              the (γ₁,β₁) layer and the (γ₂,β₂) layer have independent parameters.
            </p>
          </>
        ) : (
          <>
            <p>
              ここまではコストユニタリ→ミキサーユニタリのペアを1回だけ適用していました。
              これをもう1回繰り返す（2層にする）とどうなるか見てみます。
            </p>

            <p>
              この回路が量子状態をどう変化させるかをケット記法でたどります。
              ミキサーユニタリのStepまでで、状態はすでに
            </p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              まで変化しています。ここにもう1層分、コストユニタリU<sub>C</sub>(γ₂)と
              ミキサーユニタリU<sub>B</sub>(β₂)を順に作用させると、
            </p>
            <FormulaBlock>
              <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span>U<sub>B</sub>(β₂)U<sub>C</sub>(γ₂): U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup></span>
                <span>
                  ⟶ U<sub>B</sub>(β₂)U<sub>C</sub>(γ₂)U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
                </span>
              </span>
            </FormulaBlock>
            <p>全体をまとめて1本の矢印で書くと、</p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β₂)U<sub>C</sub>(γ₂)U<sub>B</sub>(β₁)U<sub>C</sub>(γ₁)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              となります。U<sub>C</sub>(γ₂)・U<sub>B</sub>(β₂)それぞれの中身は、1層目と全く同じ
              RZZ(2γ₂)・RX(2β₂)ゲートへの分解が成り立ちます——パラメータがγ₁・β₁からγ₂・β₂に
              変わるだけです。
            </p>

            <div style={{ overflowX: 'auto', margin: '16px 0' }}>
              <img
                key={graphId}
                src={`${API_BASE}/api/circuit-diagram?graphId=${graphId}&kind=p_layers`}
                alt="Two-layer quantum circuit: two repeated layers of H, RZZ, RX with barrier between them"
                style={{ height: 260, display: 'block' }}
              />
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              回路図は選択中のグラフでの2層の場合を、Qiskitで動的に生成しています
              （点線がレイヤーの区切り）。
              (γ₁,β₁)の層と(γ₂,β₂)の層でパラメータが独立していることに注目してください。
            </p>
          </>
        ),
    },

    // --- Step: 2層回路での計算結果 ---
    {
      chapter: CH,
      section: secResult(lang),
      title: '',
      content: (
        <TwoLayerResultStep
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
