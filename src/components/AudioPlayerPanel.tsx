import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  CLIP_TYPES,
  DIALECTS,
  GeneratedClip,
  STYLE_PRESETS,
} from '../types/studio';
import {
  analyzeWavWaveform,
  base64ToWavBlob,
  downloadWavBase64,
  formatTimecode,
} from '../utils/audio';

interface AudioPlayerPanelProps {
  currentClip: GeneratedClip | null;
  isGenerating: boolean;
  error: string | null;
  canGenerate: boolean;
  onGenerate: () => void;
}

const SPEED_OPTIONS = [0.85, 1, 1.15, 1.25];

export function AudioPlayerPanel({
  currentClip,
  isGenerating,
  error,
  canGenerate,
  onGenerate,
}: AudioPlayerPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [peaks, setPeaks] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioUrl = useMemo(() => {
    if (!currentClip?.audioBase64) return null;
    const blob = base64ToWavBlob(currentClip.audioBase64);
    return URL.createObjectURL(blob);
  }, [currentClip?.audioBase64]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);

    if (!currentClip?.audioBase64) {
      setPeaks([]);
      setDuration(0);
      return;
    }

    let cancelled = false;
    analyzeWavWaveform(currentClip.audioBase64, 56).then((result) => {
      if (!cancelled) {
        setPeaks(result.peaks);
        if (result.durationSec > 0) setDuration(result.durationSec);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentClip?.id, currentClip?.audioBase64]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      await audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const target = Math.max(0, Math.min(duration, ratio * duration));
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const clipMetaSummary = useMemo(() => {
    if (!currentClip) return '';
    const typeLabel =
      CLIP_TYPES.find((c) => c.id === currentClip.config.clipType)?.label || '';
    const dialectLabel =
      DIALECTS.find((d) => d.id === currentClip.config.languageDialect)
        ?.label || '';
    const styleLabel =
      STYLE_PRESETS.find((s) => s.id === currentClip.config.stylePreset)
        ?.label || '';
    const speakerLabel =
      currentClip.config.speakerMode === 'dual'
        ? `${currentClip.config.primarySpeaker.name} و${currentClip.config.secondarySpeaker.name}`
        : currentClip.config.primarySpeaker.name;

    return [typeLabel, dialectLabel, styleLabel, speakerLabel]
      .filter(Boolean)
      .join(' · ');
  }, [currentClip]);

  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
      {/* Primary Generate CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            5. إنشاء المقطع الصوتي
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            توليد ملف صوتي عالي الجودة بصيغة WAV جاهز للمونتاج والنشر
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !canGenerate}
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري إنشاء الصوت...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>إنشاء الصوت الآن</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs sm:text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Player Area */}
      {isGenerating ? (
        <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center text-center gap-2.5 min-h-[140px]">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-700">
            يتم الآن تسجيل الأداء الصوتي باللهجة والأسلوب المختار...
          </p>
        </div>
      ) : currentClip?.audioBase64 && audioUrl ? (
        <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => setIsPlaying(false)}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {currentClip.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {clipMetaSummary}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-2 py-1 text-xs font-mono tabular-nums rounded-md transition-colors cursor-pointer ${
                      playbackRate === rate
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  downloadWavBase64(
                    currentClip.audioBase64!,
                    `rawi-${currentClip.config.clipType}-${Date.now()}.wav`
                  )
                }
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل WAV</span>
              </button>
            </div>
          </div>

          {/* Interactive Waveform Scrubber */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل الصوت'}
              className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current mr-0.5" />
              )}
            </button>

            <div
              className="flex-1 h-12 flex items-center gap-[3px] cursor-pointer select-none"
              dir="ltr"
              role="slider"
              aria-label="شريط تقدم الصوت"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              tabIndex={0}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                handleSeek(ratio);
              }}
            >
              {(peaks.length > 0 ? peaks : Array(48).fill(0.3)).map(
                (peak, i, arr) => {
                  const barRatio = i / arr.length;
                  const played = barRatio <= progressRatio;
                  return (
                    <div
                      key={i}
                      style={{ height: `${Math.max(18, Math.round(peak * 100))}%` }}
                      className={`flex-1 rounded-full transition-colors ${
                        played ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    />
                  );
                }
              )}
            </div>

            <div className="font-mono text-xs text-slate-600 tabular-nums shrink-0">
              {formatTimecode(currentTime)} / {formatTimecode(duration)}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
          <Volume2 className="w-5 h-5 text-slate-400" />
          <p className="text-sm font-medium text-slate-600">
            سيظهر هنا مشغل الصوت والموجة الصوتية فور إنشاء المقطع
          </p>
          <p className="text-xs text-slate-400">
            اختر النوع والأسلوب والشخصية، ثم اكتب النص واضغط «إنشاء الصوت الآن»
          </p>
        </div>
      )}
    </section>
  );
}
