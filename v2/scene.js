// Scène 3D de l'accueil (Three.js) : le « H » de Hakkanodev en verre, son point lumineux et des anneaux de lumière.
// Si l'appareil n'arrive pas à suivre (3D calculée par le processeur), on rend la main à la version légère : surLent().
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function demarrer({ cv, hero, calme = false, force = false, surLent = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x06080b);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .95;
  const cam = new THREE.PerspectiveCamera(32, 1, .1, 60); cam.position.set(0, 0, 9);
  const VERT = new THREE.Color(0x2ee59d), CYAN = new THREE.Color(0x6ff3ff), LIME = new THREE.Color(0xc8ff5a);

  const groupe = new THREE.Group(); scene.add(groupe);

  // Le H en verre
  const f = new THREE.Shape();
  [[-.8, -1], [-.3, -1], [-.3, -.22], [.3, -.22], [.3, -1], [.8, -1], [.8, 1], [.3, 1], [.3, .22], [-.3, .22], [-.3, 1], [-.8, 1]].forEach(([x, y], k) => k ? f.lineTo(x, y) : f.moveTo(x, y));
  f.closePath();
  const geoH = new THREE.ExtrudeGeometry(f, { depth: .5, bevelEnabled: true, bevelThickness: .1, bevelSize: .1, bevelSegments: 10, curveSegments: 4 }); geoH.center();
  const verre = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .04, transmission: 1, thickness: 1.25, ior: 1.5, dispersion: .4,
    iridescence: 1, iridescenceIOR: 1.32, iridescenceThicknessRange: [140, 520], clearcoat: 1, clearcoatRoughness: .04,
    attenuationColor: VERT.clone().lerp(CYAN, .25), attenuationDistance: 2.4, envMapIntensity: 1.1 });
  const H = new THREE.Mesh(geoH, verre); groupe.add(H);

  // Le point du logo : une bille de lumière
  const hdr = (c, k) => c.clone().multiplyScalar(k);
  const bille = new THREE.Mesh(new THREE.SphereGeometry(.2, 40, 40), new THREE.MeshBasicMaterial({ color: hdr(VERT, 1.15) }));
  bille.position.set(1.16, -.86, 0); groupe.add(bille);
  const lueur = new THREE.PointLight(VERT, 14, 6, 1.6); lueur.position.copy(bille.position); groupe.add(lueur);

  // Anneaux lumineux (opaques : le verre les réfracte)
  const anneaux = [[1.72, VERT, 2.4, [1.2, .15, 0]], [1.98, CYAN, 2.0, [.55, .85, .4]], [2.26, LIME, 1.4, [-.65, .3, .8]]].map(([r, c, k, rot]) => {
    const pivot = new THREE.Group(); pivot.rotation.set(...rot);
    pivot.add(new THREE.Mesh(new THREE.TorusGeometry(r, .011, 10, 260), new THREE.MeshBasicMaterial({ color: hdr(c, k) })));
    const perle = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 16), new THREE.MeshBasicMaterial({ color: hdr(c, k * 1.6) })); perle.position.x = r; pivot.add(perle);
    groupe.add(pivot); return pivot; });

  // Lueur derrière le H : elle se fond dans le fond et donne de la lumière au verre
  const fond = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), new THREE.ShaderMaterial({ depthWrite: false,
    vertexShader: 'varying vec2 v;void main(){v=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 v;void main(){float d=length(v)*2.;float a=pow(max(1.-d,0.),2.2);vec3 bg=vec3(.0018,.0024,.0033);vec3 c=mix(vec3(.02,.42,.27),vec3(.05,.35,.45),v.y+.5);gl_FragColor=vec4(bg+c*a*.4,1.);}' }));
  fond.renderOrder = -1; scene.add(fond);

  // Poussières
  const NP = 700, pp = new Float32Array(NP * 3); for (let i = 0; i < NP * 3; i += 3) { pp[i] = (Math.random() - .5) * 16; pp[i + 1] = (Math.random() - .5) * 9; pp[i + 2] = Math.random() * 9 - 6; }
  const geoP = new THREE.BufferGeometry(); geoP.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const poussiere = new THREE.Points(geoP, new THREE.PointsMaterial({ color: hdr(CYAN.clone().lerp(VERT, .5), 1.4), size: .028, sizeAttenuation: true, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(poussiere);

  // Lumières colorées
  const l1 = new THREE.PointLight(VERT, 90, 0, 2); l1.position.set(4, 3, 5); scene.add(l1);
  const l2 = new THREE.PointLight(CYAN, 70, 0, 2); l2.position.set(-5, -1, 4); scene.add(l2);
  const l3 = new THREE.PointLight(LIME, 30, 0, 2); l3.position.set(1, -4, 3); scene.add(l3);

  // Rendu avec halo lumineux
  const cible = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, cible);
  composer.addPass(new RenderPass(scene, cam));
  const halo = new UnrealBloomPass(new THREE.Vector2(4, 4), .5, .75, .86); composer.addPass(halo);
  composer.addPass(new OutputPass());

  let asp = 1, large = true;
  const taille = () => { const w = hero.clientWidth, h = hero.clientHeight, q = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(q); renderer.setSize(w, h, false); composer.setPixelRatio(q); composer.setSize(w, h);
    asp = w / h; cam.aspect = asp; cam.updateProjectionMatrix(); large = asp > 1.15; };
  taille(); addEventListener('resize', taille);

  let mx = 0, my = 0, cx = 0, cy = 0, vu = true, actif = true, stop = false;
  const bouge = e => { const r = hero.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width * 2 - 1; my = (e.clientY - r.top) / r.height * 2 - 1; };
  hero.addEventListener('pointermove', bouge, { passive: true });
  const io = new IntersectionObserver(es => { vu = es[0].isIntersecting; }); io.observe(hero);
  const visib = () => { actif = !document.hidden; }; document.addEventListener('visibilitychange', visib);

  const hh = Math.tan(THREE.MathUtils.degToRad(16)) * 9; // demi-hauteur visible au niveau du H
  let avant = 0, n = 0, somme = 0, juge = force || calme;
  const image = ms => { if (stop) return;
    if (vu && actif) { const t = ms / 1000, sc = Math.max(0, Math.min(1, scrollY / hero.clientHeight));
      cx += (mx - cx) * .06; cy += (my - cy) * .06;
      const e = (large ? .8 : .5) * (1 - sc * .25);
      groupe.scale.setScalar(e);
      groupe.position.set(large ? hh * asp * .58 : hh * asp * .3, (large ? .05 : hh * .5) + Math.sin(t * .7) * .06 + sc * hh * 1.1, 0);
      groupe.rotation.set(-.08 + cy * .2, -.38 + Math.sin(t * .25) * .42 + cx * .35 + sc * 2.2, Math.sin(t * .17) * .04);
      anneaux[0].rotation.z = t * .35; anneaux[1].rotation.z = -t * .27; anneaux[2].rotation.z = t * .19;
      fond.position.set(groupe.position.x, groupe.position.y, -1.6); fond.scale.setScalar(e * 1.25);
      poussiere.rotation.y = t * .012 + cx * .05; poussiere.position.y = sc * 1.5;
      l1.position.set(4 * Math.cos(t * .3), 3, 5 * Math.abs(Math.sin(t * .3)) + 2); l2.position.set(-5 * Math.cos(t * .23), -1 + Math.sin(t * .4), 4);
      composer.render();
      // contrôle de fluidité sur les premières images
      if (!juge && avant) { const dt = ms - avant; if (n++ > 8) somme += dt; if (n === 28) { juge = true; if (somme / 20 > 34) { arreter(); surLent(); return; } } }
      avant = ms;
      if (!cv.classList.contains('ok')) cv.classList.add('ok'); } else avant = 0;
    if (!calme) requestAnimationFrame(image); };
  const arreter = () => { stop = true; removeEventListener('resize', taille); hero.removeEventListener('pointermove', bouge); io.disconnect(); document.removeEventListener('visibilitychange', visib);
    composer.dispose(); cible.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss(); };
  requestAnimationFrame(image);
  return { arreter };
}
