'use strict';

(function () {
  const MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
  const STYLE_ID = 'yd-mechanical-teardown-styles';
  const SECTION_ID = 'yd-mechanical-teardown';
  const STAGE_DURATION = 2500;
  const STAGE_COUNT = 3;
  const MICRO_PART_COUNT = 260;
  let threeModulePromise;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SECTION_ID} {
        --yd-teardown-accent: #bcff00;
        margin: 3rem auto;
        width: min(1440px, calc(100% - 2rem));
        color: #f5f5f5;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      #${SECTION_ID} * { box-sizing: border-box; }
      #${SECTION_ID} .yd-teardown-shell {
        overflow: hidden;
        border: 1px solid rgba(188,255,0,.25);
        background:
          radial-gradient(ellipse at 50% 20%, rgba(188,255,0,.08), transparent 44%),
          linear-gradient(145deg, #10120d, #070807 68%);
        box-shadow: 0 32px 100px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.025);
      }
      #${SECTION_ID} .yd-teardown-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        padding: clamp(22px, 4vw, 42px);
        border-bottom: 1px solid rgba(255,255,255,.09);
      }
      #${SECTION_ID} .yd-teardown-kicker,
      #${SECTION_ID} .yd-teardown-meta,
      #${SECTION_ID} .yd-teardown-label,
      #${SECTION_ID} .yd-teardown-round {
        font: 700 10px/1.5 'Courier New', monospace;
        letter-spacing: .16em;
        text-transform: uppercase;
      }
      #${SECTION_ID} .yd-teardown-kicker { color: var(--yd-teardown-accent); }
      #${SECTION_ID} .yd-teardown-heading h2 {
        margin: 10px 0 0;
        color: #fff;
        font: 900 clamp(28px, 5vw, 58px)/.95 'Bricolage Grotesque', sans-serif;
        letter-spacing: -.045em;
        text-transform: uppercase;
      }
      #${SECTION_ID} .yd-teardown-heading h2 span { color: var(--yd-teardown-accent); }
      #${SECTION_ID} .yd-teardown-meta { color: #81857a; text-align: right; white-space: nowrap; }
      #${SECTION_ID} .yd-teardown-comparison {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1px;
        background: rgba(255,255,255,.1);
      }
      #${SECTION_ID} .yd-teardown-view {
        position: relative;
        min-width: 0;
        background: #090b08;
      }
      #${SECTION_ID} .yd-teardown-viewport {
        position: relative;
        height: clamp(270px, 36vw, 490px);
        overflow: hidden;
        background:
          radial-gradient(ellipse at center, rgba(160,184,121,.07), transparent 68%),
          linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px), #090b08;
        background-size: auto, 28px 28px, 28px 28px, auto;
      }
      #${SECTION_ID} .yd-teardown-viewport canvas {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: pan-y;
      }
      #${SECTION_ID} .yd-teardown-viewport video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        background: #090b08;
        object-fit: contain;
      }
      #${SECTION_ID} .yd-teardown-view-head {
        position: absolute;
        z-index: 1;
        inset: 14px 16px auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        pointer-events: none;
      }
      #${SECTION_ID} .yd-teardown-label { color: #e6e9df; }
      #${SECTION_ID} .yd-teardown-label em {
        color: var(--yd-teardown-accent);
        font-style: normal;
      }
      #${SECTION_ID} .yd-teardown-round { color: #858b7b; }
      #${SECTION_ID} .yd-teardown-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 45px;
        padding: 10px 16px;
        border-top: 1px solid rgba(255,255,255,.08);
        color: #93988a;
        font: 10px/1.4 'Courier New', monospace;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      #${SECTION_ID} .yd-detached-status {
        color: var(--yd-teardown-accent);
        font-weight: 900;
        letter-spacing: .16em;
      }
      #${SECTION_ID} .yd-teardown-progress {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        padding: 18px clamp(16px, 3vw, 32px) 0;
      }
      #${SECTION_ID} .yd-teardown-step {
        height: 3px;
        background: rgba(255,255,255,.12);
        transition: background .25s ease, box-shadow .25s ease;
      }
      #${SECTION_ID} .yd-teardown-step.is-done {
        background: var(--yd-teardown-accent);
        box-shadow: 0 0 12px rgba(188,255,0,.5);
      }
      #${SECTION_ID} .yd-teardown-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 18px clamp(16px, 3vw, 32px) clamp(20px, 3vw, 30px);
      }
      #${SECTION_ID} .yd-teardown-copy {
        max-width: 600px;
        color: #9da195;
        font: 12px/1.7 'Plus Jakarta Sans', sans-serif;
      }
      #${SECTION_ID} .yd-teardown-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      #${SECTION_ID} .yd-teardown-button {
        min-height: 42px;
        padding: 0 15px;
        border: 1px solid rgba(255,255,255,.2);
        background: transparent;
        color: #fff;
        cursor: pointer;
        font: 800 10px/1 'Courier New', monospace;
        letter-spacing: .1em;
        text-transform: uppercase;
        transition: border-color .2s ease, background .2s ease, color .2s ease, opacity .2s ease;
      }
      #${SECTION_ID} .yd-teardown-button:hover:not(:disabled) {
        border-color: var(--yd-teardown-accent);
        color: var(--yd-teardown-accent);
      }
      #${SECTION_ID} .yd-teardown-button--primary {
        border-color: var(--yd-teardown-accent);
        background: var(--yd-teardown-accent);
        color: #080a05;
      }
      #${SECTION_ID} .yd-teardown-button--primary:hover:not(:disabled) {
        background: #d7ff70;
        color: #080a05;
      }
      #${SECTION_ID} .yd-teardown-button:disabled { cursor: not-allowed; opacity: .42; }
      #${SECTION_ID} .yd-teardown-message {
        min-height: 16px;
        padding: 0 clamp(16px, 3vw, 32px) 18px;
        color: #73796a;
        font: 10px/1.5 'Courier New', monospace;
        letter-spacing: .1em;
        text-transform: uppercase;
      }
      @media (max-width: 720px) {
        #${SECTION_ID} { width: min(100% - 1rem, 1440px); margin: 2rem auto; }
        #${SECTION_ID} .yd-teardown-heading { align-items: flex-start; flex-direction: column; }
        #${SECTION_ID} .yd-teardown-meta { text-align: left; }
        #${SECTION_ID} .yd-teardown-comparison { grid-template-columns: 1fr; }
        #${SECTION_ID} .yd-teardown-viewport { height: min(80vw, 390px); }
        #${SECTION_ID} .yd-teardown-controls { align-items: flex-start; flex-direction: column; }
      }
      @media (prefers-reduced-motion: reduce) {
        #${SECTION_ID} .yd-teardown-step,
        #${SECTION_ID} .yd-teardown-button { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function createSection(container) {
    if (container.dataset.ydTeardownReady === 'true') return;
    container.dataset.ydTeardownReady = 'true';
    container.innerHTML = `
      <div class="yd-teardown-shell">
        <header class="yd-teardown-heading">
          <div>
            <div class="yd-teardown-kicker">YEHULU MECHANICAL STUDY // 01</div>
            <h2>Every layer.<br><span>Every moving part.</span></h2>
          </div>
          <div class="yd-teardown-meta">FULLY CODED IN THREE.JS<br>260 MICRO-PARTS / UNIT</div>
        </header>
        <div class="yd-teardown-comparison">
          <article class="yd-teardown-view">
            <div class="yd-teardown-view-head">
              <span class="yd-teardown-label"><em>A /</em> ASSEMBLED</span>
              <span class="yd-teardown-round">REFERENCE POSE</span>
            </div>
            <div class="yd-teardown-viewport" data-teardown-view="assembled"></div>
            <footer class="yd-teardown-foot"><span>OUTER SHELL // CLOSED</span><span>01:1</span></footer>
          </article>
          <article class="yd-teardown-view">
            <div class="yd-teardown-view-head">
              <span class="yd-teardown-label"><em>B /</em> LIVE TEARDOWN</span>
              <span class="yd-teardown-round" data-teardown-round>ROUND 00 / 03</span>
            </div>
            <div class="yd-teardown-viewport" data-teardown-view="teardown">
              <video data-teardown-video playsinline controls hidden></video>
            </div>
            <footer class="yd-teardown-foot"><span>INTERNALS // <span data-micro-count>260</span> MICRO-PARTS</span><span class="yd-detached-status" data-servo-status>LINKED</span></footer>
          </article>
        </div>
        <div class="yd-teardown-progress" aria-label="Three comparison rounds">
          <span class="yd-teardown-step"></span>
          <span class="yd-teardown-step"></span>
          <span class="yd-teardown-step"></span>
        </div>
        <div class="yd-teardown-controls">
          <div class="yd-teardown-copy">Compare the original silhouette against the live mechanical breakdown. Each pass reveals another layer. The teardown replay stays locked until all three side-by-side rounds are complete.</div>
          <div class="yd-teardown-actions">
            <button type="button" class="yd-teardown-button yd-teardown-button--primary" data-action="round">SKIP TO ROUND 1 / 3</button>
            <button type="button" class="yd-teardown-button" data-action="detach">PULL LEG</button>
            <button type="button" class="yd-teardown-button" data-action="replay" disabled>VIDEO REPLAY // LOCKED</button>
          </div>
        </div>
        <div class="yd-teardown-message" data-teardown-message aria-live="polite">Reference art not supplied — both views use the same procedural Three.js model.</div>
      </div>
    `;

  }

  function loadThree() {
    if (!threeModulePromise) threeModulePromise = import(MODULE_URL);
    return threeModulePromise;
  }

  function makeMaterials(THREE) {
    return {
      shell: new THREE.MeshStandardMaterial({ color: 0x242920, metalness: .78, roughness: .27 }),
      shellLight: new THREE.MeshStandardMaterial({ color: 0x566044, metalness: .72, roughness: .25 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x10130e, metalness: .88, roughness: .3 }),
      steel: new THREE.MeshStandardMaterial({ color: 0xadb5a5, metalness: .9, roughness: .22 }),
      accent: new THREE.MeshStandardMaterial({ color: 0xbcff00, emissive: 0x344c00, emissiveIntensity: .65, metalness: .45, roughness: .28 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xb26d3c, metalness: .82, roughness: .3 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x11140f, metalness: .1, roughness: .85 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x9fe0a2, emissive: 0x123316, metalness: .3, roughness: .12 })
    };
  }

  function addBox(THREE, parent, material, position, size, rotation) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addCylinderBetween(THREE, parent, material, start, end, radius, sides) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(b, a);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), sides || 12),
      material
    );
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addGear(THREE, parent, material, radius, teeth, position, rotation) {
    const gear = new THREE.Group();
    gear.position.set(...position);
    gear.userData.basePosition = gear.position.clone();
    if (rotation) gear.rotation.set(...rotation);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * .78, radius * .78, .16, 48), material);
    core.rotation.x = Math.PI / 2;
    gear.add(core);
    const toothGeometry = new THREE.BoxGeometry(radius * .3, .16, radius * .2);
    for (let tooth = 0; tooth < teeth; tooth += 1) {
      const angle = tooth / teeth * Math.PI * 2;
      const mesh = new THREE.Mesh(toothGeometry, material);
      mesh.position.set(Math.cos(angle) * radius * .88, Math.sin(angle) * radius * .88, 0);
      mesh.rotation.z = angle;
      gear.add(mesh);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * .23, radius * .23, .2, 24), material);
    hub.rotation.x = Math.PI / 2;
    gear.add(hub);
    parent.add(gear);
    return gear;
  }

  function addHose(THREE, parent, material, points, radius) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, radius || .025, 7, false), material);
    hose.castShadow = true;
    parent.add(hose);
    return hose;
  }

  function makeMicroParts(THREE, parent, materials) {
    const microParts = new THREE.Group();
    const pistonGeometry = new THREE.CylinderGeometry(.018, .018, .19, 7);
    const screwGeometry = new THREE.CylinderGeometry(.035, .035, .035, 8);
    const wireCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(.05, .04, 0),
      new THREE.Vector3(.1, 0, 0)
    ]);
    const wireGeometry = new THREE.TubeGeometry(wireCurve, 4, .009, 4, false);
    const bearingGeometry = new THREE.SphereGeometry(.027, 7, 5);
    const specs = [
      { geometry: pistonGeometry, material: materials.steel },
      { geometry: screwGeometry, material: materials.accent },
      { geometry: wireGeometry, material: materials.copper },
      { geometry: bearingGeometry, material: materials.copper }
    ];
    const counts = specs.map((_, kind) => Array.from(
      { length: MICRO_PART_COUNT },
      (_, index) => index % 4 === kind
    ).filter(Boolean).length);
    const instances = specs.map((spec, kind) => {
      const mesh = new THREE.InstancedMesh(spec.geometry, spec.material, counts[kind]);
      mesh.castShadow = true;
      microParts.add(mesh);
      return mesh;
    });
    const cursors = [0, 0, 0, 0];
    const transform = new THREE.Object3D();

    for (let index = 0; index < MICRO_PART_COUNT; index += 1) {
      const ring = Math.floor(index / 65);
      const withinRing = index % 65;
      const angle = withinRing * 2.399963229728653 + ring * .21;
      const radius = .28 + ring * .19 + (withinRing % 5) * .026;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -.38 + (withinRing % 13) * .061;
      const kind = index % 4;
      transform.position.set(x, y, z);
      transform.rotation.set(
        kind === 0 ? Math.sin(angle) * .45 : kind === 1 ? Math.PI / 2 : 0,
        kind === 1 ? angle : 0,
        kind === 0 ? Math.cos(angle) * .45 : 0
      );
      transform.scale.setScalar(1);
      transform.updateMatrix();
      instances[kind].setMatrixAt(cursors[kind], transform.matrix);
      cursors[kind] += 1;
    }
    instances.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
    parent.add(microParts);
    return microParts;
  }

  function buildMachine(THREE, scene, isReference) {
    const materials = makeMaterials(THREE);
    const root = new THREE.Group();
    scene.add(root);
    const internals = new THREE.Group();
    const shell = new THREE.Group();
    const legs = new THREE.Group();
    const gears = [];
    root.add(internals, shell, legs);

    addBox(THREE, internals, materials.dark, [-.62, 0, 0], [.1, .94, .88]);
    addBox(THREE, internals, materials.dark, [.62, 0, 0], [.1, .94, .88]);
    addBox(THREE, internals, materials.dark, [0, .45, 0], [1.32, .08, .88]);
    addBox(THREE, internals, materials.dark, [0, -.45, 0], [1.32, .08, .88]);
    addBox(THREE, internals, materials.shellLight, [0, -.54, 0], [1.54, .12, 1.03]);
    addBox(THREE, internals, materials.dark, [0, .52, 0], [1.22, .11, .82]);
    addBox(THREE, internals, materials.accent, [0, .64, .02], [.22, .12, .31]);
    addBox(THREE, internals, materials.glass, [0, .92, .08], [.52, .26, .08]);
    addBox(THREE, internals, materials.shell, [0, 1.05, -.13], [.86, .12, .46], [.14, 0, 0]);

    gears.push(addGear(THREE, internals, materials.accent, .47, 16, [-.34, .05, .49], [Math.PI / 2, 0, 0]));
    gears.push(addGear(THREE, internals, materials.steel, .31, 12, [.4, .05, .49], [Math.PI / 2, 0, 0]));
    gears.push(addGear(THREE, internals, materials.copper, .24, 10, [0, -.25, -.48], [Math.PI / 2, 0, 0]));
    addBox(THREE, internals, materials.steel, [-.02, -.68, .01], [.08, .74, .08]);
    addBox(THREE, internals, materials.copper, [.34, -.62, .05], [.08, .58, .08], [0, 0, .22]);

    for (let bolt = 0; bolt < 12; bolt += 1) {
      const angle = bolt / 12 * Math.PI * 2;
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .055, 8), materials.steel);
      screw.position.set(Math.cos(angle) * .64, -.42, Math.sin(angle) * .42);
      screw.rotation.x = Math.PI / 2;
      internals.add(screw);
    }

    addHose(THREE, internals, materials.rubber, [[-.55, .28, .4], [-.72, .58, .24], [-.55, .88, .18], [-.27, .73, .32]], .04);
    addHose(THREE, internals, materials.accent, [[.48, .34, .42], [.73, .5, .15], [.62, .78, .06], [.35, .69, .35]], .025);
    addHose(THREE, internals, materials.copper, [[-.45, -.46, -.41], [-.76, -.72, -.24], [-.48, -.93, 0], [-.15, -.62, .42]], .022);
    addHose(THREE, internals, materials.rubber, [[.42, -.42, -.4], [.68, -.75, -.25], [.37, -.9, .06], [.12, -.62, .43]], .03);
    const microParts = makeMicroParts(THREE, internals, materials);

    const shellFront = addBox(THREE, shell, materials.shell, [0, .02, .54], [1.42, .94, .1]);
    shellFront.userData.teardownPart = true;
    const shellSide = addBox(THREE, shell, materials.shellLight, [-.73, .01, 0], [.1, .84, 1.04]);
    shellSide.userData.teardownPart = true;
    const shellTop = addBox(THREE, shell, materials.shell, [0, .53, 0], [1.48, .1, 1.04]);
    shellTop.userData.teardownPart = true;
    addBox(THREE, shell, materials.accent, [0, .61, .1], [.48, .08, .3]);
    for (let i = 0; i < 6; i += 1) {
      addBox(THREE, shell, materials.dark, [-.47 + i * .19, .03, .598], [.09, .55, .018], [0, 0, -.18]);
    }

    const legDefinitions = [
      { x: -.69, z: .39, front: true },
      { x: .69, z: .39, front: true },
      { x: -.69, z: -.39, front: false },
      { x: .69, z: -.39, front: false }
    ];
    const legGroups = [];
    legDefinitions.forEach((definition, index) => {
      const leg = new THREE.Group();
      leg.position.set(definition.x, -.25, definition.z);
      legs.add(leg);
      const direction = definition.x < 0 ? -1 : 1;
      const knee = [direction * .26, -.44, definition.front ? .08 : -.08];
      const ankle = [direction * .34, -1.02, definition.front ? .14 : -.14];
      addCylinderBetween(THREE, leg, materials.steel, [0, 0, 0], knee, .105, 12);
      addCylinderBetween(THREE, leg, materials.shellLight, knee, ankle, .075, 12);
      addCylinderBetween(THREE, leg, materials.dark, ankle, [direction * .39, -1.13, ankle[2]], .12, 10);
      const hip = new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 10), materials.accent);
      hip.position.set(0, 0, 0);
      leg.add(hip);
      const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(.105, 14, 10), materials.copper);
      kneeJoint.position.set(...knee);
      leg.add(kneeJoint);
      const servoBar = new THREE.Group();
      servoBar.position.set(direction * .09, -.12, .06);
      const servoEnd = new THREE.Vector3(direction * .18, -.7, .07);
      const servoMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(.045, .045, servoEnd.length(), 10),
        materials.accent
      );
      servoMesh.position.copy(servoEnd).multiplyScalar(.5);
      servoMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), servoEnd.clone().normalize());
      servoBar.add(servoMesh);
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 512;
      labelCanvas.height = 128;
      const labelContext = labelCanvas.getContext('2d');
      labelContext.fillStyle = '#bcff00';
      labelContext.font = 'bold 52px monospace';
      labelContext.textAlign = 'center';
      labelContext.textBaseline = 'middle';
      labelContext.fillText('DETACHED', 256, 64);
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const detachedLabel = new THREE.Sprite(new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
        depthTest: false
      }));
      detachedLabel.scale.set(.74, .19, 1);
      detachedLabel.position.set(direction * .36, -.36, .12);
      detachedLabel.visible = false;
      servoBar.add(detachedLabel);
      servoBar.userData.detachedLabel = detachedLabel;
      leg.add(servoBar);
      leg.userData.servoBar = servoBar;
      addCylinderBetween(THREE, leg, materials.dark, [direction * .15, -.12, -.09], [direction * .3, -.81, -.12], .028, 8);
      leg.userData.legIndex = index;
      leg.userData.isPullable = index === 0;
      legGroups.push(leg);
    });

    const machineBase = new THREE.Mesh(new THREE.CylinderGeometry(.56, .7, .14, 12), materials.dark);
    machineBase.position.y = -1.33;
    root.add(machineBase);

    root.rotation.y = -.38;
    root.rotation.x = .08;
    const teardownData = { root, shell, shellFront, shellSide, shellTop, legs, legGroups, gears, microParts };
    if (isReference) root.userData.reference = true;
    return teardownData;
  }

  function createViewport(THREE, viewport, isReference) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(viewport.clientWidth, viewport.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    viewport.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.PerspectiveCamera(33, viewport.clientWidth / viewport.clientHeight, .1, 100);
    camera.position.set(3.8, 2.45, 5.2);
    camera.lookAt(0, -.12, 0);
    scene.add(new THREE.HemisphereLight(0xdce9c7, 0x141912, 2.1));
    const keyLight = new THREE.DirectionalLight(0xe5f2d4, 3.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xbcff00, 13, 9);
    rimLight.position.set(-3, 1.5, 2);
    scene.add(rimLight);
    const coolLight = new THREE.PointLight(0x728a94, 8, 8);
    coolLight.position.set(2, -1, -3);
    scene.add(coolLight);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 64),
      new THREE.MeshBasicMaterial({ color: 0x182016, transparent: true, opacity: .45 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.42;
    scene.add(floor);
    const machine = buildMachine(THREE, scene, isReference);

    let pointerDown = null;
    let userRotation = 0;
    renderer.domElement.addEventListener('pointerdown', event => {
      pointerDown = { x: event.clientX, rotation: userRotation };
      renderer.domElement.setPointerCapture(event.pointerId);
    });
    renderer.domElement.addEventListener('pointermove', event => {
      if (!pointerDown) return;
      userRotation = pointerDown.rotation + (event.clientX - pointerDown.x) * .008;
      machine.root.rotation.y = -.38 + userRotation;
    });
    renderer.domElement.addEventListener('pointerup', () => { pointerDown = null; });
    renderer.domElement.addEventListener('pointercancel', () => { pointerDown = null; });

    const resizeObserver = new ResizeObserver(() => {
      const width = Math.max(1, viewport.clientWidth);
      const height = Math.max(1, viewport.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(viewport);
    return { renderer, scene, camera, machine, resizeObserver, canvas: renderer.domElement };
  }

  function ease(value) {
    const clamped = Math.max(0, Math.min(1, value));
    return clamped * clamped * (3 - 2 * clamped);
  }

  function animateMachine(machine, stage, progress, detached) {
    const open = ease(progress);
    const shellOpen = stage === 1 ? open : stage >= 2 ? 1 : 0;
    const gearOpen = stage === 2 ? open : stage >= 3 ? 1 : 0;
    const legOpen = stage === 3 ? open : 0;
    machine.shellFront.position.z = .54 + shellOpen * .95;
    machine.shellFront.rotation.y = -shellOpen * .78;
    machine.shellSide.position.x = -.73 - shellOpen * .55;
    machine.shellSide.rotation.z = shellOpen * .24;
    machine.shellTop.position.y = .53 + shellOpen * .75;
    machine.shellTop.rotation.x = -shellOpen * .36;
    machine.microParts.visible = shellOpen > .4;

    machine.gears.forEach((gear, index) => {
      const base = gear.userData.basePosition;
      gear.position.x = base.x + (index === 0 ? -.38 : index === 1 ? .35 : 0) * gearOpen;
      gear.position.y = base.y + (index === 2 ? -.38 : .16) * gearOpen;
    });

    if (machine.legGroups[0]) {
      const leg = machine.legGroups[0];
      const isDetached = detached || (stage >= 3 && legOpen >= .8);
      leg.position.x = -.69 - (detached ? 1.15 : legOpen * 1.15);
      leg.position.y = -.25 - (detached ? .05 : 0);
      leg.rotation.z = detached ? -.16 : -legOpen * .08;
      leg.userData.servoBar.rotation.z = isDetached ? -.85 : 0;
      leg.userData.servoBar.userData.detachedLabel.visible = isDetached;
    }
  }

  function mount(container) {
    if (container.dataset.ydTeardownMounted === 'true') return;
    container.dataset.ydTeardownMounted = 'true';
    addStyles();
    createSection(container);

    const message = container.querySelector('[data-teardown-message]');
    loadThree().then(THREE => {
      if (!container.isConnected) return;
      const referenceView = container.querySelector('[data-teardown-view="assembled"]');
      const liveView = container.querySelector('[data-teardown-view="teardown"]');
      const reference = createViewport(THREE, referenceView, true);
      const live = createViewport(THREE, liveView, false);
      const roundLabel = container.querySelector('[data-teardown-round]');
      const servoStatus = container.querySelector('[data-servo-status]');
      const roundButton = container.querySelector('[data-action="round"]');
      const replayButton = container.querySelector('[data-action="replay"]');
      const replayVideo = container.querySelector('[data-teardown-video]');
      const progressSteps = Array.from(container.querySelectorAll('.yd-teardown-step'));
      let completedRounds = 0;
      let currentStage = 0;
      let transitionStart = 0;
      let detached = false;
      let lastTimestamp = 0;
      let stopped = false;
      let roundTimer = 0;
      let replayStream = null;

      function updateRound() {
        roundLabel.textContent = `ROUND ${String(currentStage).padStart(2, '0')} / 03`;
        progressSteps.forEach((step, index) => step.classList.toggle('is-done', index < completedRounds));
        replayButton.disabled = completedRounds < STAGE_COUNT;
        replayButton.textContent = completedRounds < STAGE_COUNT
          ? 'VIDEO REPLAY // LOCKED'
          : live.canvas.captureStream ? 'PLAY TEARDOWN VIDEO' : 'PLAY TEARDOWN REPLAY';
        roundButton.disabled = completedRounds >= STAGE_COUNT || currentStage >= STAGE_COUNT;
        roundButton.textContent = completedRounds >= STAGE_COUNT
          ? '3 ROUNDS COMPLETE'
          : currentStage > completedRounds
            ? currentStage === STAGE_COUNT
              ? 'FINAL ROUND IN PROGRESS'
              : `SKIP TO ROUND ${currentStage + 1} / 3`
            : `SKIP TO ROUND ${completedRounds + 1} / 3`;
      }

      function beginRound() {
        if (completedRounds >= STAGE_COUNT || currentStage >= STAGE_COUNT) return;
        window.clearTimeout(roundTimer);
        currentStage += 1;
        transitionStart = performance.now();
        updateRound();
        const labels = ['Shell plates disengage.', 'Gears, hoses and wire paths exposed.', 'Servo linkage released.'];
        message.textContent = `ROUND ${currentStage} / 3 // ${labels[currentStage - 1]}`;
        roundTimer = window.setTimeout(() => {
          completedRounds = currentStage;
          updateRound();
          if (currentStage < STAGE_COUNT) {
            beginRound();
          } else {
            detached = true;
            servoStatus.textContent = 'DETACHED';
            message.textContent = '3 / 3 COMPLETE // TEARDOWN REPLAY UNLOCKED.';
          }
        }, STAGE_DURATION);
        servoStatus.textContent = detached ? 'DETACHED' : 'LINKED';
      }

      function detachLeg() {
        if (detached) return;
        detached = true;
        servoStatus.textContent = 'DETACHED';
        message.textContent = 'FRONT LEFT LEG PULLED // SERVO BAR DISCONNECTED.';
      }

      function replay() {
        if (completedRounds < STAGE_COUNT) return;
        window.clearTimeout(roundTimer);
        if (replayStream) replayStream.getTracks().forEach(track => track.stop());
        if (live.canvas.captureStream) {
          replayStream = live.canvas.captureStream(30);
          replayVideo.srcObject = replayStream;
          replayVideo.hidden = false;
          live.canvas.style.display = 'none';
          completedRounds = STAGE_COUNT;
          currentStage = 0;
          detached = false;
          servoStatus.textContent = 'LINKED';
          animateMachine(live.machine, 0, 0, false);
          replayVideo.play().catch(error => {
            console.warn('Mechanical teardown video playback was blocked:', error);
            message.textContent = 'PRESS PLAY ON THE VIDEO CONTROLS TO START THE REPLAY.';
          });
        }
        const replayStage = () => {
          if (currentStage >= STAGE_COUNT) {
            detached = true;
            servoStatus.textContent = 'DETACHED';
            message.textContent = 'VIDEO REPLAY COMPLETE // ALL THREE ROUNDS SHOWN.';
            return;
          }
          currentStage += 1;
          transitionStart = performance.now();
          roundLabel.textContent = `VIDEO // ROUND ${currentStage} / 03`;
          const labels = ['Shell plates disengage.', 'Gears, hoses and wire paths exposed.', 'Servo linkage released.'];
          message.textContent = `VIDEO REPLAY // ${labels[currentStage - 1]}`;
          roundTimer = window.setTimeout(replayStage, STAGE_DURATION);
        };
        replayStage();
      }

      function render(timestamp) {
        if (stopped) return;
        if (!container.isConnected) {
          stopped = true;
          reference.resizeObserver.disconnect();
          live.resizeObserver.disconnect();
          if (replayStream) replayStream.getTracks().forEach(track => track.stop());
          reference.renderer.dispose();
          live.renderer.dispose();
          return;
        }
        if (!lastTimestamp) lastTimestamp = timestamp;
        const delta = Math.min(.05, (timestamp - lastTimestamp) / 1000);
        lastTimestamp = timestamp;

        reference.machine.gears.forEach((gear, index) => {
          gear.rotation.z += delta * (index % 2 ? -.45 : .45);
        });
        live.machine.gears.forEach((gear, index) => {
          gear.rotation.z += delta * (index % 2 ? -.45 : .45);
        });

        const stage = currentStage;
        let progress = stage === 0 ? 0 : 1;
        if (transitionStart) {
          progress = Math.min(1, (timestamp - transitionStart) / STAGE_DURATION);
          if (progress >= 1) transitionStart = 0;
        }
        animateMachine(live.machine, stage, progress, detached);
        reference.renderer.render(reference.scene, reference.camera);
        live.renderer.render(live.scene, live.camera);
        requestAnimationFrame(render);
      }

      roundButton.addEventListener('click', beginRound);
      container.querySelector('[data-action="detach"]').addEventListener('click', detachLeg);
      replayButton.addEventListener('click', replay);
      updateRound();
      requestAnimationFrame(render);
      roundTimer = window.setTimeout(beginRound, STAGE_DURATION);
    }).catch(error => {
      console.error('Mechanical teardown could not initialize Three.js:', error);
      message.textContent = '3D VIEW UNAVAILABLE // CHECK THE CONNECTION AND RELOAD.';
      container.querySelectorAll('button').forEach(button => { button.disabled = true; });
    });
  }

  function findAboutMount() {
    if (!/^\/about(?:\.html)?\/?$/.test(window.location.pathname)) return;
    const main = document.querySelector('#root main');
    if (!main) return;
    let container = main.querySelector('#' + SECTION_ID);
    if (!container) {
      container = document.createElement('section');
      container.id = SECTION_ID;
      const mountPoint = document.createElement('div');
      mountPoint.dataset.mechanicalTeardown = '';
      container.appendChild(mountPoint);
      main.insertBefore(container, main.firstChild);
    }
    const mountPoint = container.querySelector('[data-mechanical-teardown]') || container;
    mount(mountPoint);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findAboutMount, { once: true });
  } else {
    findAboutMount();
  }

  const root = document.getElementById('root');
  if (root) {
    new MutationObserver(findAboutMount).observe(root, { childList: true, subtree: true });
  }
})();
