// Tracks the keyboard state. No mouse needed — the camera follows the surfer
// automatically, so there's no pointer-lock to fight with.
export class Input {
    constructor() {
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;
        this.jump = false;       // edge-consumed by the surfer
        this.restart = false;    // edge-consumed by the game

        this._onKeyDown = (e) => this._set(e.code, true);
        this._onKeyUp = (e) => this._set(e.code, false);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }

    _set(code, value) {
        switch (code) {
            case 'KeyW': case 'ArrowUp':    this.forward = value; break;
            case 'KeyS': case 'ArrowDown':  this.backward = value; break;
            case 'KeyA': case 'ArrowLeft':  this.left = value; break;
            case 'KeyD': case 'ArrowRight': this.right = value; break;
            case 'Space':                   if (value) this.jump = true; break;
            case 'KeyR':                    if (value) this.restart = true; break;
        }
    }

    dispose() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }
}
