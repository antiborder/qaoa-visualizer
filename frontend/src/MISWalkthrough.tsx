import { useEffect, useState } from 'react'
import { BarChart } from './BarChart'
import { Callout, Frac, FormulaBlock } from './Formula'
import { GraphTypePicker } from './GraphTypePicker'
import { GraphView } from './GraphView'
import { Histogram } from './Histogram'
import { MISGraphView } from './MISGraphView'
import type {
  DistributionEntry,
  GraphData,
  GraphInfo,
  MISDepthScanResult,
  MISOptimalResult,
  MISP1Result,
  MISSelectionEntry,
  WalkthroughStep,
} from './types'

const API_BASE = 'http://localhost:8000'
const DEBOUNCE_MS = 150

interface MISArgs {
  graphs: GraphInfo[]
  graphId: string
  onSelectGraph: (id: string) => void
  graph: GraphData
  misOptimal: MISOptimalResult | null
}

const CH = '別の組合せ最適化問題への一般化 — 最大独立集合'
const SEC_GRAPH_SELECT = 'Max-Cut以外の問題もやってみよう'
const SEC_MIS_DEF = '最大独立集合とは'
const SEC_HAMILTONIAN = 'グラフを表現するハミルトニアンの構築'
const SEC_UNITARY = 'ユニタリ演算子の構築'
const SEC_CIRCUIT_DESIGN = '量子回路の設計'
const SEC_RESULT = '量子計算の結果'

// Small icon-sized MISGraphView, matching GraphIconButton's visual pattern
// (button border/background, tiny graph, no legend) but for MIS's
// selected/not-selected node coloring instead of Max-Cut's group coloring.
function MISIconButton({
  graph,
  selection,
  label,
  selected,
  onClick,
}: {
  graph: GraphData
  selection: MISSelectionEntry[]
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: 8,
        border: selected ? '2px solid #4f8cff' : '2px solid transparent',
        borderRadius: 8,
        background: selected ? '#eef4ff' : 'transparent',
        cursor: 'pointer',
        width: 92,
      }}
    >
      <div style={{ width: 68 }}>
        <MISGraphView graph={graph} selection={selection} showLegend={false} />
      </div>
      <span style={{ fontSize: 12, color: '#374151', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </button>
  )
}

// "最大独立集合とは"'s icon-click-to-enlarge gallery, mirroring Step 3's
// SolutionGallery (Step1Walkthrough.tsx) - illustrates what a valid
// independent set looks like using the same tied-optimal selections that
// the next Step (各最適解の確認) formally presents as the brute-force answer.
function MISDefinitionGallery({
  graph,
  misOptimal,
}: {
  graph: GraphData
  misOptimal: MISOptimalResult | null
}) {
  const [selectionIndex, setSelectionIndex] = useState(0)

  useEffect(() => {
    setSelectionIndex(0)
  }, [misOptimal])

  if (!misOptimal) {
    return <p>計算中...</p>
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', margin: '16px 0' }}>
        {misOptimal.selections.map((s, i) => (
          <MISIconButton
            key={i}
            graph={graph}
            selection={s}
            label={`例 ${i + 1}`}
            selected={i === selectionIndex}
            onClick={() => setSelectionIndex(i)}
          />
        ))}
      </div>
      <MISGraphView graph={graph} selection={misOptimal.selections[selectionIndex]} />
    </>
  )
}

// Step "量子計算の結果"'s interactive part (gamma/beta sliders -> Qiskit
// fetch -> histogram + approximation-ratio bar chart). Kept as its own
// stateful component so the other six steps in this chapter can stay plain,
// static content.
function MISResultStep({ graphId, misOptimal }: Pick<MISArgs, 'graphId' | 'misOptimal'>) {
  const [gamma, setGamma] = useState(0)
  const [beta, setBeta] = useState(0)
  const [p1, setP1] = useState<MISP1Result | null>(null)
  const [depthScan, setDepthScan] = useState<MISDepthScanResult | null>(null)

  useEffect(() => {
    setDepthScan(null)
    fetch(`${API_BASE}/api/mis/depth-scan?graphId=${graphId}`)
      .then((res) => res.json())
      .then(setDepthScan)
  }, [graphId])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/mis/p1?gamma=${gamma}&beta=${beta}&graphId=${graphId}`)
        .then((res) => res.json())
        .then(setP1)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [gamma, beta, graphId])

  // Histogram.tsx only cares that entries carry {bitstring, probability,
  // cutValue} and compares cutValue to optimalCutValue - reused as-is here
  // by mapping MIS's objectiveValue into that same shape.
  const histogramDistribution: DistributionEntry[] | undefined = p1?.distribution.map((d) => ({
    bitstring: d.bitstring,
    probability: d.probability,
    cutValue: d.objectiveValue,
  }))

  return (
    <>
      <p>
        Max-Cutと同じくγ・βスライダーで探索できますが、下の近似比グラフで見るように、
        MISはp=1では最適値に遠く届きません。
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
      {p1 && misOptimal && (
        <p>
          期待目的関数値 = <strong>{p1.expectedObjectiveValue.toFixed(3)}</strong> / 最適値{' '}
          {misOptimal.size}（緑のバーが最適な独立集合に対応するビット列）
        </p>
      )}
      {histogramDistribution && misOptimal && (
        <Histogram distribution={histogramDistribution} optimalCutValue={misOptimal.size} />
      )}

      <h3 style={{ fontSize: 17 }}>層数pごとの近似比</h3>
      {depthScan ? (
        <>
          <BarChart
            labels={depthScan.pValues.map((p) => `p=${p}`)}
            values={depthScan.approximationRatios}
            color="#3b82f6"
            yMax={1.05}
            referenceLine={{ value: 1.0, label: '真の最適解' }}
          />
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            層数pへの一般化のStepで見たMax-Cutのp=1近似比と比べて、MISは同じp=1で約
            {(depthScan.approximationRatios[0] * 100).toFixed(0)}%、p=
            {depthScan.pValues[depthScan.pValues.length - 1]}でも約
            {(depthScan.approximationRatios[depthScan.approximationRatios.length - 1] * 100).toFixed(0)}
            %までしか届きません。これはペナルティ法による制約の表現が、Max-Cutの
            「隣接ノードを分ける」という単純な構造よりも最適化しづらいランドスケープを
            作り出すためです。同じQAOAという手法でも、問題ごとに得意・不得意がある——
            という一般化の教訓です。
          </p>
        </>
      ) : (
        <p>計算中...</p>
      )}

      <Callout label="まとめ：QAOAが目指しているもの">
        <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
          Max-CutからMISまで一通り見てきましたが、QAOAが目指しているのは「短時間で
          答えを見つけること」でも「真の最適解を確実に見つけること」でもありません。
          最適解が求まる保証はないまま、回路の深さp・ショット数といった限られた計算
          資源の中で、できるだけ良い解に確率的に近づけていく——これがQAOAという
          ヒューリスティックの一貫した狙いです。そしてこのStepで見た通り、その近づき
          やすさ自体、問題の構造（Max-CutかMISか）によって大きく変わります。
        </p>
      </Callout>
    </>
  )
}

export function buildMISSteps({ graphs, graphId, onSelectGraph, graph, misOptimal }: MISArgs): WalkthroughStep[] {
  return [
    // --- Step: グラフの選定 ---
    {
      chapter: CH,
      section: SEC_GRAPH_SELECT,
      title: '最大独立集合',
      content: (
        <>
          <p>
            同じ手順がMax-Cut以外にも通用することを、<strong>最大独立集合</strong>
            （Maximum Independent Set, MIS）問題で確認します。ここでも、Step 2と同じように
            グラフを選び直せます。
          </p>
          <GraphTypePicker graphs={graphs} graphId={graphId} onSelect={onSelectGraph} />
          <GraphView graph={graph} showLegend={false} />
        </>
      ),
    },

    // --- Step: 最大独立集合とは ---
    {
      chapter: CH,
      section: SEC_MIS_DEF,
      title: '',
      content: (
        <>
          <p>
            最大独立集合（MIS）問題は、Max-Cutと同じグラフG=(V,E)に対して定義される、
            別の組合せ最適化問題です。「辺で結ばれた2ノードを同時に選ばない」という
            制約のもとで、できるだけ多くのノードを選ぶ——これがMISです。この制約を
            満たすノードの集合を<strong>独立集合</strong>と呼び、その中でサイズが
            最大のものが<strong>最大独立集合</strong>です。下のアイコンをクリックすると、
            このグラフに対する実際の最大独立集合（同点で最適なもの）を見比べられます。
          </p>
          {misOptimal && (
            <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>
              <li>
                最大独立集合のサイズ: <strong>{misOptimal.size}</strong>
              </li>
              <li>
                同点で最適な解: <strong>{misOptimal.selections.length}</strong>通り
              </li>
            </ul>
          )}
          <MISDefinitionGallery graph={graph} misOptimal={misOptimal} />
        </>
      ),
    },

    // --- Step: グラフを表現するハミルトニアンの構築 ---
    {
      chapter: CH,
      section: SEC_HAMILTONIAN,
      title: '',
      content: (
        <>
          <p>
            Max-Cutのときと同じように、まずMIS問題を量子力学のハミルトニアンの言葉に
            翻訳します。各ノードiに、選ぶなら1、選ばないなら0を対応させる変数xᵢを
            使うと、MISの目的は次の最大化として書けます。
          </p>
          <FormulaBlock>目的関数 = Σᵢ xᵢ − A・Σ<sub>(i,j)∈E</sub> xᵢxⱼ</FormulaBlock>
          <p>
            xᵢ∈{'{0,1}'}という2値変数についての2次式を、制約なしで最大化・最小化する
            ——この定式化の形を<strong>QUBO</strong>（Quadratic Unconstrained Binary
            Optimization：制約なし2次2値最適化）と呼びます。量子コンピュータ（や
            量子アニーラ）で組合せ最適化問題を扱う際の標準的な出発点で、MISに限らず
            多くの問題が、まず制約をペナルティ項として目的関数に埋め込むことで
            この形に変換されます。ここでも「辺で結ばれた2ノードを同時に選ばない」
            という制約を、直接の制約としてではなく、破ったときに減点する罰則項として
            表現しています。
          </p>

          <Callout label="補足：QUBOの一般形">
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
              QUBOは一般に、2値ベクトルx=(x₁,…,xₙ)∈{'{0,1}'}ⁿと実行列Q（対称、または
              上三角）を使って、次の形の関数を最小化（または最大化）する問題として
              定義されます。
            </p>
            <FormulaBlock>
              f(x) = xᵀQx = Σᵢ Qᵢᵢxᵢ + Σ<sub>i&lt;j</sub> Qᵢⱼxᵢxⱼ
            </FormulaBlock>
            <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
              xᵢ∈{'{0,1}'}ではxᵢ²=xᵢが成り立つので、対角成分Qᵢᵢxᵢ²は自動的に1次項
              Qᵢᵢxᵢに潰れます——つまりQUBOは「1次項＋2次項」の多項式であり、2値変数の
              最適化問題としては最も一般的な、次数が2までの形です。このアプリの
              目的関数（1次項Σxᵢと2次項−AΣxᵢxⱼ）も、まさにこのxᵀQxの特別な場合に
              あたります。
            </p>
          </Callout>

          <p>
            第1項はできるだけ多くのノードを選びたいという目的、第2項は辺で結ばれた
            2ノードを同時に選ぶたびにA点のペナルティを科す罰則項です（このアプリでは
            A=2、つまり違反1本につき−2点）。ここに、パウリZ演算子の固有値との対応
            xᵢ=(1−Zᵢ)/2（xᵢ=1のときZᵢ=−1、xᵢ=0のときZᵢ=+1）を代入します。
            xᵢxⱼ=(1−Zᵢ)(1−Zⱼ)/4=(1−Zᵢ−Zⱼ+ZᵢZⱼ)/4も使ってそのまま展開すると、
          </p>
          <FormulaBlock>
            目的関数 = Σᵢ <Frac num="1−Zᵢ" den="2" /> − <Frac num="A" den="4" /> Σ<sub>(i,j)∈E</sub>{' '}
            (1 − Zᵢ − Zⱼ + ZᵢZⱼ)
          </FormulaBlock>
          <p>各項をΣの中で展開して整理すると、</p>
          <FormulaBlock>
            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span>
                目的関数 = <Frac num="n" den="2" /> − <Frac num="A|E|" den="4" /> −{' '}
                <Frac num="1" den="2" /> Σᵢ Zᵢ
              </span>
              <span>
                + <Frac num="A" den="4" /> Σ<sub>(i,j)∈E</sub> (Zᵢ + Zⱼ) −{' '}
                <Frac num="A" den="4" /> Σ<sub>(i,j)∈E</sub> ZᵢZⱼ
              </span>
            </span>
          </FormulaBlock>
          <p>
            n/2はΣᵢ(1/2)から（nは量子ビット数）、−A|E|/4は−(A/4)Σ<sub>(i,j)∈E</sub>1
            （辺の本数|E|個分の1をA/4倍したもの）からそれぞれ出てくる定数項で、
            どちらもZに依存しません。定数を全体に足してもどのビット列で目的関数が
            最大になるかという最適化の答えは変わらないので、以降は[n/2−A|E|/4]を
            無視して、Zᵢ・ZᵢZⱼの項だけを追いかけます。
          </p>
          <p>
            ここでdeg(i)（ノードiの次数、つながっている辺の本数）が出てくる理由を
            確認します。上の式の中のΣ<sub>(i,j)∈E</sub>(Zᵢ+Zⱼ)という部分は、グラフの
            辺1本ごとにその両端のZを1個ずつ足し上げたものです。ノードiのZᵢは、iに
            つながる辺の数だけこの和の中に登場する——つまりちょうどdeg(i)回登場する
            ——ので、辺ごとの和をノードごとに整理し直すと
          </p>
          <FormulaBlock>
            Σ<sub>(i,j)∈E</sub> (Zᵢ + Zⱼ) = Σᵢ deg(i)Zᵢ
          </FormulaBlock>
          <p>
            と書き換えられます。deg(i)は、この「辺の和をノードの和に整理し直す」
            操作から自然に出てくる係数です。この置き換えと、先ほど無視すると決めた
            定数項[n/2−A|E|/4]を落とすこと、符号反転（コストハミルトニアン
            H<sub>C</sub>=−目的関数の定義）を行うと、
          </p>
          <FormulaBlock>
            H<sub>C</sub> = Σᵢ [1/2 − (A/4)deg(i)] Zᵢ + (A/4) Σ<sub>(i,j)∈E</sub> Z<sub>i</sub>Z<sub>j</sub>
          </FormulaBlock>
          <p>
            という形になります。
            コストユニタリのStepで見たMax-CutのH<sub>C</sub>=Σ Z<sub>i</sub>Z<sub>j</sub>と
            比べると、各ノード単体に作用するZᵢの項が新たに加わっている点が違いです
            ——これがペナルティ項の効果をグラフ構造に応じてノードごとに反映しています。
          </p>
        </>
      ),
    },

    // --- Step: ユニタリ演算子の構築 ---
    {
      chapter: CH,
      section: SEC_UNITARY,
      title: '',
      content: (
        <>
          <p>
            このH<sub>C</sub>も、Max-CutのH<sub>C</sub>と同様に互いに可換な項
            （各Zᵢ単体の項と、各辺のZᵢZⱼの項）の和なので、全く同じ理屈でコスト
            ユニタリを個別のゲートに分解できます。
          </p>
          <FormulaBlock>
            U<sub>C</sub>(γ) = exp(−iγH<sub>C</sub>) = Π<sub>i</sub> exp(−iγc<sub>i</sub>Z<sub>i</sub>) ·
            Π<sub>(i,j)∈E</sub> exp(−iγ(A/4)Z<sub>i</sub>Z<sub>j</sub>)
          </FormulaBlock>
          <p>
            （c<sub>i</sub> = 1/2 − (A/4)deg(i)）ここでexp(−iγc<sub>i</sub>Z<sub>i</sub>)は
            RZ(2γc<sub>i</sub>)ゲートに、exp(−iγ(A/4)Z<sub>i</sub>Z<sub>j</sub>)はRZZ(γA/2)
            ゲートに、コストユニタリのStepと同じ理屈でそれぞれ対応します。ミキサー
            ユニタリU<sub>B</sub>(β)はMax-Cutと全く同じ横磁場ハミルトニアンH<sub>B</sub>=Σᵢ
            Xᵢ・RX(2β)ゲートをそのまま再利用します——MIS特有の変更が必要なのは
            コストユニタリ側だけです。
          </p>
        </>
      ),
    },

    // --- Step: 量子回路の設計 ---
    {
      chapter: CH,
      section: SEC_CIRCUIT_DESIGN,
      title: '',
      content: (
        <>
          <p>
            以上を組み合わせると、回路は「H → 各ノードのRZ → 各辺のRZZ → 全量子ビット
            のRX」という並びになります。
          </p>
          <div style={{ overflowX: 'auto', margin: '16px 0' }}>
            <img
              key={graphId}
              src={`${API_BASE}/api/circuit-diagram?graphId=${graphId}&kind=mis_p1`}
              alt="MIS quantum circuit: H, per-node RZ gates, RZZ gates, then RX gates"
              style={{ width: '100%', minWidth: 550, maxWidth: 800, display: 'block', margin: '0 auto' }}
            />
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
            回路図は選択中のグラフに合わせてQiskitで動的に生成しています。Max-Cutの回路との違いは、RZZの前にノードごとの
            RZゲートが追加されている点で、その係数はノードの次数（つながっている辺の本数）に
            応じて決まります——これがグラフ構造をH<sub>C</sub>に反映させる部分です。次数が高いノードほど
            係数の絶対値も大きくなります。
          </p>
        </>
      ),
    },

    // --- Step: 量子計算の結果 ---
    {
      chapter: CH,
      section: SEC_RESULT,
      title: '',
      content: <MISResultStep graphId={graphId} misOptimal={misOptimal} />,
    },
  ]
}
