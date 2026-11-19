(function () {
  var wrapper = document.querySelector('[data-auth-scene]');
  if (!wrapper) return;

  var canvas = wrapper.querySelector('.auth-scene-canvas');
  var smallScreen = window.matchMedia('(max-width: 767px)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THREE = null;
  var threeModulePromise = null;
  var cleanupScene = null;
  var pageIsLeaving = false;

  function createFallback() {
    var fallback = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    fallback.setAttribute('class', 'auth-scene-fallback');
    fallback.setAttribute('viewBox', '0 0 520 360');
    fallback.setAttribute('focusable', 'false');
    fallback.innerHTML =
      '<defs>' +
        '<radialGradient id="auth-scene-glow">' +
          '<stop offset="0" stop-color="#F0EDE4" stop-opacity=".32"/>' +
          '<stop offset="1" stop-color="#004741" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<linearGradient id="auth-scene-coin" x1="0" x2="1" y1="0" y2="1">' +
          '<stop offset="0" stop-color="#F0EDE4" stop-opacity=".54"/>' +
          '<stop offset=".48" stop-color="#F0EDE4" stop-opacity=".12"/>' +
          '<stop offset="1" stop-color="#004741" stop-opacity=".38"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<circle class="scene-glow" cx="265" cy="170" r="120" fill="url(#auth-scene-glow)"/>' +
      '<ellipse class="scene-orbit scene-orbit-one" cx="260" cy="174" rx="190" ry="72"/>' +
      '<ellipse class="scene-orbit scene-orbit-two" cx="260" cy="174" rx="152" ry="105"/>' +
      '<g transform="translate(260 174)"><g class="scene-coin-motion scene-coin-one">' +
        '<circle r="49" fill="url(#auth-scene-coin)"/>' +
        '<circle r="42" fill="none" stroke="#F0EDE4" stroke-opacity=".65" stroke-width="2"/>' +
        '<circle r="31" fill="none" stroke="#F0EDE4" stroke-opacity=".28"/>' +
      '</g></g>' +
      '<g transform="translate(145 106)"><g class="scene-coin-motion scene-coin-two">' +
        '<circle r="31" fill="url(#auth-scene-coin)"/>' +
        '<circle r="25" fill="none" stroke="#F0EDE4" stroke-opacity=".58" stroke-width="2"/>' +
      '</g></g>' +
      '<g transform="translate(383 238)"><g class="scene-coin-motion scene-coin-three">' +
        '<circle r="23" fill="url(#auth-scene-coin)"/>' +
        '<circle r="18" fill="none" stroke="#F0EDE4" stroke-opacity=".58" stroke-width="1.5"/>' +
      '</g></g>' +
      '<g class="scene-particles" fill="#F0EDE4">' +
        '<circle cx="115" cy="115" r="2"/><circle cx="392" cy="94" r="2.5"/>' +
        '<circle cx="414" cy="232" r="1.8"/><circle cx="146" cy="251" r="2.2"/>' +
        '<circle cx="321" cy="285" r="1.6"/><circle cx="205" cy="72" r="1.5"/>' +
      '</g>';
    wrapper.appendChild(fallback);
  }

  createFallback();

  function showFallback() {
    wrapper.classList.remove('is-loading', 'is-webgl');
    wrapper.classList.add('is-ready');
  }

  function createScene() {
    // Keep small screens and browsers without Three.js on the lightweight SVG scene.
    if (smallScreen.matches || !THREE) {
      showFallback();
      return null;
    }

    wrapper.classList.add('is-loading');
    var renderer;
    try {
      var contextAttributes = {
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      };
      var context = canvas.getContext('webgl2', contextAttributes)
        || canvas.getContext('webgl', contextAttributes);
      if (!context) {
        showFallback();
        return null;
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
      return null;
    }

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    var assembly = new THREE.Group();
    var clock = new THREE.Clock();
    var animationFrame = 0;
    var focused = false;
    var pointerX = 0;
    var pointerY = 0;
    var targetX = 0;
    var targetY = 0;
    var materials = [];

    // An alpha-clear renderer lets the existing page gradient show through.
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    camera.position.set(0, 0, 7.8);
    camera.lookAt(0, 0, 0);
    scene.add(assembly);

    scene.add(new THREE.AmbientLight(0xF0EDE4, 1.15));

    var sandLight = new THREE.PointLight(0xF0EDE4, 3.2, 12);
    sandLight.position.set(-2.2, 2.4, 4);
    scene.add(sandLight);

    var tealLight = new THREE.PointLight(0x004741, 4.5, 10);
    tealLight.position.set(2.4, -1.6, 2.5);
    scene.add(tealLight);

    function trackMaterial(material) {
      materials.push(material);
      return material;
    }

    var glassMaterial = trackMaterial(new THREE.MeshPhysicalMaterial({
      color: 0xF0EDE4,
      metalness: 0.08,
      roughness: 0.2,
      transmission: 0.45,
      thickness: 0.32,
      transparent: true,
      opacity: 0.58,
      clearcoat: 1,
      clearcoatRoughness: 0.12
    }));

    var rimMaterial = trackMaterial(new THREE.MeshPhysicalMaterial({
      color: 0xF0EDE4,
      emissive: 0xF0EDE4,
      emissiveIntensity: 0.12,
      metalness: 0.18,
      roughness: 0.24,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1
    }));

    var ringMaterial = trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xF0EDE4,
      metalness: 0.12,
      roughness: 0.28,
      transparent: true,
      opacity: 0.48
    }));

    function addCoin(radius, position, phase, scale) {
      var coin = new THREE.Group();
      var body = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, radius * 0.16, 56, 1),
        glassMaterial
      );
      body.rotation.x = Math.PI / 2;
      coin.add(body);

      var edge = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.84, radius * 0.035, 8, 56),
        rimMaterial
      );
      edge.position.z = radius * 0.09;
      coin.add(edge);

      var innerRim = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.62, radius * 0.012, 6, 48),
        ringMaterial
      );
      innerRim.position.z = radius * 0.095;
      coin.add(innerRim);

      coin.position.set(position.x, position.y, position.z);
      coin.rotation.set(0.13 + phase * 0.08, -0.22 + phase * 0.12, phase * 0.4);
      coin.scale.setScalar(scale);
      coin.userData.float = { baseY: position.y, phase: phase, speed: 0.42 + phase * 0.08 };
      assembly.add(coin);
    }

    addCoin(0.76, { x: -0.18, y: 0.16, z: 0.1 }, 0.4, 1);
    addCoin(0.48, { x: 1.08, y: -0.42, z: -0.45 }, 1.9, 0.9);
    addCoin(0.34, { x: -1.18, y: -0.56, z: -0.3 }, 3.1, 0.86);

    var orbitOne = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.009, 8, 128),
      ringMaterial
    );
    orbitOne.rotation.set(1.04, 0.22, -0.18);
    assembly.add(orbitOne);

    var orbitTwo = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.006, 8, 128),
      rimMaterial
    );
    orbitTwo.rotation.set(0.62, -0.86, 0.24);
    assembly.add(orbitTwo);

    function makeGlowTexture() {
      var glowCanvas = document.createElement('canvas');
      glowCanvas.width = 128;
      glowCanvas.height = 128;
      var context = glowCanvas.getContext('2d');
      var gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(240,237,228,0.48)');
      gradient.addColorStop(0.28, 'rgba(240,237,228,0.16)');
      gradient.addColorStop(1, 'rgba(0,71,65,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);

      var texture = new THREE.CanvasTexture(glowCanvas);
      if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    var glowTexture = makeGlowTexture();
    var glowMaterial = trackMaterial(new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xF0EDE4,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));

    [
      { x: -1.05, y: 0.72, z: -0.8, size: 1.25 },
      { x: 1.12, y: -0.9, z: -0.7, size: 1.45 },
      { x: 0.4, y: 1.1, z: -1.1, size: 0.8 }
    ].forEach(function (position) {
      var orb = new THREE.Sprite(glowMaterial);
      orb.position.set(position.x, position.y, position.z);
      orb.scale.set(position.size, position.size, 1);
      assembly.add(orb);
    });

    var particlePositions = [];
    for (var index = 0; index < 36; index += 1) {
      var angle = index * 2.399963;
      var radius = 0.8 + (index % 7) * 0.21;
      particlePositions.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.62,
        -0.85 + (index % 5) * 0.22
      );
    }
    var particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(particlePositions, 3)
    );
    var particleMaterial = trackMaterial(new THREE.PointsMaterial({
      color: 0xF0EDE4,
      size: 0.026,
      transparent: true,
      opacity: 0.62,
      sizeAttenuation: true,
      depthWrite: false
    }));
    var particles = new THREE.Points(particleGeometry, particleMaterial);
    assembly.add(particles);

    wrapper.classList.add('is-webgl');

    function resize() {
      var bounds = wrapper.getBoundingClientRect();
      var width = Math.max(1, bounds.width);
      var height = Math.max(1, bounds.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      if (reducedMotion) renderer.render(scene, camera);
    }

    function update(time, delta) {
      targetX = pointerX * 0.22 + (focused ? 0.1 : 0);
      targetY = -pointerY * 0.14 + (focused ? -0.08 : 0);
      var ease = 1 - Math.exp(-delta * 3.5);
      camera.position.x += (targetX - camera.position.x) * ease;
      camera.position.y += (targetY - camera.position.y) * ease;
      camera.position.z += ((focused ? 8.15 : 7.8) - camera.position.z) * ease;
      camera.lookAt(0, 0, 0);

      assembly.rotation.y = pointerX * 0.08 + Math.sin(time * 0.16) * 0.025;
      assembly.rotation.x = pointerY * 0.045;
      orbitOne.rotation.z = time * 0.075;
      orbitTwo.rotation.z = -time * 0.055;
      particles.rotation.z = time * 0.018;

      assembly.children.forEach(function (child) {
        if (child.userData.float) {
          var motion = child.userData.float;
          child.position.y = motion.baseY + Math.sin(time * motion.speed + motion.phase) * 0.11;
          child.rotation.y += delta * 0.045;
        }
      });
    }

    function renderFrame(time, delta) {
      update(time, delta);
      renderer.render(scene, camera);
    }

    function animate() {
      animationFrame = 0;
      if (document.hidden || pageIsLeaving) return;
      var delta = Math.min(clock.getDelta(), 0.05);
      renderFrame(clock.elapsedTime, delta);
      animationFrame = window.requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (!reducedMotion && !document.hidden && !animationFrame && !pageIsLeaving) {
        clock.start();
        animationFrame = window.requestAnimationFrame(animate);
      }
    }

    function onPointerMove(event) {
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = 1 - (event.clientY / window.innerHeight) * 2;
    }

    function onFocusIn(event) {
      if (event.target.matches('.auth-card input, .auth-card textarea, .auth-card select')) {
        focused = true;
      }
    }

    function onFocusOut() {
      focused = !!document.activeElement.matches('.auth-card input, .auth-card textarea, .auth-card select');
    }

    function onVisibilityChange() {
      // Avoid drawing while backgrounded; resume the same scene when visible again.
      if (document.hidden) {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else {
        startAnimation();
      }
    }

    function disposeMaterial(material) {
      Object.keys(material).forEach(function (key) {
        var value = material[key];
        if (value && value.isTexture) value.dispose();
      });
      material.dispose();
    }

    function dispose(forceContextLoss) {
      // Release GPU allocations on breakpoint changes and page exit.
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resize);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      scene.traverse(function (object) {
        if (object.geometry) object.geometry.dispose();
      });
      materials.forEach(disposeMaterial);
      renderer.renderLists.dispose();
      renderer.dispose();
      if (forceContextLoss) renderer.forceContextLoss();
      wrapper.classList.remove('is-webgl', 'is-loading');
      wrapper.classList.add('is-ready');
    }

    resize();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('visibilitychange', onVisibilityChange);
    renderer.render(scene, camera);
    window.requestAnimationFrame(function () {
      wrapper.classList.remove('is-loading');
      wrapper.classList.add('is-ready');
      startAnimation();
    });

    return dispose;
  }

  function onScreenSizeChange() {
    if (cleanupScene) {
      cleanupScene();
      cleanupScene = null;
    }
    if (smallScreen.matches) showFallback();
    else loadThreeScene();
  }

  function loadThreeScene() {
    if (smallScreen.matches || pageIsLeaving) {
      showFallback();
      return;
    }

    wrapper.classList.add('is-loading');
    if (!threeModulePromise) {
      threeModulePromise = import('https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js');
    }
    threeModulePromise.then(function (threeModule) {
      if (pageIsLeaving || smallScreen.matches) {
        showFallback();
        return;
      }
      THREE = threeModule;
      if (cleanupScene) cleanupScene();
      cleanupScene = createScene();
    }).catch(function () {
      if (!pageIsLeaving) showFallback();
    });
  }

  function onPageLeave() {
    pageIsLeaving = true;
    if (cleanupScene) cleanupScene(true);
    smallScreen.removeEventListener('change', onScreenSizeChange);
    window.removeEventListener('pagehide', onPageLeave);
  }

  loadThreeScene();
  smallScreen.addEventListener('change', onScreenSizeChange);
  window.addEventListener('pagehide', onPageLeave, { once: true });
})();
