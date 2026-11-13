import { useRef, useState } from 'react';
import {
  BookOpen,
  Clapperboard,
  Film,
  Loader2,
  Megaphone,
  Mic,
  Square,
  User,
  Users,
  Volume2,
} from 'lucide-react';
import {
  CLIP_TYPES,
  ClipConfig,
  ClipType,
  DIALECTS,
  LanguageDialect,
  PrebuiltVoiceId,
  STYLE_PRESETS,
  SpeakerMode,
  StylePreset,
  VOICE_CHARACTERS,
} from '../types/studio';
import { base64ToWavBlob } from '../utils/audio';

interface SetupPanelProps {
  config: ClipConfig;
  onChange: (updater: (prev: ClipConfig) => ClipConfig) => void;
}

const CLIP_ICONS: Record<ClipType, typeof BookOpen> = {
  story: BookOpen,
  reels: Clapperboard,
  youtube: Film,
  ad: Megaphone,
  podcast: Mic,
};

export function SetupPanel({ config, onChange }: SetupPanelProps) {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setPreviewingVoice(null);
  };

  const handlePreviewVoice = async (
    personaId: string,
    slotKey: string
  ) => {
    if (previewingVoice === slotKey) {
      stopPreview();
      return;
    }

    stopPreview();
    setPreviewError(null);
    setLoadingPreview(slotKey);

    try {
      const char =
        VOICE_CHARACTERS.find((v) => v.personaId === personaId) ||
        VOICE_CHARACTERS.find((v) => v.id === personaId);
      const voiceId: PrebuiltVoiceId = char?.id || 'Charon';
      const sampleText =
        char?.sampleAr[config.languageDialect] ||
        'مرحباً بكم في استوديو راوي للتعليق الصوتي.';

      const res = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId,
          personaId: char?.personaId || voiceId,
          languageDialect: config.languageDialect,
          sampleText,
          styleNote: char?.defaultStyleNote || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر تشغيل عينة الصوت.');
      }

      const blob = base64ToWavBlob(data.audioBase64);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      setPreviewingVoice(slotKey);

      audio.onended = () => {
        stopPreview();
      };
      audio.onerror = () => {
        stopPreview();
        setPreviewError('حدث خطأ أثناء تشغيل المعاينة الصوتية.');
      };
      await audio.play();
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : 'تعذر تشغيل المعاينة الصوتية.'
      );
    } finally {
      setLoadingPreview(null);
    }
  };

  const selectClipType = (typeId: ClipType) => {
    const meta = CLIP_TYPES.find((c) => c.id === typeId);
    onChange((prev) => ({
      ...prev,
      clipType: typeId,
      stylePreset: meta?.defaultStyle ?? prev.stylePreset,
      speakerMode: meta?.defaultMode ?? prev.speakerMode,
    }));
  };

  const setSpeakerMode = (mode: SpeakerMode) => {
    onChange((prev) => ({
      ...prev,
      speakerMode: mode,
    }));
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
      {/* 1. نوع المقطع */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-bold text-slate-900">
            1. نوع المقطع
          </h2>
          <span className="text-xs text-slate-500">
            يضبط الإيقاع العام تلقائياً
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {CLIP_TYPES.map((item) => {
            const Icon = CLIP_ICONS[item.id];
            const active = config.clipType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectClipType(item.id)}
                className={`text-right p-3 rounded-xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  active
                    ? 'border-blue-600 bg-blue-50/70 text-slate-900'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-blue-600' : 'text-slate-500'
                    }`}
                  />
                  <span className="text-sm font-semibold whitespace-nowrap truncate">
                    {item.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-1">
                  {item.hint}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 2. وضع الإلقاء واللغة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            وضع الإلقاء
          </label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setSpeakerMode('single')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                config.speakerMode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>راوي واحد</span>
            </button>
            <button
              type="button"
              onClick={() => setSpeakerMode('dual')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                config.speakerMode === 'dual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>حوار شخصيتين</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="dialect-select"
            className="block text-sm font-semibold text-slate-900"
          >
            اللغة واللهجة
          </label>
          <select
            id="dialect-select"
            value={config.languageDialect}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                languageDialect: e.target.value as LanguageDialect,
              }))
            }
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          >
            {DIALECTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 3. الأسلوب والنبرة */}
      <div className="space-y-3">
        <h2 className="font-display text-base font-bold text-slate-900">
          2. الأسلوب والنبرة
        </h2>

        <div className="flex flex-wrap gap-2">
          {STYLE_PRESETS.map((style) => {
            const active = config.stylePreset === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    stylePreset: style.id as StylePreset,
                  }))
                }
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {style.label}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={config.customStyle}
          onChange={(e) =>
            onChange((prev) => ({ ...prev, customStyle: e.target.value }))
          }
          placeholder="توجيه إضافي اختياري (مثلاً: بطيء مع نبرة غامضة، أو بصوت دافئ للأطفال)"
          className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
        />
      </div>

      <hr className="border-slate-100" />

      {/* 4. اختيار الشخصية الصوتية */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-bold text-slate-900">
            {config.speakerMode === 'single'
              ? '3. الشخصية الصوتية'
              : '3. شخصيات الحوار'}
          </h2>
          <span className="text-xs text-slate-500">
            اضغط معاينة لسماع نبرة الصوت
          </span>
        </div>

        {previewError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {previewError}
          </p>
        )}

        {config.speakerMode === 'single' ? (
          <div className="space-y-2">
            {VOICE_CHARACTERS.map((voice) => {
              const active = config.primarySpeaker.personaId
                ? config.primarySpeaker.personaId === voice.personaId
                : config.primarySpeaker.voiceId === voice.id;
              const slotKey = `single-${voice.personaId}`;
              const isPlaying = previewingVoice === slotKey;
              const isLoading = loadingPreview === slotKey;

              const selectPersona = () =>
                onChange((prev) => ({
                  ...prev,
                  primarySpeaker: {
                    ...prev.primarySpeaker,
                    personaId: voice.personaId,
                    voiceId: voice.id,
                    name: voice.nameAr,
                    styleNote: voice.defaultStyleNote || '',
                  },
                }));

              return (
                <div
                  key={voice.personaId}
                  onClick={selectPersona}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectPersona();
                    }
                  }}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? 'border-blue-600 bg-blue-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-slate-900">
                        {voice.nameAr}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {voice.roleLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {voice.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewVoice(voice.personaId, slotKey);
                    }}
                    disabled={isLoading}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 cursor-pointer ${
                      isPlaying
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPlaying ? (
                      <Square className="w-3 h-3 fill-current" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isPlaying ? 'إيقاف' : 'معاينة'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Speaker A */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-blue-700">
                  الشخصية الأولى (أ)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handlePreviewVoice(
                      config.primarySpeaker.personaId ||
                        config.primarySpeaker.voiceId,
                      'dual-A'
                    )
                  }
                  disabled={loadingPreview === 'dual-A'}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 cursor-pointer"
                >
                  {loadingPreview === 'dual-A' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : previewingVoice === 'dual-A' ? (
                    <Square className="w-3 h-3 fill-current" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>{previewingVoice === 'dual-A' ? 'إيقاف' : 'معاينة'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={config.primarySpeaker.name}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      primarySpeaker: {
                        ...prev.primarySpeaker,
                        name: e.target.value,
                      },
                    }))
                  }
                  placeholder="اسم الشخصية (مثلاً: الراوي)"
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <select
                  value={
                    config.primarySpeaker.personaId ||
                    VOICE_CHARACTERS.find(
                      (v) => v.id === config.primarySpeaker.voiceId
                    )?.personaId ||
                    'charon-tariq'
                  }
                  onChange={(e) => {
                    const chosen = VOICE_CHARACTERS.find(
                      (v) => v.personaId === e.target.value
                    );
                    if (!chosen) return;
                    onChange((prev) => ({
                      ...prev,
                      primarySpeaker: {
                        ...prev.primarySpeaker,
                        personaId: chosen.personaId,
                        voiceId: chosen.id,
                        styleNote: chosen.defaultStyleNote || '',
                      },
                    }));
                  }}
                  className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {VOICE_CHARACTERS.map((v) => (
                    <option key={v.personaId} value={v.personaId}>
                      {v.nameAr} — {v.roleLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Speaker B */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  الشخصية الثانية (ب)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handlePreviewVoice(
                      config.secondarySpeaker.personaId ||
                        config.secondarySpeaker.voiceId,
                      'dual-B'
                    )
                  }
                  disabled={loadingPreview === 'dual-B'}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 cursor-pointer"
                >
                  {loadingPreview === 'dual-B' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : previewingVoice === 'dual-B' ? (
                    <Square className="w-3 h-3 fill-current" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>{previewingVoice === 'dual-B' ? 'إيقاف' : 'معاينة'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={config.secondarySpeaker.name}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      secondarySpeaker: {
                        ...prev.secondarySpeaker,
                        name: e.target.value,
                      },
                    }))
                  }
                  placeholder="اسم الشخصية (مثلاً: ليلى)"
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <select
                  value={
                    config.secondarySpeaker.personaId ||
                    VOICE_CHARACTERS.find(
                      (v) => v.id === config.secondarySpeaker.voiceId
                    )?.personaId ||
                    'kore-layla'
                  }
                  onChange={(e) => {
                    const chosen = VOICE_CHARACTERS.find(
                      (v) => v.personaId === e.target.value
                    );
                    if (!chosen) return;
                    onChange((prev) => ({
                      ...prev,
                      secondarySpeaker: {
                        ...prev.secondarySpeaker,
                        personaId: chosen.personaId,
                        voiceId: chosen.id,
                        styleNote: chosen.defaultStyleNote || '',
                      },
                    }));
                  }}
                  className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {VOICE_CHARACTERS.map((v) => (
                    <option key={v.personaId} value={v.personaId}>
                      {v.nameAr} — {v.roleLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
