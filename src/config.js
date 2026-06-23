// Central tuning knobs for the whole game. Tweak here to change the feel —
// everything else reads from this object, which makes balancing easy.
export const CONFIG = {
    boundaryRadius: 100,        // radius of the playable lagoon
    waterLevel: 0,

    surfer: {
        maxSpeed: 20,          // top forward speed (lowered — it was too fast)
        accel: 15,             // how quickly you reach top speed
        reverseSpeed: 5,
        drag: 5,               // glide-down when not accelerating (surf momentum)
        turnRate: 1.9,         // radians/sec
        jumpStrength: 7,
        gravity: 22,
        radius: 1.3,           // collision radius
    },

    camera: {
        distance: 12,          // how far behind the surfer
        height: 6.5,           // how high above
        lookHeight: 1.8,       // look-at point above the surfer
        smooth: 4,             // follow smoothing (higher = snappier)
    },

    gems: {
        count: 26,
        collectRadius: 2.4,
    },

    obstacles: {
        rocks: 16,
        islands: 4,
    },

    bloom: {
        strength: 0.8,
        radius: 0.5,
        threshold: 0.6,   // only the emissive gems glow (not the bright board)
    },

    // Sun / sky (angles in degrees) + light intensities (tuned for ACES tone mapping).
    // Higher elevation = sun higher in the sky = far less horizon glare when you turn around.
    sun: { elevation: 40, azimuth: 130, lightIntensity: 3.2, hemiIntensity: 0.9 },

    // Renderer tone-mapping exposure — lower = less blown-out sky / less glare.
    render: { exposure: 0.45 },

    // Gradient sky colours. `intensity` pushes them brighter so they stay vivid
    // after tone mapping. Lower `exponent` = blue reaches further down toward the
    // horizon (so you see blue even when the camera looks slightly down).
    sky: { top: 0x2f7fd0, horizon: 0x86bdec, intensity: 1.8, exponent: 0.4 },
};
