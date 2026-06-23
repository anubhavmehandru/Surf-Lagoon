import * as THREE from 'three';
import { CONFIG } from './config.js';

// The collectibles. Bright emissive octahedrons that bob on the water, spin,
// and glow (the bloom pass does the glow). Walk into one to collect it.
export class Gems {
    constructor(scene, obstacles) {
        this.scene = scene;
        this.obstacles = obstacles;
        this.group = new THREE.Group();
        scene.add(this.group);
        this.gems = [];
        this.total = 0;
        this.collected = 0;
        this._geo = new THREE.OctahedronGeometry(0.7, 0);
    }

    spawn(count = CONFIG.gems.count) {
        this.clear();
        let placed = 0, guard = 0;
        while (placed < count && guard < count * 40) {
            guard++;
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * (CONFIG.boundaryRadius - 4);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            if (!this.obstacles.isClear(x, z, 3)) continue;

            const color = new THREE.Color().setHSL(Math.random(), 0.85, 0.6);
            const gem = new THREE.Mesh(this._geo, new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 3.2,
                roughness: 0.15,
                metalness: 0.6,
            }));
            gem.position.set(x, CONFIG.waterLevel + 1.1, z);
            gem.castShadow = true;
            gem.userData.phase = Math.random() * Math.PI * 2;
            this.group.add(gem);
            this.gems.push(gem);
            placed++;
        }
        this.total = this.gems.length;
        this.collected = 0;
    }

    clear() {
        for (const g of this.gems) {
            this.group.remove(g);
            g.material.dispose();
        }
        this.gems.length = 0;
    }

    // Animate + test collection against the surfer position. Returns how many
    // were collected this frame.
    update(time, delta, surferPos) {
        let picked = 0;
        for (let i = this.gems.length - 1; i >= 0; i--) {
            const g = this.gems[i];
            g.rotation.y += delta * 1.6;
            g.rotation.x += delta * 0.6;
            g.position.y = CONFIG.waterLevel + 1.1 + Math.sin(time * 2 + g.userData.phase) * 0.3;

            const dx = g.position.x - surferPos.x;
            const dz = g.position.z - surferPos.z;
            if (Math.hypot(dx, dz) < CONFIG.gems.collectRadius) {
                this.group.remove(g);
                g.material.dispose();
                this.gems.splice(i, 1);
                this.collected++;
                picked++;
            }
        }
        return picked;
    }

    get remaining() { return this.gems.length; }
}
