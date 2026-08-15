import { useEffect, useState } from 'react'
import { BlochSphere } from './BlochSphere'
import { Histogram } from './Histogram'
import type { P1Result } from './types'

const API_BASE = 'http://localhost:8000'
const DEBOUNCE_MS = 150

interface P1StepProps {
  optimalCutValue: number
}

export function P1Step({ optimalCutValue }: P1StepProps) {
  const [gamma, setGamma] = useState(0)
  const [beta, setBeta] = useState(0)
  const [result, setResult] = useState<P1Result | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/qaoa/p1?gamma=${gamma}&beta=${beta}`)
        .then((res) => res.json())
        .then(setResult)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [gamma, beta])

  return (
    <section style={{ marginTop: 48 }}>
      <h1>Step 3: p=1 QAOA回路</h1>

      <h3 style={{ fontSize: 17 }}>Step 2までの問題</h3>
      <p>
        コストユニタリだけでは、量子ビット同士は
        もつれ、良い解の情報は状態の「位相」の中に書き込まれるものの、測定確率は
        γをどう変えても常に完全に一様（32通りが均等）のままでした。位相は測定しても
        直接は見えないため、これだけでは「どのビット列が良い解か」を知る手立てが
        ありません。
      </p>

      <h3 style={{ fontSize: 17 }}>Step 3での解決策</h3>
      <p>
        この隠れた位相情報を、測定で見える
        「確率の偏り」に変換するため、コストユニタリの直後にもう1つのゲート——
        <strong>ミキサーユニタリ</strong> exp(-iβH_B) ——を追加します。ミキサーは
        測定の基底（Z基底）に対して対角ではないため、位相の違いを確率の違いへと
        変換する働き（干渉）を持ちます。
      </p>

      <h3 style={{ fontSize: 17 }}>γ・β・pとは</h3>
      <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>
        <li>
          <strong>γ（ガンマ）</strong>：コストユニタリの強さ——グラフの辺構造に応じた
          位相を各ビット列にどれだけ刻むか——を決める回転角。範囲は0〜2π（一般の
          重み付きグラフでも安全な範囲として2πまで表示しているが、この重みなし
          グラフでは実際にはπ周期で同じ挙動が繰り返される）
        </li>
        <li>
          <strong>β（ベータ）</strong>：ミキサーユニタリの強さ——刻まれた位相をどれだけ
          確率の偏りに変換するか——を決める回転角。範囲は0〜π（H_Bの生成子Xの固有値が
          ±1で、β=πでは大域位相（物理的に無意味）がつくだけになるため、周期はπ）
        </li>
        <li>
          <strong>p</strong>：「コストユニタリ→ミキサーユニタリ」のペアを何回繰り返すかを
          表す層数。このStepではp=1（1回だけ）を扱う（p&gt;1への一般化はStep 6で扱う）
        </li>
      </ul>
      <p>
        決まった正解の組み合わせがあるわけではないので、下のスライダーを実際に
        動かして、最適カット（緑色のバー、cutValue={optimalCutValue}）に
        どれだけ確率を集められるか探してみてください。
      </p>

      <img
        src="/circuits/step3_p1.png"
        alt="Step 3 quantum circuit: H gates, RZZ gates, then RX gates"
        style={{ width: '100%', maxWidth: 700, display: 'block', margin: '16px auto' }}
      />
      <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
        Step 2の回路（H + RZZ）に、最後の列としてRX(2β)ゲート（ミキサー）が
        全量子ビットに追加されただけです。回路の「深さ」が1段増えるのがp=1です。
      </p>

      <label style={{ display: 'block', margin: '16px 0' }}>
        γ = {gamma.toFixed(2)}
        <input
          type="range"
          min={0}
          max={Math.PI * 2}
          step={0.01}
          value={gamma}
          onChange={(e) => setGamma(Number(e.target.value))}
          style={{ display: 'block', width: '100%', maxWidth: 400 }}
        />
      </label>
      <label style={{ display: 'block', margin: '16px 0' }}>
        β = {beta.toFixed(2)}
        <input
          type="range"
          min={0}
          max={Math.PI}
          step={0.01}
          value={beta}
          onChange={(e) => setBeta(Number(e.target.value))}
          style={{ display: 'block', width: '100%', maxWidth: 400 }}
        />
      </label>

      {result && (
        <p>
          期待カット値 ⟨cut⟩ = <strong>{result.expectedCutValue.toFixed(3)}</strong> /
          最適値 {optimalCutValue}
        </p>
      )}

      {result && (
        <Histogram distribution={result.distribution} optimalCutValue={optimalCutValue} />
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 24,
        }}
      >
        {(result?.blochVectors ?? []).map((v) => (
          <BlochSphere key={v.node} target={v} label={`node ${v.node}`} color="#4f8cff" />
        ))}
      </div>
    </section>
  )
}
