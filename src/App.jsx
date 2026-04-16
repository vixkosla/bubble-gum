import { Color, Vector2, Vector3, Euler, CanvasTexture, DoubleSide, ClampToEdgeWrapping } from 'three'
import { useRef, forwardRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MeshDistortMaterial, MeshTransmissionMaterial, Environment, Lightformer, useTexture } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom, FXAA, ChromaticAberration, Vignette, HueSaturation } from '@react-three/postprocessing'
import { BallCollider, Physics, RigidBody } from '@react-three/rapier'
import { useControls, Leva } from 'leva'
import './App.css'

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
  const { color, roughness, thickness, ior, chromaticAberration, envMapIntensity } = usePersistentControls('Background Sphere', `${LEVA_STORAGE_PREFIX}:background-sphere`, {
    color:               { value: '#FFE8F4' },
    roughness:           { value: 0.05, min: 0,   max: 1,   step: 0.01 },
    thickness:           { value: 3.5,  min: 0,   max: 10,  step: 0.1  },
    ior:                 { value: 1.5,  min: 1,   max: 2.5, step: 0.01 },
    chromaticAberration: { value: 0.4,  min: 0,   max: 2,   step: 0.01 },
    envMapIntensity:     { value: 0.5,  min: 0,   max: 2,   step: 0.05 },
  })
  return (
    <mesh position={[-1.15, 0.5, -10.3]}>
      <sphereGeometry args={[4.4, 28, 28]} />
      <MeshTransmissionMaterial
        transmissionSampler
        color={color}
        roughness={roughness}
        thickness={thickness}
        ior={ior}
        chromaticAberration={chromaticAberration}
        distortion={0}
        temporalDistortion={0}
        envMapIntensity={envMapIntensity}
        samples={1}
        resolution={48}
      />
    </mesh>
  )
}

function App() {
  const isMobile = window.innerWidth < 768
  return (
    <div className="container-canvas">
      <Leva hidden={isMobile} />
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

const LEVA_STORAGE_PREFIX = 'bubble-gum:leva'

function readPersistedLeva(storageKey) {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function buildPersistedSchema(schema, persistedValues) {
  return Object.fromEntries(Object.entries(schema).map(([key, config]) => {
    if (!config || typeof config !== 'object' || !('value' in config)) return [key, config]
    const nextValue = Object.prototype.hasOwnProperty.call(persistedValues, key) ? persistedValues[key] : config.value
    return [key, { ...config, value: nextValue }]
  }))
}

function usePersistentControls(folder, storageKey, schema) {
  const schemaRef = useRef()
  if (!schemaRef.current) {
    schemaRef.current = buildPersistedSchema(schema, readPersistedLeva(storageKey))
  }
  const controls = useControls(folder, schemaRef.current)
  const serialized = JSON.stringify(controls)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, serialized)
  }, [storageKey, serialized])

  return controls
}

const FRONT_GLASS_DEFAULTS = {
  tint: '#E8F6FF',
  roughness: 0.02,
  thickness: 1.0,
  ior: 1.5,
  chromaticAberration: 0.6,
  anisotropy: 0.15,
  distortion: 0.08,
  temporalDistortion: 0.02,
  envMapIntensity: 0.5,
}

const LEFT_GLASS_DEFAULTS = {
  tint: '#F2E2FF',
}

const FRONT_GLASS_PALETTE_DEFAULTS = {
  tintA: '#FFE8F2',
  tintB: '#E5F6FF',
  tintC: '#EEE3FF',
  tintD: '#FFF0DA',
  variation: 0.62,
}

const REFLECTION_BOOST_DEFAULTS = {
  whiteKey: 2.0,
  pinkRim: 3.0,
  cyanRim: 2.5,
  frontFill: 0.7,
}

const PERFORMANCE_DEFAULTS = {
  dprMin: 0.55,
  dprMax: 0.85,
}

const spheres = [
  // --- 4×4 GRID (dots-game layout, spacing 0.60, centered 0, 0, 3.28) ---
  // Row 1 (top)
  { position: [-0.90,  0.90, 3.28], size: 0.22, useTransmissionMaterial: true, transmissionRes: 32 },
  { position: [-0.30,  0.90, 3.28], size: 0.16, useTransmissionMaterial: true, transmissionRes: 16, hasStarfish: true },
  { position: [ 0.30,  0.90, 3.28], size: 0.16, useTransmissionMaterial: true, transmissionRes: 16, hasStarfish: true },
  { position: [ 0.90,  0.90, 3.28], size: 0.22, useTransmissionMaterial: true, transmissionRes: 32 },

  // Row 2
  { position: [-0.90,  0.30, 3.28], size: 0.16, useTransmissionMaterial: true, transmissionRes: 16, hasStarfish: true },
  { position: [-0.30,  0.30, 3.28], size: 0.27, useTransmissionMaterial: true, transmissionRes: 64, hasEye: true, gemVariant: 'amethyst' },
  { position: [ 0.30,  0.30, 3.28], size: 0.27, useTransmissionMaterial: true, transmissionRes: 64, hasEye: true, gemVariant: 'aqua' },
  { position: [ 0.90,  0.30, 3.28], size: 0.16, useTransmissionMaterial: true, transmissionRes: 16, hasStarfish: true },

  // Row 3
  { position: [-0.90, -0.30, 3.28], size: 0.16, useTransmissionMaterial: true, transmissionRes: 16, hasStarfish: true },
  { position: [-0.30, -0.30, 3.28], size: 0.27, useTransmissionMaterial: true, transmissionRes: 64, hasEye: true, gemVariant: 'magenta' },
  { position: [ 0.30, -0.30, 3.28], size: 0.27, useTransmissionMaterial: true, transmissionRes: 64, hasEye: true, gemVariant: 'amethyst' },
  { position: [ 0.90, -0.30, 3.28], size: 0.16, useTransmissionMaterial: true, transmissionRes: 16, hasStarfish: true },

  // Row 4 (bottom)
  { position: [-0.90, -0.90, 3.28], size: 0.22, useTransmissionMaterial: true, transmissionRes: 32 },
  { position: [-0.30, -0.90, 3.28], size: 0.16, useTransmissionMaterial: true, transmissionRes: 16, hasStarfish: true },
  { position: [ 0.30, -0.90, 3.28], size: 0.16, useTransmissionMaterial: true, transmissionRes: 16, hasStarfish: true },
  { position: [ 0.90, -0.90, 3.28], size: 0.22, useTransmissionMaterial: true, transmissionRes: 32 },


  // --- Metallic/matte (isOrbital → rendered by OrbitalMetallics, not physics) ---
  // 6 spheres at 60° intervals in XY — large ones (0.75, 0.65, 0.62) at 120° apart
  // so they never overlap while the group rotates around Z
  { position: [ 2.0,  0.00,  0.8], size: 0.75, color: '#E86040', emissive: '#E86040', emissiveIntensity: 0.06, dCoef: { a: 0.01, b: 0.2  }, clearcoat: 0.2, roughness: 0.50, metalness: 0.0, isOrbital: true },  // 0°
  { position: [ 1.0,  1.75, -0.8], size: 0.44, color: '#D44070', emissive: '#D44070', emissiveIntensity: 0.06, dCoef: { a: 0.05, b: 0.2  }, clearcoat: 0.4, roughness: 0.45, metalness: 0.0, isOrbital: true },  // 60°
  { position: [-1.0,  1.75,  0.5], size: 0.62, color: '#9B40CC', emissive: '#9B40CC', emissiveIntensity: 0.06, dCoef: { a: 0.1,  b: 0.1  }, clearcoat: 0.4, roughness: 0.48, metalness: 0.0, isOrbital: true },  // 120°
  { position: [-2.0,  0.00, -0.6], size: 0.44, color: '#3ABEC8', emissive: '#3ABEC8', emissiveIntensity: 0.06, dCoef: { a: 0.2,  b: 0.001}, clearcoat: 0.3, roughness: 0.50, metalness: 0.0, isOrbital: true },  // 180°
  { position: [-1.0, -1.75,  0.9], size: 0.65, color: '#CC3878', emissive: '#CC3878', emissiveIntensity: 0.06, dCoef: { a: 0.4,  b: 0.01 }, clearcoat: 0.4, roughness: 0.46, metalness: 0.0, isOrbital: true },  // 240°
  { position: [ 1.0, -1.75, -1.0], size: 0.52, color: '#F5F5F5', dCoef: { a: 0.1,  b: 0.1  }, clearcoat: 0.6, roughness: 0.35, metalness: 0.0, isOrbital: true },                                               // 300°

  // --- Static (no physics) ---
  { position: [-2.15, -0.2, 2.3], size: 1.4, color: '#A0A0A0', dCoef: { a: 0.1, b: 0.1 }, clearcoat: 0.2, roughness: 0.30, metalness: 0.05, bumpScale: 2.0, isHypno: true, isStatic: true },
  { position: [-2, 1, -4],        size: 2.0, color: '#C040A0', emissive: '#C040A0', emissiveIntensity: 0.35, dCoef: { a: 0, b: 0.05 }, roughness: 0.7, metalness: 0, clearcoat: 0, opacity: 0.45, isStatic: true },


  // --- Accent spheres: 7-color palette, varied sizes, candy/jewel material ---
  { position: [ 0.60,  0.20, 2.00], size: 0.30, color: '#FF5FA2', emissive: '#FF5FA2', emissiveIntensity: 0.14, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 1.00, -0.20, 2.20], size: 0.34, color: '#7FD6D9', emissive: '#7FD6D9', emissiveIntensity: 0.13, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 0.80, -0.50, 1.80], size: 0.20, color: '#F3D2A6', emissive: '#F3D2A6', emissiveIntensity: 0.12, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.25, clearcoat: 0.5, isAccent: true },
  { position: [ 0.50,  0.70, 1.80], size: 0.36, color: '#B884FF', emissive: '#B884FF', emissiveIntensity: 0.14, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 0.90,  0.40, 1.40], size: 0.18, color: '#8FE9FF', emissive: '#8FE9FF', emissiveIntensity: 0.14, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 1.20,  0.10, 1.80], size: 0.24, color: '#FF9E84', emissive: '#FF9E84', emissiveIntensity: 0.14, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.25, clearcoat: 0.5, isAccent: true },
  { position: [ 0.40,  1.40, 1.20], size: 0.28, color: '#F07EB1', emissive: '#F07EB1', emissiveIntensity: 0.13, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 0.70,  1.60, 0.80], size: 0.16, color: '#92C6FF', emissive: '#92C6FF', emissiveIntensity: 0.12, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [-0.60,  0.80, 1.40], size: 0.32, color: '#9F74D8', emissive: '#9F74D8', emissiveIntensity: 0.13, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [-0.80,  0.50, 1.00], size: 0.22, color: '#FFD5B3', emissive: '#FFD5B3', emissiveIntensity: 0.12, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.25, clearcoat: 0.5, isAccent: true },
  { position: [-0.40, -0.50, 1.60], size: 0.18, color: '#74D7FF', emissive: '#74D7FF', emissiveIntensity: 0.13, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.30, clearcoat: 0.5, isAccent: true },
  { position: [ 0.20, -0.70, 1.30], size: 0.26, color: '#E78870', emissive: '#E78870', emissiveIntensity: 0.14, dCoef: { a: 0.05, b: 0.08 }, metalness: 0.1, roughness: 0.25, clearcoat: 0.5, isAccent: true },


  // --- Background color spheres (large, semi-transparent, compositional) ---
  { position: [ 1.5,  0.0, -4.5], size: 1.2, color: '#FF0080', emissive: '#FF0080', emissiveIntensity: 0.4, dCoef: { a: 0, b: 0.08 }, roughness: 0.7, metalness: 0, clearcoat: 0, opacity: 0.45, isStatic: true },
  { position: [ 1.0,  2.5, -4.5], size: 1.0, color: '#00E5FF', emissive: '#00E5FF', emissiveIntensity: 0.4, dCoef: { a: 0, b: 0.08 }, roughness: 0.7, metalness: 0, clearcoat: 0, opacity: 0.45, isStatic: true },
  { position: [-0.5, -2.0, -4.0], size: 0.8, color: '#FF0080', emissive: '#FF0080', emissiveIntensity: 0.35, dCoef: { a: 0, b: 0.08 }, roughness: 0.7, metalness: 0, clearcoat: 0, opacity: 0.40, isStatic: true },
]

const dynamicSpheres = spheres.filter(s => !s.isStatic && !s.isOrbital)
const accentSpheres = spheres.filter(s => s.isAccent)

// Inner shells (r=0.95) — clearly inside OrbitalMetallics outer ring (~2.1)
// No radial overlap: accent surface max = 0.95+0.36 = 1.31, orbital inner min = 2.08-0.75 = 1.33
const accentRings = [
  { center: [0, 0, 0], radius: 0.95, tilt: [ 0.28,  0.14,  0.00], speed:  1.20 },
  { center: [0, 0, 0], radius: 0.95, tilt: [ 1.33,  0.14,  0.45], speed: -1.00 },
  { center: [0, 0, 0], radius: 0.95, tilt: [ 1.85,  0.14, -0.30], speed:  0.80 },
]
// Pre-computed Euler objects for rotation math (module-level, no GC)
const accentRingEulers = accentRings.map(r => new Euler(...r.tilt))

const accentOrbitals = accentSpheres.map((sphere, index) => {
  const ringIndex = Math.floor(index / 4)
  const posInRing = index % 4
  const ring = accentRings[ringIndex]
  return {
    ...sphere,
    orbit: {
      center: ring.center,
      tilt: ring.tilt,
      radius: ring.radius,
      speed: ring.speed,
      phase: posInRing * (Math.PI / 2),
    },
  }
})

function getAccentOrbitPosition(orbit, time) {
  const a = time * orbit.speed + orbit.phase
  return [
    Math.cos(a) * orbit.radius,
    0,
    Math.sin(a) * orbit.radius,
  ]
}

function getFrontGlassTint(position, index, baseTint, paletteControls) {
  const palette = [paletteControls.tintA, paletteControls.tintB, paletteControls.tintC, paletteControls.tintD]
  const x = position?.[0] ?? 0
  const y = position?.[1] ?? 0
  const sideBias = x < -1.0 ? 2 : x > 0.9 ? 1 : 0
  const verticalBias = y > 1.2 ? 3 : y < -1.2 ? 1 : 0
  const slot = Math.abs(index + sideBias + verticalBias) % palette.length
  return new Color(baseTint).lerp(new Color(palette[slot]), paletteControls.variation).getStyle()
}

function OrbitingAccents() {
  const { accentsVisible } = usePersistentControls('Orbiting Accents', `${LEVA_STORAGE_PREFIX}:orbiting-accents`, {
    accentsVisible: { value: true, label: 'visible' },
  })
  const bodyRefs = useRef([])
  const bumpMap = useTexture('./bump.jpg')
  const _lp = useRef(new Vector3())

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    accentOrbitals.forEach((sphere, index) => {
      const body = bodyRefs.current[index]
      if (!body) return
      const [lx, ly, lz] = getAccentOrbitPosition(sphere.orbit, t)
      _lp.current.set(lx, ly, lz)
      const ringIndex = Math.floor(index / 4)
      _lp.current.applyEuler(accentRingEulers[ringIndex])
      const [cx, cy, cz] = sphere.orbit.center
      _lp.current.x += cx; _lp.current.y += cy; _lp.current.z += cz
      body.setTranslation(_lp.current)
    })
  })

  if (!accentsVisible) return null

  return (
    <group>
      {accentOrbitals.map((sphere, index) => (
        <RigidBody
          key={`orbit-accent-${index}`}
          ref={node => { bodyRefs.current[index] = node }}
          type="kinematicPosition"
          position={sphere.position}
          colliders={false}
        >
          <BallCollider args={[sphere.size]} />
          <mesh castShadow={false} receiveShadow>
            <sphereGeometry args={[sphere.size, getSphRes(sphere.size), getSphRes(sphere.size)]} />
            <MeshDistortMaterial
              color={sphere.color}
              distort={sphere.dCoef?.b ?? 0.08}
              speed={1.35}
              bumpMap={bumpMap}
              bumpScale={0.75}
              metalness={sphere.metalness}
              roughness={sphere.roughness}
              clearcoat={sphere.clearcoat}
              clearcoatRoughness={0.42}
              emissive={sphere.emissive ?? '#000000'}
              emissiveIntensity={sphere.emissiveIntensity ?? 0}
            />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}

function PostProcessingControls() {
  const { intensity, aoRadius, distanceFalloff, bloomIntensity, color } = usePersistentControls('N8AO', `${LEVA_STORAGE_PREFIX}:n8ao`, {
    intensity:       { value: 1.9,  min: 0,   max: 8, step: 0.1 },
    aoRadius:        { value: 0.9,  min: 0.1, max: 5, step: 0.1 },
    distanceFalloff: { value: 1.2,  min: 0,   max: 5, step: 0.1 },
    bloomIntensity:  { value: 0.18, min: 0,   max: 2, step: 0.02 },
    color:           { value: '#000000' },
  })
  const { caOffset, vigDarkness, saturation } = usePersistentControls('FX', `${LEVA_STORAGE_PREFIX}:fx`, {
    caOffset:    { value: 0.0008, min: 0, max: 0.005, step: 0.0001, label: 'aberration' },
    vigDarkness: { value: 0.35,   min: 0, max: 1,     step: 0.01,   label: 'vignette' },
    saturation:  { value: 0.18,   min: -1, max: 1,    step: 0.01,   label: 'saturation' },
  })
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <N8AO halfRes color={color} distanceFalloff={distanceFalloff} aoRadius={aoRadius} intensity={intensity} />
      <ChromaticAberration offset={new Vector2(caOffset, caOffset)} />
      <HueSaturation saturation={saturation} />
      <Vignette darkness={vigDarkness} />
      <Bloom intensity={bloomIntensity} luminanceThreshold={0.3} mipmapBlur={true} />
      <FXAA />
    </EffectComposer>
  )
}

const orbitalSpheres = spheres.filter(s => s.isOrbital)

function HypnoSphere({ position, size, glassControls = FRONT_GLASS_DEFAULTS, tint = LEFT_GLASS_DEFAULTS.tint }) {
  const res = Math.min(getSphRes(size), 48)
  return (
    <mesh position={position} castShadow={false} receiveShadow>
      <sphereGeometry args={[size, res, res]} />
      <MeshTransmissionMaterial
        backside
        transmissionSampler
        color={tint}
        samples={1}
        resolution={48}
        anisotropy={glassControls.anisotropy}
        thickness={Math.max(0.45, glassControls.thickness * 0.6)}
        roughness={glassControls.roughness}
        ior={glassControls.ior}
        chromaticAberration={Math.min(0.3, glassControls.chromaticAberration * 0.35)}
        envMapIntensity={glassControls.envMapIntensity}
        toneMapped={true}
      />
    </mesh>
  )
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

function StaticSideLights() {
  return (
    <>
      <spotLight
        color="#FFD7E8"
        intensity={2.4}
        distance={26}
        angle={0.52}
        penumbra={0.9}
        decay={2}
        position={[-7.5, 1.8, -6.5]}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-bias={-0.00015}
        shadow-normalBias={0.02}
      />
      <spotLight
        color="#D8F2FF"
        intensity={2.1}
        distance={26}
        angle={0.48}
        penumbra={0.9}
        decay={2}
        position={[7.0, -0.4, -6.8]}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-bias={-0.00015}
        shadow-normalBias={0.02}
      />
    </>
  )
}

function StudioEnvironment({ reflectionBoost }) {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer
        form="rect"
        color="white"
        intensity={reflectionBoost.whiteKey}
        position={[0, 5.5, -8.5]}
        rotation-x={Math.PI / 2}
        scale={[14, 10, 1]}
      />
      <Lightformer
        form="rect"
        color="#FFDAEA"
        intensity={reflectionBoost.pinkRim}
        position={[-7.5, 0.6, 1.8]}
        rotation-y={Math.PI / 2}
        scale={[6, 10, 1]}
      />
      <Lightformer
        form="rect"
        color="#DDF6FF"
        intensity={reflectionBoost.cyanRim}
        position={[7.5, 0.4, 1.6]}
        rotation-y={-Math.PI / 2}
        scale={[6, 10, 1]}
      />
      <Lightformer
        form="rect"
        color="#FFF6FB"
        intensity={reflectionBoost.frontFill}
        position={[0.3, 0.9, 6.0]}
        rotation-y={Math.PI}
        scale={[5.5, 4.5, 1]}
      />
      <Lightformer
        form="rect"
        color="white"
        intensity={0.55}
        position={[0, -5.0, -6.5]}
        rotation-x={-Math.PI / 2}
        scale={[10, 5, 1]}
      />
    </Environment>
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

function loadSVGTexture(url, size = 512) {
  return fetch(url)
    .then(r => r.text())
    .then(svgText => new Promise((resolve) => {
      const blob = new Blob([svgText], { type: 'image/svg+xml' })
      const blobUrl = URL.createObjectURL(blob)
      const img = new Image(size, size)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, size, size)
        URL.revokeObjectURL(blobUrl)
        resolve(new CanvasTexture(canvas))
      }
      img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(null) }
      img.src = blobUrl
    }))
    .catch(() => Promise.resolve(null))
}

function loadFishTexture(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width; canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = id.data
      const bgR = d[0], bgG = d[1], bgB = d[2]
      for (let i = 0; i < d.length; i += 4) {
        const dist = Math.abs(d[i]-bgR) + Math.abs(d[i+1]-bgG) + Math.abs(d[i+2]-bgB)
        // remove background + shadow (teal-ish: G and B dominant over R)
        const isTealish = d[i+1] > d[i] * 1.25 && d[i+2] > d[i] * 1.25
        if (dist < 100 || isTealish) d[i+3] = 0
      }
      ctx.putImageData(id, 0, 0)
      resolve(new CanvasTexture(canvas))
    }
    img.src = url
  })
}

function FishSprite() {
  const [texture, setTexture] = useState(null)
  const matRef = useRef()
  const meshRef = useRef()

  useEffect(() => {
    let alive = true
    loadFishTexture('/_aa5a0269-3730-4d34-99eb-0839796da872.jpeg')
      .then(t => { if (alive) setTexture(t) })
    return () => { alive = false }
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current || !texture) return
    const t = clock.getElapsedTime()
    const θ = t * 0.20
    meshRef.current.rotation.y = -θ
    meshRef.current.rotation.x = Math.sin(θ * 0.7 + 1.0) * 0.32
    const pulse = 1 + Math.sin(t * 1.8) * 0.06
    const flip = Math.cos(θ) >= 0 ? -1 : 1
    meshRef.current.scale.set(flip * pulse, pulse, pulse)
  })

  if (!texture) return null

  const SPHERE_R = 1.42
  const PHI_LEN = Math.PI * 0.55
  const THETA_LEN = Math.PI * 0.42

  return (
    <mesh ref={meshRef} position={[-2.15, -0.10, 2.3]}>
      <sphereGeometry args={[
        SPHERE_R, 24, 18,
        Math.PI / 2 - PHI_LEN / 2, PHI_LEN,
        (Math.PI - THETA_LEN) / 2, THETA_LEN
      ]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        alphaTest={0.01}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        side={DoubleSide}
      />
    </mesh>
  )
}

function makeGemTexture(variant = 'magenta') {
  const PAL = {
    magenta:  { 1:'#6A0E28', 2:'#9B1C44', 3:'#D44070', 4:'#F07098', 5:'#FFB8D0', 6:'#FFFFFF' },
    aqua:     { 1:'#0B4F58', 2:'#1A7E88', 3:'#3ABEC8', 4:'#60D4E0', 5:'#B8F0F8', 6:'#FFFFFF' },
    amethyst: { 1:'#3A1060', 2:'#601890', 3:'#9B40CC', 4:'#C068E8', 5:'#EAB8FF', 6:'#FFFFFF' },
  }
  const G = [
    [0,0,6,0,0,0,0,1,1,0,0,0,0,6,0,0],
    [0,0,0,6,0,0,1,4,5,1,0,0,6,0,0,0],
    [0,0,0,0,0,1,2,4,5,4,1,0,0,0,0,0],
    [0,0,0,0,1,2,4,5,5,4,2,1,0,0,0,0],
    [0,0,0,1,2,4,4,5,5,5,4,4,1,0,0,0],
    [0,0,1,2,4,4,4,5,5,5,5,4,4,1,0,6],
    [6,1,2,4,4,4,5,5,5,5,5,4,4,2,1,0],
    [1,3,3,3,3,3,5,5,5,5,3,3,3,3,3,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [0,1,2,3,3,3,3,3,3,3,3,3,3,2,1,0],
    [0,0,1,2,3,3,3,3,3,3,3,3,2,1,0,0],
    [0,0,0,1,2,3,3,3,3,3,3,2,1,0,0,0],
    [0,0,0,0,1,2,3,3,3,3,2,1,0,0,0,0],
    [0,0,0,0,0,1,2,3,3,2,1,0,0,0,0,0],
    [0,0,0,0,0,0,1,2,2,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
  ]
  const pal = PAL[variant]
  const S = 32
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  for (let r = 0; r < 16; r++)
    for (let c = 0; c < 16; c++) {
      const v = G[r][c]
      if (v) { ctx.fillStyle = pal[v]; ctx.fillRect(c*S, r*S, S, S) }
    }
  const t = new CanvasTexture(canvas)
  t.wrapS = t.wrapT = ClampToEdgeWrapping
  return t
}

const gemTextureCache = {}
function getGemTexture(variant) {
  if (!gemTextureCache[variant]) gemTextureCache[variant] = makeGemTexture(variant)
  return gemTextureCache[variant]
}


function Scene() {
  const performance = usePersistentControls('Performance', `${LEVA_STORAGE_PREFIX}:performance`, {
    dprMin: { value: PERFORMANCE_DEFAULTS.dprMin, min: 0.4, max: 1, step: 0.05 },
    dprMax: { value: PERFORMANCE_DEFAULTS.dprMax, min: 0.5, max: 1.25, step: 0.05 },
  })
  const frontGlass = usePersistentControls('Front Glass', `${LEVA_STORAGE_PREFIX}:front-glass`, {
    tint:                { value: FRONT_GLASS_DEFAULTS.tint },
    roughness:           { value: FRONT_GLASS_DEFAULTS.roughness, min: 0,    max: 0.2,  step: 0.005 },
    thickness:           { value: FRONT_GLASS_DEFAULTS.thickness, min: 0.25, max: 2.5,  step: 0.05 },
    ior:                 { value: FRONT_GLASS_DEFAULTS.ior, min: 1,          max: 2.25, step: 0.01 },
    chromaticAberration: { value: FRONT_GLASS_DEFAULTS.chromaticAberration, min: 0, max: 1.5, step: 0.01 },
    anisotropy:          { value: FRONT_GLASS_DEFAULTS.anisotropy, min: 0,   max: 1,    step: 0.01 },
    distortion:          { value: FRONT_GLASS_DEFAULTS.distortion, min: 0,   max: 0.25, step: 0.005 },
    temporalDistortion:  { value: FRONT_GLASS_DEFAULTS.temporalDistortion, min: 0, max: 0.1, step: 0.005 },
    envMapIntensity:     { value: FRONT_GLASS_DEFAULTS.envMapIntensity, min: 0, max: 2, step: 0.05 },
  })
  const frontGlassPalette = usePersistentControls('Front Glass Palette', `${LEVA_STORAGE_PREFIX}:front-glass-palette`, {
    tintA:     { value: FRONT_GLASS_PALETTE_DEFAULTS.tintA },
    tintB:     { value: FRONT_GLASS_PALETTE_DEFAULTS.tintB },
    tintC:     { value: FRONT_GLASS_PALETTE_DEFAULTS.tintC },
    tintD:     { value: FRONT_GLASS_PALETTE_DEFAULTS.tintD },
    variation: { value: FRONT_GLASS_PALETTE_DEFAULTS.variation, min: 0, max: 1, step: 0.01 },
  })
  const leftGlass = usePersistentControls('Left Glass', `${LEVA_STORAGE_PREFIX}:left-glass`, {
    tint: { value: LEFT_GLASS_DEFAULTS.tint },
  })
  const reflectionBoost = usePersistentControls('Reflection Boost', `${LEVA_STORAGE_PREFIX}:reflection-boost`, {
    whiteKey: { value: REFLECTION_BOOST_DEFAULTS.whiteKey, min: 0, max: 4, step: 0.05 },
    pinkRim:  { value: REFLECTION_BOOST_DEFAULTS.pinkRim,  min: 0, max: 5, step: 0.05 },
    cyanRim:  { value: REFLECTION_BOOST_DEFAULTS.cyanRim,  min: 0, max: 5, step: 0.05 },
    frontFill:{ value: REFLECTION_BOOST_DEFAULTS.frontFill,min: 0, max: 3, step: 0.05 },
  })
  return (
    <Canvas shadows dpr={[performance.dprMin, Math.max(performance.dprMin, performance.dprMax)]} gl={{ antialias: false }} camera={{ position: [0, 0, 20], fov: 25.5, near: 1, far: 60 }}>
      <color attach="background" args={['#F9F9F9']} />
      <CameraRotator />
      <Physics gravity={[0, 0, 0]}>
        <Pointer z={3.35} />
        {dynamicSpheres.filter(s => !s.isAccent).map((sphere) => {
          const index = dynamicSpheres.indexOf(sphere)
          return <Shell key={index} sphere={{ ...sphere, index, tint: getFrontGlassTint(sphere.position, index, frontGlass.tint, frontGlassPalette) }} glassControls={frontGlass} />
        })}
        <BackgroundSphere />
        <RigidBody type="fixed" position={[-2.15, -0.2, 2.3]} colliders={false}>
          <BallCollider args={[1.4]} />
        </RigidBody>
        <RigidBody type="fixed" position={[-2, 1, -4]} colliders={false}>
          <BallCollider args={[2.0]} />
        </RigidBody>
        <OrbitingAccents />
      </Physics>

      {spheres.filter(s => s.isStatic && !s.isHypno).map((sphere, index) =>
        <StaticSphere key={`static-${index}`} {...sphere} />
      )}
      {spheres.filter(s => s.isHypno).map((sphere, index) =>
        <HypnoSphere key={`hypno-${index}`} {...sphere} glassControls={frontGlass} tint={leftGlass.tint} />
      )}
      <Suspense fallback={null}><FishSprite /></Suspense>
      <OrbitalMetallics />

      <ambientLight color="white" intensity={0.45} />
      <directionalLight intensity={0.3} position={[3, 3, -1]} />
      <OrbitingLights />
      <StaticSideLights />

      <PostProcessingControls />
      <StudioEnvironment reflectionBoost={reflectionBoost} />
    </Canvas>
  )
}

function Pointer({ vec = new Vector3(), z = 3.35 }) {
  const ref = useRef()
  const target = useRef(new Vector3())

  useFrame(({ mouse, viewport }) => {
    target.current.set(
      (mouse.x * viewport.width) / 2,
      (mouse.y * viewport.height) / 2,
      z
    )
    vec.lerp(target.current, 0.1)
    ref.current?.setTranslation(vec)
  })

  return (
    <RigidBody mass={0.01} restitution={0.1} ref={ref} position={[100, 100, z]} linearDamping={4} colliders={false}>
      <BallCollider args={[1.15]} />
    </RigidBody>
  )
}

function EyeCapMesh({ radius, gemVariant = 'magenta' }) {
  const texture = useMemo(() => getGemTexture(gemVariant), [gemVariant])
  const { mouse } = useThree()

  useFrame(() => {
    texture.offset.set(-mouse.x * 0.06, -mouse.y * 0.06)
  })

  const r = radius
  const PHI_LEN = Math.PI * 0.52
  const THETA_LEN = Math.PI * 0.44

  return (
    <mesh>
      <sphereGeometry args={[r, 22, 18, Math.PI/2 - PHI_LEN/2, PHI_LEN, (Math.PI-THETA_LEN)/2, THETA_LEN]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.02} opacity={0.92}
        depthTest={false} depthWrite={false} toneMapped={false} side={DoubleSide} />
    </mesh>
  )
}

let _starfishTexture = null
let _starfishLoading = null
function getStarfishTexture() {
  if (_starfishTexture) return Promise.resolve(_starfishTexture)
  if (!_starfishLoading) {
    _starfishLoading = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width; canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = id.data
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i+1], b = d[i+2]
          const isGrayish = r > 165 && g > 165 && b > 165 && Math.abs(r-g) < 28 && Math.abs(g-b) < 28
          if (isGrayish) d[i+3] = 0
        }
        ctx.putImageData(id, 0, 0)
        const t = new CanvasTexture(canvas)
        _starfishTexture = t
        resolve(t)
      }
      img.src = '/_050d4fea-095c-4d7e-b183-8f9e5bd29dc7.jpeg'
    })
  }
  return _starfishLoading
}

function StarfishCapMesh({ radius }) {
  const [texture, setTexture] = useState(null)
  const meshRef = useRef()

  useEffect(() => {
    let alive = true
    getStarfishTexture().then(t => { if (alive) setTexture(t) })
    return () => { alive = false }
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    meshRef.current.rotation.z = clock.getElapsedTime() * 0.25
  })

  if (!texture) return null

  const r = radius
  const PHI_LEN = Math.PI * 0.78
  const THETA_LEN = Math.PI * 0.65

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[r, 20, 16, Math.PI/2 - PHI_LEN/2, PHI_LEN, (Math.PI - THETA_LEN)/2, THETA_LEN]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.02}
        depthTest={false} depthWrite={false} toneMapped={false} side={DoubleSide} />
    </mesh>
  )
}

function Shell({ sphere, meshVisible = true, glassControls = FRONT_GLASS_DEFAULTS }) {
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
      <AnimatedSphere ref={meshRef} {...sphere} glassControls={glassControls} meshVisible={meshVisible} />
      {sphere.hasEye && <EyeCapMesh radius={sphere.size} gemVariant={sphere.gemVariant} />}
      {sphere.hasStarfish && <StarfishCapMesh radius={sphere.size} />}
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

const AnimatedSphere = forwardRef(({ size, color, dCoef, index, transparent = true, opacity = 1, metalness = 0, roughness = 0.35, clearcoat = 0.4, bumpScale = 1, useTransmissionMaterial = false, transmissionRes = 64, emissive = '#000000', emissiveIntensity = 0, meshVisible = true, glassControls = FRONT_GLASS_DEFAULTS, tint }, ref) => {
  const materialRef = useRef()
  const bumpMap = useTexture('./bump.jpg')
  const res = useTransmissionMaterial ? Math.min(getSphRes(size), 32) : getSphRes(size)

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    if (materialRef.current && !useTransmissionMaterial && dCoef) {
      materialRef.current.distort = Math.cos(Math.sin(time + Math.PI * Math.pow(index, 2))) * dCoef.a + dCoef.b
    }
  })

  return (
    <mesh ref={ref} castShadow={!useTransmissionMaterial} receiveShadow visible={meshVisible}>
      <sphereGeometry args={[size, res, res]} />
      {useTransmissionMaterial ? (
        <MeshTransmissionMaterial
          transmissionSampler
          color={tint ?? glassControls.tint}
          roughness={glassControls.roughness}
          thickness={glassControls.thickness}
          ior={glassControls.ior}
          chromaticAberration={glassControls.chromaticAberration}
          anisotropy={glassControls.anisotropy}
          envMapIntensity={glassControls.envMapIntensity}
          samples={1}
          distortion={glassControls.distortion}
          temporalDistortion={glassControls.temporalDistortion}
          resolution={Math.min(transmissionRes, 24)}
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
