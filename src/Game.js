import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { CONFIG } from './config.js';
import { Input } from './Input.js';
import { HUD } from './HUD.js';
import { World } from './World.js';
import { Scenery } from './Scenery.js';
import { Obstacles } from './Obstacles.js';
import { Gems } from './Gems.js';
import { Surfer } from './Surfer.js';
import { FollowCamera } from './FollowCamera.js';

// Top-level orchestrator: owns the renderer, scene and game loop, and wires the
// gameplay modules together. The scene renders even behind the start screen.
export class Game {
    constructor(container) {
        this.container = container;
        this.running = false;
        this.won = false;
        this.elapsed = 0;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // Tone mapping compresses the sky's HDR output — without this the sky
        // clips to pure white and the sun becomes a blinding glare.
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = CONFIG.render.exposure;
        container.appendChild(this.renderer.domElement);

        // Post-processing: bloom makes the gems glow.
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.composer.addPass(new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            CONFIG.bloom.strength, CONFIG.bloom.radius, CONFIG.bloom.threshold
        ));
        // OutputPass applies tone mapping + correct colour space at the very end
        // of the post-processing chain (required for the tone mapping above).
        this.composer.addPass(new OutputPass());

        // Modules
        this.input = new Input();
        this.hud = new HUD();
        this.world = new World(this.scene);
        this.scenery = new Scenery(this.scene);
        this.obstacles = new Obstacles(this.scene);
        this.surfer = new Surfer(this.scene);
        this.gems = new Gems(this.scene, this.obstacles);
        this.followCam = new FollowCamera(this.camera);

        this.clock = new THREE.Clock();
        this._animate = this._animate.bind(this);

        window.addEventListener('resize', () => this._onResize());
    }

    start() {
        this.world.build();
        this.scenery.build();
        this.obstacles.build();
        this.gems.spawn();
        this.surfer.reset();
        this.followCam.snap(this.surfer);
        this.hud.setGems(0, this.gems.total);
        this.hud.setTime(0);
        this.hud.showStart();

        // Begin playing on the first click anywhere on the start overlay.
        const begin = () => { this._begin(); };
        const startEl = document.getElementById('start');
        if (startEl) startEl.addEventListener('click', begin);

        this._animate();
    }

    _begin() {
        if (this.running) return;
        this.running = true;
        this.hud.hideStart();
        this.hud.hideBanner();
    }

    _restart() {
        this.gems.spawn();
        this.surfer.reset();
        this.followCam.snap(this.surfer);
        this.elapsed = 0;
        this.won = false;
        this.hud.setGems(0, this.gems.total);
        this.hud.hideBanner();
        this.input.restart = false;
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    _animate() {
        requestAnimationFrame(this._animate);
        const delta = Math.min(this.clock.getDelta(), 0.05);
        const time = this.clock.elapsedTime;

        // The world (waves, buoys) and scenery (dolphins) always animate so the
        // scene looks alive, even behind the start screen.
        this.world.update(time);
        this.scenery.update(time);

        if (this.input.restart) this._restart();

        if (this.running && !this.won) {
            this.elapsed += delta;
            this.surfer.update(delta, this.input, this.world, this.obstacles);
            this.followCam.update(delta, this.surfer);

            const picked = this.gems.update(time, delta, this.surfer.position);
            if (picked) this.hud.setGems(this.gems.collected, this.gems.total);
            this.hud.setTime(this.elapsed);

            if (this.gems.remaining === 0) {
                this.won = true;
                this.hud.showBanner(`🌊 All ${this.gems.total} gems! Time ${this.elapsed.toFixed(1)}s — press R to surf again`);
            }
        } else {
            // Keep gems shimmering and the camera framed even while idle/won.
            this.gems.update(time, delta, this.surfer.position);
            this.followCam.update(delta, this.surfer);
        }

        this.composer.render();
    }
}
