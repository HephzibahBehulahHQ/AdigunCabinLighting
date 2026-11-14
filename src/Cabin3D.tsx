import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { RGBW, ZoneId, ZoneState } from './scene-engine';
import { CABIN_LAYOUTS, type CabinConfig } from './cabin-config';
import { composePreviewRGB, previewLightLevel } from './lighting-preview';
import { CABIN_EXPORT_4K, canRenderExport } from './export-capabilities';

type Props = {
  config: CabinConfig;
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
  captureRef: MutableRefObject<(() => Promise<Blob>) | null>;
  cameraResetRef: MutableRefObject<(() => void) | null>;
};

const sRGB = (rgbw: RGBW) => {
  const color = composePreviewRGB(rgbw);
  return new THREE.Color(color.r / 100, color.g / 100, color.b / 100);
};

export default function Cabin3D({ config, zones, effective, intensity, selected, onSelect, highQuality, previewActive, previewMotion, previewTime, previewDuration, captureRef, cameraResetRef }: Props) {
  const canvasHost = useRef<HTMLDivElement>(null);
  const api = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; lights: Map<ZoneId, THREE.PointLight[]>; zoneMaterials: Map<ZoneId, THREE.MeshStandardMaterial[]>; selectable: THREE.Object3D[]; frame: number; resize: ResizeObserver; cameraHome: THREE.Vector3; draw: () => void } | null>(null);
  const [error, setError] = useState('');
  const [help, setHelp] = useState('Drag to look · WASD to move · scroll to move');
  const motionHome = useRef<{ position: THREE.Vector3; rotation: THREE.Euler } | null>(null);

  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    } catch {
      setError('WebGL is unavailable in this browser. The 3D cabin could not be created.');
      return;
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07111d');
    scene.fog = new THREE.Fog('#07111d', config.lengthMeters * 0.58, config.lengthMeters * 1.35);
    const camera = new THREE.PerspectiveCamera(66, 1, 0.08, 150);
    camera.position.set(0, Math.min(1.56, config.ceilingHeightMeters - 0.5), config.lengthMeters / 2 - 1.8);
    camera.lookAt(0, camera.position.y, -config.lengthMeters / 2);
    const cameraHome = camera.position.clone();
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, highQuality ? 2 : 1.35));
    renderer.setSize(host.clientWidth || 800, host.clientHeight || 500, false);
    renderer.domElement.className = 'cabin-webgl-canvas';
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D configurable reference aircraft cabin');
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.tabIndex = 0;
    host.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#d2e7ff', '#1b2637', 1.9));
    const key = new THREE.DirectionalLight('#fff0d1', .42);
    key.position.set(-2, config.ceilingHeightMeters - .25, config.lengthMeters / 3);
    key.castShadow = highQuality;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const lights = new Map<ZoneId, THREE.PointLight[]>();
    const zoneMaterials = new Map<ZoneId, THREE.MeshStandardMaterial[]>();
    const selectable: THREE.Object3D[] = [];
    const boxGeometryCache = new Map<string, THREE.BoxGeometry>();
    const roundedGeometryCache = new Map<string, RoundedBoxGeometry>();
    const mat = (color: string, roughness = 0.72, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const addBox = (parent: THREE.Object3D, size: [number, number, number], pos: [number, number, number], material: THREE.Material, zone?: ZoneId, cast = true) => {
      const cacheKey = size.join('x');
      let geometry = boxGeometryCache.get(cacheKey);
      if (!geometry) { geometry = new THREE.BoxGeometry(...size); boxGeometryCache.set(cacheKey, geometry); }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...pos); mesh.castShadow = cast; mesh.receiveShadow = true;
      if (zone) { mesh.userData.zoneId = zone; selectable.push(mesh); }
      parent.add(mesh); return mesh;
    };
    const addInstances = (geometry: THREE.BufferGeometry, material: THREE.Material, positions: [number, number, number][], zone: ZoneId) => {
      const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
      const transform = new THREE.Matrix4();
      positions.forEach((position, index) => { transform.makeTranslation(...position); mesh.setMatrixAt(index, transform); });
      mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.zoneId = zone; selectable.push(mesh); scene.add(mesh);
      return mesh;
    };
    const floorMat = mat('#273344', .9);
    const wallMat = mat('#344254', .7);
    const shellMat = new THREE.MeshStandardMaterial({ color: '#788795', roughness: .82, side: THREE.DoubleSide, emissive: '#283543', emissiveIntensity: .58 });
    const trimMat = mat('#8494a5', .36, .58);
    const seatMat = mat('#394b60', .82);
    const seatInset = mat('#52677e', .78);
    addBox(scene, [config.widthMeters, .14, config.lengthMeters], [0, -.08, 0], floorMat);

    // Curved overhead liner, generated as a real longitudinal mesh from the reference profile.
    const roofPositions: number[] = []; const roofIndices: number[] = [];
    const across = 32; const along = 28; const radius = config.widthMeters * .5;
    for (let z = 0; z <= along; z++) {
      const depth = -config.lengthMeters / 2 + config.lengthMeters * z / along;
      for (let a = 0; a <= across; a++) {
        const angle = Math.PI * a / across;
        roofPositions.push(Math.cos(angle) * radius, config.ceilingHeightMeters - radius + Math.sin(angle) * radius, depth);
      }
    }
    for (let z = 0; z < along; z++) for (let a = 0; a < across; a++) {
      const i = z * (across + 1) + a; const n = across + 1;
      roofIndices.push(i, i + n, i + 1, i + 1, i + n, i + n + 1);
    }
    const roofGeo = new THREE.BufferGeometry(); roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPositions, 3)); roofGeo.setIndex(roofIndices); roofGeo.computeVertexNormals();
    const roof = new THREE.Mesh(roofGeo, shellMat); roof.receiveShadow = true; scene.add(roof);

    const windowMat = new THREE.MeshPhysicalMaterial({ color: '#4e7c9b', roughness: .19, metalness: .18, transmission: .25, transparent: true, opacity: .82, emissive: '#071b2b', emissiveIntensity: .25 });
    const ledLensMat = mat('#ffffff', .28, .08);
    const readingMat = mat('#c4ccd3', .3, .12);
    for (const side of [-1, 1]) {
      const x = side * (config.widthMeters / 2 - .1);
      addBox(scene, [.2, config.ceilingHeightMeters * .54, config.lengthMeters], [x, config.ceilingHeightMeters * .27, 0], wallMat);
      // Individual glazing, deep frames and mullions; never presented as a real aircraft fit.
      for (let i = 0; i < config.windowCountPerSide; i++) {
        const z = -config.lengthMeters * .43 + (config.lengthMeters * .86) * (i + .5) / config.windowCountPerSide;
        const pane = addBox(scene, [.035, .38, .48], [side * (config.widthMeters / 2 - .18), config.ceilingHeightMeters * .54, z], windowMat, 'windows', false);
        pane.rotation.z = side * -.07;
        addBox(scene, [.09, .48, .055], [side * (config.widthMeters / 2 - .15), config.ceilingHeightMeters * .54, z - .265], trimMat, 'windows', false);
        addBox(scene, [.09, .48, .055], [side * (config.widthMeters / 2 - .15), config.ceilingHeightMeters * .54, z + .265], trimMat, 'windows', false);
        addBox(scene, [.09, .055, .48], [side * (config.widthMeters / 2 - .15), config.ceilingHeightMeters * .54 - .24, z], trimMat, 'windows', false);
        addBox(scene, [.09, .055, .48], [side * (config.widthMeters / 2 - .15), config.ceilingHeightMeters * .54 + .24, z], trimMat, 'windows', false);
      }
      // Illustrative overhead stowage and emissive light-channel geometry.
      const binX = side * (config.widthMeters / 2 - config.overheadBinDepthMeters * .47);
      addBox(scene, [config.overheadBinDepthMeters, .48, config.lengthMeters * .88], [binX, config.ceilingHeightMeters * .67, 0], mat('#d3d9df', .48), 'monuments');
      addBox(scene, [.035, .045, config.lengthMeters * .86], [side * (config.widthMeters / 2 - config.overheadBinDepthMeters * .86), config.ceilingHeightMeters * .39, 0], ledLensMat, 'ceiling', false);
      // Sidewall wash and segmented reading luminaires.
      addBox(scene, [.035, .055, config.lengthMeters * .86], [side * (config.widthMeters / 2 - .23), config.ceilingHeightMeters * .34, 0], mat('#fff3d0', .32), 'sidewalls', false);
    }

    const seatGroups = CABIN_LAYOUTS[config.layoutId].groups;
    const aisleWidth = Math.min(.48, config.widthMeters * .105);
    const seatGap = .07;
    const selectedLayout = CABIN_LAYOUTS[config.layoutId];
    const rows = 'seatPlan' in selectedLayout
      ? selectedLayout.seatPlan.flatMap((section) => Array.from({ length: section.rows }, () => ({ groups: section.groups, pitchMeters: section.pitchMeters })))
      : Array.from({ length: config.seatRows }, () => ({ groups: seatGroups, pitchMeters: config.seatPitchMeters }));
    const totalSpan = rows.reduce((sum, row) => sum + row.pitchMeters, 0);
    const maxSeatsInRow = Math.max(...rows.map((row) => row.groups.reduce((sum, count) => sum + count, 0)));
    const maxAisles = Math.max(...rows.map((row) => row.groups.length - 1));
    const seatWidth = Math.min(config.layoutId === 'premium' ? .68 : .49, (config.widthMeters - .5 - maxAisles * aisleWidth - Math.max(0, maxSeatsInRow - rows[0].groups.length) * seatGap) / maxSeatsInRow);
    const seats: [number, number][] = [];
    let rowStart = -totalSpan / 2;
    for (const row of rows) {
      const totalSeats = row.groups.reduce((sum, count) => sum + count, 0);
      const aisleCount = row.groups.length - 1;
      const z = rowStart + row.pitchMeters / 2;
      rowStart += row.pitchMeters;
      const occupiedWidth = totalSeats * seatWidth + (totalSeats - row.groups.length) * seatGap + aisleCount * aisleWidth;
      let x = -occupiedWidth / 2 + seatWidth / 2;
      for (let groupIndex = 0; groupIndex < row.groups.length; groupIndex++) {
        for (let col = 0; col < row.groups[groupIndex]; col++) {
          seats.push([x, z]);
          x += seatWidth + seatGap;
        }
        if (groupIndex < row.groups.length - 1) x += aisleWidth - seatGap;
      }
    }
    const seatPositions = (offset: [number, number, number]): [number, number, number][] => seats.map(([x, z]) => [x + offset[0], offset[1], z + offset[2]]);
    const boxGeometry = (size: [number, number, number]) => {
      const cacheKey = size.join('x'); let geometry = boxGeometryCache.get(cacheKey);
      if (!geometry) { geometry = new THREE.BoxGeometry(...size); boxGeometryCache.set(cacheKey, geometry); }
      return geometry;
    };
    const roundedGeometry = (size: [number, number, number]) => {
      const cacheKey = size.join('x'); let geometry = roundedGeometryCache.get(cacheKey);
      if (!geometry) { geometry = new RoundedBoxGeometry(...size, 3, .025); roundedGeometryCache.set(cacheKey, geometry); }
      return geometry;
    };
    addInstances(roundedGeometry([seatWidth * .82, .13, .43]), seatMat, seatPositions([0, .48, .04]), 'cabin');
    addInstances(roundedGeometry([seatWidth * .8, .53, .13]), seatMat, seatPositions([0, .84, -.13]), 'cabin');
    addInstances(roundedGeometry([seatWidth * .61, .14, .085]), seatInset, seatPositions([0, 1.15, -.18]), 'cabin');
    addInstances(roundedGeometry([seatWidth * .9, .055, .5]), trimMat, seatPositions([0, .31, .02]), 'cabin');
    for (const arm of [-1, 1]) addInstances(boxGeometry([.055, .12, .45]), trimMat, seatPositions([arm * seatWidth * .44, .62, .04]), 'cabin');
    addInstances(boxGeometry([.11, .24, .09]), trimMat, seatPositions([0, .28, -.12]), 'cabin');
    const readingPositions = seats.flatMap(([x, z]) => [-1, 1].map((arm) => [x + arm * seatWidth * .43, 1.18, z - .1] as [number, number, number]));
    addInstances(boxGeometry([.035, .045, .12]), readingMat, readingPositions, 'reading');

    // Independent illustrative zone fixtures and software light sources.
    const fixtureSpecs: Record<ZoneId, { position: [number, number, number]; strip: [number, number, number]; count?: number }> = {
      ceiling: { position: [0, config.ceilingHeightMeters - .18, 0], strip: [.07, .035, config.lengthMeters * .86] },
      windows: { position: [0, config.ceilingHeightMeters * .54, 0], strip: [.035, .025, config.lengthMeters * .84] },
      sidewalls: { position: [0, config.ceilingHeightMeters * .35, 0], strip: [.05, .03, config.lengthMeters * .84] },
      footwell: { position: [0, .22, 0], strip: [.055, .035, config.lengthMeters * .86] },
      reading: { position: [0, config.ceilingHeightMeters * .53, 0], strip: [.04, .025, config.lengthMeters * .82], count: Math.min(config.seatRows, 14) },
      entry: { position: [0, config.ceilingHeightMeters * .72, -config.lengthMeters * .48], strip: [config.widthMeters * .55, .04, .06] },
      monuments: { position: [0, config.ceilingHeightMeters * .72, -config.lengthMeters * .4], strip: [config.widthMeters * .65, .05, .05] },
      toilet: { position: [0, config.ceilingHeightMeters * .6, -config.lengthMeters * .47], strip: [.55, .04, .06] },
      handrail: { position: [0, .86, 0], strip: [.025, .025, config.lengthMeters * .82] },
      trolley: { position: [0, 1.15, config.lengthMeters * .37], strip: [.7, .04, .08] },
      cabin: { position: [0, 1.45, 0], strip: [.025, .025, config.lengthMeters * .7] },
    };
    for (const [id, spec] of Object.entries(fixtureSpecs) as [ZoneId, typeof fixtureSpecs[ZoneId]][]) {
      const members: THREE.MeshStandardMaterial[] = [];
      const sourceMaterial = new THREE.MeshStandardMaterial({ color: '#111b25', emissive: '#000000', emissiveIntensity: .4, roughness: .35 }); members.push(sourceMaterial);
      if (id === 'windows' || id === 'sidewalls' || id === 'ceiling') {
        const x = id === 'ceiling' ? config.widthMeters * .23 : config.widthMeters / 2 - .28;
        for (const side of [-1, 1]) addBox(scene, spec.strip, [side * x, spec.position[1], 0], sourceMaterial, id, false);
      } else {
        const fixtures = spec.count ?? 1;
        for (let i = 0; i < fixtures; i++) {
          const z = spec.count ? -config.lengthMeters / 2 + (i + .5) * config.lengthMeters / fixtures : spec.position[2];
          const mesh = addBox(scene, spec.strip, [spec.position[0], spec.position[1], z], sourceMaterial, id, false);
          mesh.userData.zoneId = id;
        }
      }
      const fixturePositions: [number, number, number][] = ['windows', 'sidewalls'].includes(id)
        ? [-1, 1].map((side) => [side * (config.widthMeters / 2 - .32), spec.position[1], 0] as [number, number, number])
        : id === 'ceiling'
          ? [-1, 1].map((side) => [side * (config.widthMeters * .23), config.ceilingHeightMeters - .3, 0] as [number, number, number])
          : [spec.position];
      const zoneLights = fixturePositions.map((position) => {
        const light = new THREE.PointLight('#ffffff', 0, id === 'cabin' ? config.lengthMeters * .9 : config.lengthMeters * .38, 2);
        light.position.set(...position); scene.add(light); return light;
      });
      lights.set(id, zoneLights);
      zoneMaterials.set(id, members);
    }
    // Generic reference bulkheads and monuments. These are not aircraft-fit geometry.
    addBox(scene, [config.widthMeters * .88, config.ceilingHeightMeters * .74, .16], [0, config.ceilingHeightMeters * .37, -config.lengthMeters * .5 + .08], mat('#718092', .7), 'entry');
    addBox(scene, [.9, config.ceilingHeightMeters * .55, .85], [-config.widthMeters * .28, config.ceilingHeightMeters * .275, -config.lengthMeters * .42], mat('#566678', .5), 'monuments');
    addBox(scene, [.9, config.ceilingHeightMeters * .55, .85], [config.widthMeters * .28, config.ceilingHeightMeters * .275, -config.lengthMeters * .42], mat('#566678', .5), 'toilet');
    // Procedural lavatory vignette guided by the supplied vanity reference. All
    // dimensions and fittings below are illustrative, not sourced cabin equipment.
    const lavZ = -config.lengthMeters * .42;
    const vanityX = config.widthMeters * .28;
    const vanityY = config.ceilingHeightMeters * .49;
    const vanityBody = mat('#9aa8bb', .32, .12);
    const vanityFace = mat('#dce7f4', .25, .08);
    const mirrorMat = new THREE.MeshPhysicalMaterial({ color: '#b9d7ed', roughness: .12, metalness: .32, emissive: '#142d45', emissiveIntensity: .14 });
    addBox(scene, [.76, .07, .38], [vanityX, vanityY, lavZ - .33], vanityFace, 'toilet');
    addBox(scene, [.72, .48, .34], [vanityX, vanityY - .27, lavZ - .32], vanityBody, 'toilet');
    // Shallow inset bowl, rim, and tap.
    addBox(scene, [.38, .045, .24], [vanityX, vanityY + .035, lavZ - .34], mat('#75879b', .24, .1), 'toilet');
    addBox(scene, [.055, .15, .055], [vanityX, vanityY + .12, lavZ - .46], trimMat, 'toilet');
    addBox(scene, [.09, .035, .06], [vanityX, vanityY + .18, lavZ - .46], trimMat, 'toilet');
    // Mirror above the vanity with a narrow lit frame.
    addBox(scene, [.52, .42, .035], [vanityX, vanityY + .47, lavZ - .47], mirrorMat, 'toilet', false);
    addBox(scene, [.56, .025, .045], [vanityX, vanityY + .69, lavZ - .47], ledLensMat, 'toilet', false);
    // Compact toilet and lid on the opposite side of the illustrative enclosure.
    const toiletX = vanityX - .45;
    addBox(scene, [.43, .08, .44], [toiletX, .43, lavZ + .03], vanityFace, 'toilet');
    addBox(scene, [.38, .39, .38], [toiletX, .23, lavZ + .03], vanityBody, 'toilet');
    addBox(scene, [.24, .24, .04], [toiletX, .79, lavZ + .25], vanityFace, 'toilet');
    addBox(scene, [.16, .8, 1.1], [0, .4, config.lengthMeters * .41], mat('#526275', .55), 'trolley');

    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
    let pendingFrame: number | null = null;
    const draw = () => renderer.render(scene, camera);
    const requestDraw = () => {
      if (pendingFrame !== null) return;
      pendingFrame = requestAnimationFrame(() => { pendingFrame = null; if (api.current) draw(); });
    };
    const onPick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(selectable, false)[0];
      const id = hit?.object.userData.zoneId as ZoneId | undefined;
      if (id) onSelect(id);
      requestDraw();
    };
    const canvas = renderer.domElement; canvas.addEventListener('dblclick', onPick);
    cameraResetRef.current = () => { camera.position.copy(cameraHome); camera.rotation.set(0, 0, 0); requestDraw(); setHelp('Camera returned to the cabin entry view.'); };
    let dragging = false; let lastX = 0; let lastY = 0; let yaw = 0; let pitchAngle = 0;
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.focus(); canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      yaw -= (e.clientX - lastX) * .004; pitchAngle = THREE.MathUtils.clamp(pitchAngle - (e.clientY - lastY) * .003, -1.05, 1.05); lastX = e.clientX; lastY = e.clientY;
      camera.rotation.order = 'YXZ'; camera.rotation.set(pitchAngle, yaw, 0);
      requestDraw();
    };
    const up = () => { dragging = false; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); camera.position.addScaledVector(forward, THREE.MathUtils.clamp(-e.deltaY * .003, -1.2, 1.2)); camera.position.x = THREE.MathUtils.clamp(camera.position.x, -config.widthMeters / 2 + .3, config.widthMeters / 2 - .3); camera.position.z = THREE.MathUtils.clamp(camera.position.z, -config.lengthMeters / 2 + .55, config.lengthMeters / 2 - .55); requestDraw(); };
    const keys = new Set<string>();
    const keyDown = (e: KeyboardEvent) => { if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); keys.add(e.key.toLowerCase()); if (pendingFrame === null) pendingFrame = requestAnimationFrame(animateMovement); } };
    const keyUp = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); if (!keys.size) requestDraw(); };
    const onBlur = () => { keys.clear(); requestDraw(); };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('wheel', wheel, { passive: false });
    canvas.addEventListener('keydown', keyDown); canvas.addEventListener('keyup', keyUp); window.addEventListener('blur', onBlur);
    const resize = new ResizeObserver(() => { const width = host.clientWidth; const height = host.clientHeight; if (width && height) { camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); requestDraw(); } });
    resize.observe(host);
    const animateMovement = () => {
      pendingFrame = null;
      const moveDir = new THREE.Vector3(Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')), 0, Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')));
      if (moveDir.lengthSq()) {
        moveDir.normalize().applyQuaternion(camera.quaternion); moveDir.y = 0; moveDir.normalize(); camera.position.addScaledVector(moveDir, .055);
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -config.widthMeters / 2 + .3, config.widthMeters / 2 - .3);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -config.lengthMeters / 2 + .55, config.lengthMeters / 2 - .55);
      }
      draw();
      if (keys.size) pendingFrame = requestAnimationFrame(animateMovement);
    };
    api.current = { renderer, scene, camera, lights, zoneMaterials, selectable, frame: 0, resize, cameraHome, draw };
    captureRef.current = async () => {
      const gl = renderer.getContext();
      const maxRenderbufferSize = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
      if (!canRenderExport(maxRenderbufferSize, CABIN_EXPORT_4K.width, CABIN_EXPORT_4K.height)) {
        throw new Error(`This device supports a maximum renderbuffer edge of ${maxRenderbufferSize}px; the 4K export requires ${CABIN_EXPORT_4K.width} × ${CABIN_EXPORT_4K.height}.`);
      }
      const size = renderer.getSize(new THREE.Vector2()); const ratio = renderer.getPixelRatio();
      try {
        renderer.setPixelRatio(1); renderer.setSize(CABIN_EXPORT_4K.width, CABIN_EXPORT_4K.height, false);
        if (gl.drawingBufferWidth !== CABIN_EXPORT_4K.width || gl.drawingBufferHeight !== CABIN_EXPORT_4K.height) {
          throw new Error(`The browser allocated ${gl.drawingBufferWidth} × ${gl.drawingBufferHeight}; 4K capture was not started.`);
        }
        renderer.render(scene, camera);
        const blob = await new Promise<Blob>((resolve, reject) => renderer.domElement.toBlob((value) => value ? resolve(value) : reject(new Error('4K image encoding failed.'))));
        return blob;
      } finally {
        renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false); renderer.render(scene, camera);
      }
    };
    requestDraw();
    setError('');
    return () => {
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame); resize.disconnect();
      canvas.removeEventListener('dblclick', onPick); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('keydown', keyDown); canvas.removeEventListener('keyup', keyUp); window.removeEventListener('blur', onBlur);
      const cachedGeometries = new Set(boxGeometryCache.values());
      const allCachedGeometries = new Set<THREE.BufferGeometry>([...cachedGeometries, ...roundedGeometryCache.values()]);
      scene.traverse((object) => { if (object instanceof THREE.Mesh && !allCachedGeometries.has(object.geometry)) object.geometry.dispose(); });
      boxGeometryCache.forEach((geometry) => geometry.dispose());
      roundedGeometryCache.forEach((geometry) => geometry.dispose());
      boxGeometryCache.clear();
      roundedGeometryCache.clear();
      const disposed = new Set<THREE.Material>();
      scene.traverse((object) => { if (object instanceof THREE.Mesh) { const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => disposed.add(material)); } });
      disposed.forEach((material) => material.dispose());
      renderer.dispose(); renderer.domElement.remove(); api.current = null;
      captureRef.current = null;
      cameraResetRef.current = null;
    };
  }, [config]);

  useEffect(() => {
    const current = api.current;
    if (!current) return;
    for (const zone of zones) {
      const color = sRGB(effective[zone.id]);
      const level = previewLightLevel(effective[zone.id], intensity);
      for (const light of current.lights.get(zone.id) ?? []) { light.color.copy(color); light.intensity = level * (zone.id === 'cabin' ? 18 : 12); }
      for (const material of current.zoneMaterials.get(zone.id) ?? []) { material.emissive.copy(color); material.emissiveIntensity = .15 + level * 1.8; }
    }
    if (previewMotion) {
      motionHome.current ??= { position: current.camera.position.clone(), rotation: current.camera.rotation.clone() };
      const phase = previewDuration > 0 ? previewTime / previewDuration * Math.PI * 2 : 0;
      current.camera.position.copy(motionHome.current.position);
      current.camera.position.x += Math.sin(phase) * .14;
      current.camera.position.y += Math.sin(phase * .5) * .025;
      current.camera.rotation.copy(motionHome.current.rotation);
      current.camera.rotation.y += Math.sin(phase) * .008;
    } else if (motionHome.current) {
      current.camera.position.copy(motionHome.current.position);
      current.camera.rotation.copy(motionHome.current.rotation);
      motionHome.current = null;
    }
    current.draw();
  }, [zones, effective, intensity, previewMotion, previewTime, previewDuration]);

  useEffect(() => {
    const current = api.current;
    if (!current) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, previewActive ? 1 : highQuality ? 2 : 1.35);
    if (current.renderer.getPixelRatio() !== pixelRatio) {
      current.renderer.setPixelRatio(pixelRatio);
      const size = current.renderer.getSize(new THREE.Vector2());
      current.renderer.setSize(size.x, size.y, false);
    }
    current.renderer.shadowMap.enabled = highQuality && !previewActive;
    current.draw();
  }, [highQuality, previewActive]);

  useEffect(() => {
    const current = api.current; if (!current) return;
    current.selectable.forEach((object) => { object.userData.selected = object.userData.zoneId === selected; });
    current.draw();
  }, [selected]);

  const activeLayout = CABIN_LAYOUTS[config.layoutId];
  const renderedSeatCount = 'seatCount' in activeLayout
    ? activeLayout.seatCount
    : config.seatRows * CABIN_LAYOUTS[config.layoutId].groups.reduce((sum, count) => sum + count, 0);
  return <div className="cabin3d-root" data-cabin-layout={config.layoutId} data-rendered-seat-count={renderedSeatCount}>
    <div ref={canvasHost} className="cabin3d-canvas" onClick={() => setHelp('Drag to look · WASD to move · double-click a fixture to select its zone')} />
    <div className="cabin3d-badge"><i /> CONFIGURABLE REFERENCE CABIN <span>· {CABIN_LAYOUTS[config.layoutId].name} · Not an aircraft-specific fit</span></div>
    {error && <div className="cabin3d-error" role="alert">{error}</div>}
    <span className="visually-hidden" aria-live="polite">{help}</span>
  </div>;
}

