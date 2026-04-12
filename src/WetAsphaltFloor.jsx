import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const vertexShader = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */`
uniform float uTime;
varying vec2 vUv;

float h21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
vec2 h22(vec2 p) { return vec2(h21(p), h21(p + 57.31)); }

float sparkleLayer(vec2 uv, float scale, float dotScale) {
  vec2 st = uv * scale;
  vec2 i  = floor(st);
  vec2 f  = fract(st);
  float acc = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 nc  = i + vec2(float(x), float(y));
      vec2 rp  = h22(nc) * 0.72 + 0.14;
      float r  = dotScale * (0.35 + 0.65 * h21(nc + 37.0));
      vec2 d   = f - (rp + vec2(float(x), float(y)));
      float br = 0.5 + 0.5 * h21(nc + 91.0);
      acc += smoothstep(r, r * 0.25, length(d)) * br;
    }
  }
  return acc;
}

void main() {
  vec2 uv = vUv;

  // Warm pink base with subtle patches
  float patch = h21(floor(uv * 6.0)) * 0.06;
  vec3 base = vec3(0.93 + patch, 0.68, 0.73 - patch * 0.5);

  // Three layers of sparkle dots — large, medium, fine
  float s1 = sparkleLayer(uv, 22.0, 0.10);
  float s2 = sparkleLayer(uv, 48.0, 0.07);
  float s3 = sparkleLayer(uv, 90.0, 0.045);

  vec3 col = base;
  col += vec3(1.00, 0.90, 0.92) * s1 * 0.55;
  col += vec3(1.00, 0.94, 0.96) * s2 * 0.40;
  col += vec3(1.00, 0.97, 0.98) * s3 * 0.30;

  gl_FragColor = vec4(col, 1.0);
}
`

export function WetAsphaltFloor() {
  const matRef = useRef()

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh
      position={[0, 0, -16]}
      frustumCulled={false}
    >
      <planeGeometry args={[44, 28, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uTime: { value: 0 } }}
      />
    </mesh>
  )
}
