//MARE CON SPECCHIO OK

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as dat from 'dat.gui';
import { Reflector } from 'three/examples/jsm/objects/Reflector'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';


let gui;
let controls;
let onWindowResize;

export function sketch() {
  // console.log("Sketch launched")

  gui = new dat.GUI({ closed: false, width: 340 });
  const bigWavesFolder = gui.addFolder("Large Waves");
  const smallWavesFolder = gui.addFolder("Small Waves");
  const colorFolder = gui.addFolder("Colors");
  
  const debugObject = {
    waveDepthColor: "#a2a2a2",
    waveSurfaceColor: "#bb6666",
    fogNear: 10,
    fogFar: 0,
    fogColor: "#A34739"
  };


  // SCENE
  const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(
    debugObject.fogColor,
    debugObject.fogNear,
    debugObject.fogFar
  );
  scene.background = new THREE.Color(debugObject.fogColor);

  const waterGeometry = new THREE.PlaneGeometry(30, 30, 512, 512);

  // Load EXR texture
  const exrLoader = new EXRLoader();
  exrLoader.load('./assets/textures/table_mountain_2_puresky_4k.exr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
  });

  // MATERIALE SHADER
  const waterMaterial = new THREE.ShaderMaterial({
    transparent: true,
    fog: true,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uBigWavesElevation: { value: 0.2 },
      uBigWavesFrequency: { value: new THREE.Vector2(4, 2) },
      uBigWaveSpeed: { value: 0.75 },
      // Small Waves
      uSmallWavesElevation: { value: 0.15 },
      uSmallWavesFrequency: { value: 3 },
      uSmallWavesSpeed: { value: 0.2 },
      uSmallWavesIterations: { value: 4 },
      // Color
      uDepthColor: { value: new THREE.Color(debugObject.waveDepthColor) },
      uSurfaceColor: { value: new THREE.Color(debugObject.waveSurfaceColor) },
      uColorOffset: { value: 0.08 },
      uColorMultiplier: { value: 5 },

      // Fog, contains fogColor, fogDensity, fogFar and fogNear
      ...THREE.UniformsLib["fog"]
    },

    vertexShader: `#include <fog_pars_vertex>
    uniform float uTime;
    uniform float uBigWavesElevation;
    uniform vec2 uBigWavesFrequency;
    uniform float uBigWaveSpeed;
    uniform float uSmallWavesElevation;
    uniform float uSmallWavesFrequency;
    uniform float uSmallWavesSpeed;
    uniform float uSmallWavesIterations;
    varying float vElevation;
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
    float cnoise(vec3 P){
      vec3 Pi0 = floor(P);
      vec3 Pi1 = Pi0 + vec3(1.0);
      Pi0 = mod(Pi0, 289.0);
      Pi1 = mod(Pi1, 289.0);
      vec3 Pf0 = fract(P);
      vec3 Pf1 = Pf0 - vec3(1.0);
      vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
      vec4 iy = vec4(Pi0.yy, Pi1.yy);
      vec4 iz0 = Pi0.zzzz;
      vec4 iz1 = Pi1.zzzz;
      vec4 ixy = permute(permute(ix) + iy);
      vec4 ixy0 = permute(ixy + iz0);
      vec4 ixy1 = permute(ixy + iz1);
      vec4 gx0 = ixy0 / 7.0;
      vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
      gx0 = fract(gx0);
      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
      vec4 sz0 = step(gz0, vec4(0.0));
      gx0 -= sz0 * (step(0.0, gx0) - 0.5);
      gy0 -= sz0 * (step(0.0, gy0) - 0.5);
      vec4 gx1 = ixy1 / 7.0;
      vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
      gx1 = fract(gx1);
      vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
      vec4 sz1 = step(gz1, vec4(0.0));
      gx1 -= sz1 * (step(0.0, gx1) - 0.5);
      gy1 -= sz1 * (step(0.0, gy1) - 0.5);
      vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
      vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
      vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
      vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
      vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
      vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
      vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
      vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
      vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
      g000 *= norm0.x;
      g010 *= norm0.y;
      g100 *= norm0.z;
      g110 *= norm0.w;
      vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
      g001 *= norm1.x;
      g011 *= norm1.y;
      g101 *= norm1.z;
      g111 *= norm1.w;
      float n000 = dot(g000, Pf0);
      float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
      float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
      float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
      float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
      float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
      float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
      float n111 = dot(g111, Pf1);
      vec3 fade_xyz = fade(Pf0);
      vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
      vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
      float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
      return 2.2 * n_xyz;
    }
    
    void main()
    {
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
        // Grandi onde
        float elevation = sin(modelPosition.x * uBigWavesFrequency.x + uTime * uBigWaveSpeed)
                        * sin(modelPosition.z * uBigWavesFrequency.y + uTime * uBigWaveSpeed)
                        * uBigWavesElevation;
    
        // Piccole onde
        for(float i = 1.0; i <= 10.0; i++)
        {
            elevation -= abs(cnoise(
                vec3(modelPosition.xz * uSmallWavesFrequency * i, uTime * uSmallWavesSpeed)
            ) * uSmallWavesElevation / i);
        }
    
        modelPosition.y += elevation;
    
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;
    
        gl_Position = projectedPosition;
    
        vElevation = elevation;
    
        // Aggiungi mvPosition
        vec4 mvPosition = viewPosition;
        #include <fog_vertex>
    }`,
    

    fragmentShader: `#include <fog_pars_fragment>
    uniform vec3 uDepthColor;
    uniform vec3 uSurfaceColor;
    uniform float uColorOffset;
    uniform float uColorMultiplier;
    varying float vElevation;

    void main()
    {
        float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
        vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);

        gl_FragColor = vec4(color, 1.0);

        #include <fog_fragment>
    }`,
  });

  // Mesh
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI * 0.5;
  scene.add(water);

  //LIGHT
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(1, 0.75, 0);
  scene.add(directionalLight);


  //SIZE
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
  }; 


  // CAMERA
  let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

   // WINDOW RESIZE
    onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onWindowResize);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true;

  /**
   * Post processing */
   
  const renderTarget = new THREE.WebGLRenderTarget(800, 600, {
    samples: renderer.getPixelRatio() === 1 ? 2 : 0
  });


   // Reflector
   const reflectorGeometry = new THREE.BoxGeometry(4, 2, 1);
   const reflector = new Reflector(reflectorGeometry, {
     color: new THREE.Color(0x7f7f7f),
     textureWidth: window.innerWidth * window.devicePixelRatio,
     textureHeight: window.innerHeight * window.devicePixelRatio
   });
   reflector.position.set(0, 1, 0);
   reflector.rotation.z = Math.PI * 0.5;
   scene.add(reflector);

  const effectComposer = new EffectComposer(renderer, renderTarget);
  effectComposer.setSize(sizes.width, sizes.height);
  effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const renderPass = new RenderPass(scene, camera);
  effectComposer.addPass(renderPass);

  const unrealBloomPass = new UnrealBloomPass();
  unrealBloomPass.strength = 0.15;
  unrealBloomPass.radius = 1;
  unrealBloomPass.threshold = 0.1;
  effectComposer.addPass(unrealBloomPass);

  /**
   * Animate
   */
  const clock = new THREE.Clock();

  const tick = () => {
    const elapsedTime = clock.getElapsedTime();

    // Aggiorna il materiale dell'acqua
    waterMaterial.uniforms.uTime.value = elapsedTime;

    // Aggiorna i controlli
    controls.update();

    // Renderizza la scena
    effectComposer.render();

    // Richiedi il prossimo frame di animazione
    requestAnimationFrame(tick);
  };

  tick();

  
  // GUI
  bigWavesFolder
    .add(waterMaterial.uniforms.uBigWavesElevation, "value")
    .min(0)
    .max(1)
    .step(0.001)
    .name("Elevation");
  bigWavesFolder
    .add(waterMaterial.uniforms.uBigWavesFrequency.value, "x")
    .min(0)
    .max(10)
    .step(0.001)
    .name("Frequency X");
  bigWavesFolder
    .add(waterMaterial.uniforms.uBigWavesFrequency.value, "y")
    .min(0)
    .max(10)
    .step(0.001)
    .name("Frequency Y");
  bigWavesFolder
    .add(waterMaterial.uniforms.uBigWaveSpeed, "value")
    .min(0)
    .max(4)
    .step(0.001)
    .name("Speed");
  bigWavesFolder.open();

  smallWavesFolder
    .add(waterMaterial.uniforms.uSmallWavesElevation, "value")
    .min(0)
    .max(1)
    .step(0.001)
    .name("Elevation");
  smallWavesFolder
    .add(waterMaterial.uniforms.uSmallWavesFrequency, "value")
    .min(0)
    .max(30)
    .step(0.001)
    .name("Frequency");
  smallWavesFolder
    .add(waterMaterial.uniforms.uSmallWavesSpeed, "value")
    .min(0)
    .max(4)
    .step(0.001)
    .name("Speed");
  smallWavesFolder
    .add(waterMaterial.uniforms.uSmallWavesIterations, "value")
    .min(0)
    .max(5)
    .step(1)
    .name("Iterations");
  smallWavesFolder.open();

  colorFolder
    .addColor(debugObject, "waveDepthColor")
    .name("Depth Color")
    .onChange(() => {
      waterMaterial.uniforms.uDepthColor.value.set(debugObject.waveDepthColor);
    });
  colorFolder
    .addColor(debugObject, "waveSurfaceColor")
    .name("Surface Color")
    .onChange(() => {
      waterMaterial.uniforms.uSurfaceColor.value.set(
        debugObject.waveSurfaceColor
      );
    });
  colorFolder
    .add(waterMaterial.uniforms.uColorOffset, "value")
    .min(0)
    .max(1)
    .step(0.001)
    .name("Color Offset");
  colorFolder
    .add(waterMaterial.uniforms.uColorMultiplier, "value")
    .min(0)
    .max(10)
    .step(0.001)
    .name("Color Multiplier");
  colorFolder
    .addColor(debugObject, "fogColor")
    .name("Fog Color")
    .onChange(() => {
      scene.fog.color.set(debugObject.fogColor);
    });
  colorFolder
    .add(debugObject, "fogNear")
    .min(0)
    .max(10)
    .step(0.01)
    .name("Fog Near")
    .onChange(() => {
      scene.fog.near = debugObject.fogNear;
    });
  colorFolder
    .add(debugObject, "fogFar")
    .min(0)
    .max(10)
    .step(0.01)
    .name("Fog Far")
    .onChange(() => {
      scene.fog.far = debugObject.fogFar;
    });

  return {
    destroy: () => {
      // Pulizia quando lo sketch viene distrutto
      gui.destroy();
      controls.dispose();
      renderer.dispose();
    }
  };
}
