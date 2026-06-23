import * as THREE from 'three';
import { CONFIG } from './config.js';

// The player: a low-poly surfer boy riding a board. Owns its own position,
// heading and momentum-based movement, and leans into turns for some style.
export class Surfer {
    constructor(scene) {
        this.scene = scene;
        this.position = new THREE.Vector3(0, CONFIG.waterLevel, 0);
        this.heading = 0;        // yaw in radians; forward = (sin, 0, cos)
        this.speed = 0;          // signed forward speed
        this.vy = 0;             // vertical velocity (jump)
        this.grounded = true;
        this._fwd = new THREE.Vector3();

        this.mesh = this._build();
        scene.add(this.mesh);
    }

    _build() {
        const g = new THREE.Group();

        // Surfboard (nose pointing along +Z)
        const board = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.55, 1.9, 4, 12),
            new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5 })
        );
        board.rotation.x = Math.PI / 2;   // lay it flat, long axis along Z
        board.scale.set(1, 1, 0.32);      // flatten it into a board
        board.position.y = 0.18;
        board.castShadow = true;
        g.add(board);

        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.05, 2.6),
            new THREE.MeshStandardMaterial({ color: 0xe24a4a, roughness: 0.5 })
        );
        stripe.position.y = 0.3;
        g.add(stripe);

        // --- Surfer boy ---
        const boy = new THREE.Group();
        boy.position.y = 0.35;

        const skin = new THREE.MeshStandardMaterial({ color: 0xe0a878, roughness: 0.8 });
        const shirt = new THREE.MeshStandardMaterial({ color: 0x39c2c9, roughness: 0.8 });
        const shorts = new THREE.MeshStandardMaterial({ color: 0xf26b3a, roughness: 0.8 });
        const hair = new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 0.9 });

        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), shorts);
        legL.position.set(-0.22, 0.35, 0.25);
        const legR = legL.clone(); legR.position.z = -0.25;

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), shirt);
        torso.position.y = 1.05;

        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), skin);
        armL.position.set(0, 1.15, 0.45); armL.rotation.x = -0.6;  // arms out for balance
        const armR = armL.clone(); armR.position.z = -0.45; armR.rotation.x = 0.6;

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skin);
        head.position.y = 1.7;
        const hairCap = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7),
            hair
        );
        hairCap.position.y = 1.74;

        for (const part of [legL, legR, torso, armL, armR, head, hairCap]) {
            part.castShadow = true;
            boy.add(part);
        }
        boy.rotation.y = Math.PI / 2; // face the board's travel direction
        g.add(boy);
        this._boy = boy;

        // Wake: a translucent foam fan that stretches with speed
        const wake = new THREE.Mesh(
            new THREE.ConeGeometry(1.1, 4, 12, 1, true),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
        );
        wake.rotation.x = -Math.PI / 2;
        wake.position.set(0, 0.05, -2.2); // behind the board
        g.add(wake);
        this._wake = wake;

        return g;
    }

    forward() {
        return this._fwd.set(Math.sin(this.heading), 0, Math.cos(this.heading));
    }

    reset() {
        this.position.set(0, CONFIG.waterLevel, 0);
        this.heading = 0;
        this.speed = 0;
        this.vy = 0;
        this.grounded = true;
    }

    update(delta, input, world, obstacles) {
        const s = CONFIG.surfer;

        // Steering — a touch more responsive the faster you go, but always usable.
        const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
        const turnFactor = 0.4 + 0.6 * Math.min(1, Math.abs(this.speed) / s.maxSpeed);
        this.heading += steer * s.turnRate * turnFactor * delta;

        // Acceleration / braking / drag (momentum gives the surf glide).
        if (input.forward) {
            this.speed = Math.min(s.maxSpeed, this.speed + s.accel * delta);
        } else if (input.backward) {
            this.speed = Math.max(-s.reverseSpeed, this.speed - s.accel * delta);
        } else {
            const sign = Math.sign(this.speed);
            this.speed -= sign * Math.min(Math.abs(this.speed), s.drag * delta);
        }

        // Jump / gravity
        if (input.jump && this.grounded) {
            this.vy = s.jumpStrength;
            this.grounded = false;
            input.jump = false;
        }
        this.vy -= s.gravity * delta;

        // Integrate horizontal movement
        const fwd = this.forward();
        this.position.x += fwd.x * this.speed * delta;
        this.position.z += fwd.z * this.speed * delta;

        // Obstacle collision (slide around) — bleed speed on impact
        if (obstacles.resolve(this.position, s.radius)) {
            this.speed *= 0.5;
        }

        // Lagoon boundary — stop at the ring of buoys
        world.clampToBoundary(this.position, s.radius);

        // Vertical: bob on the water + jump arc
        this.position.y += this.vy * delta;
        const restY = CONFIG.waterLevel + Math.sin(performance.now() * 0.002) * 0.12;
        if (this.position.y <= restY) {
            this.position.y = restY;
            this.vy = 0;
            this.grounded = true;
        }

        // --- Pose the mesh ---
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;
        // Roll into the turn, pitch up slightly with speed
        const targetRoll = -steer * 0.35 * Math.min(1, Math.abs(this.speed) / s.maxSpeed);
        this.mesh.rotation.z += (targetRoll - this.mesh.rotation.z) * Math.min(1, 8 * delta);
        this.mesh.rotation.x = -0.12 * (this.speed / s.maxSpeed);

        // Wake intensity tracks speed
        const spd = Math.abs(this.speed) / s.maxSpeed;
        this._wake.material.opacity = 0.45 * spd;
        this._wake.scale.z = 0.6 + spd;
    }
}
