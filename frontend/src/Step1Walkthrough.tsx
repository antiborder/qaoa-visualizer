import { Callout, FormulaBlock } from './Formula'
import { GraphIconButton } from './GraphIconButton'
import { GraphTypePicker } from './GraphTypePicker'
import { GraphView } from './GraphView'
import type { GraphData, GraphInfo, Lang, OptimalResult, PartitionEntry, WalkthroughStep } from './types'

interface Step1Args {
  graphs: GraphInfo[]
  graphId: string
  onSelectGraph: (id: string) => void
  graph: GraphData
  optimal: OptimalResult
  partition: PartitionEntry[]
  partitionIndex: number
  onSelectPartition: (index: number) => void
  currentGraphLabel: string
  onJumpToChapter: (chapter: string) => void
  lang: Lang
}

// Chapter/section names are functions of `lang` rather than plain string
// constants, since the app-wide auto-numbering (Walkthrough.tsx) keys off
// exact string equality of `section` - as long as one render consistently
// uses one language's strings throughout, the numbering/pill-grouping stays
// correct regardless of which language is active.
const chIntro = (lang: Lang) => (lang === 'en' ? 'Introduction' : 'はじめに')
const chMaxcutBasics = (lang: Lang) => (lang === 'en' ? 'Max-Cut Basics' : 'Max-Cut問題の基礎')

const secWelcome = (lang: Lang) => (lang === 'en' ? 'Introduction' : 'はじめに')
const secGraphBasics = (lang: Lang) => (lang === 'en' ? 'Choosing a Graph' : 'グラフの選定')
const secWhatIsQaoa = (lang: Lang) => (lang === 'en' ? 'What is QAOA?' : 'QAOAとは')
const secMaxcut = (lang: Lang) => (lang === 'en' ? 'The Max-Cut Problem' : 'Max-Cut問題')
const secBruteForce = (lang: Lang) => (lang === 'en' ? 'The Brute-Force Answer' : '総当たりでの答え')

// The chapters Step 1's "what you can learn here" list can jump to. Chapter
// names here are plain string literals matching the (unexported) chapter
// constants each Walkthrough file defines for itself. NOTE: only this file
// is translated so far (the pilot chapter) - every other chapter's own
// pill/heading still renders in Japanese regardless of `lang`, so the jump
// targets below intentionally stay as their Japanese chapter names even
// when lang==='en'; only this list's own descriptive labels are translated.
function tocItems(lang: Lang): { chapter: string; label: string }[] {
  return [
    {
      chapter: chMaxcutBasics(lang),
      label: lang === 'en' ? 'Learn graph basics and the Max-Cut problem' : 'グラフとMax-Cut問題の基礎を学ぶ',
    },
    {
      chapter: 'コストユニタリ',
      label:
        lang === 'en'
          ? 'Use the cost unitary to encode the problem into a quantum phase'
          : 'コストユニタリで問題を量子状態の位相に変換する',
    },
    {
      chapter: 'ミキサーユニタリ',
      label:
        lang === 'en'
          ? 'Use the mixer unitary to convert phase into measurement probability'
          : 'ミキサーユニタリで位相を測定確率に変換する',
    },
    {
      chapter: 'パラメータランドスケープ',
      label:
        lang === 'en'
          ? 'See the relationship between (γ,β) and expected cut value as a 3D surface'
          : 'パラメータ(γ,β)と期待カット値の関係を3D曲面で見る',
    },
    {
      chapter: '古典最適化ループ',
      label: lang === 'en' ? 'Search for parameters with classical optimizers' : '古典最適化アルゴリズムでパラメータを探索する',
    },
    {
      chapter: '2層目への拡張',
      label: lang === 'en' ? 'Stack layers to get closer to the optimal solution' : '層を重ねてさらに良い解に近づける',
    },
    {
      chapter: '層数pへの一般化',
      label:
        lang === 'en'
          ? 'Measure the effect of adding layers and the approximation ratio'
          : '層数pを増やす効果と近似比を測定する',
    },
    {
      chapter: 'ノイズありシミュレーションとの比較',
      label: lang === 'en' ? 'See how real hardware noise affects the results' : '実機ノイズが計算結果に与える影響を見る',
    },
    {
      chapter: '別の組合せ最適化問題への一般化 — 最大独立集合',
      label:
        lang === 'en'
          ? 'Generalize the same method to another problem (Maximum Independent Set)'
          : '同じ手法を別の問題（最大独立集合）に一般化する',
    },
  ]
}

// A reusable "small icon row + big picture below" gallery: the same visual
// pattern is deliberately reused twice (once in SEC_MAXCUT to illustrate
// what a cut looks like, once in SEC_BRUTE_FORCE as the formal brute-force
// answer) rather than building two different components for the same idea.
function SolutionGallery({
  graph,
  optimal,
  partition,
  partitionIndex,
  onSelectPartition,
  lang,
}: Pick<Step1Args, 'graph' | 'optimal' | 'partition' | 'partitionIndex' | 'onSelectPartition' | 'lang'>) {
  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', margin: '16px 0' }}>
        {optimal.partitions.map((p, i) => (
          <GraphIconButton
            key={i}
            graph={graph}
            partition={p}
            label={lang === 'en' ? `Solution ${i + 1}` : `解 ${i + 1}`}
            selected={i === partitionIndex}
            onClick={() => onSelectPartition(i)}
          />
        ))}
      </div>
      <GraphView graph={graph} partition={partition} />
    </>
  )
}

// Steps 1-5 cover what used to be a single monolithic "Step 1: Max-Cut
// 問題設定" page. Each Step here is exactly one slide (one array entry) -
// Steps 2/3/4 stack several pieces of content into that one slide, in a
// fixed order, rather than being split into further sub-slides. Steps 2/3/4
// share one progress-bar chapter/pill (CH_MAXCUT_BASICS) even though
// they're numbered as three separate sections. Every visual here is an
// existing component reused as-is (GraphTypePicker, GraphView,
// GraphIconButton, FormulaBlock, Callout) - only the grouping is new, the
// content itself is unchanged from before.
export function buildStep1Steps({
  graphs,
  graphId,
  onSelectGraph,
  graph,
  optimal,
  partition,
  partitionIndex,
  onSelectPartition,
  currentGraphLabel,
  onJumpToChapter,
  lang,
}: Step1Args): WalkthroughStep[] {
  const CH_INTRO = chIntro(lang)
  const CH_MAXCUT_BASICS = chMaxcutBasics(lang)

  return [
    {
      chapter: CH_INTRO,
      section: secWelcome(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <h1>QAOA Visualizer</h1>
            <p>
              This app is a step-by-step visualizer for understanding what QAOA (the Quantum
              Approximate Optimization Algorithm) actually does — not just by following formulas,
              but by getting hands-on with it. Using the Max-Cut problem as a running example, you'll
              go through the cost/mixer unitary circuit construction, the parameter landscape, the
              classical optimization loop, the effect of adding layers, and the impact of real
              hardware noise — one idea at a time, with real running circuits and graphs.
            </p>

            <h3 style={{ fontSize: 17 }}>What you'll learn in this app</h3>
            <ul style={{ paddingLeft: 22, lineHeight: 2.1 }}>
              {tocItems(lang).map((item) => (
                <li key={item.chapter}>
                  <button
                    onClick={() => onJumpToChapter(item.chapter)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#4f8cff',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      font: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h1>QAOAビジュアライザ</h1>
            <p>
              このアプリは、QAOA（量子近似最適化アルゴリズム）が実際に何をしているのかを、数式を
              追うだけでなく手を動かしながら理解するための、Step形式のビジュアライザです。Max-Cut
              問題を題材に、コストユニタリ・ミキサーユニタリの回路構成、パラメータランドスケープ、
              古典最適化ループ、層数pを増やす効果、実機ノイズの影響までを、実際に動く回路とグラフで
              1つずつ確認していきます。
            </p>

            <h3 style={{ fontSize: 17 }}>このアプリで学べること</h3>
            <ul style={{ paddingLeft: 22, lineHeight: 2.1 }}>
              {tocItems(lang).map((item) => (
                <li key={item.chapter}>
                  <button
                    onClick={() => onJumpToChapter(item.chapter)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#4f8cff',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      font: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ),
    },

    // --- Step 2: QAOAとは / What is QAOA?（1スライド） ---
    {
      chapter: CH_INTRO,
      section: secWhatIsQaoa(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <h3 style={{ fontSize: 17 }}>What is QAOA?</h3>
            <p>
              <strong>QAOA</strong> (Quantum Approximate Optimization Algorithm) is a quantum
              algorithm for finding approximately good solutions to combinatorial optimization
              problems like Max-Cut. It gives no guarantee of finding the true optimum —
              it's a heuristic that, within a limited circuit depth and shot budget, shifts
              probability toward good solutions.
            </p>
            <p>
              Here's the rough shape of it. First, translate the problem you want to solve (Max-Cut,
              which you'll see in a later Step) into the language of quantum mechanics — a
              Hamiltonian. Next, build a quantum circuit (the cost unitary and mixer unitary) with
              tunable parameters γ,β, then run and measure it, producing a probability distribution
              that favors good solutions. Finally, a classical optimizer adjusts γ,β to make that
              probability bias even better — a <strong>hybrid algorithm</strong> where a quantum
              circuit and a classical computer work together to search for a solution.
            </p>
            <p>
              In the Steps that follow, you'll define the Max-Cut problem itself, translate it into
              the language of quantum mechanics, and then work through this whole flow hands-on:
              the actual circuit, parameter search, the effect of adding layers, and the impact of
              noise.
            </p>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 17 }}>QAOAとは</h3>
            <p>
              <strong>QAOA</strong>（Quantum Approximate Optimization Algorithm、量子近似最適化
              アルゴリズム）は、Max-Cutのような組合せ最適化問題の、なるべく良い解を近似的に
              見つけるための量子アルゴリズムです。真の最適解を確実に見つける保証はありません
              ——限られた回路の深さやショット数の中で、できるだけ良い解に確率的に近づけていく
              ヒューリスティック（経験的な手法）です。
            </p>
            <p>
              大まかな流れはこうです。まず解きたい問題（後のStepで見るMax-Cut）を量子力学の
              言葉——ハミルトニアン——に翻訳します。次に、パラメータγ・βで調整できる量子回路
              （コストユニタリ・ミキサーユニタリ）を組み、その回路を実行して測定することで、
              良い解ほど測定されやすい確率分布を作ります。最後に、古典コンピュータ側の最適化
              アルゴリズムがγ・βを調整し、この確率の偏りをさらに良くしていきます——量子回路と
              古典コンピュータが手を取り合って解を探す、<strong>ハイブリッドなアルゴリズム</strong>
              です。
            </p>
            <p>
              この後のStepでは、まずMax-Cut問題そのものを定義し、それを量子力学の言葉に翻訳する
              ところから、実際の回路・パラメータ探索・層数を増やす効果・ノイズの影響まで、
              この流れを1つずつ実際に動かしながら確認していきます。
            </p>
          </>
        ),
    },

    // --- Step 3: グラフの基礎 / Graph Basics（1スライド） ---
    {
      chapter: CH_MAXCUT_BASICS,
      section: secGraphBasics(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <h3 style={{ fontSize: 17 }}>Try it: choose a graph</h3>
            <p>First, pick the graph you'll work with.</p>
            <GraphTypePicker graphs={graphs} graphId={graphId} onSelect={onSelectGraph} />
            <GraphView graph={graph} />

            <h3 style={{ fontSize: 17 }}>What is a graph?</h3>
            <p>
              A collection of vertices (nodes) and the edges connecting them, like the one above, is
              called a <strong>graph</strong>. We call the set of vertices V, the set of edges E, and
              write the whole graph as G=(V,E).
            </p>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 17 }}>やってみよう：グラフを選ぶ</h3>
            <p>まずは取り組むグラフを選んでください。</p>
            <GraphTypePicker graphs={graphs} graphId={graphId} onSelect={onSelectGraph} />
            <GraphView graph={graph} />

            <h3 style={{ fontSize: 17 }}>グラフとは何か</h3>
            <p>
              このような、頂点（node）とそれらを結ぶ辺（edge）の集まりをここでは<strong>グラフ</strong>と
              呼びます。頂点の集合をV、辺の集合をEと呼び、グラフ全体をG=(V,E)と表記します。
            </p>
          </>
        ),
    },

    // --- Step 4: Max-Cut問題 / The Max-Cut Problem（1スライド） ---
    {
      chapter: CH_MAXCUT_BASICS,
      section: secMaxcut(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <h3 style={{ fontSize: 17 }}>The Max-Cut problem</h3>
            <p>
              Split the vertices of a graph G=(V,E) into two groups, A and B, so as to maximize the
              number of edges (cut edges) whose two endpoints fall in different groups. This is the{' '}
              <strong>Max-Cut problem</strong>. Click the icons below to compare the actual cuts
              (there may be several tied for optimal) for {currentGraphLabel}.
            </p>
            <SolutionGallery
              graph={graph}
              optimal={optimal}
              partition={partition}
              partitionIndex={partitionIndex}
              onSelectPartition={onSelectPartition}
              lang={lang}
            />

            <h3 style={{ fontSize: 17 }}>The formula for Cut(A,B)</h3>
            <FormulaBlock>
              Cut(A,B) = Σ<sub>(i,j)∈E</sub>{' '}
              <span style={{ fontSize: '0.6em' }}>[ i and j are in different groups ]</span>
            </FormulaBlock>

            <h3 style={{ fontSize: 17 }}>What's special about this graph</h3>
            <Callout label="Note: what's special about this graph">
              <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                This is the {currentGraphLabel} graph. It contains a triangle, so no split can ever
                cut every edge at once — which is exactly why it's worth searching for the "best"
                split.
              </p>
            </Callout>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 17 }}>Max-Cut問題とは</h3>
            <p>
              グラフG=(V,E)の頂点をグループA・Bの2つに分け、
              両端が異なるグループに属する辺（カットされた辺）の本数を最大化する分割 (A,B) を
              求めます。これが<strong>Max-Cut問題</strong>です。下のアイコンをクリックすると、
              {currentGraphLabel}に対する実際のカット（同点で最適なもの）を見比べられます。
            </p>
            <SolutionGallery
              graph={graph}
              optimal={optimal}
              partition={partition}
              partitionIndex={partitionIndex}
              onSelectPartition={onSelectPartition}
              lang={lang}
            />

            <h3 style={{ fontSize: 17 }}>Cut(A,B)の数式</h3>
            <FormulaBlock>
              Cut(A,B) = Σ<sub>(i,j)∈E</sub>{' '}
              <span style={{ fontSize: '0.6em' }}>[ i と j が異なるグループ ]</span>
            </FormulaBlock>

            <h3 style={{ fontSize: 17 }}>このグラフの特徴</h3>
            <Callout label="補足：このグラフの特徴">
              <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                これは{currentGraphLabel}のグラフです。三角形を含み、どう分けても辺を全部同時に
                カットすることはできません。だからこそ「一番良い分け方」を探す意味があります。
              </p>
            </Callout>
          </>
        ),
    },

    // --- Step 5: 総当たりでの答え / The Brute-Force Answer（1スライド） ---
    {
      chapter: CH_MAXCUT_BASICS,
      section: secBruteForce(lang),
      title: '',
      content:
        lang === 'en' ? (
          <>
            <h3 style={{ fontSize: 17 }}>The brute-force answer</h3>
            <p>
              For a graph this simple, brute force is actually faster than solving it on a quantum
              computer, so we've worked out the answer ahead of time. Let's check the pattern(s)
              that maximize the cut count.
            </p>
            <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>
              <li>
                Maximum cut value: <strong>{optimal.cutValue}</strong> / {optimal.totalEdges} edges
              </li>
              <li>Number of tied-optimal splits: {optimal.partitions.length} (choose below)</li>
            </ul>

            <h3 style={{ fontSize: 17 }}>Try it: compare the tied-optimal solutions</h3>
            <SolutionGallery
              graph={graph}
              optimal={optimal}
              partition={partition}
              partitionIndex={partitionIndex}
              onSelectPartition={onSelectPartition}
              lang={lang}
            />

            <h3 style={{ fontSize: 17 }}>Try changing the graph</h3>
            <Callout label="Note: what changes if you pick a different graph">
              <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                By brute force, this graph's maximum cut value is {optimal.cutValue} edges (out of{' '}
                {optimal.totalEdges} total). See how this value changes by picking a different graph
                below.
              </p>
            </Callout>
            <GraphTypePicker graphs={graphs} graphId={graphId} onSelect={onSelectGraph} />
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 17 }}>総当たりでの答え</h3>
            <p>
              実はこのように単純なグラフの場合は量子コンピュータで解くよりも総当たりで解く方が
              速いので、先に答えを出しておきました。カット数が最大になるパターンを確認して
              みましょう。
            </p>
            <ul style={{ paddingLeft: 22, lineHeight: 1.9 }}>
              <li>
                最大カット値: <strong>{optimal.cutValue}</strong> / {optimal.totalEdges} 辺
              </li>
              <li>同点で最適な分割: {optimal.partitions.length}通り（下で選べます）</li>
            </ul>

            <h3 style={{ fontSize: 17 }}>やってみよう：同点の解を見比べる</h3>
            <SolutionGallery
              graph={graph}
              optimal={optimal}
              partition={partition}
              partitionIndex={partitionIndex}
              onSelectPartition={onSelectPartition}
              lang={lang}
            />

            <h3 style={{ fontSize: 17 }}>グラフを変えて比べてみよう</h3>
            <Callout label="補足：グラフを変えると何が変わるか">
              <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                総当たり計算の結果、このグラフの最大カット値は{optimal.cutValue}辺（全
                {optimal.totalEdges}辺中）です。グラフを変えるとこの値がどう変わるか、下の
                アイコンで実際に選び直して比べてみてください。
              </p>
            </Callout>
            <GraphTypePicker graphs={graphs} graphId={graphId} onSelect={onSelectGraph} />
          </>
        ),
    },
  ]
}
