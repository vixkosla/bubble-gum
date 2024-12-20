// import {  } from 'react'
import * as THREE from 'three'

import { useRef, forwardRef } from 'react';

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

  { position: [-0.2, -0.05, 0.8], size: 0.45, color: '#FFFFFF', dCoef: { a: 0.2, b: 0.5 }, opacity: 1, clearcoat: 1, roughness: 0.6, metalness: 0, useTransmissionMaterial: true },
  { position: [0.35, -0.65, 2.5], size: 0.3, color: '#FFFFFF', dCoef: { a: 0.25, b: 0.1 }, roughness: 0.25, metalness: 0, useTransmissionMaterial: true },
  { position: [0, 1, 0.2], size: 0.55, color: '#FFFFFF', dCoef: { a: 0.3, b: 0.15 }, clearcoat: 0.8, roughness: 0.4, metalness: 0, useTransmissionMaterial: true },

  { position: [1.5, -0.5, 1], size: 0.7, color: 'grey', dCoef: { a: 0.05, b: 0.2 }, clearcoat: 0.2, roughness: 0.45, metalness: 0.9, useTransmissionMaterial: false },
  { position: [-1.15, -1.75, -1], size: 0.7, color: 'silver', dCoef: { a: 0.2, b: 0.001 }, clearcoat: 0, roughness: 0.55, metalness: 0.6 },
  { position: [-1.6, 1.6, -0.8], size: 1, color: 'silver', dCoef: { a: 0.1, b: 0.1 }, roughness: 0.6, metalness: 1, useTransmissionMaterial: false },

  { position: [1.2, -0.5, -1.8], size: 1.2, color: '#D9D9D9', dCoef: { a: 0.01, b: 0.2 }, clearcoat: 0, roughness: 0.5, metalness: 0 },
  { position: [1.4, 2.3, -0.95], size: 1.05, color: 'silver', dCoef: { a: 0.4, b: 0.01 }, clearcoat: 0, roughness: 0.6, metalness: 0.8, useTransmissionMaterial: false },
  { position: [-2.15, -0.2, 2.3], size: 1.4, color: 'white', dCoef: { a: 0.1, b: 0.1 }, clearcoat: 0.3, opacity: 1, roughness: 0.45, metalness: 0, bumpScale: 0.4 },

  { position: [-2, 1, -4], size: 2.0, color: 'grey', dCoef: { a: 0.05, b: 0.05 }, clearcoat: 0.9, roughness: 0.4, metalness: 0.2, opacity: 0.9 },

  // New level of spheres (increased depth and cluster aesthetics)

  // { position: [-1.15, 0.5, -10.3], size: 4.4, color: 'white', dCoef: { a: 0.0, b: 0.0 }, clearcoat: 0, opacity: 0.8, roughness: 0.45, metalness: 0, bumpScale: 0 },

  // { position: [0.5, 0.7, -7], size: 0.9, color: '#DCDCDC', dCoef: { a: 0.2, b: 0.15 }, roughness: 0.35, metalness: 0.1 },
  // { position: [-0.6, -0.3, -7.2], size: 0.6, color: '#BEBEBE', dCoef: { a: 0.1, b: 0.25 }, roughness: 0.4, metalness: 0.2 },
  // { position: [-1.1, 1.0, -7.5], size: 1.1, color: '#D3D3D3', dCoef: { a: 0.3, b: 0.1 }, roughness: 0.25, metalness: 0.15 },
  // { position: [1.2, -0.8, -7.8], size: 0.7, color: '#C0C0C0', dCoef: { a: 0.25, b: 0.2 }, roughness: 0.3, metalness: 0.1 },
  // { position: [0, 0.5, -8], size: 1.2, color: '#F5F5F5', dCoef: { a: 0.2, b: 0.2 }, roughness: 0.5, metalness: 0.25 }


]

function Scene() {
  return (
    <Canvas dpr={[1, 1.5]} shadows gl={{ antialias: false, preserveDrawingBuffer: true }} camera={{ position: [0, 0, 20], rotation: [0, 0, 0], fov: 25.5, near: 1, far: 35 }}>
      <color attach="background" args={['#F9F9F9']} />
      <Physics gravity={[0, 0, 0]} >
        <Pointer />


        {/* {spheres.map((sphere, index) =>
          <AnimatedSphere key={index} index={index} size={sphere.size} position={sphere.position} color={sphere.color} dCoef={sphere.dCoef} opacity={sphere.opacity}
            clearcoat={sphere.clearcoat}
            roughness={sphere.roughness}
            metalness={sphere.metalness}
          />
        )} */}

        {spheres.map((sphere, index) =>
          <Shell key={index} sphere={{ ...sphere, index }} />
        )}
        <mesh position={[-1.15, 0.5, -10.3]}>
          <sphereGeometry  args={[4.4, 64, 64]}/>
          <meshStandardMaterial  opacity={[0.5]} color="white" />
        </mesh>
      </Physics>

      <ambientLight color="white" intensity={0.65} />
      <directionalLight intensity={0.7} position={[3, 3, -1]}/>

      <spotLight position={[3, 3, 3]} angle={0.55} penumbra={0.34} intensity={8} castShadow />
      {/* <spotLight position={[-3.5, -1, 1]} angle={0.35} penumbra={0.14} intensity={8} castShadow /> */}

      {/* <OrbitControls /> */}
      <EffectComposer disableNormalPass multisampling={4}>
        <N8AO distanceFalloff={1} aoRadius={1} intensity={3} />
        {/* <FXAA /> */}
        <Bloom intensity={0.5} luminanceThreshold={0.3} />
      </EffectComposer>
      <Environment  intensity={0.5} blur={0.9} resolution={128}>
        <group rotation={[-Math.PI / 3, 0, 1]}>

          <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 2, -3]} scale={2} />
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
    <RigidBody mass={0.01} restitution={0.1} ref={ref} position={[100, 100, 10]} linearDamping={4} colliders={false}>
      <BallCollider args={[1.5]} />
    </RigidBody>
  )
}

function Shell({ sphere }) {
  const api = useRef()
  const meshRef = useRef();

  useFrame(({ delta, state }) => {

    delta = Math.min(delta, 0.1)

    const currentPosition = new THREE.Vector3();

    if (meshRef.current) {
      meshRef.current.getWorldPosition(currentPosition)
    }

    const posVector = new THREE.Vector3(...sphere.position)

    const offset = new THREE.Vector3(
      posVector.x - currentPosition.x,
      posVector.y - currentPosition.y,
      posVector.z - currentPosition.z,
    )

    // console.log(offset)

    const force = offset.length()

    // console.log(force)


    if (force > 0.15) {
      const impulse = new THREE.Vector3()
        .copy(offset)
        .normalize()
        .multiplyScalar(0.5 * (Math.sqrt(Math.pow(sphere.size, 2))));

      // console.log('Impulse:', impulse);
      // const maxForce = 18 * (Math.pow(sphere.size * 10, 2) / Math.pow(10, 4)) ; // Максимальный импульс
      // if (impulse.length() > maxForce) {
      //   impulse.setLength(maxForce);
      // }

      api.current?.applyImpulse(impulse, true)
    }
  })

  return (
    <RigidBody restitution={0} type="dynamic" mass={((Math.pow(sphere.size, 2)))} ref={api} position={sphere.position} linearDamping={1.55} angularDamping={0.8}>
      {/* <BallCollider args={[sphere.size]}/> */}
      <AnimatedSphere ref={meshRef} {...sphere} />
      {/* <pointLight intensity={1} distance={1.5} color={sphere.color} /> */}
    </RigidBody>

  )
}

const AnimatedSphere = forwardRef(({ size, position, color, dCoef, index, transparent = true, opacity = 1, metalness = 0, roughness = 0.35, clearcoat = 0.4, bumpScale = 1, useTransmissionMaterial = false }, ref) => {
  const materialRef = useRef();
  // const meshRef = useRef();

  // const [material, set] = useState();

  const bumpMap = useTexture("./bump.jpg");


  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (materialRef.current && !useTransmissionMaterial) {
      materialRef.current.distort = Math.cos(Math.sin(time + Math.PI * Math.pow(index, 2))) * dCoef.a + dCoef.b; // Анимация для обычного материала
    }    // meshRef.current.geometry.computeVertexNormals(); // Обновление нормалей

  });

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <sphereGeometry args={[size, sphRes, sphRes]} />
      {useTransmissionMaterial ? (
        <MeshTransmissionMaterial
          // color={color}
          clearcoat={clearcoat}
          roughness={0.3}
          thickness={1.4}
          ior={1.8}
          chromaticAberration={0.3}
          anisotropy={0.9}
          anisotropyBlur={0.9}
          samples={16}
          distortion={0.3}
          distortionScale={0.1}
          temporalDistortion={0.1}
          resolution={64}
          attenuationColor="white"
          attenuationDistance={0.1}
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

