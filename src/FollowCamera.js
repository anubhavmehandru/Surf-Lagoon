import * as THREE from 'three';
import { CONFIG } from './config.js';

// A third-person chase camera that smoothly trails behind and above the surfer
// and always looks at them. Smoothing uses frame-rate-independent damping.
export class FollowCamera {
    constructor(camera) {
        this.camera = camera;
        this._desired = new THREE.Vector3();
        this._lookAt = new THREE.Vector3();
    }

    // Snap straight to the target (used on spawn / restart so we don't sweep in).
    snap(surfer) {
        this._computeDesired(surfer);
        this.camera.position.copy(this._desired);
        this.camera.lookAt(this._lookAt);
    }

    _computeDesired(surfer) {
        const c = CONFIG.camera;
        const fwd = surfer.forward(); // unit vector the surfer faces
        this._desired.set(
            surfer.position.x - fwd.x * c.distance,
            surfer.position.y + c.height,
            surfer.position.z - fwd.z * c.distance
        );
        this._lookAt.set(
            surfer.position.x,
            surfer.position.y + c.lookHeight,
            surfer.position.z
        );
    }

    update(delta, surfer) {
        this._computeDesired(surfer);
        // Exponential smoothing: independent of frame rate.
        const t = 1 - Math.exp(-CONFIG.camera.smooth * delta);
        this.camera.position.lerp(this._desired, t);
        this.camera.lookAt(this._lookAt);
    }
}
