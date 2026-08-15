import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { LandscapeResult } from './types'

const X_SPAN = 3
const Z_SPAN = 3
const HEIGHT_SPAN = 1.2

function toX(gamma: number) {
  return (gamma / (2 * Math.PI)) * X_SPAN - X_SPAN / 2
}
function toZ(beta: number) {
  return (beta / Math.PI) * Z_SPAN - Z_SPAN / 2
}

interface SurfaceProps {
  landscape: LandscapeResult
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

    const lowColor = new THREE.Color('#64748b')
    const highColor = new THREE.Color('#22c55e')

    const positions: number[] = []
    const colors: number[] = []
    for (let i = 0; i < nG; i++) {
      for (let j = 0; j < nB; j++) {
        const value = expectedCutValues[i][j]
        const t = (value - minV) / range
        positions.push(toX(gammaValues[i]), t * HEIGHT_SPAN, toZ(betaValues[j]))
        const c = lowColor.clone().lerp(highColor, t)
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
      return { origin, dir }
    })
  }, [landscape])

  return (
    <group>
      {arrows.map((a, i) => (
        <primitive
          key={i}
          object={new THREE.ArrowHelper(a.dir, a.origin, 0.18, 0xf59e0b, 0.06, 0.04)}
        />
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
      <meshStandardMaterial color="#ef4444" />
    </mesh>
  )
}

export function Landscape3D({ landscape }: SurfaceProps) {
  return (
    <div style={{ width: '100%', maxWidth: 600, height: 420, margin: '0 auto' }}>
      <Canvas camera={{ position: [2.6, 2.2, 2.6], fov: 42 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1} />
        <Surface landscape={landscape} />
        <GradientArrows landscape={landscape} />
        <BestMarker landscape={landscape} />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  )
}
