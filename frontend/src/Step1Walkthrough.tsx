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
  onJumpToChapter: (chapter: string) => void
}

// Chapter 1 (progress-bar pill 1): welcome + the high-level "what is QAOA"
// orientation both live in this pill, before any Max-Cut-specific content.
const CH_INTRO = 'はじめに'
// Chapter 2 (pill 2): Steps 3, 4, 5 all live inside this one pill together -
// each Step is exactly one slide (one array entry), the pill just fills in
// three increments instead of one.
const CH_MAXCUT_BASICS = 'Max-Cut問題の基礎'

const SEC_WELCOME = 'はじめに'
const SEC_GRAPH_BASICS = 'グラフの選定'
const SEC_WHAT_IS_QAOA = 'QAOAとは'
const SEC_MAXCUT = 'Max-Cut問題'
const SEC_BRUTE_FORCE = '総当たりでの答え'

// The chapters Step 1's "このアプリで学べること" list can jump to. Chapter
// names here are plain string literals matching the (unexported) chapter
// constants each Walkthrough file defines for itself - the same literal
// values App.tsx already uses inline for the chapters that aren't split
// into their own file (パラメータランドスケープ, 古典最適化ループ, etc.).
const TOC_ITEMS: { chapter: string; label: string }[] = [
  { chapter: CH_MAXCUT_BASICS, label: 'グラフとMax-Cut問題の基礎を学ぶ' },
  { chapter: 'コストユニタリ', label: 'コストユニタリで問題を量子状態の位相に変換する' },
  { chapter: 'ミキサーユニタリ', label: 'ミキサーユニタリで位相を測定確率に変換する' },
  { chapter: 'パラメータランドスケープ', label: 'パラメータ(γ,β)と期待カット値の関係を3D曲面で見る' },
  { chapter: '古典最適化ループ', label: '古典最適化アルゴリズムでパラメータを探索する' },
  { chapter: '2層目への拡張', label: '層を重ねてさらに良い解に近づける' },
  { chapter: '層数pへの一般化', label: '層数pを増やす効果と近似比を測定する' },
  { chapter: 'ノイズありシミュレーションとの比較', label: '実機ノイズが計算結果に与える影響を見る' },
  {
    chapter: '別の組合せ最適化問題への一般化 — 最大独立集合',
    label: '同じ手法を別の問題（最大独立集合）に一般化する',
  },
]

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

          <h3 style={{ fontSize: 17 }}>このアプリで学べること</h3>
          <ul style={{ paddingLeft: 22, lineHeight: 2.1 }}>
            {TOC_ITEMS.map((item) => (
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

    // --- Step 2: QAOAとは（1スライド） ---
    {
      chapter: CH_INTRO,
      section: SEC_WHAT_IS_QAOA,
      title: '',
      content: (
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

    // --- Step 3: グラフの基礎（1スライド） ---
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

    // --- Step 4: Max-Cut問題（1スライド） ---
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

    // --- Step 5: 総当たりでの答え（1スライド） ---
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
