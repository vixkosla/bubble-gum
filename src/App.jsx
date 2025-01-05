// import {  } from 'react'
import * as THREE from 'three'

import { useRef, forwardRef, useMemo } from 'react';

import { Canvas, useFrame } from '@react-three/fiber'

import { OrbitControls, MeshDistortMaterial, MeshTransmissionMaterial, Environment, Lightformer, useTexture } from '@react-three/drei'

import {
  EffectComposer, N8AO,
  Bloom,
  Noise
} from '@react-three/postprocessing'

import { BallCollider, Physics, RigidBody } from '@react-three/rapier'


import './App.css'

function App() {
  // const [count, setCount] = useState(0)

  return (
    <>
      <div className="container-canvas">
        <Scene />
      </div>
    </>
  )
}

// sphere resolution
const sphRes = 64;

const spheres = [
  // { position: [0.3, 0, 0], size: 0.1, color: 'white', dCoef: { a: 0.01, b: 0.01 }, roughness: 0.35, metalness: 0.3, opacity: 1 },

  // { position: [-0.2, -0.05, 0.8], size: 0.45, color: '#FFFFFF', dCoef: { a: 0.2, b: 0.5 }, opacity: 1, clearcoat: 1, roughness: 0.6, metalness: 0, useTransmissionMaterial: true },
  // { position: [0.35, -0.65, 2.5], size: 0.3, color: '#FFFFFF', dCoef: { a: 0.25, b: 0.1 }, roughness: 0.25, metalness: 0, useTransmissionMaterial: true },
  // { position: [0, 1, 0.2], size: 0.55, color: '#FFFFFF', dCoef: { a: 0.3, b: 0.15 }, clearcoat: 0.8, roughness: 0.4, metalness: 0, useTransmissionMaterial: true },

  // { position: [1.5, -0.5, 1], size: 0.7, color: 'grey', dCoef: { a: 0.05, b: 0.2 }, clearcoat: 0.2, roughness: 0.45, metalness: 0.9, useTransmissionMaterial: false },
  // { position: [-1.15, -1.75, -1], size: 0.7, color: '#FFFFFF', dCoef: { a: 0.2, b: 0.001 }, clearcoat: 0, roughness: 0.55, metalness: 0.6 },
  // { position: [-1.6, 1.6, -0.8], size: 1, color: 'silver', dCoef: { a: 0.1, b: 0.1 }, roughness: 0.6, metalness: 1, useTransmissionMaterial: false },

  // { position: [1.2, -0.5, -1.8], size: 1.2, color: '#D9D9D9', dCoef: { a: 0.01, b: 0.2 }, clearcoat: 0, roughness: 0.5, metalness: 0 },
  { position: [1.4, 2.3, -0.95], size: 1.05, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 1.05, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 1.05, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 1.05, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 0.85, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 1.15, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 1.15, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 1.05, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 1.05, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 0.85, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 0.85, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 0.85, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 0.85, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 0.85, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 0.85, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [1.4, 2.3, -0.95], size: 0.85, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },


  // { position: [-2.15, -0.2, 2.3], size: 1.4, color: 'white', dCoef: { a: 0.1, b: 0.1 }, clearcoat: 0.3, opacity: 1, roughness: 0.45, metalness: 0, bumpScale: 0.4 },

  // { position: [-2, 1, -4], size: 2.0, color: 'grey', dCoef: { a: 0.05, b: 0.05 }, clearcoat: 0.9, roughness: 0.4, metalness: 0.2, opacity: 0.9 },
]

function Scene() {
  return (
    <Canvas dpr={[1, 1.25]} shadows gl={{ antialias: false, preserveDrawingBuffer: true }} camera={{ position: [0, 0, 20], rotation: [0, 0, 0], fov: 25.5, near: 1, far: 35 }}>
      <color attach="background" args={['#F9F9F9']} />
      <Physics gravity={[0, 0, 0]} friction={0.1} >
        <Pointer />

        {spheres.map((sphere, index) =>
          <Shell key={index} sphere={{ ...sphere, index }} />
        )}
        {/* <mesh position={[-1.15, 0.5, -10.3]}>
          <sphereGeometry  args={[4.4, 64, 64]}/>
          <meshStandardMaterial color="white" />
        </mesh> */}
      </Physics>

      <ambientLight color="white" intensity={0.45} />
      <directionalLight intensity={0.3} position={[3, 3, -1]} />

      {/* <OrbitControls /> */}
      <EffectComposer disableNormalPass multisampling={16}>
        <N8AO distanceFalloff={3} aoRadius={2} intensity={5} />
        {/* <FXAA /> */}
        {/* <Bloom intensity={0.3} luminanceThreshold={0.3} mipmapBlur={false} /> */}
      </EffectComposer>
      <Environment resolution={64}>
        <group rotation={[-Math.PI / 3, 0, 1]}>

          <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[2, 2, -3]} scale={3} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-3, 2, -2]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-3, -3, -3]} scale={4} />
          <Lightformer form="circle" intensity={2} rotation-y={-Math.PI / 2} position={[3, 2, 0]} scale={4} />
        </group>
      </Environment>
    </Canvas>
  )
}

function Pointer({ vec = new THREE.Vector3() }) {
  const ref = useRef()

  useFrame(({ mouse, viewport }) => {
    const target = new THREE.Vector3(
      (mouse.x * viewport.width) / 2,
      (mouse.y * viewport.height) / 2,
      0.5
    );
    vec.lerp(target, 0.1);
    ref.current?.setTranslation(vec);
  })

  return (
    <RigidBody mass={1} type="dynamic" restitution={2.5} ref={ref} position={[100, 100, 10]} linearDamping={0} colliders={false}>
      <BallCollider args={[1.5]} />
    </RigidBody>
  )
}

function Shell({ sphere, r = THREE.MathUtils.randFloatSpread }) {
  const api = useRef()
  const meshRef = useRef();
  const pos = useMemo(() => [r(10), r(10), r(5)], [])
  const size = useMemo(() => (Math.min(Math.random() * 0.9, 0.1) + Math.min(Math.random() * 0.85, 0.2) + 1.08 * (window.innerWidth / 1920 )))

  useFrame(( state, delta ) => {

    // console.log(delta)

    // delta = Math.min(delta, 0.1)

    // console.log(force)


    // const lupin = new THREE.Vector3( 0.5 * (Math.sqrt(Math.pow(sphere.size, 2))), 0.1, 0.1 * delta )
    const position = new THREE.Vector3().copy(api.current?.translation())


    const impulse = new THREE.Vector3()
      .copy(position)
      // .normalize()

    .multiply(new THREE.Vector3(0.03, 0.1, 0.18))

      // .normalize()
      .negate()
      .multiplyScalar( 10.8 * delta)
    // .multiplyScalar( 1.5 * Math.sqrt(Math.pow(sphere.size, 3)))

    if (impulse.length() > 0.2) {
      api.current?.applyImpulse(impulse, true);

    }
  })

  return (
    <RigidBody restitution={1.1} type="dynamic" mass={((Math.pow(size, 1)))} ref={api} position={pos} colliders={false} linearDamping={0.1} angularDamping={0.1}>
      <BallCollider args={[size * 1.05]} />
      <AnimatedSphere ref={meshRef} {...sphere} size={size} />
    </RigidBody>

  )
}

const AnimatedSphere = forwardRef(({ size, position, color, dCoef, index, transparent = true, opacity = 1, metalness = 0, roughness = 0.35, clearcoat = 0.4, bumpScale = 1, useTransmissionMaterial = false }, ref) => {
  const materialRef = useRef();
  const bumpMap = useTexture('./bump.jpg');

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (materialRef.current && !useTransmissionMaterial) {
      materialRef.current.distort = Math.cos(Math.sin(time + Math.PI * Math.pow(index, 2))) * dCoef.a + dCoef.b; // Анимация для обычного материала
    }

  });

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <sphereGeometry args={[size, sphRes, sphRes]} />
      {useTransmissionMaterial ? (
        <MeshTransmissionMaterial
          clearcoat={0.15}
          roughness={0.3}
          thickness={1.4}
          ior={1.8}
          chromaticAberration={0.3}
          anisotropy={0.9}
          anisotropyBlur={0.9}
          samples={4}
          distortion={0.6}
          distortionScale={0.2}
          temporalDistortion={0.1}
          resolution={32}
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
  );
})

export default App

