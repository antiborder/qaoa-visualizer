import { useEffect, useState } from 'react'
import { BlochSphere } from './BlochSphere'
import { Callout } from './Formula'
import { Histogram } from './Histogram'
import type { P1Result } from './types'

const API_BASE = 'http://localhost:8000'
const DEBOUNCE_MS = 150

interface P1StepProps {
  graphId: string
  optimalCutValue: number
  gamma1: number
  beta1: number
  onGamma1Change: (gamma1: number) => void
  onBeta1Change: (beta1: number) => void
}

export function P1Step({
  graphId,
  optimalCutValue,
  gamma1,
  beta1,
  onGamma1Change,
  onBeta1Change,
}: P1StepProps) {
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
    <section style={{ marginTop: 48 }}>
      <h1>Step 3: ミキサーユニタリによる拡散</h1>

      <h3 style={{ fontSize: 17 }}>Step 2までの問題</h3>
      <p>
        コストユニタリだけでは、量子ビット同士は
        もつれ、良い解の情報は状態の「位相」の中に書き込まれるものの、測定確率は
        γ₁をどう変えても常に完全に一様（全ビット列が均等）のままでした。位相は測定しても
        直接は見えないため、これだけでは「どのビット列が良い解か」を知る手立てが
        ありません。
      </p>

      <h3 style={{ fontSize: 17 }}>Step 3での解決策</h3>
      <p>
        この隠れた位相情報を、測定で見える
        「確率の偏り」に変換するため、コストユニタリの直後にもう1つのゲート——
        <strong>ミキサーユニタリ</strong> exp(-iβ₁H_B) ——を追加します。ミキサーは
        測定の基底（Z基底）に対して対角ではないため、位相の違いを確率の違いへと
        変換する働き（干渉）を持ちます。
      </p>

      <Callout label="補足：γ₁・β₁とは">
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
          このStepでは、コストユニタリ→ミキサーユニタリのペアを1回だけ適用します
          （この回数を増やすことはStep 6以降で扱います）。添字の「1」は1層目の
          パラメータであることを表し、Step 2・Step 3・Step 6のγ₁・β₁スライダーは
          すべて同じ値を共有しています——どこで動かしても、他のStepに反映されます。
        </p>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: '#334155', margin: 0 }}>
          <li>
            <strong>γ₁（ガンマ）</strong>：コストユニタリの強さ——グラフの辺構造に応じた
            位相を各ビット列にどれだけ刻むか——を決める回転角。範囲は0〜2π（一般の
            重み付きグラフでも安全な範囲として2πまで表示しているが、この重みなし
            グラフでは実際にはπ周期で同じ挙動が繰り返される）
          </li>
          <li>
            <strong>β₁（ベータ）</strong>：ミキサーユニタリの強さ——刻まれた位相をどれだけ
            確率の偏りに変換するか——を決める回転角。範囲は0〜π（H_Bの生成子Xの固有値が
            ±1で、β₁=πでは大域位相（物理的に無意味）がつくだけになるため、周期はπ）
          </li>
        </ul>
      </Callout>
      <p>
        決まった正解の組み合わせがあるわけではないので、下のスライダーを実際に
        動かして、最適カット（緑色のバー、cutValue={optimalCutValue}）に
        どれだけ確率を集められるか探してみてください。
      </p>

      <div style={{ overflowX: 'auto', margin: '16px 0' }}>
        <img
          src="/circuits/step3_p1.png"
          alt="Step 3 quantum circuit: H gates, RZZ gates, then RX gates"
          style={{ width: '100%', minWidth: 500, maxWidth: 700, display: 'block', margin: '0 auto' }}
        />
      </div>
      <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
        回路図はbowtieグラフでの例です。Step 2の回路（H + RZZ）に、最後の列として
        RX(2β₁)ゲート（ミキサー）が全量子ビットに追加されただけです。回路の「深さ」が1段増えます。
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
