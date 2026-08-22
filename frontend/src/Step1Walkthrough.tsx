import { Callout, FormulaBlock } from './Formula'
import { GraphIconButton } from './GraphIconButton'
import { GraphTypePicker } from './GraphTypePicker'
import { GraphView } from './GraphView'
import type { GraphData, GraphInfo, OptimalResult, PartitionEntry, WalkthroughStep } from './types'

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
}

// Chapter 1 (progress-bar pill 1): just the welcome screen, its own pill.
const CH_INTRO = 'はじめに'
// Chapter 2 (pill 2): Steps 2, 3, 4 all live inside this one pill together -
// each Step is exactly one slide (one array entry), the pill just fills in
// three increments instead of one.
const CH_MAXCUT_BASICS = 'Max-Cut問題の基礎'

const SEC_WELCOME = 'はじめに'
const SEC_GRAPH_BASICS = 'グラフの基礎'
const SEC_MAXCUT = 'Max-Cut問題'
const SEC_BRUTE_FORCE = '総当たりでの答え'

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
}: Pick<Step1Args, 'graph' | 'optimal' | 'partition' | 'partitionIndex' | 'onSelectPartition'>) {
  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', margin: '16px 0' }}>
        {optimal.partitions.map((p, i) => (
          <GraphIconButton
            key={i}
            graph={graph}
            partition={p}
            label={`解 ${i + 1}`}
            selected={i === partitionIndex}
            onClick={() => onSelectPartition(i)}
          />
        ))}
      </div>
      <GraphView graph={graph} partition={partition} />
    </>
  )
}

// Steps 1-4 cover what used to be a single monolithic "Step 1: Max-Cut
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
}: Step1Args): WalkthroughStep[] {
  return [
    {
      chapter: CH_INTRO,
      section: SEC_WELCOME,
      title: '',
      content: (
        <>
          <h1>QAOAビジュアライザ</h1>
          <p>
            このアプリは、QAOA（量子近似最適化アルゴリズム）が実際に何をしているのかを、数式を
            追うだけでなく手を動かしながら理解するための、Step形式のビジュアライザです。Max-Cut
            問題を題材に、コストユニタリ・ミキサーユニタリの回路構成、パラメータランドスケープ、
            古典最適化ループ、層数pを増やす効果、実機ノイズの影響までを、実際に動く回路とグラフで
            1つずつ確認していきます。
          </p>
        </>
      ),
    },

    // --- Step 2: グラフの基礎（1スライド） ---
    {
      chapter: CH_MAXCUT_BASICS,
      section: SEC_GRAPH_BASICS,
      title: '',
      content: (
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

    // --- Step 3: Max-Cut問題（1スライド） ---
    {
      chapter: CH_MAXCUT_BASICS,
      section: SEC_MAXCUT,
      title: '',
      content: (
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

    // --- Step 4: 総当たりでの答え（1スライド） ---
    {
      chapter: CH_MAXCUT_BASICS,
      section: SEC_BRUTE_FORCE,
      title: '',
      content: (
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
