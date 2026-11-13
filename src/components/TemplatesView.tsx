import { ArrowUpLeft } from 'lucide-react';
import {
  CLIP_TYPES,
  DIALECTS,
  STARTER_TEMPLATES,
  STYLE_PRESETS,
  StarterTemplate,
} from '../types/studio';

interface TemplatesViewProps {
  onSelectTemplate: (template: StarterTemplate) => void;
}

export function TemplatesView({ onSelectTemplate }: TemplatesViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          قوالب جاهزة للبداية السريعة
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          اختر قالباً جاهزاً ليتم تعبئة نوع المقطع والأسلوب والنص مباشرة في الاستوديو.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {STARTER_TEMPLATES.map((tpl) => {
          const clipLabel =
            CLIP_TYPES.find((c) => c.id === tpl.clipType)?.label || '';
          const dialectLabel =
            DIALECTS.find((d) => d.id === tpl.languageDialect)?.label || '';
          const styleLabel =
            STYLE_PRESETS.find((s) => s.id === tpl.stylePreset)?.label || '';
          const previewBody =
            tpl.speakerMode === 'dual'
              ? tpl.dialogueLines.map((l) => l.text).join(' — ')
              : tpl.scriptText;

          return (
            <div
              key={tpl.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-2.5">
                <h2 className="font-display text-base font-bold text-slate-900">
                  {tpl.label}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span>{clipLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{dialectLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{styleLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{tpl.speakerMode === 'dual' ? 'حوار شخصيتين' : 'راوي واحد'}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {previewBody}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectTemplate(tpl)}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>استخدام القالب في الاستوديو</span>
                <ArrowUpLeft className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
