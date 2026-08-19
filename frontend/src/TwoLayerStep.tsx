import { useEffect, useState } from 'react'
import { Landscape3D, Landscape3DLegend, Skeleton } from './Landscape3D'
import type { LayerLandscapeResult } from './types'

const API_BASE = 'http://localhost:8000'
const DEBOUNCE_MS = 200

interface TwoLayerStepProps {
  graphId: string
  optimalCutValue: number
  gamma1: number
  beta1: number
  onGamma1Change: (gamma1: number) => void
  onBeta1Change: (beta1: number) => void
}

export function TwoLayerStep({
  graphId,
  optimalCutValue,
  gamma1,
  beta1,
  onGamma1Change,
  onBeta1Change,
}: TwoLayerStepProps) {
  const [layerLandscape, setLayerLandscape] = useState<LayerLandscapeResult | null>(null)
  const [gamma2, setGamma2] = useState(0)
  const [beta2, setBeta2] = useState(0)
  const [pointValue, setPointValue] = useState<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLayerLandscape(null)
      fetch(
        `${API_BASE}/api/qaoa/layer-landscape?gamma1=${gamma1}&beta1=${beta1}&graphId=${graphId}`,
      )
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
    <section style={{ marginTop: 48 }}>
      <h1>Step 6: 2層目への拡張</h1>
      <p>
        ここまではコストユニタリ→ミキサーユニタリのペアを1回だけ適用していました。
        これをもう1回繰り返す（2層にする）とどうなるか見てみます。
      </p>

      <div style={{ overflowX: 'auto', margin: '16px 0' }}>
        <img
          src="/circuits/step6_p_layers.png"
          alt="Step 6 quantum circuit: two repeated layers of H, RZZ, RX with barrier between them"
          style={{ height: 260, display: 'block' }}
        />
      </div>
      <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
        回路図はbowtieグラフでの2層の場合の例です（点線がレイヤーの区切り）。
        (γ₁,β₁)の層と(γ₂,β₂)の層でパラメータが独立していることに注目してください。
      </p>

      <h3 style={{ fontSize: 17 }}>γ₁・β₁を固定して、2層目でどこまで伸ばせるか見る</h3>
      <p>
        γ₁・β₁はStep 2・Step 3と共有しているスライダーです（初期値はStep 4で
        見つかったp=1の最良点）。ここで動かすとStep 2・Step 3の値も一緒に変わります。
        このStepの本題はその下のγ₂・β₂——2層目を動かしたときに期待カット値が
        どう変わるかです。1層だけの値と比べて、2層目を足すだけでどこまで伸ばせるかに
        注目してください。
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
      {pointValue !== null && (
        <p>
          この(γ₁,β₁,γ₂,β₂)での期待カット値: <strong>{pointValue.toFixed(3)}</strong> /
          最適値 {optimalCutValue}
        </p>
      )}

      {layerLandscape ? (
        <>
          <p>
            1層だけ（γ₁, β₁固定、層2なし）の期待カット値:{' '}
            <strong>{layerLandscape.oneLayerValue.toFixed(3)}</strong>
            {' → '}
            2層目を最適化したときの最良値:{' '}
            <strong>{layerLandscape.bestOnGrid.expectedCutValue.toFixed(3)}</strong>
            （γ₂={layerLandscape.bestOnGrid.gamma.toFixed(2)}, β₂=
            {layerLandscape.bestOnGrid.beta.toFixed(2)}）
          </p>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            γ₁・β₁は上のスライダーの値に固定されています。
          </p>
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
          <p style={{ fontSize: 12, color: '#6b7280' }}>
            黒い輪がγ₂・β₂の現在地、赤い点が格子上の最良点です。
            注意：これはγ₁・β₁を固定したままγ₂・β₂だけを最適化した結果であり、
            次のStepの「測定結果」で示すp=2の近似比（4パラメータを同時に最適化した
            真の最良値）とは一致しません。γ₁・β₁がp=1単体では最良でも、p=2全体
            としては別の組み合わせの方が良い場合があるためです。
          </p>
        </>
      ) : (
        <Skeleton maxWidth={740} />
      )}

      <p>
        層を1つ足すだけでも、こうして期待カット値をさらに伸ばせる余地があることが
        分かりました。次のStepでは、この「層を繰り返す」という考え方を2層に
        限らず一般のp層に広げ、pを増やすほど近似比がどう変化するかを見ていきます。
      </p>
    </section>
  )
}
