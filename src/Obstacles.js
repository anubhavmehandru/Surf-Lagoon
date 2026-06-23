import * as THREE from 'three';
import { CONFIG } from './config.js';

// Builds the "terrain": sandy palm islands and rocky reefs scattered around the
// lagoon. Each obstacle is also a circular collider the surfer slides around.
export class Obstacles {
    constructor(scene) {
        this.scene = scene;
        this.colliders = []; // { x, z, radius }
        this.group = new THREE.Group();
        scene.add(this.group);
    }

    build() {
        this._buildIslands(CONFIG.obstacles.islands);
        this._buildRocks(CONFIG.obstacles.rocks);
    }

    _randomSpot(minR, maxR) {
        const angle = Math.random() * Math.PI * 2;
        const r = minR + Math.random() * (maxR - minR);
        return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
    }

    _buildIslands(count) {
        for (let i = 0; i < count; i++) {
            const { x, z } = this._randomSpot(16, CONFIG.boundaryRadius * 0.8);
            const radius = 4 + Math.random() * 3;
            const island = new THREE.Group();

            // Sandy mound
            const sand = new THREE.Mesh(
                new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
                new THREE.MeshStandardMaterial({ color: 0xe8d39a, roughness: 1 })
            );
            sand.scale.y = 0.45;
            sand.position.y = -0.4;
            sand.castShadow = true;
            sand.receiveShadow = true;
            island.add(sand);

            // A couple of palm trees
            const palms = 1 + Math.floor(Math.random() * 2);
            for (let p = 0; p < palms; p++) {
                island.add(this._buildPalm(
                    (Math.random() - 0.5) * radius,
                    (Math.random() - 0.5) * radius
                ));
            }

            island.position.set(x, 0, z);
            this.group.add(island);
            this.colliders.push({ x, z, radius: radius * 0.85 });
        }
    }

    _buildPalm(ox, oz) {
        const palm = new THREE.Group();
        const trunkH = 3 + Math.random() * 2;

        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.4, trunkH, 7),
            new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 1 })
        );
        trunk.position.y = trunkH / 2 + 0.5;
        trunk.castShadow = true;
        trunk.rotation.z = (Math.random() - 0.5) * 0.25; // gentle lean
        palm.add(trunk);

        const frondMat = new THREE.MeshStandardMaterial({ color: 0x2f9e54, roughness: 0.8 });
        for (let f = 0; f < 6; f++) {
            const frond = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.6, 5), frondMat);
            frond.position.y = trunkH + 0.5;
            frond.rotation.z = Math.PI / 2.4;
            frond.rotation.y = (f / 6) * Math.PI * 2;
            frond.castShadow = true;
            palm.add(frond);
        }
        palm.position.set(ox, 0, oz);
        return palm;
    }

    _buildRocks(count) {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b7079, roughness: 0.9, flatShading: true });
        for (let i = 0; i < count; i++) {
            const { x, z } = this._randomSpot(12, CONFIG.boundaryRadius * 0.88);
            const radius = 1.2 + Math.random() * 2.2;

            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), rockMat);
            rock.position.set(x, -radius * 0.35 + 0.3, z); // partly submerged
            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            rock.scale.y = 0.7 + Math.random() * 0.4;
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.group.add(rock);
            this.colliders.push({ x, z, radius: radius * 0.85 });
        }
    }

    // Pushes a position out of any rock/island it has entered. Returns true if
    // it had to correct, so the surfer can bleed off speed on impact.
    resolve(position, bodyRadius) {
        let hit = false;
        for (const o of this.colliders) {
            const dx = position.x - o.x;
            const dz = position.z - o.z;
            const dist = Math.hypot(dx, dz);
            const min = o.radius + bodyRadius;
            if (dist < min && dist > 1e-4) {
                position.x = o.x + (dx / dist) * min;
                position.z = o.z + (dz / dist) * min;
                hit = true;
            }
        }
        return hit;
    }

    // Keep gems/obstacles from overlapping a point.
    isClear(x, z, clearance) {
        for (const o of this.colliders) {
            if (Math.hypot(x - o.x, z - o.z) < o.radius + clearance) return false;
        }
        return true;
    }
}
