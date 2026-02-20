
// Simple & Reliable HTML5 Audio Player for Chat Sounds

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let ringtoneOscillator = null;

export const playSound = (type) => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === "send") {
            // High pitch "ping"
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === "receive") {
            // Lower pitch "bloop" (receive)
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        }
    } catch (e) {
        console.error("Sound Error:", e);
    }
};

export const playRingtone = () => {
    if (ringtoneOscillator) return; // Already playing
    if (audioCtx.state === 'suspended') audioCtx.resume();

    try {
        const playNote = () => {
            // If stopped in between
            if (!ringtoneOscillator || !ringtoneOscillator.active) return;

            const now = audioCtx.currentTime;

            // Note 1 (Harmonic bell-like tone)
            const o1 = audioCtx.createOscillator();
            const g1 = audioCtx.createGain();
            o1.connect(g1);
            g1.connect(audioCtx.destination);
            o1.type = 'sine';
            o1.frequency.setValueAtTime(659.25, now); // E5
            g1.gain.setValueAtTime(0, now);
            g1.gain.linearRampToValueAtTime(0.2, now + 0.05);
            g1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            o1.start(now);
            o1.stop(now + 1.2);

            // Note 2 (Lower harmonic)
            const o2 = audioCtx.createOscillator();
            const g2 = audioCtx.createGain();
            o2.connect(g2);
            g2.connect(audioCtx.destination);
            o2.type = 'sine';
            o2.frequency.setValueAtTime(523.25, now + 0.3); // C5
            g2.gain.setValueAtTime(0, now + 0.3);
            g2.gain.linearRampToValueAtTime(0.2, now + 0.35);
            g2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            o2.start(now + 0.3);
            o2.stop(now + 1.5);
        };

        playNote(); // Start immediately
        const intervalId = setInterval(playNote, 2500); // Loop every 2.5 seconds

        ringtoneOscillator = { intervalId, active: true };
    } catch (e) { console.error(e); }
};

export const stopRingtone = () => {
    if (ringtoneOscillator) {
        try {
            ringtoneOscillator.active = false;
            if (ringtoneOscillator.intervalId) clearInterval(ringtoneOscillator.intervalId);
            // Oscillators stop themselves via scheduled parameters
        } catch (e) { }
        ringtoneOscillator = null;
    }
};

export default playSound;
