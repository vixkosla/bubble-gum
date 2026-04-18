import { Vector3 } from 'three'
import { useRef, forwardRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, MeshTransmissionMaterial, Environment, Lightformer, useTexture } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom, FXAA } from '@react-three/postprocessing'
import { BallCollider, Physics, RigidBody } from '@react-three/rapier'
import { useControls } from 'leva'
import './App.css'

const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

function BackgroundSphere() {
  const { roughness, thickness, ior, chromaticAberration } = useControls('Background Sphere', {
    roughness:           { value: 0.02, min: 0,   max: 1,   step: 0.01 },
    thickness:           { value: 3.5,  min: 0,   max: 10,  step: 0.1  },
    ior:                 { value: 1.5,  min: 1,   max: 2.5, step: 0.01 },
    chromaticAberration: { value: 0.4,  min: 0,   max: 2,   step: 0.01 },
  })
  return (
    <mesh position={[-1.15, 0.5, -10.3]}>
      <sphereGeometry args={[4.4, 32, 32]} />
      <MeshTransmissionMaterial
        transmissionSampler={!IS_MOBILE}
        roughness={roughness}
        thickness={thickness}
        ior={ior}
        chromaticAberration={chromaticAberration}
        distortion={0}
        temporalDistortion={0}
        samples={1}
        resolution={128}
      />
    </mesh>
  )
}

function App() {
  return (
    <div className="container-canvas">
      <Scene />
    </div>
  )
}

// Adaptive resolution based on sphere size
function getSphRes(size) {
  if (size < 0.1)  return 16
  if (size < 0.25) return 24
  if (size < 0.5)  return 32
  if (size < 0.8)  return 48
  return 64
}

const spheres = [
  // --- Transmission (glass/bubble) — front layer, expanding rings ---
  // Core
  { position: [-0.2,  -0.05, 3.2], size: 0.45, useTransmissionMaterial: true, transmissionRes: 128 },
  { position: [ 0.35, -0.65, 3.8], size: 0.30, useTransmissionMaterial: true, transmissionRes: 128 },
  { position: [ 0.0,   1.0,  3.5], size: 0.55, useTransmissionMaterial: true, transmissionRes: 128 },
  // Ring 1
  { position: [-0.9,  -0.6,  3.3], size: 0.38, useTransmissionMaterial: true, transmissionRes: 64 },
  { position: [ 0.85,  0.55, 3.4], size: 0.35, useTransmissionMaterial: true, transmissionRes: 64 },
  { position: [-0.7,   1.9,  3.4], size: 0.32, useTransmissionMaterial: true, transmissionRes: 32 },
  { position: [ 1.0,  -1.1,  3.5], size: 0.30, useTransmissionMaterial: true, transmissionRes: 32 },
  // Ring 2
  { position: [-1.5,   0.3,  3.5], size: 0.25, useTransmissionMaterial: true, transmissionRes: 32 },
  { position: [ 1.5,   0.8,  3.6], size: 0.27, useTransmissionMaterial: true, transmissionRes: 32 },
  { position: [ 0.3,  -1.9,  3.4], size: 0.22, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [-1.4,   1.5,  3.5], size: 0.24, useTransmissionMaterial: true, transmissionRes: 16 },
  // Ring 3 (outer)
  { position: [-1.9,  -0.5,  3.5], size: 0.16, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [ 1.8,  -0.5,  3.6], size: 0.17, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [ 0.8,   2.2,  3.5], size: 0.15, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [-0.3,  -2.2,  3.4], size: 0.15, useTransmissionMaterial: true, transmissionRes: 16 },
  // Ring 4 (r≈2.8 — radial continuations of Ring 3 + gap fills)
  { position: [ 2.70, -0.75, 3.5], size: 0.14, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [ 0.96,  2.63, 3.5], size: 0.14, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [-2.71, -0.71, 3.5], size: 0.14, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [-0.38, -2.77, 3.5], size: 0.13, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [-1.68,  2.24, 3.5], size: 0.13, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [-1.80, -2.14, 3.5], size: 0.13, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [ 1.61, -2.29, 3.5], size: 0.13, useTransmissionMaterial: true, transmissionRes: 16 },
  // Ring 5 (r≈3.6 — same radial lines continued + gap fills)
  { position: [ 3.47, -0.96, 3.5], size: 0.13, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [ 1.23,  3.38, 3.5], size: 0.13, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [-3.48, -0.91, 3.5], size: 0.13, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [-0.49, -3.57, 3.5], size: 0.12, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [-2.17,  2.88, 3.5], size: 0.12, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [ 3.38,  1.23, 3.5], size: 0.12, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [-2.31, -2.76, 3.5], size: 0.12, useTransmissionMaterial: true, transmissionRes: 16 },
  { position: [ 2.07, -2.95, 3.5], size: 0.12, useTransmissionMaterial: true, transmissionRes: 16 },

  // --- Metallic/matte ---
  { position: [1.5, -0.5, 1],    size: 0.7,  color: 'grey',    dCoef: { a: 0.05, b: 0.2  }, clearcoat: 0.2, roughness: 0.45, metalness: 0.9 },
  { position: [-1.15, -1.75, -1], size: 0.7,  color: '#FFFFFF', dCoef: { a: 0.2,  b: 0.001}, clearcoat: 0,   roughness: 0.55, metalness: 0.6 },
  { position: [-1.6, 1.6, -0.8], size: 1.0,  color: 'silver',  dCoef: { a: 0.1,  b: 0.1  }, clearcoat: 0,   roughness: 0.6,  metalness: 1   },
  { position: [1.2, -0.5, -1.8], size: 1.2,  color: '#D9D9D9', dCoef: { a: 0.01, b: 0.2  }, clearcoat: 0,   roughness: 0.5,  metalness: 0   },
  { position: [1.4, 2.3, -0.95], size: 1.05, color: 'silver',  dCoef: { a: 0.4,  b: 0.01 }, clearcoat: 0,   roughness: 0.6,  metalness: 0.8 },

  // --- Static (no physics) ---
  { position: [-2.15, -0.2, 2.3], size: 1.4, color: 'white', dCoef: { a: 0.1, b: 0.1 }, clearcoat: 0.3, roughness: 0.45, metalness: 0, bumpScale: 0.4, isStatic: true },
  { position: [-2, 1, -4],        size: 2.0, color: 'grey',  dCoef: { a: 0.05, b: 0.05}, clearcoat: 0.9, roughness: 0.4,  metalness: 0.2, opacity: 0.9, isStatic: true },


  // --- Accent spheres: 7-color palette, varied sizes, candy/jewel material ---
  { position: [ 0.60,  0.20, 2.00], size: 0.30, color: '#FF0080', emissive: '#FF0080', emissiveIntensity: 0.18, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 1.00, -0.20, 2.20], size: 0.34, color: '#00FF41', emissive: '#00FF41', emissiveIntensity: 0.18, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 0.80, -0.50, 1.80], size: 0.20, color: '#FFFF00', emissive: '#FFFF00', emissiveIntensity: 0.20, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.25, clearcoat: 0.5, isAccent: true },
  { position: [ 0.50,  0.70, 1.80], size: 0.36, color: '#CC00FF', emissive: '#CC00FF', emissiveIntensity: 0.18, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 0.90,  0.40, 1.40], size: 0.18, color: '#00E5FF', emissive: '#00E5FF', emissiveIntensity: 0.18, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 1.20,  0.10, 1.80], size: 0.24, color: '#FF3D00', emissive: '#FF3D00', emissiveIntensity: 0.20, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.25, clearcoat: 0.5, isAccent: true },
  { position: [ 0.40,  1.40, 1.20], size: 0.28, color: '#FF0080', emissive: '#FF0080', emissiveIntensity: 0.18, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 0.70,  1.60, 0.80], size: 0.16, color: '#00FF41', emissive: '#00FF41', emissiveIntensity: 0.18, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [-0.60,  0.80, 1.40], size: 0.32, color: '#CC00FF', emissive: '#CC00FF', emissiveIntensity: 0.18, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [-0.80,  0.50, 1.00], size: 0.22, color: '#FFFF00', emissive: '#FFFF00', emissiveIntensity: 0.20, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.25, clearcoat: 0.5, isAccent: true },
  { position: [-0.40, -0.50, 1.60], size: 0.18, color: '#00E5FF', emissive: '#00E5FF', emissiveIntensity: 0.18, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 0.20, -0.70, 1.30], size: 0.26, color: '#FF3D00', emissive: '#FF3D00', emissiveIntensity: 0.20, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.25, clearcoat: 0.5, isAccent: true },


  // --- Background color spheres (large, semi-transparent, compositional) ---
  { position: [ 1.5,  0.0, -4.5], size: 1.2, color: '#FF0080', emissive: '#FF0080', emissiveIntensity: 0.4, dCoef: { a: 0, b: 0.08 }, roughness: 0.7, metalness: 0, clearcoat: 0, opacity: 0.45, isStatic: true },
  { position: [ 1.0,  2.5, -4.5], size: 1.0, color: '#00E5FF', emissive: '#00E5FF', emissiveIntensity: 0.4, dCoef: { a: 0, b: 0.08 }, roughness: 0.7, metalness: 0, clearcoat: 0, opacity: 0.45, isStatic: true },
  { position: [-0.5, -2.0, -4.0], size: 0.8, color: '#FF0080', emissive: '#FF0080', emissiveIntensity: 0.35, dCoef: { a: 0, b: 0.08 }, roughness: 0.7, metalness: 0, clearcoat: 0, opacity: 0.40, isStatic: true },
]

const dynamicSpheres = spheres.filter(s => !s.isStatic)

function AccentGroup() {
  const { accentVisible } = useControls('Experiment', {
    accentVisible: { value: true, label: 'accent balls visible' },
  })
  return dynamicSpheres
    .filter(s => s.isAccent)
    .map((sphere) => {
      const index = dynamicSpheres.indexOf(sphere)
      return <Shell key={`accent-${index}`} sphere={{ ...sphere, index }} meshVisible={accentVisible} />
    })
}

function PostProcessingControls() {
  const { intensity, aoRadius, distanceFalloff } = useControls('N8AO', {
    intensity:       { value: 2.5,  min: 0,   max: 8, step: 0.1 },
    aoRadius:        { value: 1.2,  min: 0.1, max: 5, step: 0.1 },
    distanceFalloff: { value: 1.5,  min: 0,   max: 5, step: 0.1 },
  })
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <N8AO distanceFalloff={distanceFalloff} aoRadius={aoRadius} intensity={intensity} />
      <FXAA />
      <Bloom intensity={0.3} luminanceThreshold={0.3} mipmapBlur={true} />
    </EffectComposer>
  )
}

function Scene() {
  return (
    <Canvas dpr={[1, 1.25]} shadows gl={{ antialias: false, preserveDrawingBuffer: true }} camera={{ position: [0, 0, 20], fov: 25.5, near: 1, far: 35 }}>
      <color attach="background" args={['#F9F9F9']} />
      <Physics gravity={[0, 0, 0]}>
        <Pointer />
        {dynamicSpheres.filter(s => !s.isAccent).map((sphere) => {
          const index = dynamicSpheres.indexOf(sphere)
          return <Shell key={index} sphere={{ ...sphere, index }} />
        })}
        <AccentGroup />
        <BackgroundSphere />
        <RigidBody type="fixed" position={[-2.15, -0.2, 2.3]} colliders={false}>
          <BallCollider args={[1.4]} />
        </RigidBody>
        <RigidBody type="fixed" position={[-2, 1, -4]} colliders={false}>
          <BallCollider args={[2.0]} />
        </RigidBody>
      </Physics>

      {spheres.filter(s => s.isStatic).map((sphere, index) =>
        <StaticSphere key={`static-${index}`} {...sphere} />
      )}

      <ambientLight color="white" intensity={0.45} />
      <directionalLight intensity={0.3} position={[3, 3, -1]} />
      <pointLight color="#FF0080" intensity={8} position={[0.3, -4, 2]} distance={12} decay={2} />

      <PostProcessingControls />
      <Environment>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" color="white"   intensity={2} rotation-x={Math.PI / 2}  position={[2, 2, -3]}   scale={3} />
          <Lightformer form="circle" color="white"   intensity={1} rotation-y={Math.PI / 2}  position={[-3, 2, -2]}  scale={2} />
          <Lightformer form="circle" color="#AA00FF" intensity={0.3} rotation-y={Math.PI / 2}  position={[-3, -3, -3]} scale={4} />
          <Lightformer form="circle" color="#00C853" intensity={0.3} rotation-y={-Math.PI / 2} position={[3, 2, 0]}    scale={4} />
          <Lightformer form="circle" color="#FF0080" intensity={3}   rotation-x={-Math.PI / 2} position={[0.3, -4, 2]} scale={3} />
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

function Shell({ sphere, meshVisible = true }) {
  const api = useRef()
  const meshRef = useRef()

  const _currentPosition = useRef(new Vector3())
  const _posVector = useRef(new Vector3(...sphere.position))
  const _offset = useRef(new Vector3())
  const _impulse = useRef(new Vector3())

  useFrame(({ delta }) => {
    // Skip heavy position restore for sleeping bodies
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
      <AnimatedSphere ref={meshRef} {...sphere} meshVisible={meshVisible} />
    </RigidBody>
  )
}

function StaticSphere({ size, position, color, roughness, metalness, clearcoat, opacity = 1, bumpScale = 1, dCoef = { a: 0.05, b: 0.05 }, useTransmissionMaterial = false, transmissionRes = 64, emissive = '#000000', emissiveIntensity = 0 }) {
  const bumpMap = useTexture('./bump.jpg')
  const res = getSphRes(size)
  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[size, res, res]} />
      {useTransmissionMaterial ? (
        <MeshTransmissionMaterial
          roughness={0.02}
          thickness={1.2}
          ior={1.5}
          chromaticAberration={1.0}
          anisotropy={0.3}
          envMapIntensity={0.5}
          samples={1}
          distortion={0.18}
          temporalDistortion={0.04}
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
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      )}
    </mesh>
  )
}

const AnimatedSphere = forwardRef(({ size, color, dCoef, index, transparent = true, opacity = 1, metalness = 0, roughness = 0.35, clearcoat = 0.4, bumpScale = 1, useTransmissionMaterial = false, transmissionRes = 64, emissive = '#000000', emissiveIntensity = 0, meshVisible = true }, ref) => {
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
    <mesh ref={ref} castShadow receiveShadow visible={meshVisible}>
      <sphereGeometry args={[size, res, res]} />
      {useTransmissionMaterial ? (
        <MeshTransmissionMaterial
          roughness={0.02}
          thickness={1.2}
          ior={1.5}
          chromaticAberration={1.0}
          anisotropy={0.3}
          envMapIntensity={0.5}
          samples={1}
          distortion={0.12}
          temporalDistortion={0.04}
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
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      )}
    </mesh>
  )
})

export default App
