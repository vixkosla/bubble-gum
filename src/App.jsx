import { Vector3 } from 'three'
import { useRef, forwardRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, MeshTransmissionMaterial, Environment, Lightformer, useTexture } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom, FXAA } from '@react-three/postprocessing'
import { BallCollider, Physics, RigidBody } from '@react-three/rapier'
import './App.css'

function App() {
  return (
    <div className="container-canvas">
      <Scene />
    </div>
  )
}

// Adaptive resolution based on sphere size
function getSphRes(size) {
  if (size < 0.1)  return 8
  if (size < 0.25) return 12
  if (size < 0.5)  return 24
  if (size < 0.8)  return 32
  if (size < 1.5)  return 48
  return 64
}

const spheres = [
  // --- Transmission (glass/bubble) ---
  { position: [-0.2, -0.05, 0.8],  size: 0.45, useTransmissionMaterial: true, transmissionRes: 128 },
  { position: [0.35, -0.65, 2.5],  size: 0.3,  useTransmissionMaterial: true, transmissionRes: 128 },
  { position: [0, 1, 0.2],          size: 0.55, useTransmissionMaterial: true, transmissionRes: 128 },

  // --- Metallic/matte ---
  { position: [1.5, -0.5, 1],    size: 0.7,  color: 'grey',    dCoef: { a: 0.05, b: 0.2  }, clearcoat: 0.2, roughness: 0.45, metalness: 0.9 },
  { position: [-1.15, -1.75, -1], size: 0.7,  color: '#FFFFFF', dCoef: { a: 0.2,  b: 0.001}, clearcoat: 0,   roughness: 0.55, metalness: 0.6 },
  { position: [-1.6, 1.6, -0.8], size: 1.0,  color: 'silver',  dCoef: { a: 0.1,  b: 0.1  }, clearcoat: 0,   roughness: 0.6,  metalness: 1   },
  { position: [1.2, -0.5, -1.8], size: 1.2,  color: '#D9D9D9', dCoef: { a: 0.01, b: 0.2  }, clearcoat: 0,   roughness: 0.5,  metalness: 0   },
  { position: [1.4, 2.3, -0.95], size: 1.05, color: 'silver',  dCoef: { a: 0.4,  b: 0.01 }, clearcoat: 0,   roughness: 0.6,  metalness: 0.8 },

  // --- Static (no physics) ---
  { position: [-2.15, -0.2, 2.3], size: 1.4, color: 'white', dCoef: { a: 0.1, b: 0.1 }, clearcoat: 0.3, roughness: 0.45, metalness: 0, bumpScale: 0.4, isStatic: true },
  { position: [-2, 1, -4],        size: 2.0, color: 'grey',  dCoef: { a: 0.05, b: 0.05}, clearcoat: 0.9, roughness: 0.4,  metalness: 0.2, opacity: 0.9, isStatic: true },

  // --- Colored accent spheres — scattered, physics, verified no-overlap ---
  // Zone: right-center (between main cluster and front)
  { position: [ 0.60,  0.20, 2.00], size: 0.24, color: '#00C853', dCoef: { a: 0.05, b: 0.08 }, metalness: 0.9,  roughness: 0.12, clearcoat: 1.0 },
  { position: [ 1.00, -0.20, 2.20], size: 0.26, color: '#FFD600', dCoef: { a: 0.04, b: 0.09 }, metalness: 0.9,  roughness: 0.10, clearcoat: 1.0 },
  { position: [ 0.80, -0.50, 1.80], size: 0.22, color: '#AA00FF', dCoef: { a: 0.06, b: 0.07 }, metalness: 0.85, roughness: 0.15, clearcoat: 1.0 },
  { position: [ 0.50,  0.70, 1.80], size: 0.24, color: '#00C853', dCoef: { a: 0.05, b: 0.08 }, metalness: 0.9,  roughness: 0.12, clearcoat: 1.0 },
  { position: [ 0.90,  0.40, 1.40], size: 0.22, color: '#FFD600', dCoef: { a: 0.04, b: 0.09 }, metalness: 0.9,  roughness: 0.10, clearcoat: 1.0 },
  { position: [ 1.20,  0.10, 1.80], size: 0.20, color: '#AA00FF', dCoef: { a: 0.06, b: 0.07 }, metalness: 0.85, roughness: 0.15, clearcoat: 1.0 },
  // Zone: upper area
  { position: [ 0.40,  1.40, 1.20], size: 0.22, color: '#AA00FF', dCoef: { a: 0.05, b: 0.08 }, metalness: 0.85, roughness: 0.15, clearcoat: 1.0 },
  { position: [ 0.70,  1.60, 0.80], size: 0.24, color: '#FFD600', dCoef: { a: 0.04, b: 0.09 }, metalness: 0.9,  roughness: 0.10, clearcoat: 1.0 },
  // Zone: left-center
  { position: [-0.60,  0.80, 1.40], size: 0.24, color: '#00C853', dCoef: { a: 0.05, b: 0.08 }, metalness: 0.9,  roughness: 0.12, clearcoat: 1.0 },
  { position: [-0.80,  0.50, 1.00], size: 0.22, color: '#FFD600', dCoef: { a: 0.04, b: 0.09 }, metalness: 0.9,  roughness: 0.10, clearcoat: 1.0 },
  { position: [-0.40, -0.50, 1.60], size: 0.20, color: '#00C853', dCoef: { a: 0.06, b: 0.07 }, metalness: 0.9,  roughness: 0.12, clearcoat: 1.0 },
  { position: [ 0.20, -0.70, 1.30], size: 0.22, color: '#AA00FF', dCoef: { a: 0.05, b: 0.08 }, metalness: 0.85, roughness: 0.15, clearcoat: 1.0 },
]

function Scene() {
  return (
    <Canvas dpr={[1, 1.25]} shadows gl={{ antialias: false, preserveDrawingBuffer: true }} camera={{ position: [0, 0, 20], fov: 25.5, near: 1, far: 35 }}>
      <color attach="background" args={['#F9F9F9']} />
      <Physics gravity={[0, 0, 0]}>
        <Pointer />
        {spheres.filter(s => !s.isStatic).map((sphere, index) =>
          <Shell key={index} sphere={{ ...sphere, index }} />
        )}
        <mesh position={[-1.15, 0.5, -10.3]}>
          <sphereGeometry args={[4.4, 64, 64]} />
          <meshStandardMaterial color="white" />
        </mesh>
      </Physics>

      {spheres.filter(s => s.isStatic).map((sphere, index) =>
        <StaticSphere key={`static-${index}`} {...sphere} />
      )}

      <ambientLight color="white" intensity={0.45} />
      <directionalLight intensity={0.3} position={[3, 3, -1]} />

      <EffectComposer disableNormalPass multisampling={0}>
        <N8AO distanceFalloff={1} aoRadius={1} intensity={4} />
        <FXAA />
        <Bloom intensity={0.3} luminanceThreshold={0.3} mipmapBlur={true} />
      </EffectComposer>
      <Environment>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={2} rotation-x={Math.PI / 2} position={[2, 2, -3]} scale={3} />
          <Lightformer form="circle" intensity={1} rotation-y={Math.PI / 2} position={[-3, 2, -2]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-3, -3, -3]} scale={4} />
          <Lightformer form="circle" intensity={2} rotation-y={-Math.PI / 2} position={[3, 2, 0]} scale={4} />
        </group>
      </Environment>
    </Canvas>
  )
}

function Pointer({ vec = new Vector3() }) {
  const ref = useRef()
  const target = useRef(new Vector3())

  useFrame(({ mouse, viewport }) => {
    target.current.set(
      (mouse.x * viewport.width) / 2,
      (mouse.y * viewport.height) / 2,
      0.5
    )
    vec.lerp(target.current, 0.1)
    ref.current?.setTranslation(vec)
  })

  return (
    <RigidBody mass={0.01} restitution={0.1} ref={ref} position={[100, 100, 10]} linearDamping={4} colliders={false}>
      <BallCollider args={[1.5]} />
    </RigidBody>
  )
}

function Shell({ sphere }) {
  const api = useRef()
  const meshRef = useRef()

  const _currentPosition = useRef(new Vector3())
  const _posVector = useRef(new Vector3(...sphere.position))
  const _offset = useRef(new Vector3())
  const _impulse = useRef(new Vector3())

  useFrame(({ delta }) => {
    // Skip computation for sleeping bodies (Rapier sleep optimization)
    if (api.current?.isSleeping()) return

    delta = Math.min(delta, 0.1)

    if (meshRef.current) {
      meshRef.current.getWorldPosition(_currentPosition.current)
    }

    _offset.current.set(
      _posVector.current.x - _currentPosition.current.x,
      _posVector.current.y - _currentPosition.current.y,
      _posVector.current.z - _currentPosition.current.z,
    )

    const force = _offset.current.length()

    if (force > 0.15) {
      _impulse.current
        .copy(_offset.current)
        .normalize()
        .multiplyScalar(0.5 * sphere.size)
      api.current?.applyImpulse(_impulse.current, true)
    }
  })

  return (
    <RigidBody restitution={0} type="dynamic" mass={Math.pow(sphere.size, 2)} ref={api} position={sphere.position} linearDamping={2.0} angularDamping={1.0}>
      <AnimatedSphere ref={meshRef} {...sphere} />
    </RigidBody>
  )
}

function StaticSphere({ size, position, color, roughness, metalness, clearcoat, opacity = 1, bumpScale = 1, dCoef = { a: 0.05, b: 0.05 }, useTransmissionMaterial = false, transmissionRes = 64 }) {
  const bumpMap = useTexture('./bump.jpg')
  const res = getSphRes(size)
  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[size, res, res]} />
      {useTransmissionMaterial ? (
        <MeshTransmissionMaterial
          roughness={0.05}
          thickness={0.6}
          ior={1.4}
          chromaticAberration={0.5}
          anisotropy={0}
          envMapIntensity={0.15}
          samples={1}
          distortion={0.08}
          temporalDistortion={0}
          resolution={transmissionRes}
        />
      ) : (
        <MeshDistortMaterial
          color={color}
          distort={dCoef.b}
          speed={0}
          bumpMap={bumpMap}
          bumpScale={bumpScale}
          metalness={metalness}
          roughness={roughness}
          clearcoat={clearcoat}
          clearcoatRoughness={0.6}
          transparent={opacity < 1}
          opacity={opacity}
        />
      )}
    </mesh>
  )
}

const AnimatedSphere = forwardRef(({ size, color, dCoef, index, transparent = true, opacity = 1, metalness = 0, roughness = 0.35, clearcoat = 0.4, bumpScale = 1, useTransmissionMaterial = false, transmissionRes = 64 }, ref) => {
  const materialRef = useRef()
  const bumpMap = useTexture('./bump.jpg')
  const res = getSphRes(size)

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    if (materialRef.current && !useTransmissionMaterial && dCoef) {
      materialRef.current.distort = Math.cos(Math.sin(time + Math.PI * Math.pow(index, 2))) * dCoef.a + dCoef.b
    }
  })

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <sphereGeometry args={[size, res, res]} />
      {useTransmissionMaterial ? (
        <MeshTransmissionMaterial
          roughness={0.05}
          thickness={0.6}
          ior={1.4}
          chromaticAberration={0.5}
          anisotropy={0}
          envMapIntensity={0.15}
          samples={1}
          distortion={0}
          temporalDistortion={0}
          resolution={transmissionRes}
        />
      ) : (
        <MeshDistortMaterial
          ref={materialRef}
          color={color}
          speed={2}
          bumpMap={bumpMap}
          bumpScale={bumpScale}
          metalness={metalness}
          roughness={roughness}
          clearcoat={clearcoat}
          clearcoatRoughness={0.6}
          transparent={transparent}
          opacity={opacity}
        />
      )}
    </mesh>
  )
})

export default App
