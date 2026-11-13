import { useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Wand2,
} from 'lucide-react';
import { ClipConfig, DialogueLine, STARTER_TEMPLATES } from '../types/studio';

interface ScriptEditorProps {
  config: ClipConfig;
  scriptText: string;
  dialogueLines: DialogueLine[];
  onChangeScriptText: (val: string) => void;
  onChangeDialogueLines: (lines: DialogueLine[]) => void;
  onApplyStarterTemplate: (templateId: string) => void;
}

const EXPRESSIVE_MARKERS = [
  { label: 'وقفة', token: '... ' },
  { label: 'نَفَس', token: ' <breath> ' },
  { label: 'ضحكة', token: ' <laugh> ' },
  { label: 'شهقة', token: ' <gasp> ' },
];

export function ScriptEditor({
  config,
  scriptText,
  dialogueLines,
  onChangeScriptText,
  onChangeDialogueLines,
  onApplyStarterTemplate,
}: ScriptEditorProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<{
    scriptText: string;
    dialogueLines: DialogueLine[];
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  const totalChars =
    config.speakerMode === 'single'
      ? scriptText.length
      : dialogueLines.reduce((acc, l) => acc + l.text.length, 0);

  const totalWords =
    config.speakerMode === 'single'
      ? scriptText.trim().split(/\s+/).filter(Boolean).length
      : dialogueLines
          .map((l) => l.text.trim())
          .join(' ')
          .split(/\s+/)
          .filter(Boolean).length;

  const estimatedSeconds = Math.max(0, Math.round(totalWords / 2.2));

  const insertMarkerInSingle = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChangeScriptText(`${scriptText}${token}`);
      return;
    }
    const start = el.selectionStart ?? scriptText.length;
    const end = el.selectionEnd ?? scriptText.length;
    const next = scriptText.slice(0, start) + token + scriptText.slice(end);
    onChangeScriptText(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const insertMarkerInDialogue = (token: string) => {
    if (dialogueLines.length === 0) return;
    const targetId = activeLineId || dialogueLines[dialogueLines.length - 1].id;
    onChangeDialogueLines(
      dialogueLines.map((line) =>
        line.id === targetId ? { ...line, text: `${line.text}${token}` } : line
      )
    );
  };

  const handleEnhance = async () => {
    setEnhanceError(null);
    setIsEnhancing(true);
    setUndoSnapshot({
      scriptText,
      dialogueLines: dialogueLines.map((l) => ({ ...l })),
    });

    try {
      const res = await fetch('/api/script/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          dialogueLines,
          speakerMode: config.speakerMode,
          clipType: config.clipType,
          languageDialect: config.languageDialect,
          stylePreset: config.stylePreset,
          customStyle: config.customStyle,
          speakerAName: config.primarySpeaker.name || 'الراوي',
          speakerBName: config.secondarySpeaker.name || 'المحاور',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر تحسين النص.');
      }

      if (config.speakerMode === 'dual' && Array.isArray(data.dialogueLines)) {
        onChangeDialogueLines(data.dialogueLines);
      } else if (typeof data.text === 'string') {
        onChangeScriptText(data.text);
      }
    } catch (err) {
      setUndoSnapshot(null);
      setEnhanceError(
        err instanceof Error ? err.message : 'حدث خطأ أثناء تحسين النص.'
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleUndo = () => {
    if (!undoSnapshot) return;
    onChangeScriptText(undoSnapshot.scriptText);
    onChangeDialogueLines(undoSnapshot.dialogueLines);
    setUndoSnapshot(null);
  };

  const addDialogueLine = (speaker?: 'A' | 'B') => {
    const lastSpeaker = dialogueLines[dialogueLines.length - 1]?.speaker;
    const nextSpeaker = speaker || (lastSpeaker === 'A' ? 'B' : 'A');
    const newId = `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onChangeDialogueLines([
      ...dialogueLines,
      { id: newId, speaker: nextSpeaker, text: '' },
    ]);
    setActiveLineId(newId);
  };

  const toggleLineSpeaker = (id: string) => {
    onChangeDialogueLines(
      dialogueLines.map((l) =>
        l.id === id ? { ...l, speaker: l.speaker === 'A' ? 'B' : 'A' } : l
      )
    );
  };

  const updateLineText = (id: string, text: string) => {
    onChangeDialogueLines(
      dialogueLines.map((l) => (l.id === id ? { ...l, text } : l))
    );
  };

  const removeLine = (id: string) => {
    if (dialogueLines.length <= 1) {
      onChangeDialogueLines([{ id: 'line-1', speaker: 'A', text: '' }]);
      return;
    }
    onChangeDialogueLines(dialogueLines.filter((l) => l.id !== id));
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            4. النص وإيقاع الإلقاء
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 tabular-nums">
            <span>{totalWords} كلمة</span>
            <span aria-hidden="true">·</span>
            <span>{totalChars} حرف</span>
            <span aria-hidden="true">·</span>
            <span>المدة التقديرية ~{estimatedSeconds} ث</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="تجربة نص جاهز"
            value=""
            onChange={(e) => {
              if (e.target.value) onApplyStarterTemplate(e.target.value);
            }}
            className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="">تجربة نص جاهز...</option>
            {STARTER_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.label}
              </option>
            ))}
          </select>

          {undoSnapshot && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تراجع</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleEnhance}
            disabled={isEnhancing || totalWords === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isEnhancing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            <span>
              {config.speakerMode === 'dual'
                ? 'تحسين وتنسيق الحوار'
                : 'تحسين النص ووقفات الإلقاء'}
            </span>
          </button>
        </div>
      </div>

      {enhanceError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {enhanceError}
        </p>
      )}

      {/* Expressive markers toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200/80">
        <span className="text-xs text-slate-500">إدراج إشارة إلقاء سريعة:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {EXPRESSIVE_MARKERS.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() =>
                config.speakerMode === 'single'
                  ? insertMarkerInSingle(m.token)
                  : insertMarkerInDialogue(m.token)
              }
              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors cursor-pointer"
            >
              + {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      {config.speakerMode === 'single' ? (
        <textarea
          ref={textareaRef}
          dir="auto"
          rows={8}
          value={scriptText}
          onChange={(e) => onChangeScriptText(e.target.value)}
          placeholder="اكتب هنا نص القصة، سكربت الفيديو، أو الإعلان... يمكنك أيضاً الضغط على «تحسين النص ووقفات الإلقاء» لتنظيم التشكيل والوقفات تلقائياً."
          className="w-full p-4 rounded-xl border border-slate-200 bg-white text-base leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-y min-h-[210px]"
        />
      ) : (
        <div className="space-y-2.5">
          {dialogueLines.map((line, idx) => {
            const isB = line.speaker === 'B';
            const speakerLabel = isB
              ? config.secondarySpeaker.name || 'الشخصية الثانية'
              : config.primarySpeaker.name || 'الشخصية الأولى';

            return (
              <div
                key={line.id}
                className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white focus-within:border-blue-600 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleLineSpeaker(line.id)}
                  title="اضغط لتبديل المتحدث"
                  className={`mt-0.5 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                    isB
                      ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span className="max-w-[90px] truncate">{speakerLabel}</span>
                </button>

                <textarea
                  dir="auto"
                  rows={2}
                  value={line.text}
                  onFocus={() => setActiveLineId(line.id)}
                  onChange={(e) => updateLineText(line.id, e.target.value)}
                  placeholder={`جملة ${speakerLabel} رقم ${idx + 1}...`}
                  className="flex-1 bg-transparent text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none"
                />

                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  aria-label="حذف السطر"
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => addDialogueLine()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/40 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سطر حوار</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
