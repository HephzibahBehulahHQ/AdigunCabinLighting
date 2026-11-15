import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CabinMeshProfile } from './aircraft-assets';
import type { RGBW, SceneFile, ZoneId, ZoneState } from './scene-engine';
import { composePreviewRGB, previewLightLevel } from './lighting-preview';
import { interpolateScene } from './scene-engine';
import { CABIN_EXPORT_4K, canRenderExport } from './export-capabilities';
import { inspectG650ERSeatClearance, isG650ERPublishedWindow, seatG650ERSeatAssemblies } from './aircraft-geometry';

type Props = {
  profile: CabinMeshProfile;
  zones: ZoneState[];
  effective: Record<ZoneId, RGBW>;
  intensity: number;
  selected: ZoneId;
  onSelect: (zone: ZoneId) => void;
  highQuality: boolean;
  previewActive: boolean;
  previewMotion: boolean;
  previewTime: number;
  previewDuration: number;
  previewStartedAt: number;
  scene: SceneFile;
  cameraView: 'entry' | 'mid-cabin' | 'aft' | 'window-row';
  captureRef: MutableRefObject<(() => Promise<Blob>) | null>;
  cameraResetRef: MutableRefObject<(() => void) | null>;
};

const MATERIAL_ZONES: Record<string, ZoneId> = {
  ceiling_cove: 'ceiling_cove',
  left_sidewall: 'left_sidewall',
  right_sidewall: 'right_sidewall',
  footwell: 'footwell',
};

function previewColor(value: RGBW) {
  const rgb = composePreviewRGB(value);
  return new THREE.Color(rgb.r / 100, rgb.g / 100, rgb.b / 100);
}

function applyZoneLighting(materials: Map<ZoneId, Set<THREE.Material>>, lights: Map<ZoneId, THREE.PointLight[]>, effective: Record<ZoneId, RGBW>, intensity: number) {
  for (const id of ['ceiling_cove', 'left_sidewall', 'right_sidewall', 'footwell'] as const) {
    const rgbw = effective[id];
    const color = previewColor(rgbw);
    const level = previewLightLevel(rgbw, intensity);
    for (const material of materials.get(id) ?? []) {
      if ('emissive' in material) {
        const emissiveMaterial = material as THREE.MeshStandardMaterial;
        emissiveMaterial.emissive.copy(color);
        emissiveMaterial.emissiveIntensity = level === 0 ? 0 : .2 + level * 2.6;
      }
    }
    for (const light of lights.get(id) ?? []) { light.color.copy(color); light.intensity = level * 25; }
  }
}

function batchRepeatedCabinParts(root: THREE.Object3D, candidates: THREE.Mesh[]) {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, THREE.Mesh[]>();
  for (const mesh of candidates) {
    if (Array.isArray(mesh.material)) continue;
    const key = `${mesh.geometry.uuid}:${mesh.material.uuid}`;
    const batch = batches.get(key);
    if (batch) batch.push(mesh); else batches.set(key, [mesh]);
  }
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const first = meshes[0];
    const instances = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    meshes.forEach((mesh, index) => {
      // Instanced meshes are added below `root`, so store root-local transforms.
      instances.setMatrixAt(index, rootInverse.clone().multiply(mesh.matrixWorld));
      mesh.parent?.remove(mesh);
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
    instances.castShadow = false;
    instances.receiveShadow = false;
    instances.name = `Batched ${first.name || 'cabin component'} × ${meshes.length}`;
    root.add(instances);
  }
}

export default function CabinAsset3D({ profile, zones, effective, intensity, selected, onSelect, highQuality, previewActive, previewMotion, previewTime, previewDuration, previewStartedAt, scene: activeScene, cameraView, captureRef, cameraResetRef }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtime = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; materials: Map<ZoneId, Set<THREE.Material>>; lights: Map<ZoneId, THREE.PointLight[]>; selectable: THREE.Object3D[]; resize: ResizeObserver; reset: () => void; applyLighting: (values?: Record<ZoneId, RGBW>) => void; draw: () => void } | null>(null);
  const [error, setError] = useState('');
  const home = useRef<{ position: THREE.Vector3; quaternion: THREE.Quaternion } | null>(null);
  const cameraViewRef = useRef(cameraView);
  cameraViewRef.current = cameraView;
  const previewActiveRef = useRef(previewActive);
  previewActiveRef.current = previewActive;
  const lighting = useRef({ effective, intensity });
  lighting.current = { effective, intensity };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    } catch {
      setError('WebGL is unavailable in this browser. The aircraft cabin mesh could not be rendered.');
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, highQuality ? 1.5 : 1.25));
    renderer.setSize(host.clientWidth || 800, host.clientHeight || 500, false);
    renderer.domElement.className = 'cabin-webgl-canvas';
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', `Interactive 3D ${profile.label}. Authored simulation geometry; not an OEM or verified airline fit.`);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.dataset.cabinProfile = profile.id;
    if (profile.id === 'gulfstream-g650er') renderer.domElement.dataset.visibleWindows = '0';
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07111d');
    scene.add(new THREE.HemisphereLight('#e5f3ff', '#243143', 2.1));
    const key = new THREE.DirectionalLight('#fff1db', 1.25);
    key.position.set(-2, 7, 9);
    key.castShadow = false;
    scene.add(key);
    const camera = new THREE.PerspectiveCamera(62, 1, .03, 250);
    const root = new THREE.Group();
    scene.add(root);
    const modelLights = new Map<ZoneId, THREE.PointLight[]>();
    const zoneMaterials = new Map<ZoneId, Set<THREE.Material>>();
    const selectable: THREE.Object3D[] = [];
    let box = new THREE.Box3(new THREE.Vector3(-2, 0, -20), new THREE.Vector3(2, 2.5, 20));
    const viewCenter = () => box.getCenter(new THREE.Vector3());
    const viewSize = () => box.getSize(new THREE.Vector3());
    const pose = (view: Props['cameraView']) => {
      const center = viewCenter();
      const size = viewSize();
      const y = box.min.y + Math.min(size.y * .66, 1.58);
      const forward = Math.max(1, size.z * .46);
      if (view === 'aft') return { position: new THREE.Vector3(center.x, y, box.min.z + forward * .16), target: new THREE.Vector3(center.x, y, box.max.z - forward * .2) };
      if (view === 'window-row') return { position: new THREE.Vector3(center.x + size.x * .12, y, box.max.z - Math.max(1.8, size.z * .055)), target: new THREE.Vector3(center.x + size.x * .08, y * .94, box.min.z + size.z * .08) };
      const z = view === 'mid-cabin' ? center.z + size.z * .15 : box.max.z - Math.max(1.8, size.z * .055);
      return { position: new THREE.Vector3(center.x, y, z), target: new THREE.Vector3(center.x, y * .94, box.min.z + size.z * .08) };
    };
    const fitCamera = (view: Props['cameraView']) => {
      const next = pose(view);
      camera.position.copy(next.position);
      camera.lookAt(next.target);
      home.current = { position: camera.position.clone(), quaternion: camera.quaternion.clone() };
    };
    let frame: number | null = null;
    let lastRender = 0;
    const draw = () => {
      const now = performance.now();
      if (now - lastRender < (previewActiveRef.current ? 80 : 32)) return;
      lastRender = now;
      renderer.render(scene, camera);
    };
    const requestDraw = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => { frame = null; if (runtime.current) draw(); });
    };
    const resize = new ResizeObserver(() => {
      const width = host.clientWidth; const height = host.clientHeight;
      if (width && height) { camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); requestDraw(); }
    });
    resize.observe(host);

    let rootBoxReady = false;
    const loader = new GLTFLoader();
    void loader.loadAsync(profile.meshUrl).then((gltf) => {
      if (disposed) { gltf.scene.traverse((item) => { if (item instanceof THREE.Mesh) { item.geometry.dispose(); const materials = Array.isArray(item.material) ? item.material : [item.material]; materials.forEach((material) => material.dispose()); } }); return; }
      root.add(gltf.scene);
      box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      // Keep the model in meter-scale and level it on a local floor plane.
      gltf.scene.position.set(-center.x, -box.min.y, -center.z);
      box = new THREE.Box3().setFromObject(gltf.scene);
      const radius = Math.max(size.x, size.y, size.z);
      camera.near = Math.max(.02, radius / 2500);
      camera.far = Math.max(120, radius * 6);
      camera.updateProjectionMatrix();
      scene.fog = new THREE.Fog('#07111d', size.z * .95, size.z * 2.5);
      const repeatedParts: THREE.Mesh[] = [];
      let visibleG650WindowGlass = 0;
      if (profile.id === 'gulfstream-g650er') seatG650ERSeatAssemblies(gltf.scene);
      gltf.scene.traverse((object) => {
        if (profile.id === 'gulfstream-g650er') {
          const windowVisible = isG650ERPublishedWindow(object.name);
          if (windowVisible !== null) object.visible = windowVisible;
          if (windowVisible && /^Window (?:glass|glazing) /i.test(object.name.replace(/_/g, ' '))) visibleG650WindowGlass++;
        }
        if (object instanceof THREE.Light) { object.intensity = 0; return; }
        if (!(object instanceof THREE.Mesh)) return;
        const list = Array.isArray(object.material) ? object.material : [object.material];
        if (profile.id === 'gulfstream-g650er') for (const material of list) {
          if (material.name.replace(/_/g, ' ') === 'Ivory molded cabin lining' && 'color' in material) {
            (material as THREE.MeshStandardMaterial).color.set('#e2d5bd');
            (material as THREE.MeshStandardMaterial).roughness = 0.82;
          }
        }
        const zone = list.map((material) => MATERIAL_ZONES[material.name]).find(Boolean);
        if (zone) {
          object.userData.zoneId = zone;
          selectable.push(object);
          for (const material of list) {
            const mappedZone = MATERIAL_ZONES[material.name];
            if (mappedZone) {
              const zoneMaterialSet = zoneMaterials.get(mappedZone) ?? new Set<THREE.Material>();
              zoneMaterialSet.add(material);
              zoneMaterials.set(mappedZone, zoneMaterialSet);
            }
          }
        } else repeatedParts.push(object);
        object.castShadow = false;
        object.receiveShadow = false;
      });
      if (profile.id === 'gulfstream-g650er') {
        renderer.domElement.dataset.visibleWindows = String(visibleG650WindowGlass);
        const seatAudit = inspectG650ERSeatClearance(gltf.scene);
        renderer.domElement.dataset.renderedSeats = String(seatAudit.seatCount);
        renderer.domElement.dataset.seatOverlaps = String(seatAudit.overlapCount);
        renderer.domElement.dataset.seatFloorGap = String(seatAudit.floorGapMeters ?? 'unknown');
      }
      batchRepeatedCabinParts(gltf.scene, repeatedParts);
      // Keep the interactive preview responsive on large cabins; material groups provide continuous zone coverage.
      const fixtureCount = 2;
      const addZoneLights = (zone: ZoneId, x: number, y: number) => {
        const lights: THREE.PointLight[] = [];
        for (let index = 0; index < fixtureCount; index++) {
          const z = box.min.z + size.z * (index + .5) / fixtureCount;
          const light = new THREE.PointLight('#ffffff', 0, Math.max(1.5, size.x * .95), 1.7);
          light.position.set(x, y, z);
          scene.add(light);
          lights.push(light);
        }
        modelLights.set(zone, lights);
      };
      addZoneLights('ceiling_cove', -size.x * .2, box.min.y + size.y * .92);
      addZoneLights('left_sidewall', -size.x * .43, box.min.y + size.y * .5);
      addZoneLights('right_sidewall', size.x * .43, box.min.y + size.y * .5);
      addZoneLights('footwell', 0, box.min.y + size.y * .12);
      fitCamera(cameraView);
      applyZoneLighting(zoneMaterials, modelLights, lighting.current.effective, lighting.current.intensity);
      rootBoxReady = true;
      setError('');
      requestDraw();
    }).catch((reason: unknown) => {
      if (!disposed) setError(`Aircraft mesh failed to load: ${reason instanceof Error ? reason.message : 'unknown loader error'}`);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height * 2 - 1));
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(selectable, true)[0];
      const zone = hit?.object.userData.zoneId as ZoneId | undefined;
      if (zone) onSelect(zone);
    };
    const canvas = renderer.domElement;
    canvas.addEventListener('dblclick', onPick);
    let dragging = false; let lastX = 0; let lastY = 0;
    const onDown = (event: PointerEvent) => { dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId); };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX; const dy = event.clientY - lastY;
      lastX = event.clientX; lastY = event.clientY;
      // Rotate in place so orbit gestures cannot carry the camera through the cabin shell.
      camera.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(camera.up, -dx * .0025));
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
      camera.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(right, -dy * .0025));
      requestDraw();
    };
    const onUp = () => { dragging = false; };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const direction = camera.getWorldDirection(new THREE.Vector3());
      camera.position.addScaledVector(direction, THREE.MathUtils.clamp(-event.deltaY * .003, -1, 1));
      requestDraw();
    };
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp); canvas.addEventListener('wheel', onWheel, { passive: false });
    const reset = () => { fitCamera(cameraViewRef.current); requestDraw(); };
    cameraResetRef.current = reset;
    const applyLighting = (values = lighting.current.effective) => applyZoneLighting(zoneMaterials, modelLights, values, lighting.current.intensity);
    runtime.current = { renderer, scene, camera, materials: zoneMaterials, lights: modelLights, selectable, resize, reset, applyLighting, draw };
    captureRef.current = async () => {
      const gl = renderer.getContext();
      const max = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
      if (!canRenderExport(max, CABIN_EXPORT_4K.width, CABIN_EXPORT_4K.height)) throw new Error(`This device supports ${max}px render edges; 4K capture requires ${CABIN_EXPORT_4K.width} × ${CABIN_EXPORT_4K.height}.`);
      const sizeBefore = renderer.getSize(new THREE.Vector2()); const ratio = renderer.getPixelRatio(); const aspectBefore = camera.aspect;
      const target = new THREE.WebGLRenderTarget(CABIN_EXPORT_4K.width, CABIN_EXPORT_4K.height, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true });
      target.texture.colorSpace = THREE.SRGBColorSpace;
      try {
        renderer.setPixelRatio(1); renderer.setSize(CABIN_EXPORT_4K.width, CABIN_EXPORT_4K.height, false);
        if (gl.drawingBufferWidth !== CABIN_EXPORT_4K.width || gl.drawingBufferHeight !== CABIN_EXPORT_4K.height) throw new Error(`The browser allocated ${gl.drawingBufferWidth} × ${gl.drawingBufferHeight}; 4K capture was not started.`);
        camera.aspect = CABIN_EXPORT_4K.width / CABIN_EXPORT_4K.height;
        camera.updateProjectionMatrix();
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        const pixels = new Uint8Array(CABIN_EXPORT_4K.width * CABIN_EXPORT_4K.height * 4);
        renderer.readRenderTargetPixels(target, 0, 0, CABIN_EXPORT_4K.width, CABIN_EXPORT_4K.height, pixels);
        renderer.setRenderTarget(null);
        const imageCanvas = document.createElement('canvas');
        imageCanvas.width = CABIN_EXPORT_4K.width; imageCanvas.height = CABIN_EXPORT_4K.height;
        const context = imageCanvas.getContext('2d');
        if (!context) throw new Error('A 2D canvas is unavailable for the 4K image encode.');
        const image = context.createImageData(CABIN_EXPORT_4K.width, CABIN_EXPORT_4K.height);
        const rowBytes = CABIN_EXPORT_4K.width * 4;
        for (let row = 0; row < CABIN_EXPORT_4K.height; row++) image.data.set(pixels.subarray((CABIN_EXPORT_4K.height - row - 1) * rowBytes, (CABIN_EXPORT_4K.height - row) * rowBytes), row * rowBytes);
        context.putImageData(image, 0, 0);
        return await new Promise<Blob>((resolve, reject) => imageCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('4K image encoding failed.'))));
      } finally {
        renderer.setRenderTarget(null); target.dispose(); camera.aspect = aspectBefore; camera.updateProjectionMatrix();
        renderer.setPixelRatio(ratio); renderer.setSize(sizeBefore.x, sizeBefore.y, false); renderer.render(scene, camera);
      }
    };
    const drawFrame = () => { if (rootBoxReady) draw(); };
    drawFrame();

    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      resize.disconnect();
      canvas.removeEventListener('dblclick', onPick); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('wheel', onWheel);
      root.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()); } });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); runtime.current = null; captureRef.current = null; cameraResetRef.current = null; home.current = null;
    };
  }, [profile.id]);

  useEffect(() => {
    const current = runtime.current;
    if (!previewActive || !current) return;
    let animation = 0;
    let lastLightUpdate = 0;
    const animate = (now: number) => {
      const elapsed = Math.max(0, (now - previewStartedAt) / 1000);
      // Update animated material groups at the renderer's 12.5 fps draw cadence.
      // Recomputing every mapped material on every RAF starved playback on software WebGL.
      if (now - lastLightUpdate >= 80 || elapsed >= previewDuration) {
        lastLightUpdate = now;
        current.applyLighting(interpolateScene(activeScene, Math.min(previewDuration, elapsed)));
        current.draw();
      }
      if (elapsed < previewDuration) animation = requestAnimationFrame(animate);
    };
    animation = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animation);
  }, [previewActive, previewStartedAt, activeScene, previewDuration]);

  useEffect(() => {
    const current = runtime.current;
    if (!current) return;
    current.applyLighting();
    if (previewMotion) {
      home.current ??= { position: current.camera.position.clone(), quaternion: current.camera.quaternion.clone() };
      const phase = previewDuration > 0 ? previewTime / previewDuration * Math.PI * 2 : 0;
      current.camera.position.copy(home.current.position);
      current.camera.position.x += Math.sin(phase) * .12;
      current.camera.position.y += Math.sin(phase * .5) * .025;
      current.camera.quaternion.copy(home.current.quaternion);
    } else if (home.current) {
      current.camera.position.copy(home.current.position); current.camera.quaternion.copy(home.current.quaternion); home.current = null;
    }
    current.draw();
  }, [zones, effective, intensity, previewMotion, previewTime, previewDuration]);

  useEffect(() => { runtime.current?.reset(); }, [cameraView]);
  useEffect(() => {
    const current = runtime.current;
    if (!current) return;
    const host = hostRef.current;
    current.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, highQuality && !previewActive ? 1.5 : 1));
    if (host) current.renderer.setSize(host.clientWidth, host.clientHeight, false);
    current.renderer.shadowMap.enabled = highQuality && !previewActive;
    current.draw();
  }, [highQuality, previewActive]);

  return <div className="cabin-asset-renderer" ref={hostRef} data-selected-zone={selected} data-camera-view={cameraView}>
    {error && <div className="cabin-asset-error" role="alert">{error}</div>}
    <span className="cabin-asset-attribution">{profile.label} · SIMULATION GEOMETRY</span>
  </div>;
}
