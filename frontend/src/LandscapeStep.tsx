import { Landscape3D, Landscape3DLegend, Skeleton, nearestGridValue } from './Landscape3D'
import type { LandscapeResult } from './types'

interface LandscapeStepProps {
  landscape: LandscapeResult | null
  optimalCutValue: number
  gamma1: number
  beta1: number
  onGamma1Change: (gamma1: number) => void
  onBeta1Change: (beta1: number) => void
}

export function LandscapeStep({
  landscape,
  optimalCutValue,
  gamma1,
  beta1,
  onGamma1Change,
  onBeta1Change,
}: LandscapeStepProps) {
  return (
    <section style={{ marginTop: 48 }}>
      <p>
        ミキサーユニタリのStepでは手動でγ・βを探しましたが、ここでは(γ,β)平面上すべての点で
        期待カット値⟨cut⟩を計算し、曲面として表示します。ドラッグして回転、
        スクロールして拡大縮小できます。γ₁・β₁はコストユニタリ・ミキサーユニタリ・
        2層目への拡張の各Stepと共有しているスライダーです——ここで動かすと曲面上の
        黒い輪（現在値）も一緒に動きます。
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
      {landscape ? (
        <>
          <Landscape3D
            landscape={landscape}
            maxCutValue={optimalCutValue}
            currentPoint={{ gamma: gamma1, beta: beta1 }}
            currentValue={nearestGridValue(landscape, gamma1, beta1)}
          />
          <Landscape3DLegend
            landscape={landscape}
            currentValue={nearestGridValue(landscape, gamma1, beta1)}
          />
        </>
      ) : (
        <Skeleton maxWidth={740} />
      )}
    </section>
  )
}
