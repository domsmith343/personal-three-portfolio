import * as THREE from "three";

// A quiet star field behind the hero. One Points object instead of the old
// nebula, bloom and shooting-star passes: same idea, a fraction of the GPU cost.
const root = document.documentElement;
const starField = createStarField(document.getElementById("stars"));
starField?.recolor();
document.addEventListener("themechange", () => starField?.recolor());

function createStarField(canvas) {
  if (!canvas) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  } catch (e) {
    return null; // No WebGL: the hero just shows the plain background.
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 1, 100);
  camera.position.z = 30;

  const count = window.innerWidth < 768 ? 350 : 700;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ size: 0.18, transparent: true, sizeAttenuation: true });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(canvas);

  // Stars take the theme's accent color; fainter on the white page so text stays easy to read.
  function recolor() {
    const accent = getComputedStyle(root).getPropertyValue("--accent").trim();
    material.color.set(accent || "#1d6b47");
    material.opacity = root.getAttribute("data-theme") === "dark" ? 0.75 : 0.45;
    renderer.render(scene, camera);
  }

  // Motion: a slow drift, skipped for reduced-motion visitors and paused when the hero is off screen.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true;
  let frame = null;
  const clock = new THREE.Clock();

  function tick() {
    const t = clock.getElapsedTime();
    points.rotation.y = t * 0.015;
    points.rotation.x = Math.sin(t * 0.05) * 0.05;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }
  function update() {
    const shouldRun = visible && !reduceMotion.matches && !document.hidden;
    if (shouldRun && frame === null) {
      clock.start();
      frame = requestAnimationFrame(tick);
    } else if (!shouldRun && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(canvas);
  reduceMotion.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);

  resize();
  update();
  return { recolor };
}
