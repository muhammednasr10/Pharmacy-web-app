export function playBarcodeBeep(success = true) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.value = success ? 920 : 280;
    gain.gain.value = 0.07;

    const duration = success ? 0.09 : 0.18;
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
    oscillator.onended = () => void ctx.close();
  } catch {
    // Audio is optional feedback only.
  }
}
