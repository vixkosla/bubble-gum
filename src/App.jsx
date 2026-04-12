import { Vector3, CanvasTexture } from 'three'
import { useRef, forwardRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MeshDistortMaterial, MeshTransmissionMaterial, Environment, Lightformer, useTexture } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom, FXAA } from '@react-three/postprocessing'
import { BallCollider, Physics, RigidBody } from '@react-three/rapier'
import { useControls } from 'leva'
import './App.css'
import { WetAsphaltFloor } from './WetAsphaltFloor.jsx'

function FPSStats() {
  const [fps, setFps] = useState(60)
  const [history, setHistory] = useState(() => Array(60).fill(60))
  const frameRef = useRef()

  useEffect(() => {
    let count = 0
    let last = performance.now()
    const tick = () => {
      count++
      const now = performance.now()
      if (now - last >= 500) {
        const val = Math.round(count * 1000 / (now - last))
        setFps(val)
        setHistory(h => [...h.slice(1), Math.min(val, 120)])
        count = 0
        last = now
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  const W = 100, H = 36
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * W
    const y = H - (v / 120) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 20,
      width: 120, padding: '14px 12px 10px',
      background: 'rgba(255,255,255,0.12)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderRadius: 36,
      border: '1px solid rgba(255,0,128,0.22)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      pointerEvents: 'none', userSelect: 'none',
    }}>
      <span style={{
        fontSize: 36, fontWeight: 200, lineHeight: 1,
        letterSpacing: '0.02em',
        fontFamily: 'system-ui, sans-serif',
        color: 'rgba(255,0,128,0.65)',
      }}>{fps}</span>
      <svg width={W} height={H}>
        <polyline points={pts} fill="none"
          stroke="rgba(255,0,128,0.35)" strokeWidth="1.2"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function CameraRotator() {
  const { camera } = useThree()
  const target = useRef(0)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      const t = 1 - Math.max(0, Math.min(1, (w - 400) / (1200 - 400)))
      target.current = t * (Math.PI / 2)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useFrame((_, delta) => {
    camera.rotation.z += (target.current - camera.rotation.z) * Math.min(delta * 3, 1)
  })

  return null
}

function BackgroundSphere() {
  const { color, roughness, thickness, ior, chromaticAberration } = useControls('Background Sphere', {
    color:               { value: '#FFE8F4' },
    roughness:           { value: 0.05, min: 0,   max: 1,   step: 0.01 },
    thickness:           { value: 3.5,  min: 0,   max: 10,  step: 0.1  },
    ior:                 { value: 1.5,  min: 1,   max: 2.5, step: 0.01 },
    chromaticAberration: { value: 0.4,  min: 0,   max: 2,   step: 0.01 },
  })
  return (
    <mesh position={[-1.15, 0.5, -10.3]}>
      <sphereGeometry args={[4.4, 32, 32]} />
      <MeshTransmissionMaterial
        transmissionSampler
        color={color}
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
      <FPSStats />
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
  { position: [-0.2,  -0.05, 3.2], size: 0.45, useTransmissionMaterial: true, transmissionRes: 64 },
  { position: [ 0.35, -0.65, 3.8], size: 0.30, useTransmissionMaterial: true, transmissionRes: 64 },
  { position: [ 0.0,   1.0,  3.5], size: 0.55, useTransmissionMaterial: true, transmissionRes: 64 },
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

  // --- Metallic/matte (isOrbital → rendered by OrbitalMetallics, not physics) ---
  { position: [1.5, -0.5, 1],    size: 0.44, color: '#D44070', emissive: '#D44070', emissiveIntensity: 0.06, dCoef: { a: 0.05, b: 0.2  }, clearcoat: 0.4, roughness: 0.45, metalness: 0.0, isOrbital: true },
  { position: [-1.15, -1.75, -1], size: 0.44, color: '#3ABEC8', emissive: '#3ABEC8', emissiveIntensity: 0.06, dCoef: { a: 0.2,  b: 0.001}, clearcoat: 0.3, roughness: 0.50, metalness: 0.0, isOrbital: true },
  { position: [-1.6, 1.6, -0.8], size: 0.62, color: '#9B40CC', emissive: '#9B40CC', emissiveIntensity: 0.06, dCoef: { a: 0.1,  b: 0.1  }, clearcoat: 0.4, roughness: 0.48, metalness: 0.0, isOrbital: true },
  { position: [1.2, -0.5, -1.8], size: 0.75, color: '#E86040', emissive: '#E86040', emissiveIntensity: 0.06, dCoef: { a: 0.01, b: 0.2  }, clearcoat: 0.2, roughness: 0.50, metalness: 0.0, isOrbital: true },
  { position: [1.4, 2.3, -0.95], size: 0.65, color: '#CC3878', emissive: '#CC3878', emissiveIntensity: 0.06, dCoef: { a: 0.4,  b: 0.01 }, clearcoat: 0.4, roughness: 0.46, metalness: 0.0, isOrbital: true },
  { position: [-0.4, -0.8, 1.6], size: 0.52, color: '#F5F5F5', dCoef: { a: 0.1,  b: 0.1  }, clearcoat: 0.6, roughness: 0.35, metalness: 0.0, isOrbital: true },

  // --- Static (no physics) ---
  { position: [-2.15, -0.2, 2.3], size: 1.4, color: '#A0A0A0', dCoef: { a: 0.1, b: 0.1 }, clearcoat: 0.2, roughness: 0.30, metalness: 0.05, bumpScale: 2.0, isHypno: true, isStatic: true },
  { position: [-2, 1, -4],        size: 2.0, color: '#C040A0', emissive: '#C040A0', emissiveIntensity: 0.35, dCoef: { a: 0, b: 0.05 }, roughness: 0.7, metalness: 0, clearcoat: 0, opacity: 0.45, isStatic: true },


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

const dynamicSpheres = spheres.filter(s => !s.isStatic && !s.isOrbital)

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
      <N8AO halfRes distanceFalloff={distanceFalloff} aoRadius={aoRadius} intensity={intensity} />
      <FXAA />
      <Bloom intensity={0.3} luminanceThreshold={0.3} mipmapBlur={true} />
    </EffectComposer>
  )
}

const orbitalSpheres = spheres.filter(s => s.isOrbital)

function HypnoSphere({ position, size }) {
  const res = getSphRes(size)
  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[size, res, res]} />
      <MeshTransmissionMaterial
        backside
        samples={4}
        resolution={128}
        anisotropy={0.15}
        thickness={0.6}
        roughness={0.02}
        ior={1.5}
        chromaticAberration={0.18}
        toneMapped={true}
      />
    </mesh>
  )
}

function SparkleBackground() {
  const { scene } = useThree()

  useMemo(() => {
    const S = 512
    const canvas = document.createElement('canvas')
    canvas.width = S; canvas.height = S
    const ctx = canvas.getContext('2d')
    const img = ctx.createImageData(S, S)
    const d = img.data

    const h = (x, y, s) => {
      let n = (x * 1619 + y * 31337 + s * 1000003) | 0
      n = ((n ^ (n >>> 14)) * 0x45d9f3b) | 0
      n = ((n ^ (n >>> 15)) * 0x45d9f3b) | 0
      return Math.abs((n ^ (n >>> 16)) / 0x7fffffff)
    }

    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        let bright = 0
        const LAYERS = [[22, 0.10], [48, 0.07], [90, 0.045]]
        for (const [sc, dr] of LAYERS) {
          const sx = px / S * sc, sy = py / S * sc
          const cx = Math.floor(sx),  cy = Math.floor(sy)
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const nx = cx+dx, ny = cy+dy
              const rx = h(nx,ny,1)*0.72+0.14, ry = h(nx,ny,2)*0.72+0.14
              const r  = dr*(0.35+0.65*h(nx,ny,3))
              const fx = sx-(nx+rx), fy = sy-(ny+ry)
              const dist = Math.sqrt(fx*fx+fy*fy)
              if (dist < r) { const t=1-dist/r; bright += t*t*(0.5+0.5*h(nx,ny,4)) }
            }
          }
        }
        const b = Math.min(255, bright * 100)
        const i = (py*S+px)*4
        d[i]   = Math.min(255, 232 + b)
        d[i+1] = Math.min(255, 166 + b*0.88)
        d[i+2] = Math.min(255, 178 + b*0.9)
        d[i+3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    scene.background = new CanvasTexture(canvas)
  }, [scene])

  return null
}

function OrbitingLights() {
  const pinkRef = useRef()
  const cyanRef = useRef()
  const angle = useRef(0)

  useFrame((_, delta) => {
    angle.current += delta * 0.28
    const r = 5.5
    const px = Math.cos(angle.current) * r
    const pz = Math.sin(angle.current) * r
    if (pinkRef.current) pinkRef.current.position.set(px, -3.5, pz)
    const cx = Math.cos(angle.current + Math.PI) * r
    const cz = Math.sin(angle.current + Math.PI) * r
    if (cyanRef.current) cyanRef.current.position.set(cx, 3.5, cz)
  })

  return (
    <>
      <pointLight ref={pinkRef} color="#FF0080" intensity={8} distance={14} decay={2} />
      <pointLight ref={cyanRef} color="#00E5FF" intensity={6} distance={14} decay={2} />
    </>
  )
}

function OrbitalMetallics() {
  const groupRef = useRef()
  const bumpMap = useTexture('./bump.jpg')
  const angleZ = useRef(0)

  useFrame((_, delta) => {
    angleZ.current += delta * 0.09
    if (groupRef.current) {
      groupRef.current.rotation.set(0.28, 0.14, angleZ.current)
    }
  })

  return (
    <group ref={groupRef}>
      {orbitalSpheres.map((s, i) => (
        <mesh key={i} position={s.position} castShadow receiveShadow>
          <sphereGeometry args={[s.size, getSphRes(s.size), getSphRes(s.size)]} />
          <MeshDistortMaterial
            color={s.color}
            roughness={s.roughness}
            metalness={s.metalness}
            clearcoat={s.clearcoat ?? 0}
            clearcoatRoughness={0.5}
            bumpMap={bumpMap}
            bumpScale={1.1}
            distort={0}
            speed={0}
            emissive={s.emissive ?? '#000000'}
            emissiveIntensity={s.emissiveIntensity ?? 0}
          />
        </mesh>
      ))}
    </group>
  )
}

function Scene() {
  return (
    <Canvas dpr={[0.75, 1]} shadows gl={{ antialias: false, preserveDrawingBuffer: true }} camera={{ position: [0, 0, 20], fov: 25.5, near: 1, far: 60 }}>
      <SparkleBackground />
      <CameraRotator />
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

      {spheres.filter(s => s.isStatic && !s.isHypno).map((sphere, index) =>
        <StaticSphere key={`static-${index}`} {...sphere} />
      )}
      {spheres.filter(s => s.isHypno).map((sphere, index) =>
        <HypnoSphere key={`hypno-${index}`} {...sphere} />
      )}
      <OrbitalMetallics />

      <ambientLight color="white" intensity={0.45} />
      <directionalLight intensity={0.3} position={[3, 3, -1]} />
      <OrbitingLights />

      <PostProcessingControls />
      <Environment>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" color="white"   intensity={2} rotation-x={Math.PI / 2}  position={[2, 2, -3]}   scale={3} />
          <Lightformer form="circle" color="white"   intensity={1} rotation-y={Math.PI / 2}  position={[-3, 2, -2]}  scale={2} />
          <Lightformer form="circle" color="#AA00FF" intensity={0.3} rotation-y={Math.PI / 2}  position={[-3, -3, -3]} scale={4} />
          <Lightformer form="circle" color="#00C853" intensity={0.3} rotation-y={-Math.PI / 2} position={[3, 2, 0]}    scale={4} />
          <Lightformer form="circle" color="#FF0080" intensity={3}   rotation-x={-Math.PI / 2} position={[0.3, -4, 2]} scale={3} />
          <Lightformer form="circle" color="#00E5FF" intensity={2.5} rotation-x={Math.PI / 2}  position={[3.5, 4, 1]}  scale={3} />
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

    if (force > 0.02) {
      _impulse.current
        .copy(_offset.current)
        .multiplyScalar(Math.min(1.0, 0.25 * sphere.size))
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
