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
  Lang,
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
  lang: Lang
}

const ch = (lang: Lang) =>
  lang === 'en'
    ? 'Generalizing to Another Combinatorial Optimization Problem — Maximum Independent Set'
    : '別の組合せ最適化問題への一般化 — 最大独立集合'
const secGraphSelect = (lang: Lang) =>
  lang === 'en' ? "Let's Try a Problem Other Than Max-Cut" : 'Max-Cut以外の問題もやってみよう'
const secMisDef = (lang: Lang) => (lang === 'en' ? 'What Is a Maximum Independent Set?' : '最大独立集合とは')
const secHamiltonian = (lang: Lang) =>
  lang === 'en' ? 'Building the Hamiltonian That Represents the Graph' : 'グラフを表現するハミルトニアンの構築'
const secUnitary = (lang: Lang) => (lang === 'en' ? 'Building the Unitary Operators' : 'ユニタリ演算子の構築')
const secCircuitDesign = (lang: Lang) => (lang === 'en' ? 'Designing the Quantum Circuit' : '量子回路の設計')
const secResult = (lang: Lang) => (lang === 'en' ? 'Quantum Computation Results' : '量子計算の結果')

// Illustrates the "Note: Max-Cut can also be formulated as QUBO" Callout as
// a two-column flowchart: the direct σ=±1 route (Steps 5-10, blue) and the
// QUBO x∈{0,1} route (this Step, violet) start from different variables but
// substitute into the exact same per-edge expression (1-ZᵢZⱼ)/2, so both
// arrows are drawn converging into one highlighted "same Hamiltonian" box.
function MaxCutQuboConvergenceDiagram({ lang }: { lang: Lang }) {
  const boxTextStyle = { fill: '#1f2937', fontSize: 12.5, textAnchor: 'middle' as const }
  const labelStyle = { fill: '#6b7280', fontSize: 11.5, textAnchor: 'middle' as const }
  const blue = '#3b82f6'
  const violet = '#a855f7'
  const amber = '#f59e0b'

  const t =
    lang === 'en'
      ? {
          top: 'Max-Cut: maximize the number of cut edges',
          leftHeader: 'Direct approach (Steps 5–10)',
          rightHeader: 'QUBO approach (this Step)',
          leftBox1: ['σᵢ = ±1 (spin variable)', 'group A: σᵢ = +1', 'group B: σᵢ = −1'],
          rightBox1: ['xᵢ ∈ {0,1} (binary variable)', 'group A: xᵢ = 1', 'group B: xᵢ = 0'],
          leftArrow1: 'Step 7',
          rightArrow1: 'defined here',
          leftBox2: 'cut(i,j) = (1 − σᵢσⱼ) / 2',
          rightBox2: 'Cut(A,B) = Σ(xᵢ+xⱼ−2xᵢxⱼ)',
          leftArrow2: ['substitute σᵢ → Zᵢ', '(Step 8)'],
          rightArrow2: ['substitute xᵢ=(1−Zᵢ)/2,', 'expand'],
          convergeLine1: 'same expression on every edge:',
          convergeLine2: '(1 − ZᵢZⱼ) / 2',
          convergeLine3: '⟹  HC = Σ(i,j)∈E ZᵢZⱼ',
          caption: 'two different starting points, one identical Hamiltonian',
        }
      : {
          top: 'Max-Cut：カットされる辺の数を最大化する',
          leftHeader: '直接的なアプローチ（Step 5〜10）',
          rightHeader: 'QUBOによるアプローチ（このStep）',
          leftBox1: ['σᵢ = ±1（スピン変数）', 'グループA：σᵢ = +1', 'グループB：σᵢ = −1'],
          rightBox1: ['xᵢ ∈ {0,1}（2値変数）', 'グループA：xᵢ = 1', 'グループB：xᵢ = 0'],
          leftArrow1: 'Step 7',
          rightArrow1: 'ここで定義',
          leftBox2: 'cut(i,j) = (1 − σᵢσⱼ) / 2',
          rightBox2: 'Cut(A,B) = Σ(xᵢ+xⱼ−2xᵢxⱼ)',
          leftArrow2: ['σᵢ → Zᵢ に置換', '（Step 8）'],
          rightArrow2: ['xᵢ=(1−Zᵢ)/2 を代入', 'して展開'],
          convergeLine1: 'どちらも辺ごとに同じ式になる：',
          convergeLine2: '(1 − ZᵢZⱼ) / 2',
          convergeLine3: '⟹  HC = Σ(i,j)∈E ZᵢZⱼ',
          caption: '出発点は違うが、たどり着くハミルトニアンは完全に同一',
        }

  return (
    <svg viewBox="0 0 680 470" width="100%" role="img" aria-label="Max-Cut direct approach and QUBO approach converge on the same Hamiltonian">
      <defs>
        <marker id="mcq-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
        </marker>
      </defs>

      {/* top: shared starting problem */}
      <rect x={190} y={8} width={300} height={42} rx={8} style={{ fill: '#f8fafc', stroke: '#94a3b8', strokeWidth: 1.5 }} />
      <text x={340} y={34} style={boxTextStyle}>
        {t.top}
      </text>

      {/* branch into two colored paths */}
      <line x1={300} y1={50} x2={175} y2={68} stroke={blue} strokeWidth={1.5} />
      <line x1={380} y1={50} x2={505} y2={68} stroke={violet} strokeWidth={1.5} />

      <text x={170} y={84} style={{ ...labelStyle, fill: blue, fontWeight: 700 }}>
        {t.leftHeader}
      </text>
      <text x={510} y={84} style={{ ...labelStyle, fill: violet, fontWeight: 700 }}>
        {t.rightHeader}
      </text>

      {/* box 1: the variable each path starts from */}
      <rect x={30} y={92} width={280} height={78} rx={8} style={{ fill: '#eff6ff', stroke: blue, strokeWidth: 1.5 }} />
      <text x={170} y={114} style={boxTextStyle}>
        <tspan x={170} dy={0}>{t.leftBox1[0]}</tspan>
        <tspan x={170} dy={20}>{t.leftBox1[1]}</tspan>
        <tspan x={170} dy={20}>{t.leftBox1[2]}</tspan>
      </text>

      <rect x={370} y={92} width={280} height={78} rx={8} style={{ fill: '#faf5ff', stroke: violet, strokeWidth: 1.5 }} />
      <text x={510} y={114} style={boxTextStyle}>
        <tspan x={510} dy={0}>{t.rightBox1[0]}</tspan>
        <tspan x={510} dy={20}>{t.rightBox1[1]}</tspan>
        <tspan x={510} dy={20}>{t.rightBox1[2]}</tspan>
      </text>

      {/* arrow 1: how each path writes "is this edge cut?" */}
      <line x1={170} y1={170} x2={170} y2={204} stroke={blue} strokeWidth={1.5} markerEnd="url(#mcq-arrow)" />
      <text x={170} y={192} style={labelStyle}>
        {t.leftArrow1}
      </text>
      <line x1={510} y1={170} x2={510} y2={204} stroke={violet} strokeWidth={1.5} markerEnd="url(#mcq-arrow)" />
      <text x={510} y={192} style={labelStyle}>
        {t.rightArrow1}
      </text>

      {/* box 2: the per-edge cut expression, still in each path's own variable */}
      <rect x={30} y={206} width={280} height={46} rx={8} style={{ fill: '#eff6ff', stroke: blue, strokeWidth: 1.5 }} />
      <text x={170} y={234} style={boxTextStyle}>
        {t.leftBox2}
      </text>
      <rect x={370} y={206} width={280} height={46} rx={8} style={{ fill: '#faf5ff', stroke: violet, strokeWidth: 1.5 }} />
      <text x={510} y={234} style={boxTextStyle}>
        {t.rightBox2}
      </text>

      {/* arrow 2: the substitution into Z that each path performs */}
      <line x1={170} y1={252} x2={170} y2={302} stroke={blue} strokeWidth={1.5} markerEnd="url(#mcq-arrow)" />
      <text x={170} y={272} style={labelStyle}>
        <tspan x={170} dy={0}>{t.leftArrow2[0]}</tspan>
        <tspan x={170} dy={16}>{t.leftArrow2[1]}</tspan>
      </text>
      <line x1={510} y1={252} x2={510} y2={302} stroke={violet} strokeWidth={1.5} markerEnd="url(#mcq-arrow)" />
      <text x={510} y={272} style={labelStyle}>
        <tspan x={510} dy={0}>{t.rightArrow2[0]}</tspan>
        <tspan x={510} dy={16}>{t.rightArrow2[1]}</tspan>
      </text>

      {/* converge: both paths' arrows bend inward to the same highlighted box */}
      <line x1={170} y1={306} x2={300} y2={338} stroke={blue} strokeWidth={1.5} markerEnd="url(#mcq-arrow)" />
      <line x1={510} y1={306} x2={380} y2={338} stroke={violet} strokeWidth={1.5} markerEnd="url(#mcq-arrow)" />

      <rect x={130} y={342} width={420} height={110} rx={10} style={{ fill: '#fffbeb', stroke: amber, strokeWidth: 2 }} />
      <text x={340} y={366} style={{ ...boxTextStyle, fontWeight: 700 }}>
        {t.convergeLine1}
      </text>
      <text x={340} y={390} style={{ ...boxTextStyle, fontSize: 15 }}>
        {t.convergeLine2}
      </text>
      <text x={340} y={414} style={{ ...boxTextStyle, fontSize: 15, fontWeight: 700 }}>
        {t.convergeLine3}
      </text>
      <text x={340} y={438} style={{ ...labelStyle, fontSize: 11 }}>
        {t.caption}
      </text>
    </svg>
  )
}

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
  lang,
}: {
  graph: GraphData
  misOptimal: MISOptimalResult | null
  lang: Lang
}) {
  const [selectionIndex, setSelectionIndex] = useState(0)

  useEffect(() => {
    setSelectionIndex(0)
  }, [misOptimal])

  if (!misOptimal) {
    return <p>{lang === 'en' ? 'Computing...' : '計算中...'}</p>
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', margin: '16px 0' }}>
        {misOptimal.selections.map((s, i) => (
          <MISIconButton
            key={i}
            graph={graph}
            selection={s}
            label={lang === 'en' ? `Example ${i + 1}` : `例 ${i + 1}`}
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
function MISResultStep({ graphId, misOptimal, lang }: Pick<MISArgs, 'graphId' | 'misOptimal' | 'lang'>) {
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
      {lang === 'en' ? (
        <p>
          Just as with Max-Cut, you can search using the γ,β sliders, but as you'll see in the
          approximation-ratio graph below, MIS falls far short of the optimal value at p=1.
        </p>
      ) : (
        <p>
          Max-Cutと同じくγ・βスライダーで探索できますが、下の近似比グラフで見るように、
          MISはp=1では最適値に遠く届きません。
        </p>
      )}

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
      {p1 &&
        misOptimal &&
        (lang === 'en' ? (
          <p>
            Expected objective value = <strong>{p1.expectedObjectiveValue.toFixed(3)}</strong> /
            optimal value {misOptimal.size} (the green bars correspond to bitstrings for the
            optimal independent set)
          </p>
        ) : (
          <p>
            期待目的関数値 = <strong>{p1.expectedObjectiveValue.toFixed(3)}</strong> / 最適値{' '}
            {misOptimal.size}（緑のバーが最適な独立集合に対応するビット列）
          </p>
        ))}
      {histogramDistribution && misOptimal && (
        <Histogram distribution={histogramDistribution} optimalCutValue={misOptimal.size} />
      )}

      <h3 style={{ fontSize: 17 }}>
        {lang === 'en' ? 'Approximation Ratio by Number of Layers p' : '層数pごとの近似比'}
      </h3>
      {depthScan ? (
        <>
          <BarChart
            labels={depthScan.pValues.map((p) => `p=${p}`)}
            values={depthScan.approximationRatios}
            color="#3b82f6"
            yMax={1.05}
            referenceLine={{ value: 1.0, label: lang === 'en' ? 'True optimum' : '真の最適解' }}
          />
          {lang === 'en' ? (
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              Compared to Max-Cut's p=1 approximation ratio from the Generalizing to p Layers Step,
              MIS reaches only about {(depthScan.approximationRatios[0] * 100).toFixed(0)}% at the
              same p=1, and only about{' '}
              {(depthScan.approximationRatios[depthScan.approximationRatios.length - 1] * 100).toFixed(0)}
              % even at p={depthScan.pValues[depthScan.pValues.length - 1]}. This is because
              expressing the constraint via a penalty term creates a landscape that's harder to
              optimize than Max-Cut's simple "separate adjacent nodes" structure. Even with the same
              QAOA method, some problems are a better fit than others — that's the lesson of this
              generalization.
            </p>
          ) : (
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
          )}
        </>
      ) : (
        <p>{lang === 'en' ? 'Computing...' : '計算中...'}</p>
      )}

      {lang === 'en' ? (
        <Callout label="Summary: What QAOA Is Aiming For">
          <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
            Having gone through everything from Max-Cut to MIS, what QAOA aims for is neither
            "finding an answer quickly" nor "guaranteeing the true optimal solution." Without any
            guarantee of reaching the optimal solution, it probabilistically pushes toward as good a
            solution as possible within limited computational resources — circuit depth p, shot
            count — and that is the consistent aim of the QAOA heuristic. And as we saw in this
            Step, how easy it is to get close itself varies greatly depending on the problem's
            structure (Max-Cut or MIS).
          </p>
        </Callout>
      ) : (
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
      )}
    </>
  )
}

export function buildMISSteps({ graphs, graphId, onSelectGraph, graph, misOptimal, lang }: MISArgs): WalkthroughStep[] {
  const CH = ch(lang)

  return [
    // --- Step: グラフの選定 ---
    {
      chapter: CH,
      section: secGraphSelect(lang),
      title: lang === 'en' ? 'Maximum Independent Set' : '最大独立集合',
      content:
        lang === 'en' ? (
          <>
            <p>
              We'll confirm that the same procedure carries over beyond Max-Cut, using the{' '}
              <strong>Maximum Independent Set</strong> (MIS) problem. Here too, you can re-select
              the graph just as in Step 3.
            </p>
            <GraphTypePicker graphs={graphs} graphId={graphId} onSelect={onSelectGraph} />
            <GraphView graph={graph} showLegend={false} />
          </>
        ) : (
          <>
            <p>
              同じ手順がMax-Cut以外にも通用することを、<strong>最大独立集合</strong>
              （Maximum Independent Set, MIS）問題で確認します。ここでも、Step 3と同じように
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
      section: secMisDef(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              The Maximum Independent Set (MIS) problem is another combinatorial optimization
              problem defined on the same graph G=(V,E) as Max-Cut. Select as many nodes as possible
              under the constraint of "never selecting two nodes connected by an edge" — that's MIS.
              A set of nodes satisfying this constraint is called an <strong>independent set</strong>,
              and the largest one is the <strong>maximum independent set</strong>. Click the icons
              below to compare the actual maximum independent sets for this graph (the ones tied for
              optimal).
            </p>
            {misOptimal && (
              <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>
                <li>
                  Size of the maximum independent set: <strong>{misOptimal.size}</strong>
                </li>
                <li>
                  Solutions tied for optimal: <strong>{misOptimal.selections.length}</strong>
                </li>
              </ul>
            )}
            <MISDefinitionGallery graph={graph} misOptimal={misOptimal} lang={lang} />
          </>
        ) : (
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
            <MISDefinitionGallery graph={graph} misOptimal={misOptimal} lang={lang} />
          </>
        ),
    },

    // --- Step: グラフを表現するハミルトニアンの構築 ---
    {
      chapter: CH,
      section: secHamiltonian(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              Just as with Max-Cut, we first translate the MIS problem into the language of a
              quantum-mechanical Hamiltonian. Using a variable xᵢ assigned to each node i (1 if
              selected, 0 if not), MIS's objective can be written as the following maximization.
            </p>
            <FormulaBlock>
              Objective function = Σᵢ xᵢ − A·Σ<sub>(i,j)∈E</sub> xᵢxⱼ
            </FormulaBlock>
            <p>
              Maximizing or minimizing, without constraints, a quadratic expression in binary
              variables xᵢ∈{'{0,1}'} — this form of formulation is called <strong>QUBO</strong>{' '}
              (Quadratic Unconstrained Binary Optimization). It's the standard starting point for
              handling combinatorial optimization problems on a quantum computer (or quantum
              annealer); many problems beyond MIS are converted to this form by first embedding
              their constraints into the objective function as penalty terms. Here too, the
              constraint "never select two nodes connected by an edge" is expressed not as a direct
              constraint but as a penalty term that docks points when violated.
            </p>

            <Callout label="Note: the general form of QUBO">
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
                In general, QUBO is defined as the problem of minimizing (or maximizing) a function
                of the following form, using a binary vector x=(x₁,…,xₙ)∈{'{0,1}'}ⁿ and a real
                matrix Q (symmetric, or upper-triangular).
              </p>
              <FormulaBlock>
                f(x) = xᵀQx = Σᵢ Qᵢᵢxᵢ + Σ<sub>i&lt;j</sub> Qᵢⱼxᵢxⱼ
              </FormulaBlock>
              <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                Since xᵢ²=xᵢ holds for xᵢ∈{'{0,1}'}, the diagonal term Qᵢᵢxᵢ² automatically
                collapses into the linear term Qᵢᵢxᵢ — in other words, QUBO is a "linear + quadratic
                term" polynomial, the most general form, up to degree 2, for a binary-variable
                optimization problem. This app's objective function (the linear term Σxᵢ and the
                quadratic term −AΣxᵢxⱼ) is exactly a special case of this xᵀQx.
              </p>
            </Callout>

            <Callout label="Note: Max-Cut can also be formulated as QUBO">
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
                The Max-Cut problem from Steps 5–10 was derived by directly substituting the
                ±1-valued σᵢ for Zᵢ, but the same problem can equally be reached by going through
                the QUBO framework introduced here. Let xᵢ=1 if node i is in group A and xᵢ=0 if in
                group B. Since xᵢ+xⱼ−2xᵢxⱼ equals 1 when edge (i,j) is cut (its endpoints are in
                different groups) and 0 when it isn't, maximizing the cut count is exactly the QUBO
              </p>
              <FormulaBlock>
                Cut(A,B) = Σ<sub>(i,j)∈E</sub> (xᵢ + xⱼ − 2xᵢxⱼ)
              </FormulaBlock>
              <p style={{ margin: '4px 0 14px', fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                Two paths, one destination — follow both columns down to the highlighted box:
              </p>
              <MaxCutQuboConvergenceDiagram lang={lang} />
              <p style={{ margin: '14px 0 10px', fontSize: 14, color: '#334155' }}>
                Substituting the same xᵢ=(1−Zᵢ)/2 used in Step 8 and expanding — the calculation
                takes exactly the same form as the QUBO-to-Ising conversion for MIS above — gives
              </p>
              <FormulaBlock>
                xᵢ + xⱼ − 2xᵢxⱼ = (1 − ZᵢZⱼ) / 2
              </FormulaBlock>
              <p style={{ margin: '10px 0', fontSize: 14, color: '#334155' }}>and summing over edges,</p>
              <FormulaBlock>
                Cut(A,B) = Σ<sub>(i,j)∈E</sub> <Frac num="1 − ZᵢZⱼ" den="2" /> ={' '}
                <Frac num={<>|E| − H<sub>C</sub></>} den="2" />
                {'  ,  '}H<sub>C</sub> = Σ<sub>(i,j)∈E</sub> ZᵢZⱼ
              </FormulaBlock>
              <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                — exactly the H<sub>C</sub> derived directly from σ→Z in Step 8. In other words, the
                σ=±1 shortcut used in Steps 5–10 and the QUBO route taken here are two different
                starting points that arrive at the identical Hamiltonian. Unlike MIS, Max-Cut's QUBO
                needs no penalty term, since "being cut" is already exactly the quantity being
                maximized — a penalty term is only needed, as with MIS below, when the thing being
                optimized and the constraint to satisfy are separate.
              </p>
            </Callout>

            <p>
              The first term is the objective of wanting to select as many nodes as possible; the
              second is a penalty term that docks A points every time two nodes connected by an edge
              are both selected (in this app, A=2, i.e. −2 points per violation). Here, we substitute
              the correspondence with the Pauli Z operator's eigenvalues, xᵢ=(1−Zᵢ)/2 (Zᵢ=−1 when
              xᵢ=1, Zᵢ=+1 when xᵢ=0). Also using xᵢxⱼ=(1−Zᵢ)(1−Zⱼ)/4=(1−Zᵢ−Zⱼ+ZᵢZⱼ)/4 and expanding
              directly gives,
            </p>
            <FormulaBlock>
              Objective function = Σᵢ <Frac num="1−Zᵢ" den="2" /> − <Frac num="A" den="4" /> Σ
              <sub>(i,j)∈E</sub> (1 − Zᵢ − Zⱼ + ZᵢZⱼ)
            </FormulaBlock>
            <p>Expanding and rearranging each term inside the Σ gives,</p>
            <FormulaBlock>
              <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span>
                  Objective function = <Frac num="n" den="2" /> − <Frac num="A|E|" den="4" /> −{' '}
                  <Frac num="1" den="2" /> Σᵢ Zᵢ
                </span>
                <span>
                  + <Frac num="A" den="4" /> Σ<sub>(i,j)∈E</sub> (Zᵢ + Zⱼ) −{' '}
                  <Frac num="A" den="4" /> Σ<sub>(i,j)∈E</sub> ZᵢZⱼ
                </span>
              </span>
            </FormulaBlock>
            <p>
              n/2 comes from Σᵢ(1/2) (n is the number of qubits), and −A|E|/4 comes from
              −(A/4)Σ<sub>(i,j)∈E</sub>1 (A/4 times the |E| ones, one per edge) — both are constant
              terms that don't depend on Z. Adding a constant to the whole expression doesn't change
              which bitstring maximizes the objective function, so from here on we ignore
              [n/2−A|E|/4] and track only the Zᵢ and ZᵢZⱼ terms.
            </p>
            <p>
              Let's check why deg(i) (the degree of node i, the number of edges connected to it)
              shows up here. The part Σ<sub>(i,j)∈E</sub>(Zᵢ+Zⱼ) in the formula above adds up, for
              every edge in the graph, one Z from each of its two endpoints. Zᵢ for node i appears in
              this sum once for each edge connected to i — that is, exactly deg(i) times — so
              reorganizing the sum over edges into a sum over nodes gives
            </p>
            <FormulaBlock>
              Σ<sub>(i,j)∈E</sub> (Zᵢ + Zⱼ) = Σᵢ deg(i)Zᵢ
            </FormulaBlock>
            <p>
              deg(i) is the coefficient that naturally arises from this operation of reorganizing a
              sum over edges into a sum over nodes. Applying this substitution, dropping the constant
              term [n/2−A|E|/4] we decided to ignore earlier, and flipping the sign (the cost
              Hamiltonian is defined as H<sub>C</sub>=−objective function) gives,
            </p>
            <FormulaBlock>
              H<sub>C</sub> = Σᵢ [1/2 − (A/4)deg(i)] Zᵢ + (A/4) Σ<sub>(i,j)∈E</sub> Z<sub>i</sub>Z<sub>j</sub>
            </FormulaBlock>
            <p>
              Compared to Max-Cut's H<sub>C</sub>=Σ Z<sub>i</sub>Z<sub>j</sub> from the Cost Unitary
              Step, the difference is the newly added Zᵢ term acting on each individual node — this
              is how the penalty term's effect is reflected per-node, according to the graph
              structure.
            </p>
          </>
        ) : (
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

            <Callout label="補足：Max-CutもQUBOとして定式化できる">
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#334155' }}>
                Step 5〜10で見たMax-Cut問題は、±1の値を取るσᵢをそのままZᵢに置き換えることで
                H<sub>C</sub>を導きましたが、実は同じ問題を、ここで導入したQUBOの枠組みを
                経由しても全く同じ場所にたどり着けます。ノードiがグループAならxᵢ=1、
                グループBならxᵢ=0とすると、辺(i,j)がカットされている（両端が違うグループ）
                ときxᵢ+xⱼ−2xᵢxⱼ=1、つながっている（同じグループ）とき0になるので、
                カット数の最大化はちょうど次のQUBOとして書けます。
              </p>
              <FormulaBlock>
                Cut(A,B) = Σ<sub>(i,j)∈E</sub> (xᵢ + xⱼ − 2xᵢxⱼ)
              </FormulaBlock>
              <p style={{ margin: '4px 0 14px', fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                2つの道筋、たどり着く先は1つ——両方の列を下までたどって、強調した箱を見比べてみてください：
              </p>
              <MaxCutQuboConvergenceDiagram lang={lang} />
              <p style={{ margin: '14px 0 10px', fontSize: 14, color: '#334155' }}>
                Step 8と同じ置き換えxᵢ=(1−Zᵢ)/2を代入して展開すると
                （計算の形は上のMISのQUBO→イジング変換と全く同じです）、
              </p>
              <FormulaBlock>
                xᵢ + xⱼ − 2xᵢxⱼ = (1 − ZᵢZⱼ) / 2
              </FormulaBlock>
              <p style={{ margin: '10px 0', fontSize: 14, color: '#334155' }}>となり、辺について足し合わせると、</p>
              <FormulaBlock>
                Cut(A,B) = Σ<sub>(i,j)∈E</sub> <Frac num="1 − ZᵢZⱼ" den="2" /> ={' '}
                <Frac num={<>|E| − H<sub>C</sub></>} den="2" />
                {'  ,  '}H<sub>C</sub> = Σ<sub>(i,j)∈E</sub> ZᵢZⱼ
              </FormulaBlock>
              <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                ——Step 8でσ→Zの置き換えから直接導いたH<sub>C</sub>と完全に一致します。つまり
                Step 5〜10で使ったσ=±1の近道と、ここでのQUBOを経由する道筋は、出発点が
                違うだけで、最終的に同じハミルトニアンにたどり着く2つのルートです。MISと
                違ってMax-CutのQUBOに罰則項が不要なのは、「カットされていること」自体が
                すでに最大化したい量そのものだからです——罰則項が必要になるのは、下のMISの
                ように、最適化したい対象と満たすべき制約が別物のときだけです。
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
      section: secUnitary(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              This H<sub>C</sub> too, just like Max-Cut's H<sub>C</sub>, is a sum of mutually
              commuting terms (the individual Zᵢ terms and the ZᵢZⱼ terms per edge), so by exactly
              the same reasoning we can decompose the cost unitary into individual gates.
            </p>
            <FormulaBlock>
              U<sub>C</sub>(γ) = exp(−iγH<sub>C</sub>) = Π<sub>i</sub> exp(−iγc<sub>i</sub>Z<sub>i</sub>) ·
              Π<sub>(i,j)∈E</sub> exp(−iγ(A/4)Z<sub>i</sub>Z<sub>j</sub>)
            </FormulaBlock>
            <p>
              (c<sub>i</sub> = 1/2 − (A/4)deg(i)) Here, exp(−iγc<sub>i</sub>Z<sub>i</sub>)
              corresponds to an RZ(2γc<sub>i</sub>) gate and exp(−iγ(A/4)Z<sub>i</sub>Z<sub>j</sub>)
              to an RZZ(γA/2) gate, by the same reasoning as the Cost Unitary Step. The mixer unitary
              U<sub>B</sub>(β) reuses exactly the same transverse-field Hamiltonian H<sub>B</sub>=Σᵢ
              Xᵢ and RX(2β) gate as Max-Cut, unchanged — only the cost unitary side needs
              MIS-specific changes.
            </p>
          </>
        ) : (
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
      section: secCircuitDesign(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <p>
              Let's trace how this circuit changes the quantum state, in ket notation, just as we
              did in the Adding the Mixer Unitary to the Circuit Step. Applying an H gate to every
              qubit on the initial state |0⟩<sup>⊗n</sup> gives,
            </p>
            <FormulaBlock>
              H<sup>⊗n</sup>: |0⟩<sup>⊗n</sup> ⟶ |+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              Applying the cost unitary U<sub>C</sub>(γ) to this state gives,
            </p>
            <FormulaBlock>
              U<sub>C</sub>(γ): |+⟩<sup>⊗n</sup> ⟶ U<sub>C</sub>(γ)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              and applying the mixer unitary U<sub>B</sub>(β) to that gives,
            </p>
            <FormulaBlock>
              U<sub>B</sub>(β): U<sub>C</sub>(γ)|+⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β)U<sub>C</sub>(γ)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>Writing the whole thing as a single arrow,</p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β)U<sub>C</sub>(γ)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              As we saw in the Building the Unitary Operators Step, U<sub>C</sub>(γ) decomposes into
              a product of each node's RZ(2γc<sub>i</sub>) gate and each edge's RZZ(γA/2) gate, and
              U<sub>B</sub>(β) decomposes into a product of RX(2β) gates on every qubit. Putting this
              all together, the circuit is arranged as "H → per-node RZ → per-edge RZZ → RX on all
              qubits."
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
              The circuit diagram is generated dynamically with Qiskit to match the selected graph.
              The difference from the Max-Cut circuit is the addition of a per-node RZ gate before
              the RZZ gates, whose coefficient is determined by the node's degree (the number of
              edges connected to it) — this is how the graph structure gets reflected into H
              <sub>C</sub>. The higher a node's degree, the larger the magnitude of its coefficient.
            </p>
          </>
        ) : (
          <>
            <p>
              ミキサーユニタリのStepと同じように、この回路が量子状態をどう変化させるかを
              ケット記法でたどります。初期状態|0⟩<sup>⊗n</sup>に全量子ビットへHゲートをかけると、
            </p>
            <FormulaBlock>
              H<sup>⊗n</sup>: |0⟩<sup>⊗n</sup> ⟶ |+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              続けて、コストユニタリU<sub>C</sub>(γ)をこの状態に作用させると、
            </p>
            <FormulaBlock>
              U<sub>C</sub>(γ): |+⟩<sup>⊗n</sup> ⟶ U<sub>C</sub>(γ)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              さらにミキサーユニタリU<sub>B</sub>(β)を作用させると、
            </p>
            <FormulaBlock>
              U<sub>B</sub>(β): U<sub>C</sub>(γ)|+⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β)U<sub>C</sub>(γ)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>全体をまとめて1本の矢印で書くと、</p>
            <FormulaBlock>
              |0⟩<sup>⊗n</sup> ⟶ U<sub>B</sub>(β)U<sub>C</sub>(γ)|+⟩<sup>⊗n</sup>
            </FormulaBlock>
            <p>
              となります。ユニタリ演算子の構築のStepで見た通り、U<sub>C</sub>(γ)は各ノードの
              RZ(2γc<sub>i</sub>)ゲートと各辺のRZZ(γA/2)ゲートの積に、U<sub>B</sub>(β)は
              全量子ビットのRX(2β)ゲートの積にそれぞれ分解されるので、以上を組み合わせると、
              回路は「H → 各ノードのRZ → 各辺のRZZ → 全量子ビットのRX」という並びになります。
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
      section: secResult(lang),
      title: '',
      content: <MISResultStep graphId={graphId} misOptimal={misOptimal} lang={lang} />,
    },
  ]
}
