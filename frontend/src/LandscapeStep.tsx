import { Heatmap2D } from './Heatmap2D'
import { Landscape3D } from './Landscape3D'
import type { LandscapeResult } from './types'

interface LandscapeStepProps {
  landscape: LandscapeResult | null
}

export function LandscapeStep({ landscape }: LandscapeStepProps) {
  return (
    <section style={{ marginTop: 48 }}>
      <h1>Step 4: パラメータランドスケープ（p=1）</h1>
      <p>
        Step 3では手動でγ・βを探しましたが、ここでは(γ,β)平面上すべての点で
        期待カット値⟨cut⟩を計算し、曲面として表示します。ドラッグして回転できます。
      </p>
      {landscape ? (
        <>
          <Landscape3D landscape={landscape} />
          <ul style={{ fontSize: 13, color: '#6b7280', paddingLeft: 22, lineHeight: 1.8 }}>
            <li>X軸: γ (0〜2π) / Z軸: β (0〜π)</li>
            <li>高さ・色（灰色→緑）: ⟨cut⟩の大きさ</li>
            <li>オレンジの矢印: 勾配（⟨cut⟩が最も急に増加する方向）</li>
            <li>
              赤い球: 格子上の最良点（γ={landscape.bestOnGrid.gamma.toFixed(2)}, β=
              {landscape.bestOnGrid.beta.toFixed(2)}, ⟨cut⟩=
              {landscape.bestOnGrid.expectedCutValue.toFixed(3)}）
            </li>
          </ul>

          <h3 style={{ fontSize: 17, marginTop: 32 }}>3D曲面と2Dヒートマップ</h3>
          <p>
            3D曲面は直感をつかむのに向いていますが、視点によって正確な(γ,β)座標が
            読み取りづらくなります。同じデータを真上から見た2Dヒートマップも並べます。
            Step 5ではこの上に古典最適化器の探索軌跡を重ねます。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Heatmap2D landscape={landscape} />
          </div>
        </>
      ) : (
        <p>計算中...</p>
      )}
    </section>
  )
}
