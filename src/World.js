import * as THREE from 'three';
import { CONFIG } from './config.js';

// Everything that isn't the player or the gems: the sky + sun, lighting, the
// animated ocean, varied "terrain" shallows, and the ring of boundary buoys.
export class World {
    constructor(scene) {
        this.scene = scene;
        this.waterUniforms = { uTime: { value: 0 } };
        this.buoys = [];
    }

    build() {
        this._buildSkyAndSun();
        this._buildLights();
        this._buildOcean();
        this._buildShallows();
        this._buildBoundary();
    }

    _buildSkyAndSun() {
        // Sun direction drives the directional light below. There's no visible
        // sun disk, so there's no glare — the sky is a clean blue gradient.
        const sunDir = new THREE.Vector3();
        const phi = THREE.MathUtils.degToRad(90 - CONFIG.sun.elevation);
        const theta = THREE.MathUtils.degToRad(CONFIG.sun.azimuth);
        sunDir.setFromSphericalCoords(1, phi, theta);
        this.sunDir = sunDir;

        // Gradient sky dome: sky-blue overhead fading to pale at the horizon.
        const sky = new THREE.Mesh(
            new THREE.SphereGeometry(1500, 32, 16),
            new THREE.ShaderMaterial({
                side: THREE.BackSide,
                depthWrite: false,
                fog: false,
                uniforms: {
                    topColor: { value: new THREE.Color(CONFIG.sky.top) },
                    horizonColor: { value: new THREE.Color(CONFIG.sky.horizon) },
                    intensity: { value: CONFIG.sky.intensity },
                    exponent: { value: CONFIG.sky.exponent },
                },
                vertexShader: `
                    varying vec3 vDir;
                    void main() {
                        vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }`,
                fragmentShader: `
                    varying vec3 vDir;
                    uniform vec3 topColor;
                    uniform vec3 horizonColor;
                    uniform float intensity;
                    uniform float exponent;
                    void main() {
                        float t = pow(clamp(vDir.y, 0.0, 1.0), exponent);
                        gl_FragColor = vec4(mix(horizonColor, topColor, t) * intensity, 1.0);
                    }`,
            })
        );
        this.scene.add(sky);

        // Fog tinted to the horizon colour so distant water/sky blend seamlessly.
        this.scene.fog = new THREE.Fog(CONFIG.sky.horizon, CONFIG.boundaryRadius * 1.8, CONFIG.boundaryRadius * 4.5);
    }

    _buildLights() {
        this.scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x2b6da3, CONFIG.sun.hemiIntensity));

        const sun = new THREE.DirectionalLight(0xfff4e0, CONFIG.sun.lightIntensity);
        sun.position.copy(this.sunDir).multiplyScalar(120);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        const cam = sun.shadow.camera;
        const R = CONFIG.boundaryRadius;
        cam.near = 1; cam.far = 400;
        cam.left = -R; cam.right = R; cam.top = R; cam.bottom = -R;
        sun.shadow.bias = -0.0003;
        this.scene.add(sun);
        this.scene.add(sun.target);
    }

    _buildOcean() {
        const size = CONFIG.boundaryRadius * 2.6;
        const geo = new THREE.PlaneGeometry(size, size, 96, 96);

        const mat = new THREE.MeshStandardMaterial({
            color: 0x1f7fc4,
            roughness: 0.5,    // softer so the sun doesn't glint harshly
            metalness: 0.0,
        });

        // Inject animated waves into the standard material so it still receives
        // light + shadows. Analytic normals keep the lighting correct.
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.waterUniforms.uTime;
            shader.vertexShader =
                'uniform float uTime;\n' +
                'float waveH(vec2 p){ return 0.5*sin(p.x*0.18 + uTime*1.3) + 0.35*sin(p.y*0.22 + uTime*1.0) + 0.25*sin((p.x+p.y)*0.12 + uTime*0.7); }\n' +
                shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <beginnormal_vertex>',
                `vec2 wp = position.xy;
                 float dWdx = 0.09*cos(wp.x*0.18 + uTime*1.3) + 0.03*cos((wp.x+wp.y)*0.12 + uTime*0.7);
                 float dWdy = 0.077*cos(wp.y*0.22 + uTime*1.0) + 0.03*cos((wp.x+wp.y)*0.12 + uTime*0.7);
                 vec3 objectNormal = normalize(vec3(-dWdx, -dWdy, 1.0));`
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                 transformed.z += waveH(position.xy);`
            );
        };

        const ocean = new THREE.Mesh(geo, mat);
        ocean.rotation.x = -Math.PI / 2;
        ocean.position.y = CONFIG.waterLevel;
        ocean.receiveShadow = true;
        this.scene.add(ocean);
        this.ocean = ocean;
    }

    // Translucent coloured patches to vary the "terrain" — turquoise lagoons,
    // green kelp shallows. Purely visual.
    _buildShallows() {
        const patches = [
            { color: 0x49d6c0, r: 14 },
            { color: 0x2fae6b, r: 11 },
            { color: 0x57c7e8, r: 16 },
            { color: 0x8fd66b, r: 9 },
        ];
        for (const p of patches) {
            const mesh = new THREE.Mesh(
                new THREE.CircleGeometry(p.r, 40),
                new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.28, depthWrite: false })
            );
            mesh.rotation.x = -Math.PI / 2;
            const angle = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * (CONFIG.boundaryRadius * 0.6);
            mesh.position.set(Math.cos(angle) * dist, CONFIG.waterLevel + 0.05, Math.sin(angle) * dist);
            this.scene.add(mesh);
        }
    }

    _buildBoundary() {
        const count = 48;
        const buoyMat = new THREE.MeshStandardMaterial({ color: 0xff5a3c, emissive: 0x5a1500, roughness: 0.6 });
        const topMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const x = Math.cos(a) * CONFIG.boundaryRadius;
            const z = Math.sin(a) * CONFIG.boundaryRadius;

            const buoy = new THREE.Group();
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), buoyMat);
            body.scale.y = 1.3;
            body.castShadow = true;
            const top = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 10), topMat);
            top.position.y = 1.1;
            buoy.add(body, top);
            buoy.position.set(x, CONFIG.waterLevel, z);
            buoy.userData.phase = Math.random() * Math.PI * 2;
            this.scene.add(buoy);
            this.buoys.push(buoy);
        }
    }

    // Stop the surfer at the buoy ring; cancels outward motion smoothly.
    clampToBoundary(position, bodyRadius) {
        const max = CONFIG.boundaryRadius - bodyRadius - 0.5;
        const d = Math.hypot(position.x, position.z);
        if (d > max) {
            position.x = (position.x / d) * max;
            position.z = (position.z / d) * max;
        }
    }

    update(time) {
        this.waterUniforms.uTime.value = time;
        for (const b of this.buoys) {
            b.position.y = CONFIG.waterLevel + Math.sin(time * 1.6 + b.userData.phase) * 0.25;
            b.rotation.z = Math.sin(time + b.userData.phase) * 0.15;
        }
    }
}
