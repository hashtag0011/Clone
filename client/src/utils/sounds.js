
// Lazy-initialise AudioContext so browsers don't block it before user gesture
let audioCtx = null;
let ringtoneTimer = null;

function getCtx() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error("AudioContext failed:", e);
            return null;
        }
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

// ─── Short UI sounds ───────────────────────────────────────────────────────────
export const playSound = (type) => {
    const ctx = getCtx();
    if (!ctx) return;

    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === "send") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === "receive") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
        }
    } catch (e) {
        console.error("Sound error:", e);
    }
};

// ─── Phone ringtone ────────────────────────────────────────────────────────────
// Classic double-ring pattern: two short beeps then a pause
function _ringBeep(ctx, freq1, freq2, startTime, duration) {
    [freq1, freq2].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gain.gain.setValueAtTime(0.3, startTime + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
    });
}

export const playRingtone = () => {
    if (ringtoneTimer) return; // already ringing

    const ctx = getCtx();
    if (!ctx) return;

    let active = true;

    const doRing = () => {
        if (!active) return;
        const now = ctx.currentTime;
        // Two short beeps
        _ringBeep(ctx, 480, 620, now, 0.4);
        _ringBeep(ctx, 480, 620, now + 0.5, 0.4);
        // gap until next ring cycle (2.5 s total)
    };

    doRing();
    ringtoneTimer = { timerId: setInterval(doRing, 2500), active };
};

export const stopRingtone = () => {
    if (ringtoneTimer) {
        clearInterval(ringtoneTimer.timerId);
        ringtoneTimer.active = false;
        ringtoneTimer = null;
    }
};

export default playSound;
