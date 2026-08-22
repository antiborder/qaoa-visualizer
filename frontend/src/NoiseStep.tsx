import { useEffect, useState } from 'react'
import { Callout, Frac, FormulaBlock } from './Formula'
import { Histogram } from './Histogram'
import type { DistributionEntry, NoisyP1Result } from './types'

const API_BASE = 'http://localhost:8000'
const DEBOUNCE_MS = 200

interface NoiseStepProps {
  graphId: string
  optimalCutValue: number
  bestPoint: { gamma: number; beta: number }
}

export function NoiseStep({ graphId, optimalCutValue, bestPoint }: NoiseStepProps) {
  const [gamma] = useState(bestPoint.gamma)
  const [beta] = useState(bestPoint.beta)
  const [singleQubitError, setSingleQubitError] = useState(0.01)
  const [twoQubitError, setTwoQubitError] = useState(0.03)
  const [idealDistribution, setIdealDistribution] = useState<DistributionEntry[] | null>(null)
  const [noisy, setNoisy] = useState<NoisyP1Result | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(
        `${API_BASE}/api/qaoa/noisy-p1?gamma=${gamma}&beta=${beta}&singleQubitError=${singleQubitError}&twoQubitError=${twoQubitError}&graphId=${graphId}`,
      )
        .then((res) => res.json())
        .then(setNoisy)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [gamma, beta, singleQubitError, twoQubitError, graphId])

  useEffect(() => {
    fetch(`${API_BASE}/api/qaoa/p1?gamma=${gamma}&beta=${beta}&graphId=${graphId}`)
      .then((res) => res.json())
      .then((data) => setIdealDistribution(data.distribution))
  }, [gamma, beta, graphId])

  return (
    <section style={{ marginTop: 48, marginBottom: 64 }}>
      <p>
        ここまでは理想的な（ノイズのない）シミュレータでした。実機のNISQデバイスでは
        ゲート誤り（脱分極ノイズ）が避けられません。γ₁={gamma.toFixed(2)}, β₁=
        {beta.toFixed(2)}（p=1のときのこのグラフのランドスケープ上の最良点）を固定し、
        1量子ビットゲート・
        2量子ビットゲートの誤り率をQiskit AerのNoiseModelで変化させ、確率分布と
        期待カット値がどれだけ劣化するかを見ます。
      </p>

      <Callout label="補足：ゲート誤り率とは">
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
          H・RXゲート（1量子ビット）とRZZゲート（2量子ビット）それぞれに、確率λで
          「そのゲートが触れる量子ビットの情報が完全に失われ、あらゆる状態が均等に
          混ざったランダムな状態に置き換わる」という誤り（<strong>脱分極ノイズ
          </strong>）を加えます。1量子ビットゲート誤り率・2量子ビットゲート誤り率の
          スライダーは、このλの大きさを表します。
        </p>
        <FormulaBlock>
          E(ρ) = (1 − λ)ρ + λ<Frac num="I" den="d" />
        </FormulaBlock>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
          確率(1−λ)でゲートは理想通りに働き、確率λで最大混合状態I/dに置き換わります
          （1量子ビットゲートはd=2、2量子ビットのRZZゲートはd=4）。ρ（密度行列）や
          この式の背景（量子チャネル、なぜこの形で誤りを表せるのか）は、
          <a href="#concepts">量子力学・QAOA用語集</a>で詳しく説明しています。
        </p>
        <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
          この確率λでの判定は「量子ビットを何個かランダムに選ぶ」という操作ではなく、
          回路中のゲート1つ1つに対して独立に行われます。「2量子ビットゲート誤り率」の
          “2”は、RZZゲートというゲート自体が2量子ビットにまたがって作用するという意味
          であり、（このグラフのように量子ビット数が5個あるとして）その5個の中から2個を
          選んで誤らせる、という意味ではありません。
        </p>
      </Callout>

      <Callout label="補足：誤りの掛け算的な積み重なり">
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
          回路には複数のゲートが並んでいるため、誤りは掛け算的に積み重なります。
          n量子ビット・m本の辺を持つグラフのp=1回路には、H・RXゲート（1量子ビット）が
          2n個、RZZゲート（2量子ビット）がm個あり、その1つ1つが独立に確率λ₁または
          λ₂で誤るかどうか判定されるので、回路全体が一切の誤りなく実行される確率は
          おおよそ次の通りです。
        </p>
        <FormulaBlock>
          (1 − λ<sub>1</sub>)<sup>2n</sup> × (1 − λ<sub>2</sub>)<sup>m</sup>
        </FormulaBlock>
        <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
          λが小さくてもゲート数が多いほどこの確率は下がります——2層目への拡張・
          層数pへの一般化の各Stepで見た「層を増やすほど理論上は良くなる」という利点は、
          実機では回路が深くなるぶんノイズにさらされる機会も増えるというトレードオフと
          表裏一体です。誤り率を上げていくと、測定結果は徐々にコストユニタリのStepで
          見た一様分布（位相情報が確率に反映される前の状態）に近づいていきます——
          量子ビットの情報が壊れるほど、量子計算としての意味を失っていくということです。
        </p>
      </Callout>

      <Callout label="補足：なぜ「ノイズあり」側だけショット計測なのか">
        <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
          ここまでの各Stepで使ってきたStatevectorは、常に純粋状態|ψ⟩だけを厳密に追跡する
          理想シミュレータで、雑音（混合状態）を扱えません。そこでこのStepだけ
          <strong>Qiskit Aer</strong>を使い、1回の実行（1ショット）ごとに回路中の
          各ゲートで独立に誤りが起きたかどうかを判定しながら回路を実行する、という
          方法（量子トラジェクトリ法）で雑音入りの計算をシミュレートします。これを
          4096回繰り返して確率分布を求めているため、
          右側の「ノイズあり」ヒストグラムだけが4096ショット計測と明記されています
          （左側の「理想」はStatevectorによる厳密な確率です）。仕組みの詳細は
          <a href="#concepts">量子力学・QAOA用語集</a>を参照してください。
        </p>
      </Callout>

      <label style={{ display: 'block', margin: '16px 0' }}>
        1量子ビットゲート誤り率 = {(singleQubitError * 100).toFixed(2)}%
        <input
          type="range"
          min={0}
          max={0.05}
          step={0.001}
          value={singleQubitError}
          onChange={(e) => setSingleQubitError(Number(e.target.value))}
          style={{ display: 'block', width: '100%', maxWidth: 400 }}
        />
      </label>
      <label style={{ display: 'block', margin: '16px 0' }}>
        2量子ビットゲート誤り率 = {(twoQubitError * 100).toFixed(2)}%
        <input
          type="range"
          min={0}
          max={0.1}
          step={0.002}
          value={twoQubitError}
          onChange={(e) => setTwoQubitError(Number(e.target.value))}
          style={{ display: 'block', width: '100%', maxWidth: 400 }}
        />
      </label>

      {noisy && (
        <p>
          期待カット値: 理想 <strong>{noisy.idealExpectedCutValue.toFixed(3)}</strong> → ノイズあり{' '}
          <strong>{noisy.noisyExpectedCutValue.toFixed(3)}</strong>
          （最適値 {optimalCutValue}）
        </p>
      )}

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 'min(320px, 100%)' }}>
          <h2 style={{ fontSize: 14, color: '#6b7280' }}>理想（ノイズなし）</h2>
          {idealDistribution && (
            <Histogram distribution={idealDistribution} optimalCutValue={optimalCutValue} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 'min(320px, 100%)' }}>
          <h2 style={{ fontSize: 14, color: '#6b7280' }}>ノイズあり（4096ショット計測）</h2>
          {noisy && <Histogram distribution={noisy.distribution} optimalCutValue={optimalCutValue} />}
        </div>
      </div>
    </section>
  )
}
