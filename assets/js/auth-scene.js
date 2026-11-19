(function () {
  var THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js';
  var body = document.body;
  var root = document.documentElement;
  var isDashboard = !!document.querySelector('.pft-app');
  var smallScreen = window.matchMedia('(max-width: 767px)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canvas = document.createElement('canvas');
  var fallback = document.createElement('div');
  var renderer = null;
  var scene = null;
  var camera = null;
  var geometry = null;
  var material = null;
  var clock = null;
  var frame = 0;
  var time = 0;
  var scriptPending = false;
  var pageIsLeaving = false;
  var pointerX = 0;
  var pointerY = 0;

  body.classList.toggle('aurora-dashboard', isDashboard);
  canvas.className = 'aurora-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  fallback.className = 'aurora-fallback';
  fallback.setAttribute('aria-hidden', 'true');
  body.insertBefore(canvas, body.firstChild);
  body.insertBefore(fallback, canvas.nextSibling);

  function isMotionAllowed() {
    return !smallScreen.matches
      && !document.hidden
      && !reducedMotion.matches
      && root.dataset.reduceMotion !== 'true'
      && !pageIsLeaving;
  }

  function showFallback() {
    body.classList.add('has-aurora-fallback');
    canvas.classList.remove('is-ready');
  }

  function showCanvas() {
    body.classList.remove('has-aurora-fallback');
    canvas.classList.add('is-ready');
  }

  function updateTheme() {
    if (!material) return;
    var lightTheme = root.dataset.theme === 'light';
    material.color.setHex(lightTheme ? 0x004741 : 0xF0EDE4);
    material.opacity = lightTheme
      ? (isDashboard ? 0.17 : 0.28)
      : (isDashboard ? 0.33 : 0.75);
    material.needsUpdate = true;
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function updateWave() {
    var positions = geometry.attributes.position.array;
    for (var index = 0; index < positions.length; index += 3) {
      var x = positions[index];
      var z = positions[index + 2];
      positions[index + 1] = Math.sin(x * 0.5 + time) * 0.7
        + Math.cos(z * 0.6 + time * 0.8) * 0.6
        + Math.sin((x + z) * 0.3 + time * 0.5) * 0.5;
    }
    geometry.attributes.position.needsUpdate = true;
  }

  function renderFrame() {
    if (!renderer || !scene || !camera) return;
    updateWave();
    renderer.render(scene, camera);
  }

  function stopAnimation() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }

  function animate() {
    frame = 0;
    if (!renderer || !isMotionAllowed()) return;

    time += Math.min(clock.getDelta(), 0.05) * (isDashboard ? 0.11 : 0.22);
    camera.position.x += (pointerX * 2 - camera.position.x) * 0.04;
    camera.position.y += (4.5 + pointerY * 1.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderFrame();
    frame = window.requestAnimationFrame(animate);
  }

  function syncMotion() {
    if (!renderer) return;
    if (isMotionAllowed()) {
      if (!frame) {
        clock.start();
        frame = window.requestAnimationFrame(animate);
      }
      return;
    }
    stopAnimation();
    if (reducedMotion.matches || root.dataset.reduceMotion === 'true') time = 0;
    renderFrame();
  }

  function resize() {
    if (!renderer || !camera) return;
    var width = Math.max(1, window.innerWidth);
    var height = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderFrame();
  }

  function onPointerMove(event) {
    if (!isMotionAllowed()) return;
    pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    pointerY = 1 - (event.clientY / window.innerHeight) * 2;
  }

  function disposeRenderer(forceContextLoss) {
    stopAnimation();
    if (geometry) geometry.dispose();
    if (material) material.dispose();
    if (renderer) {
      renderer.renderLists.dispose();
      renderer.dispose();
      if (forceContextLoss) renderer.forceContextLoss();
    }
    renderer = null;
    scene = null;
    camera = null;
    geometry = null;
    material = null;
  }

  function createScene() {
    if (pageIsLeaving || smallScreen.matches || !window.THREE) {
      showFallback();
      return;
    }

    var THREE = window.THREE;
    var context;
    try {
      var attributes = { alpha: true, antialias: true, powerPreference: 'low-power' };
      context = canvas.getContext('webgl2', attributes)
        || canvas.getContext('webgl', attributes);
      if (!context) {
        showFallback();
        return;
      }
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        context: context,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      });
    } catch (error) {
      showFallback();
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 4.5, 12);
    camera.lookAt(0, 0, 0);

    var columns = 110;
    var rows = 70;
    var spacing = 0.4;
    var positions = new Float32Array(columns * rows * 3);
    var pointIndex = 0;
    for (var row = 0; row < rows; row += 1) {
      for (var column = 0; column < columns; column += 1) {
        positions[pointIndex] = (column - (columns - 1) / 2) * spacing;
        positions[pointIndex + 1] = 0;
        positions[pointIndex + 2] = (row - (rows - 1) / 2) * spacing;
        pointIndex += 3;
      }
    }

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 30);
    material = new THREE.PointsMaterial({
      color: 0xF0EDE4,
      size: 0.05,
      transparent: true,
      opacity: isDashboard ? 0.33 : 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    scene.add(new THREE.Points(geometry, material));
    clock = new THREE.Clock();

    updateTheme();
    resize();
    showCanvas();
    renderFrame();
    syncMotion();
  }

  function loadThree() {
    if (scriptPending || pageIsLeaving) return;
    scriptPending = true;
    var script = document.createElement('script');
    script.src = THREE_CDN;
    script.async = true;
    script.onload = function () {
      scriptPending = false;
      createScene();
    };
    script.onerror = function () {
      scriptPending = false;
      showFallback();
    };
    document.head.appendChild(script);
  }

  function startScene() {
    if (smallScreen.matches) {
      showFallback();
    } else if (window.THREE) {
      createScene();
    } else {
      showFallback();
      loadThree();
    }
  }

  function onScreenSizeChange() {
    if (smallScreen.matches) {
      disposeRenderer(false);
      showFallback();
    } else if (!renderer) {
      startScene();
    }
  }

  function onVisibilityChange() {
    if (document.hidden) stopAnimation();
    else syncMotion();
  }

  function onPageLeave() {
    pageIsLeaving = true;
    disposeRenderer(true);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pft-theme-change', updateTheme);
    window.removeEventListener('pft-v2-state-change', syncMotion);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    smallScreen.removeEventListener('change', onScreenSizeChange);
    reducedMotion.removeEventListener('change', syncMotion);
    if (themeObserver) themeObserver.disconnect();
  }

  var themeObserver = new MutationObserver(updateTheme);
  themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pft-theme-change', updateTheme);
  window.addEventListener('pft-v2-state-change', syncMotion);
  document.addEventListener('visibilitychange', onVisibilityChange);
  smallScreen.addEventListener('change', onScreenSizeChange);
  reducedMotion.addEventListener('change', syncMotion);
  window.addEventListener('pagehide', onPageLeave, { once: true });

  startScene();
})();
