import * as THREE from 'three';
import { CONFIG } from './config.js';

// Decorative life *outside* the playable lagoon so the horizon isn't empty:
// distant forested islands and pods of dolphins leaping in and out of the water.
export class Scenery {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        scene.add(this.group);
        this.dolphins = [];
    }

    build() {
        this._buildDistantIslands();
        this._buildDolphins();
    }

    _buildDistantIslands() {
        const count = 9;
        const sandMat = new THREE.MeshStandardMaterial({ color: 0xd9c79a, roughness: 1 });
        const forestMat = new THREE.MeshStandardMaterial({ color: 0x3f7d4a, roughness: 1 });

        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
            const dist = CONFIG.boundaryRadius + 40 + Math.random() * 110;
            const s = 14 + Math.random() * 30;

            const island = new THREE.Group();
            const sand = new THREE.Mesh(
                new THREE.SphereGeometry(s, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
                sandMat
            );
            sand.scale.y = 0.5;
            island.add(sand);

            // Forested hill on top
            const forest = new THREE.Mesh(
                new THREE.SphereGeometry(s * 0.72, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
                forestMat
            );
            forest.scale.y = 0.85;
            forest.position.y = s * 0.16;
            island.add(forest);

            island.position.set(Math.cos(a) * dist, -2, Math.sin(a) * dist);
            this.group.add(island);
        }
    }

    _buildDolphin() {
        const g = new THREE.Group();
        const pivot = new THREE.Group();   // tilts (pitch) during the leap
        g.add(pivot);
        g.userData.pivot = pivot;

        const grey = new THREE.MeshStandardMaterial({ color: 0x6f7e8c, roughness: 0.55 });
        const belly = new THREE.MeshStandardMaterial({ color: 0xdde7ee, roughness: 0.55 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), grey);
        body.scale.set(0.7, 0.7, 2.2);          // long axis = local +Z (nose forward)
        pivot.add(body);

        const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 12), belly);
        bellyMesh.scale.set(0.64, 0.5, 2.0);
        bellyMesh.position.y = -0.18;
        pivot.add(bellyMesh);

        const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 4), grey);
        dorsal.position.set(0, 0.55, -0.15);
        dorsal.rotation.x = -0.3;
        pivot.add(dorsal);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 10), grey);
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 1.7;
        pivot.add(nose);

        const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 4), grey);
        fluke.rotation.x = Math.PI / 2;
        fluke.scale.set(1, 1, 0.25);
        fluke.position.z = -1.9;
        pivot.add(fluke);

        return g;
    }

    _buildDolphins() {
        const pods = 4;
        for (let i = 0; i < pods; i++) {
            const a = (i / pods) * Math.PI * 2 + 0.6;
            const dist = CONFIG.boundaryRadius + 10 + Math.random() * 16;
            const dolphin = this._buildDolphin();
            Object.assign(dolphin.userData, {
                center: new THREE.Vector3(Math.cos(a) * dist, 0, Math.sin(a) * dist),
                circleR: 6 + Math.random() * 5,
                swimSpeed: 0.45 + Math.random() * 0.25,
                leapSpeed: 1.2 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
                amp: 3 + Math.random() * 1.5,
            });
            this.group.add(dolphin);
            this.dolphins.push(dolphin);
        }
    }

    update(time) {
        for (const d of this.dolphins) {
            const u = d.userData;
            const a = time * u.swimSpeed + u.phase;

            // Swim in a circle; nose follows the tangent (local +Z -> heading -a)
            d.position.x = u.center.x + Math.cos(a) * u.circleR;
            d.position.z = u.center.z + Math.sin(a) * u.circleR;
            d.rotation.y = -a;

            // Leap: above water when sin > 0, hidden below the surface when < 0
            const lp = time * u.leapSpeed + u.phase;
            d.position.y = Math.sin(lp) * u.amp;
            u.pivot.rotation.x = Math.cos(lp) * 0.9; // pitch nose up/down through the arc
        }
    }
}
