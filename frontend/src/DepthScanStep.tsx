import { useEffect, useState } from 'react'
import { BarChart } from './BarChart'
import { Callout, Frac, FormulaBlock } from './Formula'
import { ParameterPathChart } from './ParameterPathChart'
import type { DepthScanResult } from './types'

const API_BASE = 'http://localhost:8000'

interface DepthScanStepProps {
  graphId: string
}

export function DepthScanStep({ graphId }: DepthScanStepProps) {
  const [result, setResult] = useState<DepthScanResult | null>(null)

  useEffect(() => {
    setResult(null)
    fetch(`${API_BASE}/api/qaoa/depth-scan?graphId=${graphId}`)
      .then((res) => res.json())
      .then(setResult)
  }, [graphId])

  return (
    <section style={{ marginTop: 48 }}>
      <h1>Step 7: 層数pへの一般化</h1>
      <p>
        Step 6では層を2つに増やす（p=2）ことで、期待カット値をさらに伸ばせることを
        確認しました。この考え方を一般化し、層数pを1からさらに増やしていくと
        近似比がどう変化するかを見てみます。
      </p>
      <Callout label="補足：p（層数）とは">
        <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
          「コストユニタリ→ミキサーユニタリ」のペアを何回繰り返すかを表す層数です。
          Step 6ではp=2に拡張しましたが、ここではさらに一般のp層に広げます。
        </p>
      </Callout>
      <p>
        pを増やす（p層に増やす）と断熱定理に沿った経路に近づき、理論上はより良い解に
        収束しやすくなります（断熱定理とQAOAの関係は
        <a href="#concepts">量子力学・QAOA用語集</a>で詳しく説明しています）。各pごとに
        ランダムな初期値からCOBYLAで複数回最適化し、最良の近似比を記録します。
      </p>

      {result ? (
        <>
          <h3 style={{ fontSize: 17 }}>測定結果</h3>

          <h4 style={{ fontSize: 15, margin: '16px 0 4px' }}>近似比（最良解 / 真の最適値）</h4>
          <Callout label="補足：近似比の計算方法">
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
              各pについて、γ・βをランダムに初期化した点からCOBYLAで最適化する試行を
              R=5回繰り返し（乱数の初期値ごとに見つかる局所解が異なるため）、その中で
              最も良かった期待カット値を採用します。それを総当たりで求めた真の最大
              カット値で割ったものが近似比です。
            </p>
            <FormulaBlock>
              近似比(p) ={' '}
              <Frac
                num={<>r=1,…,Rの中でのCOBYLA最適化後の期待カット値の最大値</>}
                den={<>真の最大カット値</>}
              />
            </FormulaBlock>
            <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
              1に近いほど、その層数pで真の最適解にどれだけ近づけたかを表します。
            </p>
          </Callout>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <BarChart
              labels={result.pValues.map((p) => `p=${p}`)}
              values={result.approximationRatios}
              color="#22c55e"
              yMax={1.05}
              referenceLine={{ value: 1.0, label: '真の最適解' }}
            />
          </div>

          <h4 style={{ fontSize: 15, margin: '32px 0 4px' }}>
            勾配分散 Var[∂⟨cut⟩/∂γ₁]（ランダム初期値40点）
          </h4>
          <Callout label="補足：勾配分散の計算方法">
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
              γ・βをランダムに選んだN=40個の点θ₁,…,θ₄₀それぞれで、1層目のγ（γ₁）に
              対する厳密な勾配∂⟨cut⟩/∂γ₁を、Step 5の勾配法と同じパラメータシフト則
              （γ₁が入っている各RZZゲートを±π/2シフトして評価し、差を足し合わせる）で
              計算します。
            </p>
            <FormulaBlock>
              g(θ) ={' '}
              <Frac num="∂⟨cut⟩" den="∂γ₁" /> (θ) = Σ<sub>(i,j)∈E</sub>{' '}
              [f(θ; γ₁の辺(i,j)を+π/2シフト) − f(θ; γ₁の辺(i,j)を−π/2シフト)]
            </FormulaBlock>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
              このN個の勾配値のばらつき（分散）を計算したものが勾配分散です。ḡはN個の
              g(θₖ)の平均です。
            </p>
            <FormulaBlock>
              勾配分散(p) = <Frac num="1" den="N" /> Σ<sub>k=1</sub>
              <sup>N</sup> (g(θ<sub>k</sub>) − ḡ)²
            </FormulaBlock>
            <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
              この分散が小さいほど、ランダムな点での勾配が軒並みほぼ0に近い——
              「どちらに動かせば改善するか」という手がかりが薄れていく、バレンプラトー
              （勾配消失）の兆候です。
            </p>
          </Callout>

          <Callout label="補足：分散が小さいと何が悪いのか">
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
              <strong>これは悪いニュースです。</strong>Step 5のCOBYLA・勾配法のような
              古典最適化器は、出発点の近くで「どちらに動かせば⟨cut⟩が増えるか」という
              手がかり（勾配、または少なくとも近くの点とのわずかな差）を頼りに探索します。
              勾配がほぼ全域で0に近いと、ランダムな出発点からはこの手がかりが得られず、
              最適化器はどちらに動いてよいか分からないまま足踏みします。
            </p>
            <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
              さらに実機では期待値を有限回のショット測定から推定するため、測定には
              避けられないショットノイズ（およそ1/√ショット数の大きさ）が乗ります。
              量子ビット数が増えると真の勾配は指数関数的に小さくなる一方、ショット
              ノイズはそこまで小さくならないため、真の勾配信号がノイズに埋もれ、それを
              検出するには指数関数的に多くのショットが必要になります——これがバレン
              プラトーがQAOAやVQEのような変分量子アルゴリズムを大きな問題に拡張する
              際の主要な障壁とされる理由です。逆に勾配分散が0から離れて大きいことは
              良いニュースで、ランダムな出発点からでも古典最適化器が頼れる手がかりを
              得られることを意味します。
            </p>
          </Callout>

          <Callout label="補足：今回の測定結果は良いニュースか">
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
              ここまでは「分散が0に近づいたら何が起きるか」という一般論です。実際に
              このグラフで分散が0に近づいているかどうかは、下の測定結果を見てください。
              先に結論を言うと——この5量子ビットのbowtieグラフではpを1から5に増やしても
              分散はほぼ0にならず、6〜9程度の範囲を保ったままです。
            </p>
            <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
              <strong>今回の測定ではバレンプラトーの兆候は出ておらず、その意味では良い
              結果です。</strong>ただしこれは、まだ量子ビット数が小さく、バレンプラトーが
              強く現れる領域に達していないからだと考えられます。量子ビット数の多い
              グラフに変えると、分散がpとともに縮み始める様子が見え始める可能性が
              あります。
            </p>
          </Callout>

          <Callout label="補足：なぜγ₁だけを見ているのか">
            <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
              全パラメータ（γ₁…γₚ, β₁…βₚ）ではなくγ₁だけを見ているのは、単純化のためです
              ——1つのパラメータのシフト評価だけでも辺の数だけ回路実行が必要で、これを
              全2pパラメータ×N=40点で行うとコストが大きく膨らみます。バレンプラトーの
              標準的な文献（McCleanら, 2018）でも、十分ランダム化された回路では
              どのパラメータの勾配も同じように消失していくため、代表として1つだけ測れば
              傾向を示すには十分、という考え方に従っています。
            </p>
          </Callout>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <BarChart
              labels={result.pValues.map((p) => `p=${p}`)}
              values={result.gradientVariances}
              color="#f59e0b"
              valueFormat={(v) => v.toFixed(2)}
            />
          </div>

          <ul style={{ fontSize: 13, color: '#6b7280', paddingLeft: 22, lineHeight: 1.8, marginTop: 24 }}>
            <li>
              近似比はp=1（{result.approximationRatios[0].toFixed(3)}）からp≧2でほぼ1に近づき、
              層を増やす効果がはっきり見える
            </li>
            <li>
              一方で勾配分散はこの規模のグラフでは明確な単調減少になっていない——
              バレンプラトー（勾配消失）は主に量子ビット数の増加によって顕著になる現象で、
              深さpだけを増やしてもこの規模では強くは現れない、という正直な結果
            </li>
            <li>
              量子ビット数の多いグラフに変えると、より明確な傾向が観測できると予想される——
              Step 1のグラフ選択で他のグラフに変えて比べてみてください
            </li>
          </ul>

          <h4 style={{ fontSize: 15, margin: '32px 0 4px' }}>
            γ・β平面上の経路（p={result.pValues[result.pValues.length - 1]}）
          </h4>
          <Callout label="補足：この比較の読み方">
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
              青がCOBYLAで実際に見つかった最良解のγ<sub>i</sub>・β<sub>i</sub>（i=1からpまで、
              数字は層の順番）、オレンジの破線が
              <a href="#concepts">量子力学・QAOA用語集の§5.2</a>
              で導出した断熱定理由来のスケジュール（γ<sub>i</sub>=s<sub>i</sub>・π、
              β<sub>i</sub>=(1−s<sub>i</sub>)・π）です。
            </p>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
              オレンジの経路の絶対的な位置には意味がありません——断熱定理が要求するのは
              「時間Tが十分大きいこと」だけで、Tの具体的な値はこのアプリの中で自然には
              決まらないため、γ・βの軸に収まるようscale=πを選んで正規化しただけです。
              比較すべきは絶対値ではなく<strong>形（γが増加し、βが減少していく傾向か）</strong>
              です。
            </p>
            <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
              両者が似ていなくても不思議ではありません——断熱定理は「この形を使えば十分大きな
              pで最適解に至る」という十分条件を述べているだけで、「最良のパラメータは必ず
              この形になる」という必要条件ではないからです（詳しくは用語集§5.4）。青い経路が
              オレンジと違う形をしていたら、それはCOBYLAが断熱的な経路とは違う、非断熱的な
              近道を見つけた可能性を示しています。
            </p>
          </Callout>
          <ParameterPathChart
            actualGammas={result.bestGammas[result.bestGammas.length - 1]}
            actualBetas={result.bestBetas[result.bestBetas.length - 1]}
            adiabaticGammas={result.adiabaticGammas[result.adiabaticGammas.length - 1]}
            adiabaticBetas={result.adiabaticBetas[result.adiabaticBetas.length - 1]}
          />
          <ul
            style={{
              paddingLeft: 0,
              listStyle: 'none',
              fontSize: 13,
              color: '#374151',
              textAlign: 'center',
              lineHeight: 1.8,
            }}
          >
            <li>
              <span style={{ color: '#3b82f6', fontWeight: 700 }}>●━━</span> 実際に最適化された経路
              （COBYLAの最良解）
            </li>
            <li>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>●┄┄</span> 断熱定理由来のスケジュール
              （形のみ比較、絶対値に意味なし）
            </li>
          </ul>
        </>
      ) : (
        <p>計算中（数秒かかります）...</p>
      )}
    </section>
  )
}
