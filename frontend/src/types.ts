import type { ReactNode } from 'react'

export interface GraphNode {
  id: number
  x: number
  y: number
}

export interface GraphEdge {
  source: number
  target: number
}

export interface GraphData {
  id: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface GraphInfo extends GraphData {
  label: string
}

export interface PartitionEntry {
  node: number
  group: 0 | 1
}

export interface OptimalResult {
  cutValue: number
  totalEdges: number
  partitions: PartitionEntry[][]
  gwApproximationRatio: number
  gwGuaranteedCutValue: number
}

export interface BlochVector {
  node: number
  x: number
  y: number
  z: number
}

export interface CostOnlyResult {
  gamma: number
  maxProbabilityDeviation: number
  distribution: DistributionEntry[]
  blochVectors: BlochVector[]
}

export interface DistributionEntry {
  bitstring: string
  probability: number
  cutValue: number
}

export interface P1Result {
  gamma: number
  beta: number
  expectedCutValue: number
  distribution: DistributionEntry[]
  blochVectors: BlochVector[]
}

export interface GradientFieldEntry {
  gamma: number
  beta: number
  dGamma: number
  dBeta: number
  expectedCutValue: number
}

export interface LandscapeResult {
  gammaValues: number[]
  betaValues: number[]
  expectedCutValues: number[][]
  gradientField: GradientFieldEntry[]
  bestOnGrid: { gamma: number; beta: number; expectedCutValue: number }
}

export interface LayerLandscapeResult extends LandscapeResult {
  oneLayerValue: number
}

export interface TrajectoryPoint {
  gamma: number
  beta: number
  expectedCutValue: number
}

export type OptimizerMethod = 'cobyla' | 'spsa' | 'gradient'

export interface OptimizeResult {
  method: OptimizerMethod
  trajectory: TrajectoryPoint[]
}

export interface NoisyP1Result {
  gamma: number
  beta: number
  idealExpectedCutValue: number
  noisyExpectedCutValue: number
  distribution: DistributionEntry[]
}

export interface DepthScanResult {
  pValues: number[]
  optimalCutValue: number
  bestExpectedCutValues: number[]
  approximationRatios: number[]
  gradientVariances: number[]
  bestGammas: number[][]
  bestBetas: number[][]
  adiabaticGammas: number[][]
  adiabaticBetas: number[][]
}

export interface MISSelectionEntry {
  node: number
  selected: 0 | 1
}

export interface MISOptimalResult {
  size: number
  selections: MISSelectionEntry[][]
}

export interface MISDistributionEntry {
  bitstring: string
  probability: number
  objectiveValue: number
}

export interface MISP1Result {
  gamma: number
  beta: number
  expectedObjectiveValue: number
  distribution: MISDistributionEntry[]
}

export interface MISDepthScanResult {
  pValues: number[]
  optimalSize: number
  bestExpectedObjectiveValues: number[]
  approximationRatios: number[]
}

// One atomic screen in the paged walkthrough. Three levels of grouping:
//   chapter  - which pill in SegmentedProgressBar this step belongs to
//              (coarsest; several numbered sections can share one chapter,
//              e.g. Step 2/3/4 all live inside one chapter/pill)
//   section  - the numbered "Step N: section" unit (its number is computed
//              from its position among unique sections in Walkthrough.tsx,
//              never hardcoded)
//   title    - this atomic step's own heading within its section
// A section with only one step (Steps 5-12, for now) still renders
// correctly, it just fills its whole chapter/pill in a single Next click.
export interface WalkthroughStep {
  chapter: string
  section: string
  title: string
  content: ReactNode
}
