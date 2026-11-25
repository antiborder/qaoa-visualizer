import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { ConvergenceChart } from './ConvergenceChart'
import { ColVec, Frac, FormulaBlock } from './Formula'
import { Landscape3D, nearestGridValue } from './Landscape3D'
import type { Lang, LandscapeResult, OptimizerMethod, TrajectoryPoint } from './types'

// Local dev talks to the backend on :8000; in production the frontend
// is served by the backend itself, so the same origin ('' base) is used.
const API_BASE =
  import.meta.env.VITE_API_BASE ??
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : '')

const methodMeta = (lang: Lang): { key: OptimizerMethod; label: string; color: string }[] => [
  { key: 'cobyla', label: 'COBYLA', color: '#3b82f6' },
  { key: 'spsa', label: 'SPSA', color: '#a855f7' },
  {
    key: 'gradient',
    label: lang === 'en' ? 'Gradient Method (Parameter-Shift Rule)' : '勾配法（パラメータシフト則）',
    color: '#f59e0b',
  },
]

interface MethodInfo {
  key: OptimizerMethod
  name: string
  origin: string
  overview: ReactNode
  steps: ReactNode[]
  values: string
  derivation?: { title: string; body: ReactNode }
  pros: string
  cons: string
}

const SPSA_EXAMPLE_ROWS: { delta: [number, number]; dot: number; ghat: [number, number] }[] = [
  { delta: [1, 1], dot: 1, ghat: [1, 1] },
  { delta: [1, -1], dot: 5, ghat: [5, -5] },
  { delta: [-1, 1], dot: -5, ghat: [5, -5] },
  { delta: [-1, -1], dot: -1, ghat: [1, 1] },
]

function buildMethodInfo(lang: Lang): MethodInfo[] {
  if (lang === 'en') {
    return [
      {
        key: 'cobyla',
        name: 'COBYLA',
        origin: 'Constrained Optimization BY Linear Approximations (1994, M.J.D. Powell)',
        overview: (
          <>
            A gradient-free method that uses only function values, approximating the local
            landscape with a plane (a linear function) and inching toward a better direction. The
            variable being searched is the 2D vector x=(γ,β); we write the current point as x
            <sub>k</sub>=(γ<sub>k</sub>,β<sub>k</sub>).
          </>
        ),
        steps: [
          <>
            Build a triangle (a simplex — n+1 vertices, so 3 points in 2D) whose vertices are the
            current point x<sub>k</sub> and two points shifted from it by radius ρ (rho, the search
            radius — the larger it is, the bolder the move) in the γ and β directions respectively.
            This initial triangle is built by a fixed procedure, not randomly (only SPSA uses
            randomness)
          </>,
          <>
            Compute f(γ,β)=⟨cut⟩ at each of the 3 vertices
          </>,
          <>
            From the three values, determine a single plane m(x) = c + g<sub>γ</sub>(γ−γ<sub>k</sub>){' '}
            + g<sub>β</sub>(β−β<sub>k</sub>) (g is also a 2D vector (g<sub>γ</sub>,g<sub>β</sub>);
            the three unknowns c, g<sub>γ</sub>, g<sub>β</sub> are uniquely determined by the three
            simultaneous equations m(vertex)=f(vertex))
          </>,
          <>
            Move in the direction that maximizes m within the circle of radius ρ: x<sub>k+1</sub> =
            x<sub>k</sub> + ρ · <Frac num="g" den="|g|" />
          </>,
          <>If f improved, keep ρ as is; if not, shrink ρ, then return to step 1</>,
        ],
        values: "This app's values: initial ρ=0.6, maximum 40 iterations.",
        pros: 'No gradient computation needed. Converges with few evaluations in low-dimensional, low-noise settings',
        cons: 'Weak in high dimensions (many parameters) or noisy environments',
      },
      {
        key: 'spsa',
        name: 'SPSA',
        origin: 'Simultaneous Perturbation Stochastic Approximation (James C. Spall, late 1980s)',
        overview:
          'A method that moves all parameters simultaneously in a random direction and approximates the gradient from just two function evaluations.',
        steps: [
          <>
            Compute the perturbation size c<sub>k</sub> = <Frac num="c" den={<>k<sup>δ</sup></>} />,
            which shrinks with the iteration count k (δ is an exponent controlling the decay rate —
            a separate parameter unrelated to QAOA's γ. It's largest at k=1 and gradually shrinks
            afterward)
          </>,
          <>
            Generate the perturbation vector Δ<sub>k</sub> ={' '}
            <ColVec top={<>Δ<sub>k</sub><sup>γ</sup></>} bottom={<>Δ<sub>k</sub><sup>β</sup></>} />.
            The γ and β components are each independently and randomly ±1, so Δ<sub>k</sub> is one
            of <ColVec top="+1" bottom="+1" />, <ColVec top="+1" bottom="−1" />,{' '}
            <ColVec top="−1" bottom="+1" />, <ColVec top="−1" bottom="−1" /> (25% each)
          </>,
          <>
            Evaluate f=⟨cut⟩ at just the two points θ<sub>k</sub>+c<sub>k</sub>Δ<sub>k</sub> and θ
            <sub>k</sub>−c<sub>k</sub>Δ<sub>k</sub>
          </>,
          <>
            <p style={{ margin: '0 0 6px' }}>
              Compute ĝ<sub>k</sub> (the hat over g is standard statistical notation for "an
              estimate of the true gradient" — contrast this with the exact ∂⟨cut⟩/∂γ, ∂⟨cut⟩/∂β
              computed by the gradient method described later) by dividing, following the basic
              form of a partial derivative df/dx=[f(x+dx)−f(x−dx)]/(2dx), by the actual amount
              moved in the γ and β directions, c<sub>k</sub>Δ<sub>k</sub><sup>γ</sup>, c
              <sub>k</sub>Δ<sub>k</sub><sup>β</sup>:
            </p>
            <FormulaBlock>
              ĝ<sub>k</sub><sup>γ</sup> ={' '}
              <Frac
                num={<>f(θ<sub>k</sub>+c<sub>k</sub>Δ<sub>k</sub>) − f(θ<sub>k</sub>−c<sub>k</sub>Δ<sub>k</sub>)</>}
                den={<>2c<sub>k</sub>Δ<sub>k</sub><sup>γ</sup></>}
              />{' '}
              ≈ <Frac num="∂⟨cut⟩" den="∂γ" />
            </FormulaBlock>
            <FormulaBlock>
              ĝ<sub>k</sub><sup>β</sup> ={' '}
              <Frac
                num={<>f(θ<sub>k</sub>+c<sub>k</sub>Δ<sub>k</sub>) − f(θ<sub>k</sub>−c<sub>k</sub>Δ<sub>k</sub>)</>}
                den={<>2c<sub>k</sub>Δ<sub>k</sub><sup>β</sup></>}
              />{' '}
              ≈ <Frac num="∂⟨cut⟩" den="∂β" />
            </FormulaBlock>
            <p style={{ margin: '4px 0 0' }}>
              The numerator is the same difference of the two measured values for both γ and β;
              only the denominator differs, according to the amount actually moved in the γ and β
              directions (Δ<sub>k</sub><sup>γ</sup>, Δ<sub>k</sub><sup>β</sup> are the components of
              Δ<sub>k</sub> from step 2).
            </p>
          </>,
          <>
            Similarly, compute the step size a<sub>k</sub> ={' '}
            <Frac num="a" den={<>(k+A)<sup>α</sup></>} />, which shrinks with the iteration count k
          </>,
          <>
            Update the parameters by θ<sub>k+1</sub> = θ<sub>k</sub> + a<sub>k</sub> · ĝ<sub>k</sub>{' '}
            (θ=(γ,β)). Return to step 1
          </>,
        ],
        values: "This app's values: a=0.6, c=0.2, A=0, α=0.602, δ=0.101 (40 iterations).",
        derivation: {
          title: 'Why this formula converges to the true gradient (checked with a concrete example)',
          body: (
            <>
              <p style={{ margin: '0 0 8px' }}>
                Let's write the true gradient ∂⟨cut⟩/∂γ, ∂⟨cut⟩/∂β at θ<sub>k</sub> as g<sub>γ</sub>,
                g<sub>β</sub> below. By a Taylor expansion, f(θ<sub>k</sub>+c<sub>k</sub>Δ<sub>k</sub>){' '}
                − f(θ<sub>k</sub>−c<sub>k</sub>Δ<sub>k</sub>) ≈ 2c<sub>k</sub>(g<sub>γ</sub>Δ
                <sub>k</sub><sup>γ</sup> + g<sub>β</sub>Δ<sub>k</sub><sup>β</sup>), so step 4's
                formula can be rewritten as:
              </p>
              <FormulaBlock>
                ĝ<sub>k</sub><sup>γ</sup> ≈{' '}
                <Frac
                  num={<>g<sub>γ</sub>Δ<sub>k</sub><sup>γ</sup> + g<sub>β</sub>Δ<sub>k</sub><sup>β</sup></>}
                  den={<>Δ<sub>k</sub><sup>γ</sup></>}
                />
              </FormulaBlock>
              <p style={{ margin: '10px 0 8px' }}>
                The β component has the same form, just with Δ<sub>k</sub><sup>β</sup> in the
                denominator. Suppose the true gradient were g=(g<sub>γ</sub>,g<sub>β</sub>)=(3,−2)
                (normally unknown, but let's assume we know it here just to check that the
                estimator actually works). Let's compute ĝ<sub>k</sub> for each of the 4 possible
                patterns of Δ<sub>k</sub>.
              </p>
              <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 380 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #374151' }}>
                      <th style={{ textAlign: 'left', padding: '5px 10px' }}>Δ<sub>k</sub></th>
                      <th style={{ textAlign: 'left', padding: '5px 10px' }}>
                        g<sub>γ</sub>Δ<sub>k</sub><sup>γ</sup> + g<sub>β</sub>Δ<sub>k</sub><sup>β</sup>
                      </th>
                      <th style={{ textAlign: 'left', padding: '5px 10px' }}>
                        ĝ<sub>k</sub> = (value above)/Δ<sub>k</sub><sup>γ</sup>, (value above)/Δ
                        <sub>k</sub><sup>β</sup>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SPSA_EXAMPLE_ROWS.map(({ delta, dot, ghat }, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '5px 10px' }}>
                          ({delta[0] > 0 ? '+1' : '−1'}, {delta[1] > 0 ? '+1' : '−1'})
                        </td>
                        <td style={{ padding: '5px 10px' }}>{dot}</td>
                        <td style={{ padding: '5px 10px' }}>
                          ({ghat[0]}, {ghat[1]})
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ padding: '5px 10px', fontWeight: 600 }}>Average</td>
                      <td style={{ padding: '5px 10px' }}></td>
                      <td style={{ padding: '5px 10px', fontWeight: 600 }}>
                        ({(SPSA_EXAMPLE_ROWS.reduce((s, r) => s + r.ghat[0], 0) / 4).toFixed(0)},{' '}
                        {(SPSA_EXAMPLE_ROWS.reduce((s, r) => s + r.ghat[1], 0) / 4).toFixed(0)}) =
                        exactly matches g
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p style={{ margin: '8px 0 0' }}>
                The four ĝ<sub>k</sub> values — (1,1), (5,−5), and so on — are all far from the true
                value (3,−2): each individual estimate is pure noise. But because the four patterns
                occur with equal probability (25% each), averaging them gives a γ component of
                (1+5+5+1)/4=3 and a β component of (1−5−5+1)/4=−2, exactly matching the true
                gradient. The reason a<sub>k</sub> shrinks with each iteration is to average out
                this noise while gradually converging toward the true gradient's direction.
              </p>
            </>
          ),
        },
        pros: 'Always just 2 evaluations per iteration, regardless of the number of parameters. Designed for noisy environments',
        cons: 'Because the gradient estimate is noisy, the convergence path tends to be unstable and zigzag',
      },
      {
        key: 'gradient',
        name: 'Gradient Method (Parameter-Shift Rule)',
        origin: 'Classical gradient ascent + the parameter-shift rule unique to quantum circuits (exact analytical differentiation)',
        overview:
          'A method that computes the exact gradient — not an approximation — by actually shifting the Qiskit circuit by ±π/2 and evaluating it. γ is shared across 6 RZZ gates, and β across 5 RX gates.',
        steps: [
          <>
            Shift each of the 6 RZZ gates carrying γ by +π/2 and −π/2 one at a time, evaluate the
            circuit, and sum the differences over all 6 gates to get <Frac num="∂⟨cut⟩" den="∂γ" />
          </>,
          <>
            Do the same for the 5 RX gates carrying β, summing the differences over all 5 gates to
            get <Frac num="∂⟨cut⟩" den="∂β" />
          </>,
          <>
            Update the parameters by (γ, β) ← (γ, β) + lr (a fixed learning rate) ·{' '}
            (<Frac num="∂⟨cut⟩" den="∂γ" />, <Frac num="∂⟨cut⟩" den="∂β" />)
          </>,
          <>Return to step 1</>,
        ],
        values: "This app's values: learning rate lr=0.03, 25 iterations (22 circuit evaluations per iteration).",
        pros: 'Converges most smoothly and accurately on a noise-free simulator',
        cons: 'The number of evaluations needed per gradient computation grows in proportion to the number of parameters. On real hardware, this requires many shots, increasing cost',
      },
    ]
  }

  return [
    {
      key: 'cobyla',
      name: 'COBYLA',
      origin: 'Constrained Optimization BY Linear Approximations（1994年, M.J.D. Powell）',
      overview: (
        <>
          関数の値だけを使い、局所的な平面（1次関数）で近似しながら少しずつ良い方向へ進む、勾配を使わない手法です。探索する変数はx=(γ,β)という2次元のベクトルで、現在の点をx
          <sub>k</sub>=(γ<sub>k</sub>,β<sub>k</sub>)と書きます。
        </>
      ),
      steps: [
        <>
          現在の点x<sub>k</sub>と、そこからγ方向・β方向にそれぞれ半径ρ（ロー、探索半径。
          大きいほど大胆に動く）だけずらした2点を頂点とする三角形
          （シンプレックス、n+1個の頂点。2次元なので3点）を作る。この初期の三角形はランダム
          ではなく決まった手順で作られる（乱数を使うのはSPSAだけ）
        </>,
        <>3頂点それぞれでf(γ,β)=⟨cut⟩を計算する</>,
        <>
          3点の値から、平面 m(x) = c + g<sub>γ</sub>(γ−γ<sub>k</sub>) + g<sub>β</sub>(β−β<sub>k</sub>){' '}
          を1つ決める（gも(g<sub>γ</sub>,g<sub>β</sub>)という2次元ベクトル。未知数c, g<sub>γ</sub>,
          g<sub>β</sub>の3個を、m(頂点)=f(頂点)とおいた3本の連立方程式から一意に求める）
        </>,
        <>
          半径ρの円の中でmを最大化する方向 x<sub>k+1</sub> = x<sub>k</sub> + ρ ·{' '}
          <Frac num="g" den="|g|" /> へ移動する
        </>,
        <>fが改善すればそのままρで、改善しなければρを縮小して、手順1へ戻る</>,
      ],
      values: 'このアプリの値：初期のρ=0.6、最大反復回数40回。',
      pros: '勾配計算が不要。低次元・ノイズの少ない環境では少ない評価回数で収束',
      cons: '高次元（パラメータ数が多い）やノイズの強い環境には弱い',
    },
    {
      key: 'spsa',
      name: 'SPSA',
      origin: 'Simultaneous Perturbation Stochastic Approximation（James C. Spall, 1980年代末）',
      overview: '全パラメータを同時にランダムな方向へ動かし、たった2点の評価だけで勾配を近似する手法です。',
      steps: [
        <>
          反復回数kに応じて縮小する摂動幅 c<sub>k</sub> = <Frac num="c" den={<>k<sup>δ</sup></>} />{' '}
          を計算する（δは減衰の速さを決める指数。QAOAのγとは無関係の別のパラメータ。
          k=1回目が最も大きく、以降だんだん小さくなる）
        </>,
        <>
          摂動ベクトル Δ<sub>k</sub> = <ColVec top={<>Δ<sub>k</sub><sup>γ</sup></>} bottom={<>Δ<sub>k</sub><sup>β</sup></>} />{' '}
          を生成する。γ成分・β成分はそれぞれ独立に+1か−1をランダムに取るため、Δ<sub>k</sub>は
          <ColVec top="+1" bottom="+1" />, <ColVec top="+1" bottom="−1" />,{' '}
          <ColVec top="−1" bottom="+1" />, <ColVec top="−1" bottom="−1" /> の4通り（各25%）のいずれかになる
        </>,
        <>
          θ<sub>k</sub>+c<sub>k</sub>Δ<sub>k</sub> と θ<sub>k</sub>−c<sub>k</sub>Δ<sub>k</sub> の2点だけで
          f=⟨cut⟩を評価する
        </>,
        <>
          <p style={{ margin: '0 0 6px' }}>
            ĝ<sub>k</sub>（gの上のハットは「真の勾配の推定値」を表す統計学の標準的な記法。
            後述の勾配法が計算する厳密な∂⟨cut⟩/∂γ, ∂⟨cut⟩/∂βと対比してほしい）を、偏微分の基本形
            df/dx=[f(x+dx)−f(x−dx)]/(2dx) のとおり、γ方向・β方向それぞれで実際に動いた量
            c<sub>k</sub>Δ<sub>k</sub><sup>γ</sup>, c<sub>k</sub>Δ<sub>k</sub><sup>β</sup> で割って求める：
          </p>
          <FormulaBlock>
            ĝ<sub>k</sub><sup>γ</sup> ={' '}
            <Frac
              num={<>f(θ<sub>k</sub>+c<sub>k</sub>Δ<sub>k</sub>) − f(θ<sub>k</sub>−c<sub>k</sub>Δ<sub>k</sub>)</>}
              den={<>2c<sub>k</sub>Δ<sub>k</sub><sup>γ</sup></>}
            />{' '}
            ≈ <Frac num="∂⟨cut⟩" den="∂γ" />
          </FormulaBlock>
          <FormulaBlock>
            ĝ<sub>k</sub><sup>β</sup> ={' '}
            <Frac
              num={<>f(θ<sub>k</sub>+c<sub>k</sub>Δ<sub>k</sub>) − f(θ<sub>k</sub>−c<sub>k</sub>Δ<sub>k</sub>)</>}
              den={<>2c<sub>k</sub>Δ<sub>k</sub><sup>β</sup></>}
            />{' '}
            ≈ <Frac num="∂⟨cut⟩" den="∂β" />
          </FormulaBlock>
          <p style={{ margin: '4px 0 0' }}>
            分子はγ用もβ用も同じ2点の測定値の差。分母だけが、γ方向・β方向で実際に動いた量に
            応じて異なる（Δ<sub>k</sub><sup>γ</sup>, Δ<sub>k</sub><sup>β</sup>は手順2のΔ<sub>k</sub>の成分）。
          </p>
        </>,
        <>
          同様に反復回数kに応じて縮小するステップ幅 a<sub>k</sub> ={' '}
          <Frac num="a" den={<>(k+A)<sup>α</sup></>} /> を計算する
        </>,
        <>
          θ<sub>k+1</sub> = θ<sub>k</sub> + a<sub>k</sub> · ĝ<sub>k</sub> でパラメータを更新する
          （θ=(γ,β)）。手順1へ戻る
        </>,
      ],
      values: 'このアプリの値：a=0.6, c=0.2, A=0, α=0.602, δ=0.101（反復回数40回）。',
      derivation: {
        title: 'なぜこの式が真の勾配に収束するのか（具体例で確認）',
        body: (
          <>
            <p style={{ margin: '0 0 8px' }}>
              θ<sub>k</sub>における真の勾配∂⟨cut⟩/∂γ, ∂⟨cut⟩/∂βを、以下ではg<sub>γ</sub>, g<sub>β</sub>と
              書きます。テイラー展開よりf(θ<sub>k</sub>+c<sub>k</sub>Δ<sub>k</sub>) −{' '}
              f(θ<sub>k</sub>−c<sub>k</sub>Δ<sub>k</sub>) ≈ 2c<sub>k</sub>(g<sub>γ</sub>Δ<sub>k</sub><sup>γ</sup>{' '}
              + g<sub>β</sub>Δ<sub>k</sub><sup>β</sup>)なので、手順4の式は次のように書き直せます：
            </p>
            <FormulaBlock>
              ĝ<sub>k</sub><sup>γ</sup> ≈{' '}
              <Frac
                num={<>g<sub>γ</sub>Δ<sub>k</sub><sup>γ</sup> + g<sub>β</sub>Δ<sub>k</sub><sup>β</sup></>}
                den={<>Δ<sub>k</sub><sup>γ</sup></>}
              />
            </FormulaBlock>
            <p style={{ margin: '10px 0 8px' }}>
              β成分についても分母がΔ<sub>k</sub><sup>β</sup>になるだけで同じ形です。仮に真の勾配が
              g=(g<sub>γ</sub>,g<sub>β</sub>)=(3,−2)だったとして（本来は未知の値ですが、推定が機能するか検証するために
              ここだけ知っているとします）、Δ<sub>k</sub>が取りうる4パターンそれぞれでĝ<sub>k</sub>を計算してみます。
            </p>
            <div style={{ overflowX: 'auto', margin: '8px 0' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 380 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #374151' }}>
                    <th style={{ textAlign: 'left', padding: '5px 10px' }}>Δ<sub>k</sub></th>
                    <th style={{ textAlign: 'left', padding: '5px 10px' }}>
                      g<sub>γ</sub>Δ<sub>k</sub><sup>γ</sup> + g<sub>β</sub>Δ<sub>k</sub><sup>β</sup>
                    </th>
                    <th style={{ textAlign: 'left', padding: '5px 10px' }}>
                      ĝ<sub>k</sub> = (上の値)/Δ<sub>k</sub><sup>γ</sup>, (上の値)/Δ<sub>k</sub><sup>β</sup>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SPSA_EXAMPLE_ROWS.map(({ delta, dot, ghat }, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '5px 10px' }}>
                        ({delta[0] > 0 ? '+1' : '−1'}, {delta[1] > 0 ? '+1' : '−1'})
                      </td>
                      <td style={{ padding: '5px 10px' }}>{dot}</td>
                      <td style={{ padding: '5px 10px' }}>
                        ({ghat[0]}, {ghat[1]})
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: '5px 10px', fontWeight: 600 }}>平均</td>
                    <td style={{ padding: '5px 10px' }}></td>
                    <td style={{ padding: '5px 10px', fontWeight: 600 }}>
                      ({(SPSA_EXAMPLE_ROWS.reduce((s, r) => s + r.ghat[0], 0) / 4).toFixed(0)},{' '}
                      {(SPSA_EXAMPLE_ROWS.reduce((s, r) => s + r.ghat[1], 0) / 4).toFixed(0)}) = g と完全一致
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ margin: '8px 0 0' }}>
              4通りのĝ<sub>k</sub>は(1,1)や(5,−5)など、どれも真の値(3,−2)からかけ離れています——1回1回の推定は
              ノイズだらけです。しかし4パターンは等確率（各25%）で起こるため、平均を取ると
              γ成分は(1+5+5+1)/4=3、β成分は(1−5−5+1)/4=−2と、真の勾配にぴったり一致します。
              a<sub>k</sub>が反復とともに小さくなっていくのは、このノイズを均しながら少しずつ
              真の勾配の方向へ収束させていくためです。
            </p>
          </>
        ),
      },
      pros: 'パラメータ数によらず1反復あたり常に2回の評価で済む。ノイズの多い環境向けに設計されている',
      cons: '勾配推定にノイズが乗るため収束経路が不安定・ジグザグになりやすい',
    },
    {
      key: 'gradient',
      name: '勾配法（パラメータシフト則）',
      origin: '古典的な勾配上昇法 ＋ 量子回路特有のパラメータシフト則（厳密な解析的微分）',
      overview:
        'Qiskit回路を実際に±π/2シフトして評価することで、近似ではなく厳密な勾配を求める手法です。γは6本のRZZゲート、βは5本のRXゲートに同じ値が入っています。',
      steps: [
        <>
          γが入っている6本のRZZゲートを1本ずつ+π/2、−π/2シフトして回路を評価し、その差を6本分足し合わせて{' '}
          <Frac num="∂⟨cut⟩" den="∂γ" /> を求める
        </>,
        <>
          βが入っている5本のRXゲートについても同様に、その差を5本分足し合わせて{' '}
          <Frac num="∂⟨cut⟩" den="∂β" /> を求める
        </>,
        <>
          (γ, β) ← (γ, β) + lr（学習率、一定値） · (<Frac num="∂⟨cut⟩" den="∂γ" />,{' '}
          <Frac num="∂⟨cut⟩" den="∂β" />) でパラメータを更新する
        </>,
        <>手順1へ戻る</>,
      ],
      values: 'このアプリの値：学習率lr=0.03、反復回数25回（1反復あたり22回の回路評価）。',
      pros: 'ノイズのないシミュレータでは最も滑らかかつ正確に収束する',
      cons: '1回の勾配計算に必要な評価回数がパラメータ数に比例して増加。実機では多ショットが必要でコスト増',
    },
  ]
}

interface MethodBoxProps {
  color: string
  children: ReactNode
}

// A colored variant of the app's usual gray Callout, used to visually tell
// the 3 optimizer write-ups apart at a glance - each keyed to the same color
// used for that method's trajectory line in the heatmap/convergence chart.
function MethodBox({ color, children }: MethodBoxProps) {
  return (
    <div
      style={{
        background: `${color}12`,
        border: `1px solid ${color}40`,
        borderLeft: `5px solid ${color}`,
        borderRadius: 8,
        padding: '18px 22px',
        margin: '24px 0',
      }}
    >
      {children}
    </div>
  )
}

interface OptimizeStepProps {
  graphId: string
  landscape: LandscapeResult | null
  optimalCutValue: number
  lang: Lang
}

export function OptimizeStep({ graphId, landscape, optimalCutValue, lang }: OptimizeStepProps) {
  const [startPoint, setStartPoint] = useState({ gamma: 3.0, beta: 1.0 })
  const [trajectories, setTrajectories] = useState<Record<OptimizerMethod, TrajectoryPoint[]>>({
    cobyla: [],
    spsa: [],
    gradient: [],
  })
  const [running, setRunning] = useState<OptimizerMethod | null>(null)

  useEffect(() => {
    setTrajectories({ cobyla: [], spsa: [], gradient: [] })
  }, [graphId])

  const runOptimizer = async (method: OptimizerMethod) => {
    setRunning(method)
    const res = await fetch(
      `${API_BASE}/api/qaoa/optimize?method=${method}&gamma0=${startPoint.gamma}&beta0=${startPoint.beta}&graphId=${graphId}`,
    )
    const data = await res.json()
    setTrajectories((prev) => ({ ...prev, [method]: data.trajectory }))
    setRunning(null)
  }

  const METHODS = methodMeta(lang)
  const METHOD_INFO = buildMethodInfo(lang)

  const series = METHODS.map((m) => ({
    label: m.label,
    color: m.color,
    points: trajectories[m.key],
  })).filter((s) => s.points.length > 0)

  return (
    <section style={{ marginTop: 48, marginBottom: 64 }}>
      {lang === 'en' ? (
        <>
          <p>
            As mentioned in the Cost Unitary Step, γ,β aren't known in advance — they themselves
            must be determined by search. Each step of this search re-runs the whole "build circuit
            → run → measure" flow for a candidate (γ,β), and recomputes the expected cut value
            ⟨cut⟩ (and gradient) from it — in other words, this flow repeats once for every
            iteration of the search.
          </p>
          <p>
            Choose a starting point (γ,β) with the slider below, and compare three classical
            optimization algorithms searching from the same starting point. COBYLA, SPSA, and the
            gradient method (parameter-shift rule, exact differentiation by actually shifting the
            Qiskit circuit by ±π/2) each search the (γ,β) space with a different strategy, and the
            quantum circuit is run with Qiskit each time.
          </p>
          <p style={{ fontSize: 12, color: '#6b7280' }}>
            You can compare, with your own eyes, how each method actually converges using the
            slider, 3D surface, and buttons below.
          </p>
        </>
      ) : (
        <>
          <p>
            コストユニタリのStepで触れたとおり、γ・βは最初から分かっているわけではなく、
            それ自体を探索的に決める必要があります。この探索の1手ごとに、候補となる
            (γ,β)で「回路を構築→実行→測定」の一連の流れをあらためて行い、そこから
            期待カット値⟨cut⟩（や勾配）を計算し直します——つまり探索の反復回数だけ、
            この一連の流れを繰り返すことになります。
          </p>
          <p>
            下のスライダーで開始点(γ,β)を選び、3つの古典最適化アルゴリズムに
            同じ開始点から探索させて比較します。COBYLA・SPSA・勾配法（パラメータシフト則、
            Qiskit回路を実際に±π/2シフトして評価する厳密な微分）はそれぞれ異なる戦略で
            (γ,β)空間を探索し、量子回路はその都度Qiskitで実行されます。
          </p>
          <p style={{ fontSize: 12, color: '#6b7280' }}>
            実際にどの手法がどう収束するかは、下のスライダーと3D曲面、ボタンで自分の目で比較できます。
          </p>
        </>
      )}

      {landscape ? (
        <>
          <label style={{ display: 'block', margin: '16px 0' }}>
            {lang === 'en' ? 'Start point γ = ' : '開始点 γ = '}
            {startPoint.gamma.toFixed(2)}
            <input
              type="range"
              min={0}
              max={Math.PI * 2}
              step={0.01}
              value={startPoint.gamma}
              onChange={(e) => setStartPoint((p) => ({ ...p, gamma: Number(e.target.value) }))}
              style={{ display: 'block', width: '100%', maxWidth: 400 }}
            />
          </label>
          <label style={{ display: 'block', margin: '16px 0' }}>
            {lang === 'en' ? 'Start point β = ' : '開始点 β = '}
            {startPoint.beta.toFixed(2)}
            <input
              type="range"
              min={0}
              max={Math.PI}
              step={0.01}
              value={startPoint.beta}
              onChange={(e) => setStartPoint((p) => ({ ...p, beta: Number(e.target.value) }))}
              style={{ display: 'block', width: '100%', maxWidth: 400 }}
            />
          </label>

          <h4 style={{ fontSize: 14, margin: '0 0 6px', textAlign: 'center' }}>
            {lang === 'en'
              ? `Search trajectory on the 3D surface (projected onto the plane at height ⟨cut⟩=${optimalCutValue})`
              : `3D曲面上の探索軌跡（⟨cut⟩=${optimalCutValue}の高さの平面に投影）`}
          </h4>
          <Landscape3D
            landscape={landscape}
            maxCutValue={optimalCutValue}
            trajectories={series}
            currentPoint={startPoint}
            currentValue={nearestGridValue(landscape, startPoint.gamma, startPoint.beta)}
          />
          <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
            {lang === 'en'
              ? `The black ring is the starting point: γ=${startPoint.gamma.toFixed(2)}, β=${startPoint.beta.toFixed(2)}`
              : `黒い輪が開始点: γ=${startPoint.gamma.toFixed(2)}, β=${startPoint.beta.toFixed(2)}`}
          </p>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {METHODS.map((m) => (
              <button key={m.key} onClick={() => runOptimizer(m.key)} disabled={running !== null}>
                {running === m.key
                  ? lang === 'en'
                    ? 'Running...'
                    : '実行中...'
                  : lang === 'en'
                    ? `Optimize with ${m.label}`
                    : `${m.label}で最適化`}
              </button>
            ))}
          </div>

          {series.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 13, marginBottom: 8 }}>
                {series.map((s) => (
                  <span key={s.label} style={{ color: s.color }}>
                    ● {s.label}: {lang === 'en' ? 'final ⟨cut⟩=' : '最終⟨cut⟩='}
                    {s.points[s.points.length - 1].expectedCutValue.toFixed(3)}
                  </span>
                ))}
              </div>
              <ConvergenceChart series={series} optimalCutValue={optimalCutValue} />
            </div>
          )}
        </>
      ) : (
        <p>{lang === 'en' ? 'Computing landscape...' : 'ランドスケープ計算中...'}</p>
      )}

      <h3 style={{ fontSize: 17, marginTop: 32 }}>
        {lang === 'en' ? 'Comparing the Three Methods' : '3手法の比較'}
      </h3>
      <div style={{ overflowX: 'auto', margin: '8px 0 16px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 500 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #374151' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}></th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>COBYLA</th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>SPSA</th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                {lang === 'en' ? 'Gradient Method' : '勾配法'}
              </th>
            </tr>
          </thead>
          <tbody>
            {(lang === 'en'
              ? [
                  ['Category', 'Derivative-free (linear approximation)', 'Stochastic gradient approximation', 'Exact analytical gradient'],
                  ['Evaluations per iteration', 'Variable (depends on simplex size)', 'Always 2', 'Proportional to parameter count (22 here)'],
                  ['Smoothness of convergence', 'Moderate (some oscillation)', 'Unstable, zigzag', 'Smoothest'],
                  ['Robustness to hardware noise', 'Moderate', 'High', 'Low (needs many shots)'],
                  ['Suitability for high dimensions (large p)', 'Poor', 'Good (dimension-independent)', 'Poor (degrades linearly)'],
                ]
              : [
                  ['分類', '微分不要（線形近似）', '確率的勾配近似', '厳密な解析的勾配'],
                  ['1反復の評価回数', '可変（単体サイズに依存）', '常に2回', 'パラメータ数に比例（今回22回）'],
                  ['収束の滑らかさ', '中程度（やや振動）', '不安定・ジグザグ', '最も滑らか'],
                  ['実機ノイズへの頑健性', '中程度', '高い', '低い（多ショットが必要）'],
                  ['高次元（大きいp）への適性', '苦手', '得意（次元非依存）', '苦手（線形に悪化）'],
                ]
            ).map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    style={{
                      padding: '6px 8px',
                      fontWeight: j === 0 ? 600 : 400,
                      color: j === 0 ? '#374151' : '#4b5563',
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MethodBox color="#3b82f6">
        {METHOD_INFO.map((m, i) => (
          <div
            key={m.key}
            style={{
              marginTop: i === 0 ? 0 : 28,
              paddingTop: i === 0 ? 0 : 20,
              borderTop: i === 0 ? undefined : '1px solid #cbd5e1',
            }}
          >
            <h3 style={{ fontSize: 17, margin: '0 0 4px' }}>{m.name}</h3>
            <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: 13 }}>{m.origin}</p>
            <p style={{ margin: '0 0 12px' }}>{m.overview}</p>

            <h4 style={{ fontSize: 14, margin: '0 0 6px' }}>{lang === 'en' ? 'Procedure' : '手順'}</h4>
            <ol style={{ margin: '0 0 10px', paddingLeft: 22, lineHeight: 1.9 }}>
              {m.steps.map((step, si) => (
                <li key={si} style={{ marginBottom: 6 }}>
                  {step}
                </li>
              ))}
            </ol>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>{m.values}</p>

            {m.derivation && (
              <>
                <h4 style={{ fontSize: 14, margin: '0 0 6px' }}>{m.derivation.title}</h4>
                <div style={{ margin: '0 0 12px' }}>{m.derivation.body}</div>
              </>
            )}

            <h4 style={{ fontSize: 14, margin: '0 0 6px' }}>{lang === 'en' ? 'Characteristics' : '特徴'}</h4>
            <ul style={{ margin: 0, paddingLeft: 22, lineHeight: 1.7 }}>
              <li>
                <strong style={{ color: '#16a34a' }}>{lang === 'en' ? 'Pros: ' : 'メリット：'}</strong> {m.pros}
              </li>
              <li>
                <strong style={{ color: '#dc2626' }}>{lang === 'en' ? 'Cons: ' : 'デメリット：'}</strong> {m.cons}
              </li>
            </ul>
          </div>
        ))}
      </MethodBox>
    </section>
  )
}
