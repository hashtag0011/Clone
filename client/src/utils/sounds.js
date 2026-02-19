
// Simple & Reliable HTML5 Audio Player for Chat Sounds

// Short "Pop" sound (Base64 MP3)
const POP_SOUND = "data:audio/mp3;base64,//uQRAAAAWMSLwUIYAAsYRXgIwAAAA0D//uQRAAAAWMSLwUIYAAsYRXgIwAAAA0D//uQRAAAAWMSLwUIYAAsYRXgIwAAAA0D";
// Note: This is still a placeholder. In a real scenario, use a hosted URL or a valid base64 string.
// Since I cannot fetch external files, I will use a minimal valid MP3 header or rely on a generic fallback if possible.
// Actually, for immediate feedback, let's use a very short synthesized beep via Web Audio API but wrapping it in a simpler function.
// But wait, the user said "sound not coming". Maybe Web Audio Context was blocked.
// I'll try to use a standard Audio object with a Silent fallback or a very short Beep URL.
// Since I can't guarantee external URL access, I'll stick to Web Audio API but ensure it resumes on user interaction. 
// OR simpler: use a reliable hosted sound URL if CORS allows.
// Let's use a Data URI for a short beep.

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

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
        } else {
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

export default playSound;
