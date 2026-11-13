export function base64ToWavBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export async function analyzeWavWaveform(
  base64: string,
  barCount = 56
): Promise<{ peaks: number[]; durationSec: number }> {
  try {
    const blob = base64ToWavBlob(base64);
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channelData.length / barCount));
    const peaks: number[] = [];

    for (let i = 0; i < barCount; i++) {
      const start = i * blockSize;
      const end = Math.min(channelData.length, start + blockSize);
      let max = 0;
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks.push(Math.max(0.12, Math.min(1, max)));
    }

    await ctx.close();
    return { peaks, durationSec: audioBuffer.duration };
  } catch {
    // Graceful deterministic fallback if AudioContext fails
    const fallbackPeaks = Array.from({ length: barCount }, (_, idx) => {
      const wave = 0.35 + 0.45 * Math.abs(Math.sin(idx * 0.45));
      return Number(wave.toFixed(2));
    });
    return { peaks: fallbackPeaks, durationSec: 0 };
  }
}

export function downloadWavBase64(base64: string, filename: string): void {
  const blob = base64ToWavBlob(base64);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.wav') ? filename : `${filename}.wav`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
