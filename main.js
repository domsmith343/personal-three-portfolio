import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

// Enhanced Three.js Scene Setup with Nebula Shader Effects
      const isMobile = window.innerWidth < 768;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      let composer, bloomPass, filmPass, starSystem, galaxyGroup, starOriginalSizes, starTwinkleSpeeds, starTwinklePhases, shootingStarSystem, shootingStarData = []; // Removed shootingStarLifetime and shootingStarSpeed as they are part of shootingStarData
      const renderer = new THREE.WebGLRenderer({
        antialias: !isMobile, // Disable antialias on mobile
        alpha: true,
      });
      const clock = new THREE.Clock();

      // Responsive renderer and camera for mobile
      function setRendererAndCameraSize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (window.innerWidth < 600) {
          camera.fov = 90;
        } else {
          camera.fov = 75;
        }
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        if (composer) {
          composer.setSize(window.innerWidth, window.innerHeight);
        }
        if (bloomPass) {
          bloomPass.resolution.set(window.innerWidth, window.innerHeight);
        }
      }
      setRendererAndCameraSize();
      renderer.setClearColor(0x000814, 1); // Deep space background
      document
        .getElementById("canvas-container")
        .appendChild(renderer.domElement);

      // Post-processing setup
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

// Optimized bloom parameters based on device
const bloomParams = {
  strength: isMobile ? 1.2 : 1.5,  // Slightly less intense on mobile to save performance
  radius: isMobile ? 0.3 : 0.4,    // Smaller radius on mobile for better performance
  threshold: 0.7,                  // Lower threshold makes more elements bloom
};
bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        bloomParams.strength,
        bloomParams.radius,
        bloomParams.threshold
      );
      composer.addPass(bloomPass);

      // Film Grain Pass
      filmPass = new FilmPass(
        0.35,  // noise intensity
        0.025, // scanline intensity
        648,   // scanline count
        false  // grayscale
      );
      composer.addPass(filmPass);

      // Nebula Shader Material
      const nebulaVertexShader = `
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

      const nebulaFragmentShader = `
            uniform float uTime;
            uniform float uIntensity;
            uniform float uSpeed;
            uniform float uColorShift;
            varying vec2 vUv;
            varying vec3 vPosition;
            
            // Simplex noise function
            vec3 mod289(vec3 x) {
                return x - floor(x * (1.0 / 289.0)) * 289.0;
            }
            
            vec4 mod289(vec4 x) {
                return x - floor(x * (1.0 / 289.0)) * 289.0;
            }
            
            vec4 permute(vec4 x) {
                return mod289(((x*34.0)+1.0)*x);
            }
            
            vec4 taylorInvSqrt(vec4 r) {
                return 1.79284291400159 - 0.85373472095314 * r;
            }
            
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                
                vec3 i = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                
                i = mod289(i);
                vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;
                
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }
            
            void main() {
                vec2 uv = vUv;
                vec3 pos = vPosition * 0.015;
                
                float time = uTime * uSpeed * 0.3;
                
                // Create flowing nebula patterns with multiple noise octaves
                float noise1 = snoise(pos + vec3(time * 0.1, time * 0.15, time * 0.1));
                float noise2 = snoise(pos * 2.5 + vec3(time * 0.2, -time * 0.1, time * 0.2)) * 0.4;
                float noise3 = snoise(pos * 5.0 + vec3(-time * 0.15, time * 0.25, -time * 0.1)) * 0.2;
                
                float combinedNoise = noise1 + noise2 + noise3;
                
                // Create spiral galaxy arms
                vec2 center = vec2(0.5, 0.5);
                vec2 toCenter = uv - center;
                float angle = atan(toCenter.y, toCenter.x);
                float radius = length(toCenter);
                
                float spiralArms = sin(angle * 2.0 + radius * 8.0 - time * 1.5) * 0.3 + 0.7;
                
                // Combine patterns
                float density = (combinedNoise * 0.7 + spiralArms * 0.3) * 0.5 + 0.5;
                density = smoothstep(0.25, 0.75, density);
                
                // Dynamic color mixing
                float colorPhase = (snoise(pos * 0.8 + vec3(time * 0.05)) + 1.0) * 0.5;
                colorPhase = mod(colorPhase + uColorShift, 1.0);
                
                vec3 color1 = vec3(0.1, 0.05, 0.6);   // Deep blue
                vec3 color2 = vec3(0.6, 0.1, 0.4);    // Magenta  
                vec3 color3 = vec3(0.05, 0.6, 0.7);   // Cyan
                vec3 color4 = vec3(0.7, 0.3, 0.05);   // Orange
                vec3 color5 = vec3(0.4, 0.1, 0.6);    // Purple
                
                vec3 nebulaColor;
                if (colorPhase < 0.2) {
                    nebulaColor = mix(color1, color2, colorPhase * 5.0);
                } else if (colorPhase < 0.4) {
                    nebulaColor = mix(color2, color3, (colorPhase - 0.2) * 5.0);
                } else if (colorPhase < 0.6) {
                    nebulaColor = mix(color3, color4, (colorPhase - 0.4) * 5.0);
                } else if (colorPhase < 0.8) {
                    nebulaColor = mix(color4, color5, (colorPhase - 0.6) * 5.0);
                } else {
                    nebulaColor = mix(color5, color1, (colorPhase - 0.8) * 5.0);
                }
                
                // Distance-based intensity falloff
                float falloff = 1.0 - smoothstep(0.0, 0.8, radius);
                falloff = falloff * falloff;
                
                // Final alpha with breathing effect
                float breathe = sin(time * 0.5) * 0.1 + 0.9;
                float alpha = density * uIntensity * falloff * breathe * 0.4;
                
                gl_FragColor = vec4(nebulaColor, alpha);
            }
        `;

      // Create nebula system
      const nebulaGroup = new THREE.Group();
      const nebulaLayers = [];

      // Create multiple nebula layers for depth and complexity
      const nebulaLayerCount = isMobile ? 2 : 4; // Fewer layers on mobile
      for (let i = 0; i < nebulaLayerCount; i++) {
        const geometry = new THREE.PlaneGeometry(100, 100, 1, 1);
        const material = new THREE.ShaderMaterial({
          vertexShader: nebulaVertexShader,
          fragmentShader: nebulaFragmentShader,
          uniforms: {
            uTime: { value: 0 },
            uIntensity: { value: 0.8 - i * 0.15 },
            uSpeed: { value: 1.0 + i * 0.3 },
            uColorShift: { value: i * 0.25 },
          },
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

        const nebula = new THREE.Mesh(geometry, material);
        nebula.position.z = -10 - i * 12;
        nebula.rotation.z = (i * Math.PI) / 4;
        nebula.rotation.x = Math.PI / 6;

        nebulaLayers.push(nebula);
        nebulaGroup.add(nebula);
      }

      scene.add(nebulaGroup);

      // Enhanced Galaxy Star System
      galaxyGroup = new THREE.Group();
      scene.add(galaxyGroup);

      const galaxyParams = {
        starCount: isMobile ? 5000 : 12000, // Fewer stars on mobile
        galaxyRadius: 35,
        spiralArms: 4,
        spiralTightness: 0.3,
        galaxyHeight: 4,
        coreRadius: 4,
        rotationSpeed: 0.0008,
      };

      // Create star systems
      const starGeometry = new THREE.BufferGeometry();
      const starPositions = new Float32Array(galaxyParams.starCount * 3);
      const starColors = new Float32Array(galaxyParams.starCount * 3);
      const starSizes = new Float32Array(galaxyParams.starCount);
      
      // Arrays for star twinkling animation
      starOriginalSizes = new Float32Array(galaxyParams.starCount);
      starTwinkleSpeeds = new Float32Array(galaxyParams.starCount);
      starTwinklePhases = new Float32Array(galaxyParams.starCount);

      // Generate spiral galaxy structure
      for (let i = 0; i < galaxyParams.starCount; i++) {
        const i3 = i * 3;

        const radius = Math.pow(Math.random(), 0.6) * galaxyParams.galaxyRadius;
        const baseAngle = Math.random() * Math.PI * 2;
        const spiralAngle = radius * galaxyParams.spiralTightness;
        const armOffset =
          Math.floor(Math.random() * galaxyParams.spiralArms) *
          ((Math.PI * 2) / galaxyParams.spiralArms);
        const angle = baseAngle + spiralAngle + armOffset;
        const angleNoise = (Math.random() - 0.5) * 0.4;
        const finalAngle = angle + angleNoise;

        const x = Math.cos(finalAngle) * radius;
        const z = Math.sin(finalAngle) * radius;
        const y =
          (Math.random() - 0.5) *
          galaxyParams.galaxyHeight *
          (1 - radius / galaxyParams.galaxyRadius);

        starPositions[i3] = x;
        starPositions[i3 + 1] = y;
        starPositions[i3 + 2] = z;

        // Enhanced star colors
        const coreDistance = radius / galaxyParams.galaxyRadius;
        const temperature = Math.random();

        let color;
        if (radius < galaxyParams.coreRadius) {
          // Core stars - bright yellow/white
          color = new THREE.Color().setHSL(
            0.1 + Math.random() * 0.1,
            0.6,
            0.9 + Math.random() * 0.1
          );
        } else if (temperature < 0.2) {
          // Hot blue giants
          color = new THREE.Color().setHSL(
            0.6 + Math.random() * 0.1,
            0.9,
            0.8 + Math.random() * 0.2
          );
        } else if (temperature < 0.5) {
          // White/blue main sequence
          color = new THREE.Color().setHSL(
            0.55 + Math.random() * 0.15,
            0.7,
            0.8 + Math.random() * 0.2
          );
        } else if (temperature < 0.8) {
          // Yellow/white stars
          color = new THREE.Color().setHSL(
            0.15 + Math.random() * 0.1,
            0.6,
            0.8 + Math.random() * 0.2
          );
        } else {
          // Red dwarf stars
          color = new THREE.Color().setHSL(
            0.0 + Math.random() * 0.05,
            0.8,
            0.6 + Math.random() * 0.2
          );
        }

        starColors[i3] = color.r;
        starColors[i3 + 1] = color.g;
        starColors[i3 + 2] = color.b;

        // Variable star sizes
        const baseSize = 0.08;
        const sizeVariation = Math.random() * 0.12;
        const distanceSize = (1 - coreDistance * 0.6) * 0.08;
        const size = baseSize + sizeVariation + distanceSize;
        
        // Store original size for twinkling animation
        starSizes[i] = size;
        starOriginalSizes[i] = size;
        
        // Each star gets a random twinkling speed and phase
        starTwinkleSpeeds[i] = 0.3 + Math.random() * 2; // Random speed between 0.3 and 2.3
        starTwinklePhases[i] = Math.random() * Math.PI * 2; // Random starting phase
      }

      starGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(starPositions, 3)
      );
      starGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(starColors, 3)
      );
      starGeometry.setAttribute(
        "size",
        new THREE.BufferAttribute(starSizes, 1)
      );

      const starMaterial = new THREE.PointsMaterial({
        size: 0.1,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });

      starSystem = new THREE.Points(starGeometry, starMaterial);
      galaxyGroup.add(starSystem);

      // Shooting Star System with Tails
      const numShootingStars = 7; // Number of conceptual shooting stars
      const pointsPerShootingStar = 15; // Head + 14 tail segments for a longer tail for a longer tail
      const totalShootingStarPoints = numShootingStars * pointsPerShootingStar;

      shootingStarData = []; // Array to hold state for each conceptual shooting star

      const shootingStarGeometry = new THREE.BufferGeometry();
      const shootingStarPositions = new Float32Array(totalShootingStarPoints * 3);
      const shootingStarColors = new Float32Array(totalShootingStarPoints * 3);
      const shootingStarOpacities = new Float32Array(totalShootingStarPoints); // For fading tails
      const shootingStarSizes = new Float32Array(totalShootingStarPoints);     // For shrinking tails

      for (let i = 0; i < numShootingStars; i++) {
        shootingStarData.push({
          headPosition: new THREE.Vector3(
            (Math.random() - 0.5) * 300, // Initial far-off-screen X
            (Math.random() - 0.5) * 300, // Initial far-off-screen Y
            (Math.random() - 0.5) * 300  // Initial far-off-screen Z
          ),
          velocity: new THREE.Vector3(),
          lifetime: 0,
          currentLifetime: 0,
          speed: Math.random() * 50 + 40, // Speed: 40 to 90 units/sec
          isActive: false,
          tailPositions: [] // Stores previous head positions for smooth tail
        });

        for (let j = 0; j < pointsPerShootingStar; j++) {
          const pointIndex = i * pointsPerShootingStar + j;
          // All points of a star start at the same initial head position (off-screen)
          shootingStarPositions[pointIndex * 3] = shootingStarData[i].headPosition.x;
          shootingStarPositions[pointIndex * 3 + 1] = shootingStarData[i].headPosition.y;
          shootingStarPositions[pointIndex * 3 + 2] = shootingStarData[i].headPosition.z;

          if (j === 0) { // Head
            shootingStarColors[pointIndex * 3] = 1.0; // Bright white
            shootingStarColors[pointIndex * 3 + 1] = 1.0;
            shootingStarColors[pointIndex * 3 + 2] = 1.0;
            shootingStarOpacities[pointIndex] = 0.0; // Start inactive, opacity set when active
            shootingStarSizes[pointIndex] = 0.35; // Head size
          } else { // Tail segments
            const tailFactor = Math.max(0, (pointsPerShootingStar - j -1)) / (pointsPerShootingStar-1) ;
            shootingStarColors[pointIndex * 3] = 0.7 + 0.3 * tailFactor; // Fading to a slightly bluish white
            shootingStarColors[pointIndex * 3 + 1] = 0.7 + 0.3 * tailFactor;
            shootingStarColors[pointIndex * 3 + 2] = 0.8 + 0.2 * tailFactor;
            shootingStarOpacities[pointIndex] = 0.0; // Tail segments also start inactive
            shootingStarSizes[pointIndex] = 0.35 * tailFactor * 0.7; // Shrinking size, ensure tail is smaller
          }
        }
      }

      shootingStarGeometry.setAttribute('position', new THREE.BufferAttribute(shootingStarPositions, 3));
      shootingStarGeometry.setAttribute('color', new THREE.BufferAttribute(shootingStarColors, 3));
      shootingStarGeometry.setAttribute('alpha', new THREE.BufferAttribute(shootingStarOpacities, 1));
      shootingStarGeometry.setAttribute('size', new THREE.BufferAttribute(shootingStarSizes, 1));

      const shootingStarVertexShader = `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
            vAlpha = alpha;
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            // Make size slightly larger and more responsive to distance
            gl_PointSize = size * (400.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
      `;

      const shootingStarFragmentShader = `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
            if (vAlpha < 0.01) discard; // Don't render if almost fully transparent
            float d = distance(gl_PointCoord, vec2(0.5, 0.5));
            // Softer edge for the points
            float strength = 1.0 - smoothstep(0.4, 0.5, d);
            if (strength < 0.01) discard;
            gl_FragColor = vec4(vColor, vAlpha * strength);
        }
      `;

      const shootingStarMaterial = new THREE.ShaderMaterial({
        vertexShader: shootingStarVertexShader,
        fragmentShader: shootingStarFragmentShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
      });

      shootingStarSystem = new THREE.Points(shootingStarGeometry, shootingStarMaterial);
      scene.add(shootingStarSystem);

      // Enhanced cosmic dust
      const dustCount = 4000;
      const dustGeometry = new THREE.BufferGeometry();
      const dustPositions = new Float32Array(dustCount * 3);
      const dustColors = new Float32Array(dustCount * 3);

      for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;

        const radius =
          Math.pow(Math.random(), 0.4) * galaxyParams.galaxyRadius * 1.3;
        const angle = Math.random() * Math.PI * 2;
        const spiralAngle = radius * galaxyParams.spiralTightness * 0.6;

        dustPositions[i3] = Math.cos(angle + spiralAngle) * radius;
        dustPositions[i3 + 1] =
          (Math.random() - 0.5) * galaxyParams.galaxyHeight * 1.5;
        dustPositions[i3 + 2] = Math.sin(angle + spiralAngle) * radius;

        // Dust colors that complement nebula
        const dustHue = 0.6 + Math.random() * 0.3; // Blue to purple range
        const color = new THREE.Color().setHSL(
          dustHue,
          0.7,
          0.3 + Math.random() * 0.4
        );
        dustColors[i3] = color.r;
        dustColors[i3 + 1] = color.g;
        dustColors[i3 + 2] = color.b;
      }

      dustGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(dustPositions, 3)
      );
      dustGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(dustColors, 3)
      );

      const dustMaterial = new THREE.PointsMaterial({
        size: 0.03,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });

      const dustSystem = new THREE.Points(dustGeometry, dustMaterial);
      galaxyGroup.add(dustSystem);

      // Camera positioning
      camera.position.set(0, 20, 40);
      camera.lookAt(0, 0, 0);

      // Enhanced mouse interaction
      const mouse = { x: 0, y: 0 };
      const targetRotation = { x: 0, y: 0 };
      const currentRotation = { x: 0, y: 0 };

      document.addEventListener("mousemove", (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        targetRotation.x = mouse.y * 0.25; // Camera vertical rotation
        targetRotation.y = mouse.x * 0.35; // Camera horizontal rotation

        // Add direct subtle rotation to the galaxy itself
        // This is in addition to the automatic rotation and camera-driven rotation
        if (galaxyGroup) {
          galaxyGroup.rotation.x += mouse.y * 0.0005; // Subtle vertical tilt
          galaxyGroup.rotation.y += mouse.x * 0.0005; // Subtle horizontal turn
        }

        // Update custom cursor
        const cursor = document.querySelector(".custom-cursor");
        if (cursor) {
          cursor.style.left = event.clientX + "px";
          cursor.style.top = event.clientY + "px";
        }
      });

      // Scroll-based camera animation
      let lastScrollY = window.scrollY;
      let targetCameraZ = 40;

      window.addEventListener("scroll", () => {
        const scrollY = window.scrollY;
        const scrollDelta = scrollY - lastScrollY;
        lastScrollY = scrollY;

        // Adjust camera Z position based on scroll
        targetCameraZ -= scrollDelta * 0.03;
        targetCameraZ = Math.max(10, Math.min(60, targetCameraZ));
      });

      // Main animation loop
      function animate() {
        requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        // Update nebula uniforms
        nebulaLayers.forEach((layer) => {
          layer.material.uniforms.uTime.value = elapsedTime;
        });

        // Smooth camera rotation
        currentRotation.x += (targetRotation.x - currentRotation.x) * 0.05;
        currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05;

        // Apply parallax rotation
        galaxyGroup.rotation.x = currentRotation.x;
        galaxyGroup.rotation.y = currentRotation.y;
        nebulaGroup.rotation.x = currentRotation.x * 0.5; // Nebula rotates at half the speed
        nebulaGroup.rotation.y = currentRotation.y * 0.5; // Nebula rotates at half the speed

        // Automatic galaxy rotation
        galaxyGroup.rotation.y += galaxyParams.rotationSpeed;
        
        // Star twinkling animation
        if (starSystem && starSystem.geometry && starOriginalSizes) {
          const geometry = starSystem.geometry;
          const sizesAttribute = geometry.getAttribute('size');
          
          if (sizesAttribute) {
            
            
            // Update each star's size based on its unique twinkling pattern
            for (let i = 0; i < galaxyParams.starCount; i++) {
              const phase = starTwinklePhases[i];
              const speed = starTwinkleSpeeds[i];
              const originalSize = starOriginalSizes[i];
              
              // Calculate the twinkle factor (oscillating between 0.7 and 1.3)
              const twinkleFactor = 1.0 + 0.5 * Math.sin((elapsedTime * speed) + phase); // Range 0.5 to 1.5
              
              // Apply the twinkle factor to the original size
              sizesAttribute.array[i] = originalSize * twinkleFactor;
            }
            
            sizesAttribute.needsUpdate = true;
          }
        }

        // Smooth camera zoom
        camera.position.z += (targetCameraZ - camera.position.z) * 0.05;

        // Animate floating elements
        const floatingElements = document.querySelectorAll(".floating-element");
        floatingElements.forEach((el, index) => {
          const speed = 0.5 + index * 0.2;
          const phase = index * 2.0;
          el.style.transform = `translateY(${Math.sin(elapsedTime * speed + phase) * 20}px) rotate(${elapsedTime * 15 * (index + 1)}deg)`;
        });

        // renderer.render(scene, camera); // Replaced by composer.render()
        // Shooting Star Animation with Tails (Corrected and Completed)
        if (shootingStarSystem && typeof shootingStarData !== 'undefined' && shootingStarData.length > 0) {
            const now = clock.getElapsedTime();
            let deltaTime = now - (shootingStarSystem.lastUpdateTime || now);
            
            // Guard against problematic deltaTime values
            if (deltaTime <= 0 || deltaTime > 0.2) { 
                deltaTime = 1 / 60; // Default to 60 FPS if delta is too large or invalid
            }
            shootingStarSystem.lastUpdateTime = now;

            const positionsAttribute = shootingStarSystem.geometry.attributes.position;
            const opacitiesAttribute = shootingStarSystem.geometry.attributes.alpha;
            const sizesAttribute = shootingStarSystem.geometry.attributes.size;
            const numConceptualStars = shootingStarData.length;
            const pointsPerStar = shootingStarSystem.geometry.attributes.position.count / numConceptualStars;

            let activeStarCount = 0;
            shootingStarData.forEach(s => { if(s.isActive) activeStarCount++; });

            for (let i = 0; i < numConceptualStars; i++) {
                const star = shootingStarData[i];

                if (star.isActive) {
                    star.headPosition.addScaledVector(star.velocity, deltaTime);
                    star.currentLifetime -= deltaTime;

                    // Add current head position to the front of tail history
                    star.tailPositions.unshift(new THREE.Vector3().copy(star.headPosition));
                    // Keep tail history length limited to number of points per star (head + tail segments)
                    if (star.tailPositions.length > pointsPerStar) {
                        star.tailPositions.pop();
                    }
                    
                    // Update all points (head + tail segments)
                    for (let j = 0; j < pointsPerStar; j++) {
                        const pointIndex = i * pointsPerStar + j;
                        // Use historical position for tail, current for head or if history is short
                        let currentPos = (j < star.tailPositions.length) ? star.tailPositions[j] : star.headPosition;
                        
                        positionsAttribute.setXYZ(pointIndex, currentPos.x, currentPos.y, currentPos.z);

                        if (j === 0) { // Head
                            opacitiesAttribute.array[pointIndex] = star.currentLifetime > 0 ? 1.0 : 0.0; // Head is visible if star is alive
                            sizesAttribute.array[pointIndex] = 0.35; // Head size (as per initialization)
                        } else { // Tail segments
                            const tailProgress = Math.max(0, star.currentLifetime / star.lifetime); // How much of lifetime is left
                            // SegmentFactor: 1 for segment closest to head, 0 for last segment
                            const segmentFactor = Math.max(0, (pointsPerStar - 1 - j)) / (pointsPerStar - 1);
                            // Use Math.pow to create a non-linear falloff, making the tail brighter for longer
                            opacitiesAttribute.array[pointIndex] = Math.pow(segmentFactor, 0.5) * tailProgress; 
                            sizesAttribute.array[pointIndex] = 0.35 * Math.pow(segmentFactor, 0.7) * tailProgress;
                        }
                    }

                    const boundaryRadius = galaxyParams.galaxyRadius * 3; // Define a boundary for deactivation
                    if (star.currentLifetime <= 0 || star.headPosition.length() > boundaryRadius) {
                        star.isActive = false;
                        // Make all points of this star invisible immediately upon deactivation
                        for (let j = 0; j < pointsPerStar; j++) {
                           opacitiesAttribute.array[i * pointsPerStar + j] = 0.0;
                        }
                    }
                } else {
                    // Chance to reactivate an inactive star, only if we're below the max count
                    if (activeStarCount < 2 && Math.random() < 0.015 * deltaTime * 60) { // Slightly increased chance to compensate for the hard cap
                        star.isActive = true;
                        activeStarCount++; // Increment count immediately
                        const edgeOffset = galaxyParams.galaxyRadius * 2.2; // Start slightly further out
                        const side = Math.floor(Math.random() * 6); // Random side of a cube for starting position
                        const randVal = () => (Math.random() - 0.5) * 2 * edgeOffset * 0.7; // Random coordinate value

                        if (side === 0) star.headPosition.set(randVal(), edgeOffset, randVal());         // Top
                        else if (side === 1) star.headPosition.set(randVal(), -edgeOffset, randVal());    // Bottom
                        else if (side === 2) star.headPosition.set(edgeOffset, randVal(), randVal());     // Right
                        else if (side === 3) star.headPosition.set(-edgeOffset, randVal(), randVal());    // Left
                        else if (side === 4) star.headPosition.set(randVal(), randVal(), edgeOffset);     // Front
                        else star.headPosition.set(randVal(), randVal(), -edgeOffset);    // Back
                        
                        // Target a point within the central region of the galaxy
                        const targetPoint = new THREE.Vector3(
                            (Math.random() - 0.5) * galaxyParams.galaxyRadius * 0.4, // More central target
                            (Math.random() - 0.5) * galaxyParams.galaxyRadius * 0.4,
                            (Math.random() - 0.5) * galaxyParams.galaxyRadius * 0.4
                        );
                        star.velocity.subVectors(targetPoint, star.headPosition).normalize().multiplyScalar(star.speed);
                        
                        star.lifetime = Math.random() * 2.5 + 2.0; // Lifetime: 2.0 to 4.5 seconds
                        star.currentLifetime = star.lifetime;
                        star.tailPositions = []; // Clear tail history
                        // Pre-fill tail history with current head position so tail doesn't jump on first frame
                        for(let k=0; k < pointsPerStar; ++k) star.tailPositions.push(new THREE.Vector3().copy(star.headPosition));
                        
                        // Ensure head opacity is set correctly on activation
                        opacitiesAttribute.array[i * pointsPerStar] = 1.0;
                    }
                }
            }
            positionsAttribute.needsUpdate = true;
            opacitiesAttribute.needsUpdate = true;
            sizesAttribute.needsUpdate = true;
        }

        if (composer) composer.render();
      }

      // Hide loader when everything is ready
      window.addEventListener('load', () => {
        const loader = document.getElementById('loader');
        if (loader) {
          loader.classList.add('hidden');
        }
      });

      animate();

      // Handle window resize
      window.addEventListener("resize", () => {
        setRendererAndCameraSize();
      });

      // Smooth scrolling for navigation
      document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
          e.preventDefault();
          document.querySelector(this.getAttribute("href")).scrollIntoView({
            behavior: "smooth",
          });
        });
      });

      // Intersection Observer for section animations
      const sections = document.querySelectorAll(".section");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
            } else {
              entry.target.classList.remove("visible");
            }
          });
        },
        {
          threshold: 0.2,
        }
      );

      sections.forEach((section) => {
        observer.observe(section);
      });
