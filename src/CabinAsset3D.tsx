import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CabinMeshProfile } from './aircraft-assets';
import type { RGBW, SceneFile, ZoneId, ZoneState } from './scene-engine';
import { composePreviewRGB, previewLightLevel } from './lighting-preview';
import { interpolateScene, preserveSafetyZones } from './scene-engine';
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
  'Window glass': 'windows',
  'Window glazing': 'windows',
};

function featureZone(name: string): ZoneId | undefined {
  const normalized = name.replace(/_/g, ' ').toLowerCase();
  if (/window (glass|glazing)/.test(normalized)) return 'windows';
  if (/sidewall light/.test(normalized)) return normalized.includes('-1') ? 'left_sidewall' : 'right_sidewall';
  if (/footwell/.test(normalized)) return 'footwell';
  return undefined;
}

function previewColor(value: RGBW) {
  const rgb = composePreviewRGB(value);
  return new THREE.Color(rgb.r / 100, rgb.g / 100, rgb.b / 100);
}

function applyZoneLighting(materials: Map<ZoneId, Set<THREE.Material>>, lights: Map<ZoneId, THREE.Light[]>, effective: Record<ZoneId, RGBW>, intensity: number) {
  for (const id of ['ceiling', 'windows', 'sidewalls', 'footwell', 'reading', 'entry', 'monuments', 'toilet', 'handrail', 'trolley', 'cabin', 'ceiling_cove', 'left_sidewall', 'right_sidewall', 'spotlights', 'emergency', 'exit'] as const) {
    const rgbw = effective[id];
    const color = previewColor(rgbw);
    const level = previewLightLevel(rgbw, intensity);
    for (const material of materials.get(id) ?? []) {
      if (material.userData.simulatedFixture === true) {
        if ('color' in material) (material as THREE.MeshBasicMaterial).color.copy(level === 0 ? new THREE.Color('#07111d') : color);
        material.opacity = level === 0 ? 0 : Math.min(1, .68 + level * .32);
        if ('emissive' in material) {
          const emitter = material as THREE.MeshStandardMaterial;
          emitter.emissive.copy(color);
          emitter.emissiveIntensity = level === 0 ? 0 : .8 + level * 1.4;
        }
        continue;
      }
      if ('emissive' in material) {
        const emissiveMaterial = material as THREE.MeshStandardMaterial;
        const modeledEmitter = id === 'ceiling_cove' || id === 'left_sidewall' || id === 'right_sidewall' || id === 'footwell';
        // Window glazing is a passive surface. Keep its authored glass tint and
        // let the separately modeled window source and aimed local lights create
        // the daylight spill; emissive glass reads as a flat glowing cutout.
        if (id === 'windows') {
          // Retain a readable cool glass tint in the view while the separate
          // diffuser and local sources do the actual simulated illumination.
          emissiveMaterial.emissive.set('#416a8c');
          emissiveMaterial.emissiveIntensity = level === 0 ? 0 : .18 + level * .14;
          continue;
        }
        // GLB light-channel meshes carry illustrative base colors. Darken those
        // actual emitters at zero so an inactive strip cannot glow as a mood.
        if (modeledEmitter) {
          emissiveMaterial.color.copy(level === 0 ? new THREE.Color('#101821') : color);
          emissiveMaterial.transparent = true;
          emissiveMaterial.opacity = level === 0 ? 0 : 1;
        }
        emissiveMaterial.emissive.copy(color);
        emissiveMaterial.emissiveIntensity = level === 0 ? 0 : .08 + level * .72;
      }
    }
    // Avoid clipped white pools when local real-time lights overlap on pale cabin surfaces.
    const fixturePower = id === 'windows' ? 8 : id === 'reading' ? 36 : id === 'spotlights' ? 20 : id === 'ceiling' ? 18 : id === 'emergency' || id === 'exit' ? 4 : 2.5;
    for (const light of lights.get(id) ?? []) {
      const fillScale = id === 'spotlights' ? .10 : .35;
      light.color.copy(color); light.intensity = level * (light instanceof THREE.SpotLight ? fixturePower : fixturePower * fillScale);
    }
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
  const runtime = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; materials: Map<ZoneId, Set<THREE.Material>>; lights: Map<ZoneId, THREE.Light[]>; selectable: THREE.Object3D[]; resize: ResizeObserver; reset: () => void; applyLighting: (values?: Record<ZoneId, RGBW>) => void; draw: () => void } | null>(null);
  const [error, setError] = useState('');
  const home = useRef<{ position: THREE.Vector3; quaternion: THREE.Quaternion } | null>(null);
  const cameraViewRef = useRef(cameraView);
  cameraViewRef.current = cameraView;
  const previewActiveRef = useRef(previewActive);
  previewActiveRef.current = previewActive;
  const lighting = useRef({ effective, intensity, zones });
  lighting.current = { effective, intensity, zones };

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
    renderer.toneMappingExposure = 1.02;
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
    scene.add(new THREE.HemisphereLight('#e5f3ff', '#243143', .72));
    const key = new THREE.DirectionalLight('#fff1db', .52);
    key.position.set(-2, 7, 9);
    key.castShadow = false;
    scene.add(key);
    const camera = new THREE.PerspectiveCamera(62, 1, .03, 250);
    const root = new THREE.Group();
    scene.add(root);
    const modelLights = new Map<ZoneId, THREE.Light[]>();
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
      const windowBounds: THREE.Box3[] = [];
      let excludedWindowGlassCount = 0;
      const seatBounds: THREE.Box3[] = [];
      const binBounds: THREE.Box3[] = [];
      const consoleBounds: THREE.Box3[] = [];
      const monumentBounds: THREE.Box3[] = [];
      let hasAuthoredCeiling = false;
      let visibleG650WindowGlass = 0;
      if (profile.id === 'gulfstream-g650er') seatG650ERSeatAssemblies(gltf.scene);
      gltf.scene.traverse((object) => {
        if (profile.id === 'gulfstream-g650er') {
          const windowVisible = isG650ERPublishedWindow(object.name);
          if (windowVisible !== null) object.visible = windowVisible;
          if (object instanceof THREE.Mesh && /^Cabin wall bay /i.test(object.name.replace(/_/g, ' '))) object.visible = false;
          const isPane = /^Window (?:glass|glazing) /i.test(object.name.replace(/_/g, ' '));
          if (isPane && windowVisible) visibleG650WindowGlass++;
          if (isPane && windowVisible === false) excludedWindowGlassCount++;
        }
        if (object instanceof THREE.Light) {
          const lightZone = object.name.includes('left_sidewall') ? 'left_sidewall' : object.name.includes('right_sidewall') ? 'right_sidewall' : undefined;
          object.intensity = 0;
          if (lightZone) { const entries = modelLights.get(lightZone) ?? []; entries.push(object); modelLights.set(lightZone, entries); }
          return;
        }
        if (!(object instanceof THREE.Mesh) || !object.visible) return;
        const feature = featureZone(object.name);
        let list = Array.isArray(object.material) ? object.material : [object.material];
        if (feature === 'windows' && object.visible) {
          list = list.map((material) => material.name.toLowerCase().includes('window glass') ? material.clone() : material);
          object.material = Array.isArray(object.material) ? list : list[0];
          const bounds = new THREE.Box3().setFromObject(object);
          if (!bounds.isEmpty()) windowBounds.push(bounds);
        }
        const normalizedName = object.name.replace(/_/g, ' ').toLowerCase();
        if (object instanceof THREE.Mesh && /(?:cabin )?ceiling (?:panel|shell|lining)/.test(normalizedName)) hasAuthoredCeiling = true;
        if (/seat.*headrest/.test(normalizedName)) {
          const bounds = new THREE.Box3().setFromObject(object); if (!bounds.isEmpty()) seatBounds.push(bounds);
        }
        if (/overhead luggage bin/.test(normalizedName)) {
          const bounds = new THREE.Box3().setFromObject(object); if (!bounds.isEmpty()) binBounds.push(bounds);
        }
        if (/vip side console/.test(normalizedName)) {
          const bounds = new THREE.Box3().setFromObject(object); if (!bounds.isEmpty()) consoleBounds.push(bounds);
        }
        if (/galley module|monument/.test(normalizedName)) {
          const bounds = new THREE.Box3().setFromObject(object); if (!bounds.isEmpty()) monumentBounds.push(bounds);
        }
        if (profile.id === 'gulfstream-g650er') for (const material of list) {
          const materialName = material.name.replace(/_/g, ' ');
          if (materialName === 'Ivory molded cabin lining' && 'color' in material) {
            (material as THREE.MeshStandardMaterial).color.set('#e2d5bd');
            (material as THREE.MeshStandardMaterial).roughness = 0.82;
          }
          if (materialName === 'Navy woven upholstery' && 'color' in material) {
            (material as THREE.MeshStandardMaterial).color.set('#b8aa95');
            (material as THREE.MeshStandardMaterial).roughness = 0.78;
          }
          if (materialName === 'Pearl seat headrest' && 'color' in material) {
            (material as THREE.MeshStandardMaterial).color.set('#e4d8c6');
            (material as THREE.MeshStandardMaterial).roughness = 0.74;
          }
          if (materialName === 'Upholstery stitching' && 'color' in material) (material as THREE.MeshStandardMaterial).color.set('#76695a');
        }
        const zone = feature ?? list.map((material) => MATERIAL_ZONES[material.name]).find(Boolean);
        if (zone && (feature !== 'windows' || object.visible)) {
          object.userData.zoneId = zone;
          selectable.push(object);
          for (const material of list) {
            const mappedZone = feature ?? MATERIAL_ZONES[material.name];
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
      if (profile.id === 'gulfstream-g650er' && windowBounds.length) {
        // Replace disconnected authored bay faces with continuous inner wall
        // panels and cut oval openings from the 16 retained glass bounds.
        const panelMaterial = new THREE.MeshStandardMaterial({ color: '#e2d5bd', emissive: '#211a12', emissiveIntensity: .12, roughness: .84, metalness: .01, side: THREE.DoubleSide });
        const cabinCenterX = box.getCenter(new THREE.Vector3()).x;
        for (const side of [-1, 1]) {
          const sideWindows = windowBounds.filter((bounds) => (bounds.getCenter(new THREE.Vector3()).x - cabinCenterX) * side > 0);
          if (!sideWindows.length) continue;
          const frameXs = sideWindows.map((bounds) => bounds.getCenter(new THREE.Vector3()).x);
          const inward = side < 0 ? 1 : -1;
          const x = frameXs.reduce((sum, value) => sum + value, 0) / frameXs.length + inward * .025;
          const outer = new THREE.Shape();
          outer.moveTo(box.min.z + .06, box.min.y + size.y * .16);
          outer.lineTo(box.max.z - .06, box.min.y + size.y * .16);
          outer.lineTo(box.max.z - .06, box.max.y - size.y * .075);
          outer.lineTo(box.min.z + .06, box.max.y - size.y * .075);
          outer.closePath();
          for (const bounds of sideWindows) {
            const center = bounds.getCenter(new THREE.Vector3());
            const extent = bounds.getSize(new THREE.Vector3());
            const opening = new THREE.Path();
            opening.absellipse(center.z, center.y, Math.max(.04, extent.z * .58), Math.max(.04, extent.y * .58), 0, Math.PI * 2, false, 0);
            outer.holes.push(opening);
          }
          const wallGeometry = new THREE.ShapeGeometry(outer, 24);
          wallGeometry.rotateY(-Math.PI / 2);
          wallGeometry.translate(x, 0, 0);
          const wall = new THREE.Mesh(wallGeometry, panelMaterial);
          wall.name = `Estimated continuous sidewall with ${sideWindows.length} window openings`;
          wall.userData.zoneId = side < 0 ? 'left_sidewall' : 'right_sidewall';
          wall.castShadow = false; wall.receiveShadow = false;
          root.add(wall);
        }
      }
      if (profile.id === 'gulfstream-g650er') {
        renderer.domElement.dataset.visibleWindows = String(visibleG650WindowGlass);
        renderer.domElement.dataset.excludedWindowGlassCount = String(excludedWindowGlassCount);
        const seatAudit = inspectG650ERSeatClearance(gltf.scene);
        renderer.domElement.dataset.renderedSeats = String(seatAudit.seatCount);
        renderer.domElement.dataset.seatOverlaps = String(seatAudit.overlapCount);
        renderer.domElement.dataset.seatFloorGap = String(seatAudit.floorGapMeters ?? 'unknown');
      }
      batchRepeatedCabinParts(gltf.scene, repeatedParts);
      gltf.scene.updateMatrixWorld(true);
      const fixtureGeometry = new THREE.BoxGeometry(1, 1, 1);
      const addFixtures = (zone: ZoneId, items: { position: THREE.Vector3; size: THREE.Vector3; rotation?: THREE.Euler }[]) => {
        if (!items.length) return;
        const material = new THREE.MeshBasicMaterial({ color: '#07111d', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
        material.userData.simulatedFixture = true;
        const mesh = new THREE.InstancedMesh(fixtureGeometry, material, items.length);
        mesh.name = `Simulated ${zone} fixture group · ${items.length}`;
        mesh.userData.zoneId = zone;
        const transform = new THREE.Object3D();
        items.forEach((item, index) => {
          transform.position.copy(item.position); transform.scale.copy(item.size);
          if (item.rotation) transform.rotation.copy(item.rotation); else transform.rotation.set(0, 0, 0);
          transform.updateMatrix(); mesh.setMatrixAt(index, transform.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
        root.add(mesh); selectable.push(mesh);
        const registered = zoneMaterials.get(zone) ?? new Set<THREE.Material>(); registered.add(material); zoneMaterials.set(zone, registered);
      };
      const addPoint = (zone: ZoneId, position: THREE.Vector3, distance: number, decay = 2) => {
        const light = new THREE.PointLight('#ffffff', 0, distance, decay); light.position.copy(position); light.name = `Simulated ${zone} source`;
        scene.add(light); const list = modelLights.get(zone) ?? []; list.push(light); modelLights.set(zone, list);
      };
      const addSpot = (zone: ZoneId, position: THREE.Vector3, targetPosition: THREE.Vector3, distance: number, angle = Math.PI / 5) => {
        const light = new THREE.SpotLight('#ffffff', 0, distance, angle, .72, 2); light.position.copy(position); light.name = `Simulated ${zone} aimed source`;
        const target = new THREE.Object3D(); target.position.copy(targetPosition); scene.add(target); light.target = target; scene.add(light);
        const list = modelLights.get(zone) ?? []; list.push(light); modelLights.set(zone, list);
      };
      const centerX = box.getCenter(new THREE.Vector3()).x;
      const cabinSpan = Math.max(.1, box.max.z - box.min.z);
      const roofHalfWidth = size.x * .49;
      const roofEdgeDrop = Math.max(.16, size.y * .14);
      const roofY = (x: number) => box.max.y - .035 - roofEdgeDrop * Math.min(1, ((x - centerX) / roofHalfWidth) ** 2);
      // The VVIP mesh has no ceiling shell. Add a curved, model-relative lining
      // surface so light groups illuminate a cabin surface instead of empty sky.
      const roofGeometry = new THREE.BufferGeometry();
      const roofColumns = 12; const roofRows = 40;
      const roofVertices: number[] = []; const roofIndices: number[] = [];
      for (let row = 0; row <= roofRows; row++) {
        const z = box.min.z + .08 + (cabinSpan - .16) * row / roofRows;
        for (let column = 0; column <= roofColumns; column++) {
          const x = centerX - roofHalfWidth + roofHalfWidth * 2 * column / roofColumns;
          roofVertices.push(x, roofY(x), z);
        }
      }
      for (let row = 0; row < roofRows; row++) for (let column = 0; column < roofColumns; column++) {
        const a = row * (roofColumns + 1) + column; const b = a + 1; const c = a + roofColumns + 1; const d = c + 1;
        roofIndices.push(a, b, c, b, d, c);
      }
      roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roofVertices, 3));
      roofGeometry.setIndex(roofIndices); roofGeometry.computeVertexNormals();
      const roofMaterial = new THREE.MeshStandardMaterial({ color: '#e2d5bd', emissive: '#c9b998', emissiveIntensity: .32, roughness: .84, metalness: .015, side: THREE.DoubleSide });
      if (!hasAuthoredCeiling) {
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.name = 'Estimated curved ceiling lining · dimension-based'; roof.castShadow = false; roof.receiveShadow = true;
        root.add(roof);
      } else {
        roofGeometry.dispose(); roofMaterial.dispose();
      }
      const panes = windowBounds.map((bounds) => {
        const center = bounds.getCenter(new THREE.Vector3()); const inward = center.x < centerX ? 1 : -1;
        return { bounds, position: center.add(new THREE.Vector3(inward * Math.max(.12, size.x * .045), 0, 0)), inward };
      });
      const windowSourceItems = panes.map(({ bounds, position, inward }) => {
        const extent = bounds.getSize(new THREE.Vector3());
        return {
          // A slim luminous diffuser sits just inside the glazing plane. The
          // original glass stays tinted and non-emissive like a real window.
          position: new THREE.Vector3(position.x - inward * Math.max(.08, size.x * .032), position.y, position.z),
          size: new THREE.Vector3(.012, Math.max(.12, extent.y * .68), Math.max(.12, extent.z * .68)),
        };
      });
      addFixtures('windows', windowSourceItems);
      panes.filter((_, index) => index % Math.max(1, Math.ceil(panes.length / 16)) === 0).forEach(({ position, inward }) => {
        const source = position.clone();
        source.x -= inward * .025;
        const target = new THREE.Vector3(centerX, box.min.y + size.y * .34, source.z);
        addSpot('windows', source, target, Math.max(1.5, size.x * 1.1), Math.PI / 4);
      });

      // The bin edge uses each actual bin mesh's aisle-facing lower lip as its placement datum.
      const binItems = binBounds.map((bounds) => {
        const center = bounds.getCenter(new THREE.Vector3()); const side = center.x < centerX ? -1 : 1;
        return { position: new THREE.Vector3(center.x - side * bounds.getSize(new THREE.Vector3()).x * .43, bounds.min.y + .018, center.z), size: new THREE.Vector3(.018, .014, Math.max(.18, bounds.getSize(new THREE.Vector3()).z * .82)) };
      });
      const edgeItems = binItems.length ? binItems : consoleBounds.map((bounds) => {
        const center = bounds.getCenter(new THREE.Vector3()); const side = center.x < centerX ? -1 : 1;
        return { position: new THREE.Vector3(center.x - side * bounds.getSize(new THREE.Vector3()).x * .42, bounds.max.y + .012, center.z), size: new THREE.Vector3(.016, .012, Math.max(.18, bounds.getSize(new THREE.Vector3()).z * .88)) };
      });
      addFixtures('handrail', edgeItems);
      edgeItems.filter((_, index) => index % Math.max(1, Math.ceil(edgeItems.length / 18)) === 0).forEach((item) => addPoint('handrail', item.position.clone(), Math.max(1.2, size.x * .42)));

      // Ceiling wash strips sit just above the overhead-bin tops and aim upward.
      const ceilingItems = binBounds.map((bounds) => {
        const center = bounds.getCenter(new THREE.Vector3()); const extent = bounds.getSize(new THREE.Vector3());
        return { position: new THREE.Vector3(center.x, bounds.max.y + .022, center.z), size: new THREE.Vector3(Math.max(.12, extent.x * .62), .012, Math.max(.18, extent.z * .78)) };
      });
      if (!ceilingItems.length) {
        for (const side of [-1, 1]) {
          const x = centerX + side * size.x * .29;
          ceilingItems.push({ position: new THREE.Vector3(x, roofY(x) - .025, box.getCenter(new THREE.Vector3()).z), size: new THREE.Vector3(.035, .018, cabinSpan * .84) });
        }
      }
      addFixtures('ceiling', ceilingItems);
      ceilingItems.filter((_, index) => index % Math.max(1, Math.ceil(ceilingItems.length / 12)) === 0).forEach((item) => {
        const surfaceY = roofY(item.position.x);
        const source = item.position.clone();
        source.y = Math.min(source.y, surfaceY - .055);
        const target = new THREE.Vector3(item.position.x, surfaceY - .006, item.position.z);
        addSpot('ceiling', source, target, Math.max(1.5, size.x * .52), Math.PI / 4);
      });

      // Central cove is a linear, ceiling-mounted source, independent from the bin-top wash.
      const coveY = roofY(centerX) - .025;
      addFixtures('ceiling_cove', [{ position: new THREE.Vector3(centerX, coveY, box.getCenter(new THREE.Vector3()).z), size: new THREE.Vector3(Math.max(.035, size.x * .018), .025, cabinSpan * .86) }]);
      for (let index = 0; index < 8; index++) addPoint('ceiling_cove', new THREE.Vector3(centerX, coveY - .025, box.min.z + cabinSpan * (index + .5) / 8), Math.max(1.5, size.x * .62));

      // One visible task emitter per authored seat headrest; physical spotlights are sampled along the cabin to bound draw cost.
      const readingItems = seatBounds.map((bounds) => {
        const center = bounds.getCenter(new THREE.Vector3());
        return { position: new THREE.Vector3(center.x, Math.min(roofY(center.x) - .035, bounds.max.y + .42), center.z), size: new THREE.Vector3(.045, .018, .035) };
      });
      addFixtures('reading', readingItems);
      readingItems.filter((_, index) => index % Math.max(1, Math.ceil(readingItems.length / 24)) === 0).forEach((item) => {
        const target = item.position.clone().add(new THREE.Vector3(0, -Math.max(.42, size.y * .24), .24));
        addSpot('reading', item.position.clone(), target, Math.max(1.5, size.x * .62), Math.PI / 6);
      });

      // Focused work lights are tied to modeled galley/monument bounds, not arbitrary cabin coordinates.
      const workItems = monumentBounds.map((bounds) => {
        const center = bounds.getCenter(new THREE.Vector3());
        const aisleFaceX = center.x < centerX ? bounds.max.x : bounds.min.x;
        return {
          position: new THREE.Vector3(aisleFaceX, roofY(aisleFaceX) - .07, center.z),
          size: new THREE.Vector3(.20, .06, .20),
          target: new THREE.Vector3(aisleFaceX, Math.min(bounds.max.y - .04, bounds.min.y + .68), center.z),
        };
      });
      // Where the cabin has no operator galley/monument surface near the seated
      // passenger view, derive additional task spots from the modeled side-console
      // bounds, evenly spaced along their actual longitudinal run.
      for (const bounds of consoleBounds) {
        const center = bounds.getCenter(new THREE.Vector3());
        const extent = bounds.getSize(new THREE.Vector3());
        const aisleFaceX = center.x < centerX ? bounds.max.x : bounds.min.x;
        for (let index = 0; index < 4; index++) {
          const z = bounds.min.z + extent.z * (index + .5) / 4;
          workItems.push({
            position: new THREE.Vector3(aisleFaceX, roofY(aisleFaceX) - .07, z),
            size: new THREE.Vector3(.20, .06, .20),
            target: new THREE.Vector3(aisleFaceX, bounds.max.y - .012, z),
          });
        }
      }
      addFixtures('spotlights', workItems.map(({ position, size: fixtureSize }) => ({ position, size: fixtureSize })));
      workItems.forEach((item) => {
        addSpot('spotlights', item.position.clone(), item.target, Math.max(1.2, size.x * .7), Math.PI / 7);
        addPoint('spotlights', item.target.clone(), Math.max(1.2, size.x * .35), 2.2);
      });

      // Escape-path guides remain independent of decorative scene tracks.
      const pathX = Math.max(.05, size.x * .035);
      const pathItems = [-1, 1].map((side) => ({ position: new THREE.Vector3(centerX + side * pathX, box.min.y + .045, box.getCenter(new THREE.Vector3()).z), size: new THREE.Vector3(.018, .018, cabinSpan * .92) }));
      addFixtures('emergency', pathItems);
      for (let index = 0; index < 10; index++) addPoint('emergency', new THREE.Vector3(centerX, box.min.y + .07, box.min.z + cabinSpan * (index + .5) / 10), Math.max(1.1, size.x * .25));

      // Exit cues are deliberately marked as estimated at the modeled cabin ends; the GLBs contain no exit stations.
      const signItems = [box.min.z + Math.min(.42, cabinSpan * .025), box.max.z - Math.min(.42, cabinSpan * .025)].map((z, index) => ({
        position: new THREE.Vector3(centerX, box.min.y + size.y * .76, z), size: new THREE.Vector3(.30, .12, .025), rotation: new THREE.Euler(0, index ? Math.PI : 0, 0),
      }));
      const signCanvas = document.createElement('canvas'); signCanvas.width = 256; signCanvas.height = 96;
      const signContext = signCanvas.getContext('2d');
      if (signContext) {
        signContext.fillStyle = '#123d2b'; signContext.fillRect(0, 0, signCanvas.width, signCanvas.height);
        signContext.strokeStyle = '#69e7a4'; signContext.lineWidth = 6; signContext.strokeRect(3, 3, signCanvas.width - 6, signCanvas.height - 6);
        signContext.fillStyle = '#aaffd0'; signContext.font = '700 54px Arial'; signContext.textAlign = 'center'; signContext.textBaseline = 'middle';
        signContext.fillText('EXIT  ›', signCanvas.width / 2, signCanvas.height / 2);
      }
      const signTexture = new THREE.CanvasTexture(signCanvas); signTexture.colorSpace = THREE.SRGBColorSpace;
      const signMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', map: signTexture, emissive: '#000000', emissiveMap: signTexture, emissiveIntensity: 0, roughness: .4, metalness: .05 });
      signMaterial.transparent = true; signMaterial.opacity = 0; signMaterial.depthWrite = false; signMaterial.userData.simulatedFixture = true;
      const signMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, .375), signMaterial, signItems.length);
      signMesh.name = `Estimated simulated EXIT signs · ${signItems.length}`; signMesh.userData.zoneId = 'exit';
      const signTransform = new THREE.Object3D();
      signItems.forEach((item, index) => {
        signTransform.position.copy(item.position); signTransform.scale.set(item.size.x, item.size.y, 1); signTransform.rotation.copy(item.rotation ?? new THREE.Euler());
        signTransform.updateMatrix(); signMesh.setMatrixAt(index, signTransform.matrix);
      });
      signMesh.instanceMatrix.needsUpdate = true; signMesh.computeBoundingSphere(); root.add(signMesh); selectable.push(signMesh);
      const signMaterials = zoneMaterials.get('exit') ?? new Set<THREE.Material>(); signMaterials.add(signMaterial); zoneMaterials.set('exit', signMaterials);
      signItems.forEach((item) => addPoint('exit', item.position.clone(), Math.max(.8, size.x * .20)));

      renderer.domElement.dataset.simulatedFixtureCounts = JSON.stringify({ windows: panes.length, ceiling: ceilingItems.length, handrail: edgeItems.length, reading: readingItems.length, spotlights: workItems.length, emergency: pathItems.length, exit: signItems.length, placementBasis: binBounds.length ? 'overhead-bins' : consoleBounds.length ? 'vip-side-console-and-upper-sidewall' : 'upper-sidewall-fallback' });
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
      root.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => { if (material instanceof THREE.MeshStandardMaterial) { material.map?.dispose(); material.emissiveMap?.dispose(); } material.dispose(); }); } });
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
        const independentSafety = Object.fromEntries(lighting.current.zones.filter((zone) => zone.id === 'emergency' || zone.id === 'exit').map((zone) => [zone.id, zone.rgbw]));
        current.applyLighting(preserveSafetyZones(interpolateScene(activeScene, Math.min(previewDuration, elapsed)), independentSafety));
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

