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
