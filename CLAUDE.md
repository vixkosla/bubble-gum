# bubble-gum

Interactive Three.js sphere/bubble cluster animation. Portfolio project, deployed at https://bubble-gum.vercel.app

## Stack
- Vite + React
- Three.js (WebGL)

## Context
- Used as portfolio demo in Upwork Project Catalog listing (bit.ly/4uRYEtW)
- Part of the Three.js freelance portfolio alongside `threejs-wordpress-jumbotron`

## Dev
```bash
npm install
npm run dev
```

## Оптимизации (разобрали, не внедрено)

**Критично — GC фризы:**
- В `Shell.useFrame` каждый кадр создаётся 3–4 `new THREE.Vector3()` → GC spikes
- Фикс: вынести в `useRef`, переиспользовать через `.set()`
- То же в `Pointer.useFrame` (`target` создаётся каждый кадр)

**Геометрия:**
- `sphRes = 64` для всех шаров — избыточно для малых
- Малые (size < 0.5) → 16–24, средние → 32, крупные → 48
- Фоновая сфера `size=4.4` с `64×64` — достаточно 16

**Постпроцессинг:**
- `multisampling={8}` → снизить до 4
- `Bloom mipmapBlur={false}` → включить `true` (быстрее)
- `MeshTransmissionMaterial samples={4}` (×3 шара) → снизить до 2
- `N8AO intensity={4}` → можно 2–3

**Бандл:**
- `Noise` импортирован но не используется
- `import * as THREE` — нужен только `Vector3`
