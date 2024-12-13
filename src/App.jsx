import { useState } from 'react'
import { useRef } from 'react';

import { Canvas, useFrame } from '@react-three/fiber'

import { Box, OrbitControls, MeshDistortMaterial, Environment, Lightformer, useTexture } from '@react-three/drei'

import {
  EffectComposer, N8AO,
  DepthOfField,
  Bloom,
  Noise,
  Vignette,
  ChromaticAberration
} from '@react-three/postprocessing'

import './App.css'

function App() {
  const [count, setCount] = useState(0)

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
  { position: [0.3, 0, 0], size: 0.1, color: 'white', dCoef: { a: 0.01, b: 0.01 }, roughness: 0.1, opacity: 1 },

  { position: [-0.3, -0.05, 0.8], size: 0.3, color: '#FFFFFF', dCoef: { a: 0.2, b: 0.5 }, opacity: 1, roughness: 0.6, metalness: 1 },
  { position: [0.35, -0.65, 2.5], size: 0.4, color: '#FFFFFF', dCoef: { a: 0.25, b: 0.1 }, roughness: 0.25, metalness: 0 },
  { position: [0, 1, 0], size: 0.55, color: '#8A8A8A', dCoef: { a: 0.3, b: 0.15 },clearcoat: 0.8, roughness: 0.4, metalness: 0 },

  { position: [1.5, -0.5, 1], size: 0.7, color: '#8A8A8A', dCoef: { a: 0.1, b: 0.2 }, clearcoat: 0.8, roughness: 0.4, metalness: 0 },
  { position: [-1.15, -1.5, -1], size: 0.9, color: '#363636', dCoef: { a: 0.1, b: 0.2 }, roughness: 0.4, metalness: 0 },
  { position: [-1.6, 1.6, -0.8], size: 1, color: '#D9D9D9', dCoef: { a: 0.1, b: 0.2 }, roughness: 0.45, metalness: 0 },

  { position: [1, -0.5, -1], size: 1.2, color: '#D9D9D9', dCoef: { a: 0.1, b: 0.2 }, roughness: 0.5, metalness: 0 },
  { position: [1.3, 2.2, -0.95], size: 1.25, color: 'blue', dCoef: { a: 0.2, b: 0.1 }, clearcoat: 0.9, roughness: 0.6, metalness: 0 },
  { position: [-2.15, -0.2, 2.3], size: 1.4, color: 'white', dCoef: { a: 0.15, b: 0.1 }, opacity: 1, roughness: 0.7, metalness: 0 },

  { position: [-2, 1, -4], size: 2.0, color: 'grey', dCoef: { a: 0.05, b: 0.05 }, roughness: 0.8, metalness: 0 },




]

function Scene() {
  return (
    <Canvas dpr={[1, 2]} shadows camera={{ position: [0, 0, 20], rotation: [0, 0, 0], fov: 25.5, near: 1, far: 35 }}>
      <color attach="background" args={['#F9F9F9']} />
      {/* <AnimatedSphere size={1} position={[0, 1, 0]} /> */}
      {spheres.map((sphere, index) =>
        <AnimatedSphere key={index} index={index} size={sphere.size} position={sphere.position} color={sphere.color} dCoef={sphere.dCoef} opacity={sphere.opacity}
          clearcoat={sphere.clearcoat}
          roughness={sphere.roughness}
          metalness={sphere.metalness}
        />
      )}
      <ambientLight intensity={0.45} />
      {/* <spotLight
        position={[0, 0, 0]}
        angle={Math.PI / 4}
        penumbra={0.5}
        intensity={2}
        distance={30}
        castShadow
        target={[-1, 1, -13]}
      /> */}
      {/* <directionalLight position={[5, 5, 5]} intensity={1.5} target={[-1, 1, -13]} castShadow /> */}
      {/* <spotLight position={[1, 1, 1]} angle={0.15} penumbra={0.2} intensity={20} castShadow /> */}
      {/* <spotLight position={[1.1, 1, 3]} angle={0.3} penumbra={0.5} intensity={15 } castShadow /> */}
      <spotLight position={[0, 3, 3]} angle={0.55} penumbra={0.24} intensity={4} castShadow />
      <spotLight position={[-3.5, -1, 1]} angle={0.35} penumbra={0.14} intensity={4} castShadow />
      {/* <SpotLightHelper args={[0, 0, 3]}/> */}
      {/* <spotLight position={[-3, 5, -6]} angle={0.55} penumbra={0.1} intensity={20} castShadow /> */}
      <OrbitControls />
      <EffectComposer disableNormalPass>
        {/* <N8AO distanceFalloff={1} aoRadius={1} intensity={1} /> */}
        {/* <DepthOfField
          focusDistance={1}
          focalLength={0.02}
          bokehScale={2}
          height={480}
        /> */}
        {/* <Bloom
          luminanceThreshold={0}
          luminanceSmoothing={0.9}
          height={300}
          opacity={3}
        /> */}
        {/* <ChromaticAberration offset={[0.0005, 0.0001]} /> */}
        {/* <Noise opacity={0.015} /> */}

      </EffectComposer>
      <Environment preset="night" intensity={0.9} blur={0.9} resolution={256}>
        {/* <group rotation={[-Math.PI / 5, 0, 1]}> */}

        <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -5]} scale={2} />
        <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
        <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={2} />
        <Lightformer form="circle" intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
        {/* </group> */}
      </Environment>
    </Canvas>
  )
}

function AnimatedSphere({ size, position, color, dCoef, index, transparent = true, opacity = 1, metalness = 0, roughness = 0.35, clearcoat = 0.3 }) {
  const materialRef = useRef();
  const meshRef = useRef();

  // const [material, set] = useState();

  const bumpMap = useTexture("./bump.jpg");


  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    materialRef.current.distort = Math.cos(Math.sin(time + Math.PI * Math.pow(index, 2))) * dCoef.a + dCoef.b; // Плавное изменение distort
    // meshRef.current.geometry.computeVertexNormals(); // Обновление нормалей
  });

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <sphereGeometry args={[size, sphRes, sphRes]} />
      <MeshDistortMaterial ref={materialRef} color={color} speed={2}
        bumpMap={bumpMap} bumpScale={1}
        metalness={metalness}
        roughness={roughness}
        clearcoat={clearcoat}
        clearcoatRoughness={1}
        transparent={transparent}
        opacity={opacity} />
    </mesh>
  );
}

export default App

