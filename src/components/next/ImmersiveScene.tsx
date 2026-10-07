'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

/**
 * Scène 3D du fond immersif : particules flottantes et reflet « eau » en bas.
 * Chargée uniquement côté client via ImmersiveBackground (lazy).
 */

export interface SceneProps {
  dark: boolean;
  mobile: boolean;
  reducedMotion: boolean;
}

// Pointeur et progression de scroll partagés hors de React pour éviter tout re-render par frame.
const input = { x: 0, y: 0, scroll: 0 };

const FLOOR_Y = -2.4;

const particleVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uFloor;
  uniform float uMirror;
  attribute float aPhase;
  attribute float aSize;
  varying float vFade;
  void main() {
    vec3 p = position;
    // Dérive lente et indépendante par particule
    p.y += sin(uTime * 0.25 + aPhase * 6.2831) * 0.35;
    p.x += cos(uTime * 0.18 + aPhase * 12.566) * 0.25;
    if (uMirror > 0.5) {
      // Reflet : symétrie par rapport au sol, estompé avec la distance
      p.y = 2.0 * uFloor - p.y;
      vFade = clamp(1.0 - (uFloor - p.y) / 6.0, 0.0, 1.0) * 0.35;
    } else {
      vFade = 1.0;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPixelRatio * (14.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d) * uOpacity * vFade;
    gl_FragColor = vec4(uColor, a);
  }
`;

function Particles({ count, dark, mirror, reducedMotion }: { count: number; dark: boolean; mirror: boolean; reducedMotion: boolean }) {
  const dpr = useThree(state => state.viewport.dpr);
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = FLOOR_Y + Math.random() * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
      phases[i] = Math.random();
      sizes[i] = 0.6 + Math.random() * 1.4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: dpr },
    uFloor: { value: FLOOR_Y },
    uMirror: { value: mirror ? 1 : 0 },
    uColor: { value: new THREE.Color('#e0b15a') },
    uOpacity: { value: 0.9 }
  }), [dpr, mirror]);

  // Plus discret et plus foncé en mode clair pour rester lisible sur fond blanc.
  uniforms.uColor.value.set(dark ? '#e0b15a' : '#b07a1c');
  uniforms.uOpacity.value = dark ? 0.9 : 0.55;

  useFrame(({ clock }) => {
    if (!reducedMotion && material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        transparent
        depthWrite={false}
        blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}

/** Caméra : avance doucement avec le scroll. */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  useFrame(({ camera }, delta) => {
    const target = reducedMotion ? 7 : 7 - input.scroll * 2.5;
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target, 2.5, delta);
    // Le regard est légèrement abaissé pour que le reflet du sol reste visible en bas d'écran.
    camera.position.y = -0.6;
    camera.lookAt(0, -0.6, 0);
  });
  return null;
}

export default function ImmersiveScene({ dark, mobile, reducedMotion }: SceneProps) {
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      input.x = (event.clientX / window.innerWidth) * 2 - 1;
      input.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      input.scroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const count = mobile ? 280 : 800;

  return (
    <Canvas
      // Mobile : pixel ratio plafonné à 1,5 ; bureau : 2 maximum.
      dpr={[1, mobile ? 1.5 : 2]}
      camera={{ position: [0, 0, 7], fov: 45 }}
      gl={{ antialias: !mobile, alpha: true, powerPreference: 'high-performance' }}
      // Mouvement réduit : une seule image statique, aucune boucle de rendu.
      frameloop={reducedMotion ? 'demand' : 'always'}
      aria-hidden="true"
    >
      <Particles count={count} dark={dark} mirror={false} reducedMotion={reducedMotion} />
      <Particles count={Math.round(count / 2)} dark={dark} mirror reducedMotion={reducedMotion} />
      <CameraRig reducedMotion={reducedMotion} />
    </Canvas>
  );
}