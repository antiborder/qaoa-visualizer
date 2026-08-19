import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line, OrbitControls, Sphere } from '@react-three/drei'
import * as THREE from 'three'

interface Vector3Like {
  x: number
  y: number
  z: number
}

// Bloch sphere convention: physics z (|0>/|1> axis) is mapped to three.js's
// up axis (y), so the sphere reads with |0> at the top as in textbook diagrams.
function toSceneVector({ x, y, z }: Vector3Like) {
  return new THREE.Vector3(x, z, y)
}

const SHAFT_RADIUS = 0.04

function BlochArrow({ target, color }: { target: Vector3Like; color: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const shaftRef = useRef<THREE.Mesh>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const current = useRef(new THREE.Vector3(0, 0, 0))

  // The backend is the sole source of quantum-computed values (see the
  // gamma-slider architecture discussion); this just eases the displayed
  // arrow toward the latest fetched vector so slider changes don't jump.
  useFrame((_, delta) => {
    const t = toSceneVector(target)
    current.current.lerp(t, Math.min(1, delta * 6))
    const length = Math.max(current.current.length(), 0.001)
    const dir =
      current.current.lengthSq() > 1e-8
        ? current.current.clone().normalize()
        : new THREE.Vector3(0, 1, 0)

    // Scale the arrowhead with the shaft length instead of using a fixed
    // size - a fixed head is larger than short vectors like a
    // heavily-entangled qubit's ~0.08 Bloch vector, which visually swallows
    // the whole arrow and makes very different lengths look the same.
    const headLength = Math.min(0.24, length * 0.7)
    const headWidth = Math.min(0.16, length * 0.44)
    const shaftLength = Math.max(length - headLength, 0.001)

    groupRef.current?.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    shaftRef.current?.scale.set(SHAFT_RADIUS, shaftLength, SHAFT_RADIUS)
    shaftRef.current?.position.set(0, shaftLength / 2, 0)
    headRef.current?.scale.set(headWidth, headLength, headWidth)
    headRef.current?.position.set(0, shaftLength + headLength / 2, 0)
  })

  return (
    <group ref={groupRef}>
      <mesh ref={shaftRef}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={headRef}>
        <coneGeometry args={[1, 1, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

interface BlochSphereProps {
  target: Vector3Like
  label: string
  color?: string
}

export function BlochSphere({ target, label, color = '#ff6f61' }: BlochSphereProps) {
  return (
    <div style={{ width: 150 }}>
      <div style={{ width: 150, height: 150 }}>
        <Canvas camera={{ position: [1.8, 1.3, 1.8], fov: 40 }}>
          <ambientLight intensity={1.2} />
          <Sphere args={[1, 24, 24]}>
            <meshBasicMaterial color="#9ca3af" wireframe transparent opacity={0.25} />
          </Sphere>
          <Line points={[[-1.2, 0, 0], [1.2, 0, 0]]} color="#9ca3af" lineWidth={1} />
          <Line points={[[0, -1.2, 0], [0, 1.2, 0]]} color="#9ca3af" lineWidth={1} />
          <Line points={[[0, 0, -1.2], [0, 0, 1.2]]} color="#9ca3af" lineWidth={1} />
          <BlochArrow target={target} color={color} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, margin: '4px 0 0' }}>{label}</p>
    </div>
  )
}
