'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function PenroseHero3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 320;
    const height = currentMount.clientHeight || 320;

    // Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    currentMount.appendChild(renderer.domElement);

    // Build Minimal Geometric Wireframe Monolith (Penrose-inspired octahedron/torus geometry)
    const geometry = new THREE.OctahedronGeometry(2.2, 0);
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    
    // Line material with theme glow
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
    });
    const mesh = new THREE.LineSegments(wireframeGeometry, lineMaterial);
    scene.add(mesh);

    // Inner core geometry for depth
    const innerGeometry = new THREE.IcosahedronGeometry(1.2, 0);
    const innerWireframe = new THREE.WireframeGeometry(innerGeometry);
    const innerMaterial = new THREE.LineBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.35,
    });
    const innerMesh = new THREE.LineSegments(innerWireframe, innerMaterial);
    scene.add(innerMesh);

    // Mouse Parallax
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      if (prefersReducedMotion) return;
      const rect = currentMount.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = x * 0.5;
      targetRotationX = -y * 0.5;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Intersection & Visibility Observer to eliminate off-screen/hidden GPU rendering cycles
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting && document.visibilityState === 'visible';
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(currentMount);

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible) return; // Skip GPU draw calls when offscreen or in background tab

      if (!prefersReducedMotion) {
        mesh.rotation.y += 0.003;
        mesh.rotation.x += 0.0015;
        innerMesh.rotation.y -= 0.002;
        innerMesh.rotation.z += 0.002;
      }

      // Smooth interpolation toward target rotation
      mesh.rotation.y += (targetRotationY - mesh.rotation.y) * 0.05;
      mesh.rotation.x += (targetRotationX - mesh.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth || 320;
      const newHeight = currentMount.clientHeight || 320;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      innerGeometry.dispose();
      lineMaterial.dispose();
      innerMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  if (!hasWebGL) {
    // High-Quality Static SVG Fallback
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <svg viewBox="0 0 100 100" className="w-48 h-48 text-fg-primary stroke-current fill-none stroke-[1.5]">
          <polygon points="50,10 90,80 10,80" />
          <polygon points="50,25 78,75 22,75" strokeDasharray="2 2" />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-72 sm:h-96 flex items-center justify-center pointer-events-none transition-opacity duration-700 ease-out-expo"
    />
  );
}
