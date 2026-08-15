import { useEffect, useState } from 'react'
import { Histogram } from './Histogram'
import type { DistributionEntry, NoisyP1Result } from './types'

const API_BASE = 'http://localhost:8000'
const DEBOUNCE_MS = 200

interface NoiseStepProps {
  optimalCutValue: number
}

export function NoiseStep({ optimalCutValue }: NoiseStepProps) {
  const [gamma] = useState(2.85)
  const [beta] = useState(0.29)
  const [singleQubitError, setSingleQubitError] = useState(0.01)
  const [twoQubitError, setTwoQubitError] = useState(0.03)
  const [idealDistribution, setIdealDistribution] = useState<DistributionEntry[] | null>(null)
  const [noisy, setNoisy] = useState<NoisyP1Result | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/qaoa/noisy-p1?gamma=${gamma}&beta=${beta}&singleQubitError=${singleQubitError}&twoQubitError=${twoQubitError}`)
        .then((res) => res.json())
        .then(setNoisy)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [gamma, beta, singleQubitError, twoQubitError])

  useEffect(() => {
    fetch(`${API_BASE}/api/qaoa/p1?gamma=${gamma}&beta=${beta}`)
      .then((res) => res.json())
      .then((data) => setIdealDistribution(data.distribution))
  }, [gamma, beta])

  return (
    <section style={{ marginTop: 48, marginBottom: 64 }}>
      <h1>Step 7: ノイズありシミュレーションとの比較</h1>
      <p>
        ここまでは理想的な（ノイズのない）シミュレータでした。実機のNISQデバイスでは
        ゲート誤り（脱分極ノイズ）が避けられません。γ={gamma.toFixed(2)}, β=
        {beta.toFixed(2)}（Step 3で見つけた良好な点）を固定し、1量子ビットゲート・
        2量子ビットゲートの誤り率をQiskit AerのNoiseModelで変化させ、確率分布と
        期待カット値がどれだけ劣化するかを見ます。
      </p>

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
        <div style={{ flex: 1, minWidth: 320 }}>
          <h2 style={{ fontSize: 14, color: '#6b7280' }}>理想（ノイズなし）</h2>
          {idealDistribution && (
            <Histogram distribution={idealDistribution} optimalCutValue={optimalCutValue} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          <h2 style={{ fontSize: 14, color: '#6b7280' }}>ノイズあり（4096ショット計測）</h2>
          {noisy && <Histogram distribution={noisy.distribution} optimalCutValue={optimalCutValue} />}
        </div>
      </div>
    </section>
  )
}
