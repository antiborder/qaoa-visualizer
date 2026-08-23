import { useEffect, useRef, useState } from 'react'
import { ConceptsPage } from './ConceptsPage'
import { buildCostUnitarySteps } from './CostUnitaryWalkthrough'
import { DepthScanStep } from './DepthScanStep'
import { LandscapeStep } from './LandscapeStep'
import { buildMixerUnitarySteps } from './MixerUnitaryWalkthrough'
import { buildMISSteps } from './MISWalkthrough'
import { NoiseStep } from './NoiseStep'
import { OptimizeStep } from './OptimizeStep'
import { buildStep1Steps } from './Step1Walkthrough'
import { buildTwoLayerSteps } from './TwoLayerWalkthrough'
import { Walkthrough } from './Walkthrough'
import type {
  GraphData,
  GraphInfo,
  Lang,
  LandscapeResult,
  MISOptimalResult,
  OptimalResult,
  WalkthroughStep,
} from './types'

const API_BASE = 'http://localhost:8000'

function App() {
  const [graphs, setGraphs] = useState<GraphInfo[]>([])
  const [graphId, setGraphId] = useState('bowtie')
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [optimal, setOptimal] = useState<OptimalResult | null>(null)
  const [misOptimal, setMisOptimal] = useState<MISOptimalResult | null>(null)
  const [landscape, setLandscape] = useState<LandscapeResult | null>(null)
  const [partitionIndex, setPartitionIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  // Always holds the most recently constructed `steps` array (assigned
  // below, after `steps` is built) - see jumpToChapter's comment.
  const stepsRef = useRef<WalkthroughStep[]>([])
  // Shared "layer 1" parameters: Step 5 (cost-only) only uses gamma1, but
  // Step 6 and Step 9 both build on the exact same first cost+mixer layer,
  // so all three steps read/write this one pair rather than keeping their
  // own separate copies.
  const [gamma1, setGamma1] = useState(0)
  const [beta1, setBeta1] = useState(0)
  // Minimal hash-based navigation - just enough to link out to a separate
  // "concepts" reference page without pulling in a routing library for a
  // single-user learning app with one extra page.
  const [page, setPage] = useState(() => (window.location.hash === '#concepts' ? 'concepts' : 'main'))
  // Language selection, shareable via ?lang=en / ?lang=ja in the URL.
  // Currently only Step1Walkthrough.tsx reads `lang` - every other chapter
  // still renders Japanese regardless of this value, as a deliberate pilot
  // before translating the rest.
  const [lang, setLang] = useState<Lang>(() =>
    new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'ja',
  )

  useEffect(() => {
    const onHashChange = () => setPage(window.location.hash === '#concepts' ? 'concepts' : 'main')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const changeLang = (next: Lang) => {
    setLang(next)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', next)
    window.history.replaceState(null, '', url)
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/graphs`)
      .then((res) => res.json())
      .then(setGraphs)
  }, [])

  useEffect(() => {
    // Deliberately keep the previous graph/optimal/landscape on screen while
    // the new ones load (stale-while-revalidate) instead of nulling them out
    // - nulling forced the "Loading..." fallback below to replace the whole
    // page on every graph switch, which collapsed the page height and reset
    // scroll to the top even when the picker triggering the switch was far
    // down the page (e.g. the reused GraphTypePicker on the last walkthrough
    // step). The stale data is fully replaced the moment the fetches resolve.
    setPartitionIndex(0)
    fetch(`${API_BASE}/api/graph?graphId=${graphId}`)
      .then((res) => res.json())
      .then(setGraph)
    fetch(`${API_BASE}/api/maxcut/optimal?graphId=${graphId}`)
      .then((res) => res.json())
      .then(setOptimal)
    fetch(`${API_BASE}/api/qaoa/landscape?graphId=${graphId}`)
      .then((res) => res.json())
      .then(setLandscape)
    fetch(`${API_BASE}/api/mis/optimal?graphId=${graphId}`)
      .then((res) => res.json())
      .then(setMisOptimal)
  }, [graphId])

  // Re-seed (gamma1, beta1) with the new graph's best p=1 point whenever the
  // landscape changes (initial load, or a graph switch) - a point tuned for
  // one graph isn't meaningful for another. The sliders in Step 5/6/9 can
  // still be freely readjusted afterward.
  useEffect(() => {
    if (landscape) {
      setGamma1(landscape.bestOnGrid.gamma)
      setBeta1(landscape.bestOnGrid.beta)
    }
  }, [landscape])

  if (page === 'concepts') {
    return <ConceptsPage />
  }

  if (!graph || !optimal) {
    return <p>Loading...</p>
  }

  const partition = optimal.partitions[partitionIndex]
  const currentGraphLabel = graphs.find((g) => g.id === graphId)?.label ?? graphId

  // Lets Step 1's "what you can learn here" list jump straight to a chapter
  // by name, without hardcoding its array index (which would break the
  // no-hardcoded-numbering design as soon as steps are inserted/reordered).
  // jumpToChapter only reads stepsRef.current when actually called (a click,
  // later), by which point this render's `steps` below has been assigned
  // into it - the ref breaks the chicken-and-egg problem of needing the
  // full array to resolve a jump target while still constructing that array.
  const jumpToChapter = (chapter: string) => {
    const index = stepsRef.current.findIndex((s) => s.chapter === chapter)
    if (index >= 0) {
      setCurrentStep(index)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Steps 1-5 (Step1Walkthrough.tsx) and onward (CostUnitaryWalkthrough.tsx)
  // are broken into small, one-idea-per-step screens. The remaining chapters
  // are still single-step "chapters" for now - each renders its existing,
  // unmodified component as one big step. Splitting those the same way is
  // future work; this flat array is the shape that lets it happen without
  // touching Walkthrough/SegmentedProgressBar.
  const steps: WalkthroughStep[] = [
    ...buildStep1Steps({
      graphs,
      graphId,
      onSelectGraph: setGraphId,
      graph,
      optimal,
      partition,
      partitionIndex,
      onSelectPartition: setPartitionIndex,
      currentGraphLabel,
      onJumpToChapter: jumpToChapter,
      lang,
    }),
    ...buildCostUnitarySteps({
      graphId,
      graph,
      partition,
      optimalCutValue: optimal.cutValue,
      gamma1,
      onGamma1Change: setGamma1,
      lang,
    }),
    ...buildMixerUnitarySteps({
      graphId,
      optimalCutValue: optimal.cutValue,
      gamma1,
      beta1,
      onGamma1Change: setGamma1,
      onBeta1Change: setBeta1,
      lang,
    }),
    {
      chapter: lang === 'en' ? 'Parameter Landscape' : 'パラメータランドスケープ',
      section: lang === 'en' ? 'Parameter Landscape' : 'パラメータランドスケープ',
      title: '',
      content: (
        <LandscapeStep
          landscape={landscape}
          optimalCutValue={optimal.cutValue}
          gamma1={gamma1}
          beta1={beta1}
          onGamma1Change={setGamma1}
          onBeta1Change={setBeta1}
          lang={lang}
        />
      ),
    },
    {
      chapter: lang === 'en' ? 'Classical Optimization Loop' : '古典最適化ループ',
      section: lang === 'en' ? 'Classical Optimization Loop' : '古典最適化ループ',
      title: '',
      content: (
        <OptimizeStep graphId={graphId} landscape={landscape} optimalCutValue={optimal.cutValue} lang={lang} />
      ),
    },
    ...buildTwoLayerSteps({
      graphId,
      optimalCutValue: optimal.cutValue,
      gamma1,
      beta1,
      onGamma1Change: setGamma1,
      onBeta1Change: setBeta1,
      lang,
    }),
    {
      chapter: lang === 'en' ? 'Generalizing to p Layers' : '層数pへの一般化',
      section: lang === 'en' ? 'Generalizing to p Layers' : '層数pへの一般化',
      title: '',
      content: <DepthScanStep graphId={graphId} lang={lang} />,
    },
    {
      chapter: lang === 'en' ? 'Comparing Against a Noisy Simulation' : 'ノイズありシミュレーションとの比較',
      section: lang === 'en' ? 'Comparing Against a Noisy Simulation' : 'ノイズありシミュレーションとの比較',
      title: '',
      content: landscape ? (
        <NoiseStep
          graphId={graphId}
          optimalCutValue={optimal.cutValue}
          bestPoint={landscape.bestOnGrid}
          lang={lang}
        />
      ) : null,
    },
    ...buildMISSteps({
      graphs,
      graphId,
      onSelectGraph: setGraphId,
      graph,
      misOptimal,
      lang,
    }),
  ]
  stepsRef.current = steps

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 0 0', fontSize: 13 }}>
        <button
          onClick={() => changeLang('ja')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            font: 'inherit',
            color: lang === 'ja' ? '#1f2937' : '#4f8cff',
            fontWeight: lang === 'ja' ? 700 : 400,
            textDecoration: lang === 'ja' ? 'none' : 'underline',
          }}
        >
          日本語
        </button>
        <span style={{ color: '#d1d5db' }}>|</span>
        <button
          onClick={() => changeLang('en')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            font: 'inherit',
            color: lang === 'en' ? '#1f2937' : '#4f8cff',
            fontWeight: lang === 'en' ? 700 : 400,
            textDecoration: lang === 'en' ? 'none' : 'underline',
          }}
        >
          English
        </button>
      </div>
      <Walkthrough steps={steps} stepIndex={currentStep} onStepChange={setCurrentStep} />
    </main>
  )
}

export default App
