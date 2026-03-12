import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const TAU = Math.PI * 2;
const FULL_TIMER_MINUTES = 60;
const FULL_TIMER_SECONDS = FULL_TIMER_MINUTES * 60;
const DISPLAY_SWEEP_DEG = 330;
const DISPLAY_SWEEP_RAD = THREE.MathUtils.degToRad(DISPLAY_SWEEP_DEG);
const DISPLAY_START_DEG = 90 - DISPLAY_SWEEP_DEG;
const DISPLAY_END_DEG = 90;
const CURVE_SEGMENTS = 160;
const RADIAL_SEGMENTS = 192;
const DISPLAY_OUTER_RADIUS = 128;
const DISPLAY_INNER_RADIUS = 12;
const DISPLAY_SLIT_WIDTH = 4.2;
const DISPLAY_RETURN_WIDTH_DEG = 3.4;
const AXON_VIEW_SIZE = 620;
const LINE_COLOR = 0x111111;

const state = {
  setMinutes: FULL_TIMER_MINUTES,
  remainingSeconds: FULL_TIMER_SECONDS,
  running: false,
  explodeTarget: 0,
  speedMultiplier: 60,
  view: "assembly",
  sidebarHidden: false,
};

const motion = {
  explode: 0,
  progress: 1,
  knobAngle: 0,
};

const defaultSelection = {
  name: "No part selected",
  role: "Click a visible piece in the 3D assembly to highlight it and inspect its role.",
  system: "Selection: none",
};

const ui = {
  appRoot: document.querySelector("#app"),
  timerRange: document.querySelector("#timer-range"),
  explodeRange: document.querySelector("#explode-range"),
  speedRange: document.querySelector("#speed-range"),
  timerSettingOutput: document.querySelector("#timer-setting-output"),
  explodeOutput: document.querySelector("#explode-output"),
  speedOutput: document.querySelector("#speed-output"),
  remainingOutput: document.querySelector("#remaining-output"),
  statusOutput: document.querySelector("#status-output"),
  startButton: document.querySelector("#start-button"),
  pauseButton: document.querySelector("#pause-button"),
  resetButton: document.querySelector("#reset-button"),
  selectedName: document.querySelector("#selected-name"),
  selectedRole: document.querySelector("#selected-role"),
  selectedGroup: document.querySelector("#selected-group"),
  assemblyViewButton: document.querySelector("#assembly-view-button"),
  componentsViewButton: document.querySelector("#components-view-button"),
  assemblyView: document.querySelector("#assembly-view"),
  componentsView: document.querySelector("#components-view"),
  panelToggleButton: document.querySelector("#panel-toggle-button"),
  catalogGrid: document.querySelector("#catalog-grid"),
  canvas: document.querySelector("#scene"),
};

const renderer = new THREE.WebGLRenderer({
  canvas: ui.canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
renderer.setSize(ui.canvas.clientWidth, ui.canvas.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0xffffff, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2400);
camera.position.set(480, -520, 420);
camera.zoom = 1.14;

const controls = new OrbitControls(camera, ui.canvas);
controls.enableDamping = true;
controls.target.set(0, 0, -18);
controls.minZoom = 0.72;
controls.maxZoom = 2.35;
controls.maxPolarAngle = Math.PI * 0.49;

scene.add(new THREE.AmbientLight(0xf5efe4, 1.8));

const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(420, -380, 520);
scene.add(sun);

const fill = new THREE.DirectionalLight(0xdbe6ed, 1.15);
fill.position.set(-260, 300, 180);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffe1ba, 0.85);
rim.position.set(0, -520, 120);
scene.add(rim);

const clockRoot = new THREE.Group();
scene.add(clockRoot);

const placements = [];
const animators = {};
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerDown = new THREE.Vector2();
const highlightState = new WeakMap();
const componentCards = [];
let selectedPart = null;
let activeComponentCard = null;
let componentObserver = null;
let previewRenderer = null;
let liveComponentRenderer = null;
let liveComponentCanvas = null;

const partCatalog = {
  frontLens: {
    name: "Front Lens",
    role: "Protective transparent cover over the timer face that keeps the front surface clean and readable.",
    system: "Front display",
  },
  frontBezelShell: {
    name: "Front Bezel Shell",
    role: "Front housing ring that seats the lens, defines the main opening, and joins the clock body to the rear shell.",
    system: "Front display",
  },
  faceMask: {
    name: "Dial Face",
    role: "Fixed white top dial with a narrow slit. The red timer sheet passes under this face, emerges through the slit, and rides back over the dial.",
    system: "Front display",
  },
  visualDisk: {
    name: "Red Slit Disk",
    role: "Red timing disk stored beneath the dial. A portion threads through the slit and lies on top, creating the visible countdown field.",
    system: "Display drive",
  },
  diskHub: {
    name: "Disk Carrier Hub",
    role: "Couples the visual disk to the driven shaft so the display rotates as the mechanism advances.",
    system: "Display drive",
  },
  knob: {
    name: "Central Knob",
    role: "Manual user control used to set the timer directly from the front of the product.",
    system: "User input",
  },
  knobShaft: {
    name: "Knob Shaft",
    role: "Transfers rotation from the front knob into the encoder or sensing module behind the face.",
    system: "User input",
  },
  supportPlate: {
    name: "Front Support Plate",
    role: "Primary internal chassis that carries the bearing, posts, electronics standoffs, and mechanism mounts.",
    system: "Structure",
  },
  outputShaft: {
    name: "Main Output Shaft",
    role: "Central rotating shaft that connects the reduction train to the disk hub.",
    system: "Mechanism",
  },
  outputGear: {
    name: "Output Gear",
    role: "Final reduction gear that turns the main shaft and determines the visible timer motion.",
    system: "Mechanism",
  },
  idlerGearB: {
    name: "Intermediate Gear B",
    role: "Transfer gear in the reduction train that steps torque and speed down between stages.",
    system: "Mechanism",
  },
  idlerGearA: {
    name: "Intermediate Gear A",
    role: "Intermediate reduction stage between the motor pinion and the final output gear.",
    system: "Mechanism",
  },
  motorPinion: {
    name: "Motor Pinion",
    role: "Small first-stage gear mounted to the motor shaft that starts the reduction train.",
    system: "Mechanism",
  },
  motorBracket: {
    name: "Motor Bracket",
    role: "Structural bracket that fixes the stepper motor to the internal chassis at the correct gear mesh position.",
    system: "Mechanism",
  },
  motorBody: {
    name: "Stepper Motor",
    role: "Drive motor that advances the timer automatically under electronic control.",
    system: "Mechanism",
  },
  encoder: {
    name: "Encoder Module",
    role: "Input sensing module that detects manual knob rotation and sends that setting to the electronics.",
    system: "User input",
  },
  pcb: {
    name: "Main PCB",
    role: "Control electronics board carrying logic, radio, regulation, and connectors for the timer system.",
    system: "Electronics",
  },
  buzzer: {
    name: "Piezo Buzzer",
    role: "Audio indicator used to signal timer completion or state changes.",
    system: "Electronics",
  },
  ledRing: {
    name: "LED Ring Diffuser",
    role: "Optional light guide element for subtle status illumination around the center region.",
    system: "Front display",
  },
  powerModule: {
    name: "Power Module",
    role: "Side power interface zone representing USB-C or power-conditioning hardware near the housing edge.",
    system: "Electronics",
  },
  rearShell: {
    name: "Rear Housing Shell",
    role: "Back enclosure that closes the assembly, carries internal ribs and posts, and provides the wall-facing volume.",
    system: "Rear enclosure",
  },
  wallBracket: {
    name: "Wall Mount Bracket",
    role: "Separate rear mounting piece that lets the product hang securely on the wall.",
    system: "Rear enclosure",
  },
};

const componentOrder = [
  "frontLens",
  "frontBezelShell",
  "faceMask",
  "visualDisk",
  "diskHub",
  "knob",
  "knobShaft",
  "supportPlate",
  "outputShaft",
  "outputGear",
  "idlerGearB",
  "idlerGearA",
  "motorPinion",
  "motorBracket",
  "motorBody",
  "encoder",
  "pcb",
  "buzzer",
  "ledRing",
  "powerModule",
  "rearShell",
  "wallBracket",
];

const componentSpecs = {
  frontLens: {
    size: "332 mm OD x 2 mm",
    material: "Clear acrylic / polycarbonate lens",
    connectedTo: "Front bezel shell",
  },
  frontBezelShell: {
    size: "340 mm OD x 12 mm depth",
    material: "Injection-molded ABS or PC-ABS shell",
    connectedTo: "Front lens, face mask, rear shell",
  },
  faceMask: {
    size: "290 mm OD x 1.8 mm",
    material: "White dial plate with slit cutout",
    connectedTo: "Front bezel shell, visual disk, knob shaft",
  },
  visualDisk: {
    size: "256 mm display field x layered sheet stack",
    material: "Red polymer timing disk / sheet",
    connectedTo: "Dial face slit, carrier hub, output shaft",
  },
  diskHub: {
    size: "30 mm flange x 9 mm body",
    material: "Molded polymer or machined hub",
    connectedTo: "Visual disk, output shaft",
  },
  knob: {
    size: "40 mm OD x 18 mm depth",
    material: "ABS/PC front control knob",
    connectedTo: "Knob shaft",
  },
  knobShaft: {
    size: "6 mm OD x 30 mm length",
    material: "Steel or acetal shaft",
    connectedTo: "Central knob, encoder module",
  },
  supportPlate: {
    size: "240 mm OD x 3 mm",
    material: "Molded or stamped structural chassis",
    connectedTo: "Housing bosses, motor bracket, PCB, output shaft",
  },
  outputShaft: {
    size: "4 mm OD x 28 mm length",
    material: "Steel shaft",
    connectedTo: "Output gear, disk carrier hub",
  },
  outputGear: {
    size: "58 mm OD x 5 mm",
    material: "Molded acetal reduction gear",
    connectedTo: "Output shaft, intermediate gear B",
  },
  idlerGearB: {
    size: "26 mm OD x 4 mm",
    material: "Molded acetal reduction gear",
    connectedTo: "Intermediate gear A, output gear",
  },
  idlerGearA: {
    size: "18 mm OD x 4 mm",
    material: "Molded acetal reduction gear",
    connectedTo: "Motor pinion, intermediate gear B",
  },
  motorPinion: {
    size: "10 mm OD x 4 mm",
    material: "Pinion gear on motor shaft",
    connectedTo: "Stepper motor shaft, intermediate gear A",
  },
  motorBracket: {
    size: "60 x 52 mm bracket body",
    material: "Bent sheet steel or molded mount",
    connectedTo: "Support plate, stepper motor",
  },
  motorBody: {
    size: "42 mm dia x 20 mm depth",
    material: "Compact stepper motor body",
    connectedTo: "Motor bracket, motor pinion",
  },
  encoder: {
    size: "24 x 16 x 10 mm sensing module",
    material: "Encoder body with metal barrel",
    connectedTo: "Knob shaft, main PCB",
  },
  pcb: {
    size: "145 mm OD x 1.6 mm",
    material: "FR-4 control board",
    connectedTo: "Encoder, buzzer, power module, standoffs",
  },
  buzzer: {
    size: "24 mm dia x 6 mm",
    material: "Piezoelectric buzzer can",
    connectedTo: "Main PCB",
  },
  ledRing: {
    size: "220 / 206 mm ring x 1.5 mm",
    material: "Diffuser ring / light guide",
    connectedTo: "Dial face stack, support structure",
  },
  powerModule: {
    size: "26 x 18 x 10 mm",
    material: "Power daughterboard and connector block",
    connectedTo: "Main PCB, rear shell side opening",
  },
  rearShell: {
    size: "340 mm OD x 26 mm depth",
    material: "Injection-molded rear housing",
    connectedTo: "Front bezel shell, wall bracket, internal posts",
  },
  wallBracket: {
    size: "70 x 26 x 2 mm",
    material: "Stamped steel or molded hanger",
    connectedTo: "Rear shell, wall fastener",
  },
};

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

function degToRad(angle) {
  return THREE.MathUtils.degToRad(angle);
}

function makeShapeCircle(radius) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, TAU, false);
  return shape;
}

function makeCircularPath(radius) {
  const path = new THREE.Path();
  path.absarc(0, 0, radius, 0, TAU, true);
  return path;
}

function makeAnnularSectorShape(innerRadius, outerRadius, startDeg, endDeg, segments = CURVE_SEGMENTS) {
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const angle = degToRad(startDeg + (endDeg - startDeg) * t);
    points.push(new THREE.Vector2(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius));
  }
  for (let i = segments; i >= 0; i -= 1) {
    const t = i / segments;
    const angle = degToRad(startDeg + (endDeg - startDeg) * t);
    points.push(new THREE.Vector2(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius));
  }
  const shape = new THREE.Shape(points);
  shape.closePath();
  return shape;
}

function extrudeShape(shape, depth, curveSegments = CURVE_SEGMENTS) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function roundedRectShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function monochromeColor(color) {
  const source = new THREE.Color(color);
  const luminance = source.r * 0.299 + source.g * 0.587 + source.b * 0.114;
  const value = THREE.MathUtils.lerp(0.22, 0.98, luminance);
  return new THREE.Color(value, value, value);
}

function ringMaterial(color, extra = {}) {
  const { preserveColor = false, ...materialOptions } = extra;
  return new THREE.MeshBasicMaterial({
    color: preserveColor ? new THREE.Color(color) : monochromeColor(color),
    toneMapped: false,
    ...materialOptions,
  });
}

function buildEdgeLines(geometry) {
  const edges = new THREE.EdgesGeometry(geometry, 22);
  return new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color: LINE_COLOR,
      transparent: true,
      opacity: 0.88,
      toneMapped: false,
    }),
  );
}

function attachEdgeOverlay(mesh) {
  if (!mesh.isMesh || mesh.userData.edgeOverlay) {
    return;
  }

  const edgeOverlay = buildEdgeLines(mesh.geometry);
  edgeOverlay.userData.isEdgeOverlay = true;
  edgeOverlay.raycast = () => null;
  edgeOverlay.renderOrder = 3;
  mesh.renderOrder = 1;
  if (Array.isArray(mesh.material)) {
    for (const material of mesh.material) {
      material.polygonOffset = true;
      material.polygonOffsetFactor = 1;
      material.polygonOffsetUnits = 1;
    }
  } else if (mesh.material) {
    mesh.material.polygonOffset = true;
    mesh.material.polygonOffsetFactor = 1;
    mesh.material.polygonOffsetUnits = 1;
  }
  mesh.userData.edgeOverlay = edgeOverlay;
  mesh.add(edgeOverlay);
}

function refreshEdgeOverlay(mesh) {
  if (!mesh?.userData?.edgeOverlay) {
    return;
  }

  const { edgeOverlay } = mesh.userData;
  edgeOverlay.geometry.dispose();
  edgeOverlay.geometry = new THREE.EdgesGeometry(mesh.geometry, 22);
}

function markSelectable(root, partInfo) {
  root.userData.partInfo = partInfo;
  root.traverse((child) => {
    child.userData.partRoot = root;
  });
}

function addPlacement(object, assembled, exploded, partInfo) {
  placements.push({
    object,
    assembled: assembled.clone(),
    exploded: exploded.clone(),
  });
  object.traverse((child) => {
    if (child.isMesh) {
      attachEdgeOverlay(child);
    }
  });
  if (partInfo) {
    markSelectable(object, partInfo);
  }
  clockRoot.add(object);
  return object;
}

function createRing(outerRadius, innerRadius, depth, material) {
  const shape = makeShapeCircle(outerRadius);
  shape.holes.push(makeCircularPath(innerRadius));
  return new THREE.Mesh(extrudeShape(shape, depth), material);
}

function makeAnnulusShape(innerRadius, outerRadius) {
  const shape = makeShapeCircle(outerRadius);
  shape.holes.push(makeCircularPath(innerRadius));
  return shape;
}

function makeCylinderGeometry(radiusTop, radiusBottom, depth, radialSegments = RADIAL_SEGMENTS) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, depth, radialSegments);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function createDisk(radius, depth, material) {
  return new THREE.Mesh(makeCylinderGeometry(radius, radius, depth), material);
}

function createBoss(diameter, height, material, holeDiameter = 0) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(makeCylinderGeometry(diameter / 2, diameter / 2, height, 36), material));
  if (holeDiameter > 0) {
    const recess = new THREE.Mesh(
      makeCylinderGeometry(holeDiameter / 2, holeDiameter / 2, height + 0.25, 24),
      ringMaterial(0x73787f),
    );
    group.add(recess);
  }
  return group;
}

function createFrontLens() {
  const group = new THREE.Group();
  const lensMaterial = ringMaterial(0xfdf8f0, {
    transparent: true,
    opacity: 0.22,
  });
  const main = createRing(166, 22, 2, lensMaterial);
  const lip = createRing(163, 160, 0.85, ringMaterial(0xffffff, { transparent: true, opacity: 0.12 }));
  lip.position.z = -1.15;
  group.add(main, lip);
  return group;
}

function createFrontBezelShell() {
  const group = new THREE.Group();
  const shellMaterial = ringMaterial(0xf3f0ea);
  const flange = createRing(170, 135, 3.6, shellMaterial);
  flange.position.z = 4.2;
  const wall = createRing(166.2, 160.2, 8.4, shellMaterial);
  wall.position.z = -1.8;
  const innerWall = createRing(139, 135, 9.8, shellMaterial);
  innerWall.position.z = -0.4;
  const lensSeat = createRing(164.4, 160.8, 1.2, ringMaterial(0xe7e3dc));
  lensSeat.position.z = 2.4;

  group.add(flange, wall, innerWall, lensSeat);

  for (const angle of [45, 135, 225, 315]) {
    const boss = createBoss(10, 8, shellMaterial, 3.2);
    boss.position.set(Math.cos(degToRad(angle)) * 146, Math.sin(degToRad(angle)) * 146, -5.2);
    group.add(boss);
  }

  return group;
}

function createFaceMask() {
  const shape = makeShapeCircle(145);
  shape.holes.push(makeCircularPath(9));

  const slit = new THREE.Path();
  slit.moveTo(-DISPLAY_SLIT_WIDTH / 2, 9);
  slit.lineTo(DISPLAY_SLIT_WIDTH / 2, 9);
  slit.lineTo(DISPLAY_SLIT_WIDTH / 2, 137);
  slit.absarc(0, 137, DISPLAY_SLIT_WIDTH / 2, 0, Math.PI, false);
  slit.lineTo(-DISPLAY_SLIT_WIDTH / 2, 9);
  slit.closePath();
  shape.holes.push(slit);

  return new THREE.Mesh(extrudeShape(shape, 1.8), ringMaterial(0xf6f3ed));
}

function createVisualDiskAssembly(registerAnimators = true) {
  const group = new THREE.Group();
  const hiddenDisk = createRing(
    DISPLAY_OUTER_RADIUS,
    DISPLAY_INNER_RADIUS,
    1,
    ringMaterial(0xc44f46, { preserveColor: true }),
  );
  hiddenDisk.position.z = -1.55;
  group.add(hiddenDisk);

  const slitRibbon = new THREE.Mesh(
    new THREE.BoxGeometry(DISPLAY_SLIT_WIDTH * 0.76, 128, 0.7),
    ringMaterial(0xc65047, { preserveColor: true }),
  );
  slitRibbon.position.set(0, 73, 0.56);
  group.add(slitRibbon);

  const overFaceSector = new THREE.Mesh(
    extrudeShape(
      makeAnnularSectorShape(
        DISPLAY_INNER_RADIUS,
        DISPLAY_OUTER_RADIUS,
        DISPLAY_START_DEG,
        DISPLAY_END_DEG,
      ),
      0.72,
    ),
    ringMaterial(0xce554b, { preserveColor: true }),
  );
  overFaceSector.position.z = 1.34;
  group.add(overFaceSector);

  const returnEdge = new THREE.Group();
  returnEdge.position.z = 1.22;
  const returnTop = new THREE.Mesh(
    new THREE.BoxGeometry(DISPLAY_SLIT_WIDTH * 0.95, 26, 0.72),
    ringMaterial(0xb8463f, { preserveColor: true }),
  );
  returnTop.position.y = DISPLAY_INNER_RADIUS + 13;
  const returnDrop = new THREE.Mesh(
    new THREE.BoxGeometry(DISPLAY_SLIT_WIDTH * 0.76, 20, 1.55),
    ringMaterial(0xa53f38, { preserveColor: true }),
  );
  returnDrop.position.set(0, DISPLAY_INNER_RADIUS + 10, -0.08);
  returnEdge.add(returnTop, returnDrop);
  group.add(returnEdge);

  if (registerAnimators) {
    animators.hiddenDisk = hiddenDisk;
    animators.overFaceSector = overFaceSector;
    animators.slitRibbon = slitRibbon;
    animators.returnEdge = returnEdge;
  }
  return group;
}

function createDiskCarrierHub() {
  const group = new THREE.Group();
  const material = ringMaterial(0x878b91);
  const flange = createDisk(15, 1.5, material);
  flange.position.z = -4.2;
  const body = createDisk(10, 9, material);
  body.position.z = 0.2;
  const collar = createDisk(6, 2.4, ringMaterial(0x75797f));
  collar.position.z = 5.2;
  group.add(flange, body, collar);
  return group;
}

function createCentralKnob() {
  const group = new THREE.Group();
  const material = ringMaterial(0xf1ede7);
  const core = createDisk(18, 12, material);
  const frontCap = new THREE.Mesh(makeCylinderGeometry(20, 17, 5, 72), material);
  frontCap.position.z = 6.5;
  const backChamfer = new THREE.Mesh(makeCylinderGeometry(17, 20, 4, 72), material);
  backChamfer.position.z = -7;
  group.add(core, frontCap, backChamfer);
  return group;
}

function createKnobShaft() {
  const group = new THREE.Group();
  const shaft = createDisk(3, 30, ringMaterial(0x777b81));
  const collar = createDisk(4, 6, ringMaterial(0x666a70));
  collar.position.z = -12;
  group.add(shaft, collar);
  return group;
}

function createFrontSupportPlate() {
  const shape = makeShapeCircle(120);
  shape.holes.push(makeCircularPath(4.5));
  const cutoutRadius = 31;
  for (const angle of [45, 135, 225, 315]) {
    const radians = degToRad(angle);
    const cx = Math.cos(radians) * 72;
    const cy = Math.sin(radians) * 72;
    const cutout = new THREE.Path();
    cutout.absellipse(cx, cy, cutoutRadius * 1.55, cutoutRadius * 0.95, 0, TAU, true, degToRad(angle));
    shape.holes.push(cutout);
  }
  for (const angle of [45, 135, 225, 315]) {
    const hole = new THREE.Path();
    hole.absarc(Math.cos(degToRad(angle)) * 108, Math.sin(degToRad(angle)) * 108, 1.7, 0, TAU, true);
    shape.holes.push(hole);
  }

  const group = new THREE.Group();
  const plate = new THREE.Mesh(extrudeShape(shape, 3), ringMaterial(0xd7d9dc));
  group.add(plate);

  for (const angle of [45, 135, 225, 315]) {
    const boss = createBoss(12, 4, ringMaterial(0xd0d2d5), 3.2);
    boss.position.set(Math.cos(degToRad(angle)) * 108, Math.sin(degToRad(angle)) * 108, -1.5);
    group.add(boss);
  }

  for (const [x, y] of [
    [0, 0],
    [42, 0],
    [64, 0],
    [78, 0],
  ]) {
    const post = createBoss(x === 0 ? 8 : 6, 8, ringMaterial(0xbec2c8), x === 0 ? 4.2 : 3.2);
    post.position.set(x, y, -5);
    group.add(post);
  }

  for (const [x, y] of [
    [55, 55],
    [-55, 55],
    [-55, -55],
    [55, -55],
  ]) {
    const standoff = createBoss(7, 10, ringMaterial(0xc6c9ce), 3.2);
    standoff.position.set(x, y, -6.5);
    group.add(standoff);
  }

  return group;
}

function createOutputShaft() {
  const group = new THREE.Group();
  const shaft = createDisk(2, 28, ringMaterial(0x6f7379));
  const shoulder = createDisk(3, 4, ringMaterial(0x5c6066));
  shoulder.position.z = -6;
  const top = createDisk(2.75, 4, ringMaterial(0x5c6066));
  top.position.z = 12;
  group.add(shaft, shoulder, top);
  return group;
}

function createSimpleGear(outerDiameter, rootDiameter, thickness, toothCount, toothDepth, color) {
  const group = new THREE.Group();
  const root = createDisk(rootDiameter / 2, thickness, ringMaterial(color));
  group.add(root);

  const toothWidth = Math.max((outerDiameter * Math.PI / toothCount) * 0.38, toothDepth * 2.1);
  for (let i = 0; i < toothCount; i += 1) {
    const tooth = new THREE.Mesh(
      new THREE.BoxGeometry(toothDepth, toothWidth, thickness),
      ringMaterial(color),
    );
    const angle = (i / toothCount) * TAU;
    tooth.position.set(Math.cos(angle) * (rootDiameter / 2 + toothDepth / 2), Math.sin(angle) * (rootDiameter / 2 + toothDepth / 2), 0);
    tooth.rotation.z = angle;
    group.add(tooth);
  }

  return group;
}

function createMotorPinion() {
  const group = createSimpleGear(10, 7.6, 4, 10, 1.2, 0x6d7178);
  const hub = createDisk(4, 5, ringMaterial(0x5a5e65));
  group.add(hub);
  return group;
}

function createIdlerGearA() {
  const group = createSimpleGear(18, 15.4, 4, 12, 1.3, 0x80858c);
  group.add(createDisk(5, 5, ringMaterial(0x6e737a)));
  return group;
}

function createIdlerGearB() {
  const group = createSimpleGear(26, 22.8, 4, 16, 1.6, 0x858991);
  group.add(createDisk(6, 5, ringMaterial(0x71767d)));
  return group;
}

function createOutputGear() {
  const group = createSimpleGear(58, 53.8, 5, 28, 2.1, 0x8d9197);
  group.add(createDisk(9, 7, ringMaterial(0x777c83)));
  return group;
}

function createMotorBracket() {
  const group = new THREE.Group();
  const flangeGeo = extrudeShape(roundedRectShape(60, 18, 3), 2, 24);
  const plateGeo = extrudeShape(roundedRectShape(52, 52, 4), 2, 24);
  const material = ringMaterial(0xb6bac0);

  const flange = new THREE.Mesh(flangeGeo, material);
  const plate = new THREE.Mesh(plateGeo, material);
  flange.position.z = 1;
  plate.position.z = -10;
  group.add(flange, plate);

  const web1 = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 10), material);
  web1.position.set(-21, 0, -5);
  const web2 = web1.clone();
  web2.position.x = 21;
  group.add(web1, web2);

  return group;
}

function createStepperMotorBody() {
  const group = new THREE.Group();
  const body = createDisk(21, 20, ringMaterial(0x4b4f56));
  const tail = new THREE.Mesh(
    extrudeShape(roundedRectShape(30, 30, 3), 4, 24),
    ringMaterial(0x383c43),
  );
  tail.position.z = -12;
  const shaft = createDisk(2.5, 8, ringMaterial(0xc2c5ca));
  shaft.position.z = 14;
  group.add(body, tail, shaft);
  return group;
}

function createEncoderModule() {
  const group = new THREE.Group();
  const barrel = createDisk(7, 8, ringMaterial(0x767b82));
  const body = new THREE.Mesh(
    extrudeShape(roundedRectShape(24, 16, 2), 10, 12),
    ringMaterial(0x535861),
  );
  body.position.z = -8;
  group.add(barrel, body);
  return group;
}

function createMainPcb() {
  const shape = makeShapeCircle(72.5);
  shape.holes.push(makeCircularPath(9));
  for (const [x, y] of [
    [55, 55],
    [-55, 55],
    [-55, -55],
    [55, -55],
  ]) {
    const hole = new THREE.Path();
    hole.absarc(x, y, 1.7, 0, TAU, true);
    shape.holes.push(hole);
  }

  const group = new THREE.Group();
  const board = new THREE.Mesh(extrudeShape(shape, 1.6, 72), ringMaterial(0x245336));
  group.add(board);

  const componentMaterial = ringMaterial(0x2b3034);
  const radioMaterial = ringMaterial(0xc7d3dc);
  const regulatorMaterial = ringMaterial(0x43484e);

  const mcu = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 6), componentMaterial);
  mcu.position.set(0, 26, -3);
  const ble = new THREE.Mesh(new THREE.BoxGeometry(22, 16, 5), radioMaterial);
  ble.position.set(-30, 16, -2.6);
  const regulation = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 6), regulatorMaterial);
  regulation.position.set(30, -16, -3);
  const connector = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 7), componentMaterial);
  connector.position.set(52, 0, -3.5);

  group.add(mcu, ble, regulation, connector);
  return group;
}

function createPiezoBuzzer() {
  const group = new THREE.Group();
  const body = createDisk(12, 6, ringMaterial(0x2b2f34));
  const port = createDisk(3.5, 1.1, ringMaterial(0x565b63));
  port.position.z = 2.6;
  group.add(body, port);
  return group;
}

function createLedRing() {
  return createRing(110, 103, 1.5, ringMaterial(0xf3f0ea, { transparent: true, opacity: 0.42 }));
}

function createPowerModule() {
  const group = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(26, 18, 1.6), ringMaterial(0x294c34));
  const module = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 8), ringMaterial(0x2a2e33));
  module.position.z = -4.5;
  const usb = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 4), ringMaterial(0xc4c8ce));
  usb.position.set(10, 0, 0);
  group.add(board, module, usb);
  return group;
}

function createRearHousingShell() {
  const group = new THREE.Group();
  const material = ringMaterial(0xf2efe8);
  const wall = createRing(170, 164.4, 26, material);
  const backPlate = createDisk(170, 3.6, material);
  backPlate.position.z = -11.2;
  const innerRim = createRing(165, 150, 3.6, ringMaterial(0xe2ddd4));
  innerRim.position.z = 10.6;
  group.add(wall, backPlate, innerRim);

  for (const angle of [45, 135, 225, 315]) {
    const boss = createBoss(10, 18, material, 3.2);
    boss.position.set(Math.cos(degToRad(angle)) * 146, Math.sin(degToRad(angle)) * 146, 0);
    group.add(boss);
  }

  for (const angle of [0, 90, 180, 270]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(82, 5, 8), ringMaterial(0xe1dcd2));
    rib.position.set(Math.cos(degToRad(angle)) * 74, Math.sin(degToRad(angle)) * 74, -5.5);
    rib.rotation.z = degToRad(angle);
    group.add(rib);
  }

  const hanger = new THREE.Mesh(
    extrudeShape(roundedRectShape(42, 20, 4), 6, 18),
    ringMaterial(0xe5e0d7),
  );
  hanger.position.set(0, 122, -7);
  group.add(hanger);

  const portCutSuggestion = new THREE.Mesh(new THREE.BoxGeometry(16, 18, 12), ringMaterial(0x6f7379));
  portCutSuggestion.position.set(164, 0, 0);
  group.add(portCutSuggestion);

  return group;
}

function createWallMountBracket() {
  const shape = roundedRectShape(70, 26, 3);
  const keyhole = new THREE.Path();
  keyhole.absarc(0, 0, 4, 0, TAU, true);
  const slot = new THREE.Path();
  slot.moveTo(-2, -1);
  slot.lineTo(2, -1);
  slot.lineTo(2, 11);
  slot.lineTo(-2, 11);
  slot.closePath();
  shape.holes.push(keyhole, slot);
  const plate = new THREE.Mesh(extrudeShape(shape, 2, 18), ringMaterial(0x72777e));
  return plate;
}

const componentFactories = {
  frontLens: createFrontLens,
  frontBezelShell: createFrontBezelShell,
  faceMask: createFaceMask,
  visualDisk: () => createVisualDiskAssembly(false),
  diskHub: createDiskCarrierHub,
  knob: createCentralKnob,
  knobShaft: createKnobShaft,
  supportPlate: createFrontSupportPlate,
  outputShaft: createOutputShaft,
  outputGear: createOutputGear,
  idlerGearB: createIdlerGearB,
  idlerGearA: createIdlerGearA,
  motorPinion: createMotorPinion,
  motorBracket: createMotorBracket,
  motorBody: createStepperMotorBody,
  encoder: createEncoderModule,
  pcb: createMainPcb,
  buzzer: createPiezoBuzzer,
  ledRing: createLedRing,
  powerModule: createPowerModule,
  rearShell: createRearHousingShell,
  wallBracket: createWallMountBracket,
};

function createSpecsMarkup(specs) {
  return `
    <dl>
      <dt>Size</dt><dd>${specs.size}</dd>
      <dt>Material</dt><dd>${specs.material}</dd>
      <dt>Connected to</dt><dd>${specs.connectedTo}</dd>
    </dl>
  `;
}

function fitOrthoCameraToObject(camera, element, object, padding = 1.4) {
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const aspect = element.clientWidth / Math.max(element.clientHeight, 1);
  const viewSize = maxDim * padding;
  camera.left = (-viewSize * aspect) / 2;
  camera.right = (viewSize * aspect) / 2;
  camera.top = viewSize / 2;
  camera.bottom = -viewSize / 2;
  camera.near = 0.1;
  camera.far = 4000;
  camera.position.set(0, 0, maxDim * 3.2);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function createComponentCard(partKey) {
  const partInfo = partCatalog[partKey];
  const specs = componentSpecs[partKey];
  const card = document.createElement("article");
  card.className = "component-card";

  const viewport = document.createElement("div");
  viewport.className = "component-card__viewport";
  const preview = document.createElement("img");
  preview.className = "component-card__preview";
  preview.alt = `${partInfo.name} preview`;
  viewport.append(preview);
  const canvas = document.createElement("canvas");
  canvas.className = "component-card__canvas";
  card.append(viewport);

  const nameButton = document.createElement("button");
  nameButton.className = "component-card__name";
  nameButton.type = "button";
  nameButton.textContent = partInfo.name;
  nameButton.setAttribute("aria-label", `Specs for ${partInfo.name}`);
  card.append(nameButton);

  const tooltip = document.createElement("div");
  tooltip.className = "component-card__tooltip";
  tooltip.innerHTML = createSpecsMarkup(specs);
  card.append(tooltip);

  ui.catalogGrid.append(card);
  const cardState = {
    partKey,
    card,
    viewport,
    preview,
    canvas,
    scene: null,
    camera: null,
    object: null,
    renderer: null,
    width: 0,
    height: 0,
    dragging: false,
    previewReady: false,
  };
  viewport.addEventListener("pointerdown", (event) => {
    activateLiveComponent(cardState);
    activeComponentCard = cardState;
    cardState.dragging = true;
    viewport.classList.add("is-dragging");
    viewport.setPointerCapture(event.pointerId);
    cardState.pointerX = event.clientX;
    cardState.pointerY = event.clientY;
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!cardState.dragging || !cardState.object) {
      return;
    }

    const deltaX = event.clientX - cardState.pointerX;
    const deltaY = event.clientY - cardState.pointerY;
    cardState.pointerX = event.clientX;
    cardState.pointerY = event.clientY;
    cardState.object.rotation.y += deltaX * 0.012;
    cardState.object.rotation.x += deltaY * 0.008;
    cardState.object.rotation.x = THREE.MathUtils.clamp(cardState.object.rotation.x, -1.1, 1.1);
  });

  function endDrag(event) {
    if (cardState.dragging) {
      cardState.dragging = false;
      viewport.classList.remove("is-dragging");
    }
    if (event && viewport.hasPointerCapture?.(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  }

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("lostpointercapture", () => {
    cardState.dragging = false;
    viewport.classList.remove("is-dragging");
  });

  componentCards.push(cardState);
  return cardState;
}

function buildComponentScene(cardState) {
  if (cardState.scene) {
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);

  const partObject = componentFactories[cardState.partKey]();
  partObject.traverse((child) => {
    if (child.isMesh) {
      attachEdgeOverlay(child);
    }
  });

  const bounds = new THREE.Box3().setFromObject(partObject);
  const center = bounds.getCenter(new THREE.Vector3());
  partObject.position.sub(center);
  scene.add(partObject);
  partObject.rotation.x = -0.22;
  partObject.rotation.y = 0.32;
  cardState.scene = scene;
  cardState.camera = camera;
  cardState.object = partObject;
}

function syncComponentCardCamera(cardState) {
  const width = cardState.viewport.clientWidth;
  const height = cardState.viewport.clientHeight;
  if (!width || !height || (cardState.width === width && cardState.height === height)) {
    return;
  }

  cardState.width = width;
  cardState.height = height;
  fitOrthoCameraToObject(cardState.camera, cardState.viewport, cardState.object, 1.72);
}

function getPreviewRenderer() {
  if (!previewRenderer) {
    previewRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    previewRenderer.setPixelRatio(1);
    previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewRenderer.setClearColor(0xffffff, 1);
  }

  return previewRenderer;
}

function ensureComponentPreview(cardState) {
  if (cardState.previewReady) {
    return;
  }

  buildComponentScene(cardState);
  const renderer = getPreviewRenderer();
  const previewSize = 360;
  renderer.setSize(previewSize, previewSize, false);
  fitOrthoCameraToObject(
    cardState.camera,
    { clientWidth: previewSize, clientHeight: previewSize },
    cardState.object,
    1.72,
  );
  renderer.render(cardState.scene, cardState.camera);
  cardState.preview.src = renderer.domElement.toDataURL("image/png");
  cardState.previewReady = true;
}

function getLiveComponentRenderer() {
  if (!liveComponentRenderer) {
    liveComponentCanvas = document.createElement("canvas");
    liveComponentCanvas.className = "component-card__canvas";
    liveComponentRenderer = new THREE.WebGLRenderer({
      canvas: liveComponentCanvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    liveComponentRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    liveComponentRenderer.outputColorSpace = THREE.SRGBColorSpace;
    liveComponentRenderer.setClearColor(0xffffff, 1);
  }

  return liveComponentRenderer;
}

function activateLiveComponent(cardState) {
  ensureComponentPreview(cardState);
  if (activeComponentCard && activeComponentCard !== cardState) {
    deactivateLiveComponent(activeComponentCard);
  }

  const renderer = getLiveComponentRenderer();
  activeComponentCard = cardState;
  cardState.preview.style.opacity = "0";
  cardState.canvas.style.display = "block";
  if (liveComponentCanvas.parentElement !== cardState.viewport) {
    cardState.viewport.append(liveComponentCanvas);
  }
  const width = Math.max(1, Math.round(cardState.viewport.clientWidth));
  const height = Math.max(1, Math.round(cardState.viewport.clientHeight));
  renderer.setSize(width, height, false);
  cardState.width = 0;
  cardState.height = 0;
  syncComponentCardCamera(cardState);
  renderer.render(cardState.scene, cardState.camera);
}

function deactivateLiveComponent(cardState) {
  if (!cardState || activeComponentCard !== cardState) {
    return;
  }

  cardState.preview.style.opacity = "1";
  cardState.canvas.style.display = "none";
  if (liveComponentCanvas?.parentElement === cardState.viewport) {
    cardState.viewport.removeChild(liveComponentCanvas);
  }
  activeComponentCard = null;
}

function initializeComponentCatalog() {
  if (!ui.catalogGrid || ui.catalogGrid.childElementCount > 0) {
    return;
  }

  for (const partKey of componentOrder) {
    createComponentCard(partKey);
  }

  componentObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cardState = componentCards.find((item) => item.card === entry.target);
        if (!cardState) {
          continue;
        }

        if (state.view === "components" && entry.isIntersecting) {
          ensureComponentPreview(cardState);
        } else {
          if (activeComponentCard === cardState) {
            deactivateLiveComponent(cardState);
          }
        }
      }
    },
    {
      root: ui.componentsView,
      rootMargin: "160px",
      threshold: 0.01,
    },
  );

  for (const cardState of componentCards) {
    componentObserver.observe(cardState.card);
  }
}

const lensGroup = addPlacement(createFrontLens(), new THREE.Vector3(0, 0, 19), new THREE.Vector3(0, 0, 44), partCatalog.frontLens);
const bezelGroup = addPlacement(createFrontBezelShell(), new THREE.Vector3(0, 0, 14), new THREE.Vector3(0, 0, 34), partCatalog.frontBezelShell);
const maskGroup = addPlacement(createFaceMask(), new THREE.Vector3(0, 0, 9.2), new THREE.Vector3(0, 0, 24.5), partCatalog.faceMask);
const visualDiskGroup = addPlacement(createVisualDiskAssembly(), new THREE.Vector3(0, 0, 9.35), new THREE.Vector3(0, 0, 21), partCatalog.visualDisk);
const hubGroup = addPlacement(createDiskCarrierHub(), new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, 13), partCatalog.diskHub);
const knobGroup = addPlacement(createCentralKnob(), new THREE.Vector3(0, 0, 21), new THREE.Vector3(0, 0, 53), partCatalog.knob);
const knobShaftGroup = addPlacement(createKnobShaft(), new THREE.Vector3(0, 0, 8), new THREE.Vector3(0, 0, 22), partCatalog.knobShaft);
const supportPlateGroup = addPlacement(createFrontSupportPlate(), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), partCatalog.supportPlate);
const outputShaftGroup = addPlacement(createOutputShaft(), new THREE.Vector3(0, 0, 2.5), new THREE.Vector3(0, 0, 6), partCatalog.outputShaft);
const outputGearGroup = addPlacement(createOutputGear(), new THREE.Vector3(0, 0, -6), new THREE.Vector3(0, 0, -10), partCatalog.outputGear);
const idlerBGearGroup = addPlacement(createIdlerGearB(), new THREE.Vector3(42, 0, -6), new THREE.Vector3(42, 0, -10), partCatalog.idlerGearB);
const idlerAGearGroup = addPlacement(createIdlerGearA(), new THREE.Vector3(64, 0, -6), new THREE.Vector3(64, 0, -10), partCatalog.idlerGearA);
const motorPinionGroup = addPlacement(createMotorPinion(), new THREE.Vector3(78, 0, -6), new THREE.Vector3(78, 0, -10), partCatalog.motorPinion);
const motorBracketGroup = addPlacement(createMotorBracket(), new THREE.Vector3(78, 0, -8), new THREE.Vector3(78, 0, -20), partCatalog.motorBracket);
const motorBodyGroup = addPlacement(createStepperMotorBody(), new THREE.Vector3(78, 0, -18), new THREE.Vector3(78, 0, -33), partCatalog.motorBody);
const encoderGroup = addPlacement(createEncoderModule(), new THREE.Vector3(0, 0, -7.5), new THREE.Vector3(0, 0, -15), partCatalog.encoder);
const pcbGroup = addPlacement(createMainPcb(), new THREE.Vector3(0, 0, -14.5), new THREE.Vector3(0, 0, -48), partCatalog.pcb);
const buzzerGroup = addPlacement(createPiezoBuzzer(), new THREE.Vector3(34, -30, -12), new THREE.Vector3(34, -30, -41), partCatalog.buzzer);
const ledRingGroup = addPlacement(createLedRing(), new THREE.Vector3(0, 0, 1.5), new THREE.Vector3(0, 0, 10), partCatalog.ledRing);
const powerGroup = addPlacement(createPowerModule(), new THREE.Vector3(146, 16, -14.5), new THREE.Vector3(146, 16, -48), partCatalog.powerModule);
const rearShellGroup = addPlacement(createRearHousingShell(), new THREE.Vector3(0, 0, -13), new THREE.Vector3(0, 0, -60), partCatalog.rearShell);
const wallBracketGroup = addPlacement(createWallMountBracket(), new THREE.Vector3(0, 0, -28), new THREE.Vector3(0, 0, -78), partCatalog.wallBracket);

const floorShadow = new THREE.Mesh(
  new THREE.CircleGeometry(220, RADIAL_SEGMENTS),
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
  }),
);
floorShadow.rotation.x = Math.PI / 2;
floorShadow.position.set(0, 0, -106);
scene.add(floorShadow);

function visitMaterials(root, callback) {
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material) {
        callback(material);
      }
    }
  });
}

function setHighlight(root, highlighted) {
  if (!root) {
    return;
  }

  visitMaterials(root, (material) => {
    if (!highlightState.has(material)) {
      highlightState.set(material, {
        color: "color" in material ? material.color.clone() : null,
        opacity: material.opacity,
      });
    }

    const original = highlightState.get(material);
    if ("color" in material && original.color) {
      if (highlighted) {
        material.color.copy(original.color).lerp(new THREE.Color(0xb8b8b8), 0.38);
      } else {
        material.color.copy(original.color);
      }
    }

    if (material.transparent) {
      material.opacity = highlighted ? Math.min(1, original.opacity + 0.18) : original.opacity;
    }
  });
}

function updateSelectionInfo(partInfo) {
  ui.selectedName.textContent = partInfo.name;
  ui.selectedRole.textContent = partInfo.role;
  ui.selectedGroup.textContent = partInfo.system.startsWith("Selection:")
    ? partInfo.system
    : `Assembly: ${partInfo.system}`;
}

function setSelectedPart(root) {
  if (selectedPart === root) {
    return;
  }

  if (selectedPart) {
    setHighlight(selectedPart, false);
  }

  selectedPart = root;

  if (selectedPart) {
    setHighlight(selectedPart, true);
    updateSelectionInfo(selectedPart.userData.partInfo);
  } else {
    updateSelectionInfo(defaultSelection);
  }
}

function getSelectableRoot(object) {
  let current = object;
  while (current && current !== clockRoot) {
    if (current.userData?.partInfo) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function pickPart(clientX, clientY) {
  const bounds = ui.canvas.getBoundingClientRect();
  pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clockRoot.children, true);
  const root = hits.length > 0 ? getSelectableRoot(hits[0].object) : null;
  setSelectedPart(root);
}

function updatePointerCursor(clientX, clientY) {
  const bounds = ui.canvas.getBoundingClientRect();
  pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clockRoot.children, true);
  ui.canvas.style.cursor = hits.length > 0 ? "pointer" : "grab";
}

function formatRemaining(seconds) {
  const clamped = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function syncUi() {
  ui.timerSettingOutput.value = `${state.setMinutes} min`;
  ui.explodeOutput.value = `${Math.round(state.explodeTarget * 100)}%`;
  ui.speedOutput.value = `${state.speedMultiplier}x`;
  ui.remainingOutput.textContent = formatRemaining(state.remainingSeconds);
  ui.statusOutput.textContent = state.running ? "Running" : "Ready";
}

function setView(view) {
  state.view = view;
  const showingAssembly = view === "assembly";
  ui.assemblyView.hidden = !showingAssembly;
  ui.componentsView.hidden = showingAssembly;
  ui.assemblyViewButton.classList.toggle("mode-button--active", showingAssembly);
  ui.componentsViewButton.classList.toggle("mode-button--active", !showingAssembly);
  initializeComponentCatalog();
  setSidebarHidden(view === "components");
  if (showingAssembly) {
    deactivateLiveComponent(activeComponentCard);
  } else {
    for (const cardState of componentCards) {
      const rect = cardState.card.getBoundingClientRect();
      const parentRect = ui.componentsView.getBoundingClientRect();
      const isVisible =
        rect.bottom >= parentRect.top - 160 &&
        rect.top <= parentRect.bottom + 160 &&
        rect.right >= parentRect.left &&
        rect.left <= parentRect.right;
      if (isVisible) {
        ensureComponentPreview(cardState);
      }
    }
  }
  resize();
}

function setSidebarHidden(hidden) {
  state.sidebarHidden = hidden;
  ui.appRoot.classList.toggle("is-panel-hidden", hidden);
  ui.panelToggleButton.textContent = hidden ? "›" : "‹";
  ui.panelToggleButton.setAttribute(
    "aria-label",
    hidden ? "Show side panel" : "Hide side panel",
  );
  requestAnimationFrame(resize);
}

function setTimerMinutes(minutes) {
  state.setMinutes = minutes;
  state.remainingSeconds = minutes * 60;
  if (state.remainingSeconds <= 0) {
    state.running = false;
  }
  syncUi();
}

ui.timerRange.addEventListener("input", (event) => {
  setTimerMinutes(Number(event.currentTarget.value));
});

ui.explodeRange.addEventListener("input", (event) => {
  state.explodeTarget = Number(event.currentTarget.value) / 100;
  syncUi();
});

ui.speedRange.addEventListener("input", (event) => {
  state.speedMultiplier = Number(event.currentTarget.value);
  syncUi();
});

ui.assemblyViewButton.addEventListener("click", () => {
  setView("assembly");
});

ui.componentsViewButton.addEventListener("click", () => {
  setView("components");
});

ui.panelToggleButton.addEventListener("click", () => {
  setSidebarHidden(!state.sidebarHidden);
});

ui.startButton.addEventListener("click", () => {
  if (state.remainingSeconds <= 0) {
    state.remainingSeconds = state.setMinutes * 60;
  }
  state.running = true;
  syncUi();
});

ui.pauseButton.addEventListener("click", () => {
  state.running = false;
  syncUi();
});

ui.resetButton.addEventListener("click", () => {
  state.running = false;
  state.remainingSeconds = state.setMinutes * 60;
  syncUi();
});

ui.canvas.addEventListener("pointerdown", (event) => {
  pointerDown.set(event.clientX, event.clientY);
});

ui.canvas.addEventListener("pointermove", (event) => {
  if ((event.buttons & 1) === 0) {
    updatePointerCursor(event.clientX, event.clientY);
  }
});

ui.canvas.addEventListener("pointerup", (event) => {
  const distance = pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
  if (distance < 5) {
    pickPart(event.clientX, event.clientY);
  } else {
    ui.canvas.style.cursor = "grab";
  }
});

controls.addEventListener("start", () => {
  ui.canvas.style.cursor = "grabbing";
});

controls.addEventListener("end", () => {
  ui.canvas.style.cursor = "grab";
});

function updateVisibleRed(progress) {
  if (!animators.hiddenDisk || !animators.overFaceSector || !animators.returnEdge) {
    return;
  }

  const clamped = THREE.MathUtils.clamp(progress, 0, 1);
  const isFull = clamped >= 0.999;
  const visibleSweepDeg = clamped * DISPLAY_SWEEP_DEG;
  const visibleStartDeg = DISPLAY_END_DEG - visibleSweepDeg;

  animators.overFaceSector.visible = clamped > 0.001;
  if (animators.overFaceSector.visible) {
    const overFaceGeometry = isFull
      ? extrudeShape(makeAnnulusShape(DISPLAY_INNER_RADIUS, DISPLAY_OUTER_RADIUS), 0.72)
      : extrudeShape(
          makeAnnularSectorShape(
            DISPLAY_INNER_RADIUS,
            DISPLAY_OUTER_RADIUS,
            visibleStartDeg,
            DISPLAY_END_DEG,
          ),
          0.72,
        );
    animators.overFaceSector.geometry.dispose();
    animators.overFaceSector.geometry = overFaceGeometry;
    refreshEdgeOverlay(animators.overFaceSector);
  }

  animators.hiddenDisk.visible = clamped > 0.001 && !isFull;
  animators.slitRibbon.visible = clamped > 0.01 && !isFull;
  animators.returnEdge.visible = clamped > 0.001 && !isFull;
  if (!isFull) {
    animators.returnEdge.rotation.z = degToRad(visibleStartDeg + DISPLAY_RETURN_WIDTH_DEG / 2);
  }
}

function updatePlacements(explodeAmount) {
  for (const placement of placements) {
    placement.object.position.lerpVectors(placement.assembled, placement.exploded, explodeAmount);
  }
}

function resize() {
  const { clientWidth, clientHeight } = ui.canvas;
  renderer.setSize(clientWidth, clientHeight, false);
  const aspect = clientWidth / clientHeight;
  camera.left = (-AXON_VIEW_SIZE * aspect) / 2;
  camera.right = (AXON_VIEW_SIZE * aspect) / 2;
  camera.top = AXON_VIEW_SIZE / 2;
  camera.bottom = -AXON_VIEW_SIZE / 2;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resize);
resize();
initializeComponentCatalog();
setView(state.view);
setSidebarHidden(state.sidebarHidden);
syncUi();
updateSelectionInfo(defaultSelection);

const clock = new THREE.Clock();

function renderLoop() {
  const delta = Math.min(clock.getDelta(), 0.05);

  if (state.running) {
    state.remainingSeconds = Math.max(0, state.remainingSeconds - delta * state.speedMultiplier);
    if (state.remainingSeconds === 0) {
      state.running = false;
    }
  }

  const targetProgress = THREE.MathUtils.clamp(state.remainingSeconds / FULL_TIMER_SECONDS, 0, 1);
  motion.progress = damp(motion.progress, targetProgress, 6, delta);
  motion.explode = damp(motion.explode, state.explodeTarget, 6, delta);

  const elapsedTurn = 1 - motion.progress;
  const mechanismAngle = -elapsedTurn * DISPLAY_SWEEP_RAD;
  const knobTarget = mechanismAngle * 1.3;
  motion.knobAngle = damp(motion.knobAngle, knobTarget, 7, delta);

  visualDiskGroup.rotation.z = 0;
  if (animators.hiddenDisk) {
    animators.hiddenDisk.rotation.z = mechanismAngle;
  }
  hubGroup.rotation.z = mechanismAngle;
  outputShaftGroup.rotation.z = mechanismAngle;
  outputGearGroup.rotation.z = mechanismAngle;
  idlerBGearGroup.rotation.z = -mechanismAngle * (58 / 26);
  idlerAGearGroup.rotation.z = mechanismAngle * (58 / 18);
  motorPinionGroup.rotation.z = -mechanismAngle * (58 / 10);
  knobGroup.rotation.z = motion.knobAngle;
  knobShaftGroup.rotation.z = motion.knobAngle;

  updateVisibleRed(motion.progress);
  updatePlacements(motion.explode);

  ui.remainingOutput.textContent = formatRemaining(state.remainingSeconds);
  ui.statusOutput.textContent = state.running ? "Running" : "Ready";

  controls.update();
  if (state.view === "assembly") {
    renderer.render(scene, camera);
  } else if (activeComponentCard && liveComponentRenderer) {
    syncComponentCardCamera(activeComponentCard);
    liveComponentRenderer.render(activeComponentCard.scene, activeComponentCard.camera);
  }
  requestAnimationFrame(renderLoop);
}

renderLoop();
