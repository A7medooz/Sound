import { Download, Play, RotateCw, Trash2 } from 'lucide-react';
import {
  CLIP_TYPES,
  DIALECTS,
  GeneratedClip,
  STYLE_PRESETS,
} from '../types/studio';
import { downloadWavBase64, formatTimecode } from '../utils/audio';

interface ClipLibraryProps {
  clips: GeneratedClip[];
  activeClipId: string | null;
  onSelectClip: (clip: GeneratedClip) => void;
  onDeleteClip: (id: string) => void;
  onReloadToEditor: (clip: GeneratedClip) => void;
}

export function ClipLibrary({
  clips,
  activeClipId,
  onSelectClip,
  onDeleteClip,
  onReloadToEditor,
}: ClipLibraryProps) {
  if (clips.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
        <p className="font-display text-base font-bold text-slate-900">
          لا توجد مقاطع محفوظة بعد
        </p>
        <p className="text-sm text-slate-500">
          أي مقطع صوتي تقوم بإنشائه سيظهر هنا لتتمكن من إعادته أو تحميله لاحقاً.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
      {clips.map((clip) => {
        const typeLabel =
          CLIP_TYPES.find((c) => c.id === clip.config.clipType)?.label || '';
        const dialectLabel =
          DIALECTS.find((d) => d.id === clip.config.languageDialect)?.label || '';
        const styleLabel =
          STYLE_PRESETS.find((s) => s.id === clip.config.stylePreset)?.label || '';
        const isCurrent = clip.id === activeClipId;
        const hasAudio = Boolean(clip.audioBase64);

        return (
          <div
            key={clip.id}
            className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
              isCurrent ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'
            }`}
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {clip.title}
                </h3>
                {clip.durationSec ? (
                  <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
                    {formatTimecode(clip.durationSec)}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{typeLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{dialectLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{styleLabel}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {clip.config.speakerMode === 'dual'
                    ? `${clip.config.primarySpeaker.name} و${clip.config.secondarySpeaker.name}`
                    : clip.config.primarySpeaker.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasAudio ? (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectClip(clip)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>تشغيل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadWavBase64(
                        clip.audioBase64!,
                        `rawi-${clip.config.clipType}-${clip.createdAt}.wav`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>WAV</span>
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-400 px-2">
                  نص وإعدادات محفوظة
                </span>
              )}

              <button
                type="button"
                onClick={() => onReloadToEditor(clip)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>فتح في المحرر</span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteClip(clip.id)}
                aria-label="حذف المقطع"
                className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
