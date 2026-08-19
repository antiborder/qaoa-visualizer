import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { LandscapeResult } from './types'

const X_SPAN = 3
const Z_SPAN = 3
const HEIGHT_SPAN = 1.2

// Surface color scheme: fixed hue (green) and lightness, varying only
// saturation with <cut> - low cut is a pale, desaturated green, high cut is
// a vivid, saturated green, all at the same brightness. Exported so
// Heatmap2D can reuse the exact same scale for its 2D projection of the
// same data.
export const SURFACE_HUE = 142 / 360
export const SURFACE_LIGHTNESS = 0.75
export const SURFACE_SAT_LOW = 0.25
export const SURFACE_SAT_HIGH = 0.9

function toX(gamma: number) {
  return (gamma / (2 * Math.PI)) * X_SPAN - X_SPAN / 2
}
function toZ(beta: number) {
  return Z_SPAN / 2 - (beta / Math.PI) * Z_SPAN
}

interface SurfaceProps {
  landscape: LandscapeResult
}

const GAMMA_TICKS = [
  { value: 0, label: '0' },
  { value: Math.PI / 2, label: 'π/2' },
  { value: Math.PI, label: 'π' },
  { value: (3 * Math.PI) / 2, label: '3π/2' },
  { value: 2 * Math.PI, label: '2π' },
]
const BETA_TICKS = [
  { value: 0, label: '0' },
  { value: Math.PI / 2, label: 'π/2' },
  { value: Math.PI, label: 'π' },
]
// Fixed integer scale for the <cut> axis rather than the data's own
// min/max - every graph preset in this app has a true max cut of 2 or 4,
// so 0..4 gives one consistent, easy-to-read reference scale across graphs.
const CUT_AXIS_TICKS = [0, 1, 2, 3, 4]

interface AxisLabelsProps extends SurfaceProps {
  gammaLabel: string
  betaLabel: string
  maxCutValue: number
}

const tickLabelStyle: CSSProperties = {
  fontSize: 11,
  color: '#475569',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
}
const axisTitleStyle: CSSProperties = {
  ...tickLabelStyle,
  fontSize: 13,
  fontWeight: 600,
  color: '#1e293b',
}

// Explicit tick labels and a value axis, so a reader can read off actual
// (gamma, beta, <cut>) numbers from the plot instead of only relative shape.
// Rendered as plain DOM (via drei's Html) rather than in-scene 3D text, so
// labels don't depend on a typeface being fetched over the network.
function AxisLabels({ landscape, gammaLabel, betaLabel, maxCutValue }: AxisLabelsProps) {
  const flat = landscape.expectedCutValues.flat()
  const minV = Math.min(...flat)
  const maxV = Math.max(...flat)
  const range = maxV - minV || 1
  const corner = { x: -X_SPAN / 2 - 0.22, z: -Z_SPAN / 2 - 0.22 }

  // Anchor the gamma/beta tick labels to the height of the graph's known
  // true optimum (e.g. 4 for the bowtie graph) rather than the bottom
  // (f=0-ish) of the surface - the terrain's peaks and valleys make labels
  // sitting down among them hard to read, while this reference height sits
  // at or above the plotted surface, in clear space.
  const labelY = ((maxCutValue - minV) / range) * HEIGHT_SPAN

  return (
    <>
      {GAMMA_TICKS.map((t) => (
        <Html key={`g-${t.label}`} position={[toX(t.value), labelY, -Z_SPAN / 2 - 0.15]} center>
          <span style={tickLabelStyle}>{t.label}</span>
        </Html>
      ))}
      <Html position={[0, labelY, -Z_SPAN / 2 - 0.42]} center>
        <span style={axisTitleStyle}>{gammaLabel}</span>
      </Html>

      {BETA_TICKS.map((t) => (
        <Html key={`b-${t.label}`} position={[-X_SPAN / 2 - 0.15, labelY, toZ(t.value)]} center>
          <span style={tickLabelStyle}>{t.label}</span>
        </Html>
      ))}
      <Html position={[-X_SPAN / 2 - 0.42, labelY, 0]} center>
        <span style={axisTitleStyle}>{betaLabel}</span>
      </Html>

      {(() => {
        const cutTickY = (v: number) => ((v - minV) / range) * HEIGHT_SPAN
        const yBottom = cutTickY(CUT_AXIS_TICKS[0])
        const yTop = cutTickY(CUT_AXIS_TICKS[CUT_AXIS_TICKS.length - 1])
        // Tick numbers and the axis title sit at a genuinely different 3D
        // x-coordinate than the line itself (not just a CSS pixel nudge on
        // top of the same point) - a screen-space-only offset shrinks to
        // nothing once the user zooms in on the canvas, since it doesn't
        // scale with the 3D projection the way a real position offset does.
        const tickX = corner.x - 0.16
        const titleX = corner.x - 0.4
        return (
          <>
            <Line
              points={[
                [corner.x, yBottom, corner.z],
                [corner.x, yTop, corner.z],
              ]}
              color="#94a3b8"
              lineWidth={1.5}
            />
            {CUT_AXIS_TICKS.map((v) => (
              <Html key={`cut-${v}`} position={[tickX, cutTickY(v), corner.z]} center>
                <span style={tickLabelStyle}>{v}</span>
              </Html>
            ))}
            <Html position={[titleX, (yBottom + yTop) / 2, corner.z]} center>
              <span style={axisTitleStyle}>⟨cut⟩</span>
            </Html>
          </>
        )
      })()}
    </>
  )
}

function Surface({ landscape }: SurfaceProps) {
  const { gammaValues, betaValues, expectedCutValues } = landscape

  const geometry = useMemo(() => {
    const nG = gammaValues.length
    const nB = betaValues.length
    const flat = expectedCutValues.flat()
    const minV = Math.min(...flat)
    const maxV = Math.max(...flat)
    const range = maxV - minV || 1

    // Fixed hue/lightness (a light green), varying only saturation with
    // <cut> - low cut desaturates toward gray-green, high cut is a vivid
    // green, but nothing ever gets darker or lighter than its neighbors.
    const c = new THREE.Color()

    const positions: number[] = []
    const colors: number[] = []
    for (let i = 0; i < nG; i++) {
      for (let j = 0; j < nB; j++) {
        const value = expectedCutValues[i][j]
        const t = (value - minV) / range
        positions.push(toX(gammaValues[i]), t * HEIGHT_SPAN, toZ(betaValues[j]))
        c.setHSL(SURFACE_HUE, SURFACE_SAT_LOW + t * (SURFACE_SAT_HIGH - SURFACE_SAT_LOW), SURFACE_LIGHTNESS)
        colors.push(c.r, c.g, c.b)
      }
    }

    const indices: number[] = []
    for (let i = 0; i < nG - 1; i++) {
      for (let j = 0; j < nB - 1; j++) {
        const a = i * nB + j
        const b = a + 1
        const c = a + nB
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setIndex(indices)
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [gammaValues, betaValues, expectedCutValues])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.7} />
    </mesh>
  )
}

const ARROW_LENGTH = 0.18
const ARROW_HEAD_LENGTH = 0.08
const ARROW_HEAD_WIDTH = 0.032
const ARROW_SHAFT_RADIUS = 0.012

function GradientArrow({ origin, dir }: { origin: THREE.Vector3; dir: THREE.Vector3 }) {
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    return q
  }, [dir])

  const shaftLength = Math.max(ARROW_LENGTH - ARROW_HEAD_LENGTH, 0.01)

  return (
    <group position={origin} quaternion={quaternion}>
      <mesh position={[0, shaftLength / 2, 0]}>
        <cylinderGeometry args={[ARROW_SHAFT_RADIUS, ARROW_SHAFT_RADIUS, shaftLength, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[0, shaftLength + ARROW_HEAD_LENGTH / 2, 0]}>
        <coneGeometry args={[ARROW_HEAD_WIDTH, ARROW_HEAD_LENGTH, 12]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  )
}

function GradientArrows({ landscape }: SurfaceProps) {
  const arrows = useMemo(() => {
    const flat = landscape.expectedCutValues.flat()
    const minV = Math.min(...flat)
    const maxV = Math.max(...flat)
    const range = maxV - minV || 1

    return landscape.gradientField.map((g) => {
      const t = (g.expectedCutValue - minV) / range
      const origin = new THREE.Vector3(toX(g.gamma), t * HEIGHT_SPAN + 0.03, toZ(g.beta))
      const dir = new THREE.Vector3(g.dGamma, 0, g.dBeta)
      if (dir.lengthSq() > 1e-6) dir.normalize()
      else dir.set(0, 1, 0)
      return { origin, dir }
    })
  }, [landscape])

  return (
    <group>
      {arrows.map((a, i) => (
        <GradientArrow key={i} origin={a.origin} dir={a.dir} />
      ))}
    </group>
  )
}

function BestMarker({ landscape }: SurfaceProps) {
  const flat = landscape.expectedCutValues.flat()
  const minV = Math.min(...flat)
  const maxV = Math.max(...flat)
  const t = (landscape.bestOnGrid.expectedCutValue - minV) / (maxV - minV || 1)
  const pos: [number, number, number] = [
    toX(landscape.bestOnGrid.gamma),
    t * HEIGHT_SPAN + 0.05,
    toZ(landscape.bestOnGrid.beta),
  ]
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={0.7} />
    </mesh>
  )
}

// Marks the exact point the user's own gamma/beta sliders are currently at
// (as opposed to the grid's best point) - height comes from a precise
// single-point evaluation the caller already fetched, not the coarser grid,
// so it stays accurate even between grid samples. A plain black ring reads
// clearly against the surface because the surface's lightness is now fixed
// (only saturation varies), so there's no genuinely dark region to blend into.
function CurrentMarker({
  landscape,
  point,
  value,
}: SurfaceProps & { point: { gamma: number; beta: number }; value: number }) {
  const flat = landscape.expectedCutValues.flat()
  const minV = Math.min(...flat)
  const maxV = Math.max(...flat)
  const t = (value - minV) / (maxV - minV || 1)
  const pos: [number, number, number] = [toX(point.gamma), t * HEIGHT_SPAN + 0.05, toZ(point.beta)]
  return (
    <mesh position={pos} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.055, 0.018, 12, 24]} />
      <meshStandardMaterial color="#1f2937" />
    </mesh>
  )
}

// Marks the (gamma=0, beta=0) corner of the grid - for a "next layer"
// landscape (layer 2's gamma/beta with layer 1 fixed), the cost unitary at
// gamma2=0 is the identity and the two mixers compose into one, so this
// corner's height is EXACTLY the previous layer's value alone. Drawing it
// as an explicit reference (plane + boundary curves + marker) shows the
// viewer where "layer 2 does nothing" sits relative to the rest of the surface.
function OriginReference({ landscape }: SurfaceProps) {
  const { gammaValues, betaValues, expectedCutValues } = landscape
  const flat = expectedCutValues.flat()
  const minV = Math.min(...flat)
  const maxV = Math.max(...flat)
  const range = maxV - minV || 1

  const originValue = expectedCutValues[0][0]
  const originT = (originValue - minV) / range
  const originY = originT * HEIGHT_SPAN

  const gammaZeroLine: [number, number, number][] = betaValues.map((b, j) => {
    const t = (expectedCutValues[0][j] - minV) / range
    return [toX(gammaValues[0]), t * HEIGHT_SPAN + 0.01, toZ(b)]
  })
  const betaZeroLine: [number, number, number][] = gammaValues.map((g, i) => {
    const t = (expectedCutValues[i][0] - minV) / range
    return [toX(g), t * HEIGHT_SPAN + 0.01, toZ(betaValues[0])]
  })

  return (
    <>
      <mesh position={[0, originY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[X_SPAN, Z_SPAN]} />
        <meshBasicMaterial color="#64748b" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <Line points={gammaZeroLine} color="#2563eb" lineWidth={3} />
      <Line points={betaZeroLine} color="#2563eb" lineWidth={3} />
      <mesh position={[toX(gammaValues[0]), originY + 0.03, toZ(betaValues[0])]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.7} />
      </mesh>
    </>
  )
}

// Step 4 (and now Step 5's start point) has no live single-point endpoint
// of its own (unlike Step 6's two-layer-point), so a marker reads off the
// nearest sample already in the landscape grid - close enough to be
// visually exact at the grid's resolution.
export function nearestGridValue(landscape: LandscapeResult, gamma: number, beta: number): number {
  const { gammaValues, betaValues, expectedCutValues } = landscape
  let iBest = 0
  let iBestDiff = Infinity
  for (let i = 0; i < gammaValues.length; i++) {
    const diff = Math.abs(gammaValues[i] - gamma)
    if (diff < iBestDiff) {
      iBestDiff = diff
      iBest = i
    }
  }
  let jBest = 0
  let jBestDiff = Infinity
  for (let j = 0; j < betaValues.length; j++) {
    const diff = Math.abs(betaValues[j] - beta)
    if (diff < jBestDiff) {
      jBestDiff = diff
      jBest = j
    }
  }
  return expectedCutValues[iBest][jBest]
}

export interface Trajectory3D {
  label: string
  color: string
  points: { gamma: number; beta: number }[]
}

// Draws each optimizer's (gamma,beta) path as a line on a flat "ceiling"
// plane at height <cut>=maxCutValue (the true optimum), rather than at
// z=0 or following the surface's own (noisy, occluding) height - a fixed
// reference height keeps every trajectory equally readable regardless of
// where the terrain happens to dip or peak beneath it.
function TrajectoryPlane({
  landscape,
  maxCutValue,
  trajectories,
}: SurfaceProps & { maxCutValue: number; trajectories: Trajectory3D[] }) {
  const flat = landscape.expectedCutValues.flat()
  const minV = Math.min(...flat)
  const maxV = Math.max(...flat)
  const range = maxV - minV || 1
  const y = ((maxCutValue - minV) / range) * HEIGHT_SPAN

  return (
    <>
      {trajectories.map((traj) => (
        <group key={traj.label}>
          <Line
            points={traj.points.map((p) => [toX(p.gamma), y, toZ(p.beta)] as [number, number, number])}
            color={traj.color}
            lineWidth={2}
          />
          {traj.points.map((p, i) => (
            <mesh key={i} position={[toX(p.gamma), y, toZ(p.beta)]}>
              <sphereGeometry args={[i === traj.points.length - 1 ? 0.05 : 0.025, 12, 12]} />
              <meshStandardMaterial color={traj.color} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

// A same-sized placeholder for whatever is still loading (the 3D canvas
// itself, or a companion plot like Heatmap2D) - keeps the page layout
// stable instead of the content popping in once data arrives.
export function Skeleton({
  maxWidth,
  aspectRatio = '1 / 1',
}: {
  maxWidth: number
  aspectRatio?: string
}) {
  return (
    <div
      className="skeleton"
      style={{ width: '100%', maxWidth, aspectRatio, margin: '0 auto' }}
    />
  )
}

interface Landscape3DProps extends SurfaceProps {
  showOriginReference?: boolean
  gammaLabel?: string
  betaLabel?: string
  maxCutValue: number
  currentPoint?: { gamma: number; beta: number }
  currentValue?: number
  trajectories?: Trajectory3D[]
}

export function Landscape3D({
  landscape,
  showOriginReference,
  gammaLabel = 'γ',
  betaLabel = 'β',
  maxCutValue,
  currentPoint,
  currentValue,
  trajectories,
}: Landscape3DProps) {
  return (
    <div style={{ width: '100%', maxWidth: 740, aspectRatio: '1 / 1', margin: '0 auto' }}>
      <Canvas camera={{ position: [0.001, 6.3, -0.4], fov: 42, up: [0, 0, -1] }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1} />
        <Surface landscape={landscape} />
        <GradientArrows landscape={landscape} />
        <BestMarker landscape={landscape} />
        {currentPoint && currentValue !== undefined && (
          <CurrentMarker landscape={landscape} point={currentPoint} value={currentValue} />
        )}
        {trajectories && trajectories.length > 0 && (
          <TrajectoryPlane landscape={landscape} maxCutValue={maxCutValue} trajectories={trajectories} />
        )}
        <AxisLabels
          landscape={landscape}
          gammaLabel={gammaLabel}
          betaLabel={betaLabel}
          maxCutValue={maxCutValue}
        />
        {showOriginReference && <OriginReference landscape={landscape} />}
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  )
}

const swatchBase: CSSProperties = { flexShrink: 0, display: 'inline-block' }

interface Landscape3DLegendProps {
  landscape: LandscapeResult
  originValue?: number
  gammaLabel?: string
  betaLabel?: string
  currentValue?: number
}

// Mirrors the 3D scene's own colors/shapes for each glyph, so the legend
// reads as "this swatch IS that object" rather than a separate color key.
export function Landscape3DLegend({
  landscape,
  originValue,
  gammaLabel = 'γ',
  betaLabel = 'β',
  currentValue,
}: Landscape3DLegendProps) {
  return (
    <ul
      style={{
        fontSize: 13,
        color: '#374151',
        paddingLeft: 0,
        listStyle: 'none',
        lineHeight: 1.6,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            ...swatchBase,
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '13px solid #f59e0b',
            transform: 'rotate(45deg)',
            marginLeft: 3,
            marginRight: 3,
          }}
        />
        オレンジの矢印: 勾配（⟨cut⟩が最も急に増加する方向）
      </li>
      <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            ...swatchBase,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #fecaca, #f87171 55%, #ef4444)',
          }}
        />
        赤い球: 格子上の最良点（{gammaLabel}={landscape.bestOnGrid.gamma.toFixed(2)}, {betaLabel}=
        {landscape.bestOnGrid.beta.toFixed(2)}, ⟨cut⟩=
        {landscape.bestOnGrid.expectedCutValue.toFixed(3)}）
      </li>
      {currentValue !== undefined && (
        <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              ...swatchBase,
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '3px solid #1f2937',
              boxSizing: 'border-box',
            }}
          />
          黒い輪: スライダーの現在値（⟨cut⟩={currentValue.toFixed(3)}）
        </li>
      )}
      {originValue !== undefined && (
        <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              ...swatchBase,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #bfdbfe, #60a5fa 55%, #3b82f6)',
            }}
          />
          青い線・球・半透明の面: {gammaLabel}=0と{betaLabel}=0の交点（1層だけの値{' '}
          {originValue.toFixed(3)}）
        </li>
      )}
    </ul>
  )
}
