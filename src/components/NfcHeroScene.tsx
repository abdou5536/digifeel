import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Radio } from 'lucide-react';

export const NfcHeroScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sceneError, setSceneError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: window.innerWidth > 700 });
    } catch (error) {
      console.error('La scène 3D Digifeel n’a pas pu être initialisée.', error);
      setSceneError(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 8.5);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const keyLight = new THREE.DirectionalLight(0xd9e2dd, 3);
    keyLight.position.set(-3, 4, 6);
    scene.add(keyLight);
    const edgeLight = new THREE.PointLight(0xc99445, 28, 18);
    edgeLight.position.set(3, 1, 3);
    scene.add(edgeLight);

    const badgeGroup = new THREE.Group();
    scene.add(badgeGroup);

    const badgeGeometry = new RoundedBoxGeometry(3.2, 2.05, 0.24, 8, 0.18);
    const badgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x111513,
      metalness: 0.64,
      roughness: 0.24,
      clearcoat: 0.75,
      clearcoatRoughness: 0.19
    });
    const badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
    badgeGroup.add(badge);

    const face = document.createElement('canvas');
    face.width = 1024;
    face.height = 640;
    const context = face.getContext('2d');
    if (context) {
      context.fillStyle = '#101513';
      context.fillRect(0, 0, face.width, face.height);
      context.strokeStyle = 'rgba(201, 148, 69, .48)';
      context.lineWidth = 5;
      context.strokeRect(28, 28, face.width - 56, face.height - 56);
      context.fillStyle = '#c99445';
      context.font = '700 62px Arial, sans-serif';
      context.letterSpacing = '12px';
      context.fillText('DIGIFEEL', 82, 142);
      context.fillStyle = '#d9e2dd';
      context.font = '500 24px Arial, sans-serif';
      context.letterSpacing = '7px';
      context.fillText('TAP TO SHARE YOUR EXPERIENCE', 82, 196);
      context.strokeStyle = 'rgba(217, 226, 221, .46)';
      context.lineWidth = 7;
      for (let index = 0; index < 3; index += 1) {
        context.beginPath();
        context.arc(512, 392, 46 + index * 36, -Math.PI * 0.78, -Math.PI * 0.22);
        context.stroke();
      }
      context.fillStyle = '#c99445';
      context.beginPath();
      context.arc(512, 392, 12, 0, Math.PI * 2);
      context.fill();
    }

    if (context) {
      const texture = new THREE.CanvasTexture(face);
      texture.colorSpace = THREE.SRGBColorSpace;
      const faceMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
      const faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.02, 1.88), faceMaterial);
      faceMesh.position.z = 0.126;
      badgeGroup.add(faceMesh);
    }

    const rings: THREE.Mesh[] = [];
    [2.2, 2.7, 3.2].forEach((radius, index) => {
      const material = new THREE.MeshBasicMaterial({
        color: 0xc99445,
        transparent: true,
        opacity: 0.24 - index * 0.045,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.009, 5, 120), material);
      ring.position.set(0, -0.08, -0.5 - index * 0.08);
      ring.scale.set(0.72, 0.72, 0.72);
      rings.push(ring);
      scene.add(ring);
    });

    const isSmallScreen = window.matchMedia('(max-width: 700px)').matches;
    const particleCount = isSmallScreen ? 68 : 220;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 8.5;
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 5.5;
      particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 3.5 - 1.2;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0xc99445, size: isSmallScreen ? 0.018 : 0.022, transparent: true, opacity: 0.65, sizeAttenuation: true })
    );
    scene.add(particles);

    let width = 0;
    let height = 0;
    let frameId = 0;
    let isVisible = true;
    let pointerX = 0;
    let pointerY = 0;
    let currentX = 0;
    let currentY = 0;
    let elapsed = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const setPointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.65;
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.4;
    };
    const clearPointer = () => {
      pointerX = 0;
      pointerY = 0;
    };

    const renderFrame = () => {
      frameId = 0;
      if (!isVisible) return;
      elapsed += 0.008;
      currentX += (pointerY - currentX) * 0.035;
      currentY += (pointerX - currentY) * 0.035;
      badgeGroup.rotation.x = reducedMotion.matches ? 0 : currentX + Math.sin(elapsed) * 0.035;
      badgeGroup.rotation.y = reducedMotion.matches ? 0 : currentY + Math.sin(elapsed * 0.8) * 0.08;
      badgeGroup.position.y = reducedMotion.matches ? 0 : Math.sin(elapsed * 1.1) * 0.08;
      particles.rotation.y = reducedMotion.matches ? 0 : elapsed * 0.012;
      rings.forEach((ring, index) => {
        const scale = reducedMotion.matches ? 0.72 : 0.72 + ((elapsed * 0.16 + index * 0.32) % 0.42);
        ring.scale.set(scale, scale, scale);
        (ring.material as THREE.MeshBasicMaterial).opacity = (0.28 - index * 0.055) * (1 - (scale - 0.72) / 0.42);
      });
      renderer.render(scene, camera);
      if (!reducedMotion.matches) frameId = window.requestAnimationFrame(renderFrame);
    };

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible && !frameId) frameId = window.requestAnimationFrame(renderFrame);
      if (!isVisible && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    }, { threshold: 0.05 });
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    canvas.addEventListener('pointermove', setPointer, { passive: true });
    canvas.addEventListener('pointerleave', clearPointer);
    reducedMotion.addEventListener('change', renderFrame);
    resize();
    frameId = window.requestAnimationFrame(renderFrame);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', setPointer);
      canvas.removeEventListener('pointerleave', clearPointer);
      reducedMotion.removeEventListener('change', renderFrame);
      if (frameId) window.cancelAnimationFrame(frameId);
      badgeGeometry.dispose();
      badgeMaterial.dispose();
      particleGeometry.dispose();
      (particles.material as THREE.Material).dispose();
      rings.forEach(ring => {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      });
      badgeGroup.traverse(object => {
        if (object instanceof THREE.Mesh && object !== badge) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach(item => item.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  if (sceneError) {
    return <div className="nfc-scene-fallback" aria-label="Puce Digifeel"><Radio aria-hidden="true" /> DIGIFEEL</div>;
  }

  return (
    <div className="nfc-hero-scene" role="img" aria-label="Puce NFC Digifeel en trois dimensions">
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
};
