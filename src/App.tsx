import { useEffect, useState } from 'react';
import { ActiveView, Header } from './components/Header';
import { SetupPanel } from './components/SetupPanel';
import { ScriptEditor } from './components/ScriptEditor';
import { AudioPlayerPanel } from './components/AudioPlayerPanel';
import { ClipLibrary } from './components/ClipLibrary';
import { TemplatesView } from './components/TemplatesView';
import {
  ClipConfig,
  DialogueLine,
  GeneratedClip,
  STARTER_TEMPLATES,
  StarterTemplate,
  VOICE_CHARACTERS,
} from './types/studio';
import { analyzeWavWaveform } from './utils/audio';

const STORAGE_KEY = 'rawi_studio_clips_v1';

const DEFAULT_CONFIG: ClipConfig = {
  clipType: 'story',
  speakerMode: 'single',
  languageDialect: 'ar-msa',
  stylePreset: 'dramatic',
  customStyle: '',
  primarySpeaker: {
    personaId: 'charon-tariq',
    voiceId: 'Charon',
    name: 'طارق',
    styleNote: '',
  },
  secondarySpeaker: {
    personaId: 'kore-layla',
    voiceId: 'Kore',
    name: 'ليلى',
    styleNote: '',
  },
};

const DEFAULT_DIALOGUE: DialogueLine[] = [
  { id: 'd-init-1', speaker: 'A', text: '' },
  { id: 'd-init-2', speaker: 'B', text: '' },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('studio');
  const [config, setConfig] = useState<ClipConfig>(DEFAULT_CONFIG);
  const [scriptText, setScriptText] = useState<string>(
    STARTER_TEMPLATES[0].scriptText
  );
  const [dialogueLines, setDialogueLines] =
    useState<DialogueLine[]>(DEFAULT_DIALOGUE);

  const [clips, setClips] = useState<GeneratedClip[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as GeneratedClip[];
      }
    } catch {
      // Ignore storage parse issues
    }
    return [];
  });

  const [currentClip, setCurrentClip] = useState<GeneratedClip | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Persist metadata & scripts (omit large base64 audio to stay well within localStorage quota)
  useEffect(() => {
    try {
      const serializable = clips.slice(0, 20).map(({ audioBase64: _drop, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // Ignore quota errors
    }
  }, [clips]);

  const canGenerate =
    config.speakerMode === 'single'
      ? scriptText.trim().length > 0
      : dialogueLines.some((l) => l.text.trim().length > 0);

  const buildClipTitle = (): string => {
    const raw =
      config.speakerMode === 'single'
        ? scriptText.trim()
        : dialogueLines.find((l) => l.text.trim())?.text.trim() || 'حوار صوتي';
    const cleaned = raw.replace(/<[^>]+>|\|[^|]+\|/g, '').trim();
    return cleaned.length > 48 ? `${cleaned.slice(0, 48)}...` : cleaned || 'مقطع صوتي';
  };

  const handleGenerate = async () => {
    if (!canGenerate || isGenerating) return;
    setGenError(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          scriptText,
          dialogueLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء إنشاء الصوت.');
      }

      const audioBase64 = data.audioBase64 as string;
      const analysis = await analyzeWavWaveform(audioBase64, 56);

      const newClip: GeneratedClip = {
        id: `clip-${Date.now()}`,
        title: buildClipTitle(),
        createdAt: Date.now(),
        config: structuredClone(config),
        scriptText,
        dialogueLines: dialogueLines.map((l) => ({ ...l })),
        audioBase64,
        durationSec: analysis.durationSec || undefined,
        modelUsed: data.modelUsed,
      };

      setCurrentClip(newClip);
      setClips((prev) => [newClip, ...prev]);
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : 'تعذر الاتصال بخدمة توليد الصوت.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const applyTemplate = (tpl: StarterTemplate) => {
    const preferredVoice = tpl.preferredPersonaId
      ? VOICE_CHARACTERS.find((v) => v.personaId === tpl.preferredPersonaId)
      : undefined;

    setConfig((prev) => ({
      ...prev,
      clipType: tpl.clipType,
      speakerMode: tpl.speakerMode,
      languageDialect: tpl.languageDialect,
      stylePreset: tpl.stylePreset,
      customStyle: '',
      primarySpeaker: preferredVoice
        ? {
            personaId: preferredVoice.personaId,
            voiceId: preferredVoice.id,
            name: preferredVoice.nameAr,
            styleNote: preferredVoice.defaultStyleNote || '',
          }
        : prev.primarySpeaker,
    }));

    if (tpl.speakerMode === 'dual') {
      setDialogueLines(
        tpl.dialogueLines.map((l, idx) => ({
          ...l,
          id: `tpl-${Date.now()}-${idx}`,
        }))
      );
    } else {
      setScriptText(tpl.scriptText);
    }
    setGenError(null);
    setActiveView('studio');
  };

  const handleApplyTemplateById = (templateId: string) => {
    const found = STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (found) applyTemplate(found);
  };

  const handleResetStudio = () => {
    setConfig(DEFAULT_CONFIG);
    setScriptText('');
    setDialogueLines(DEFAULT_DIALOGUE);
    setCurrentClip(null);
    setGenError(null);
    setActiveView('studio');
  };

  const handleReloadClip = (clip: GeneratedClip) => {
    setConfig(structuredClone(clip.config));
    setScriptText(clip.scriptText);
    setDialogueLines(
      clip.dialogueLines.length > 0
        ? clip.dialogueLines.map((l) => ({ ...l }))
        : DEFAULT_DIALOGUE
    );
    if (clip.audioBase64) {
      setCurrentClip(clip);
    }
    setActiveView('studio');
  };

  const handleSelectClip = (clip: GeneratedClip) => {
    setCurrentClip(clip);
    setActiveView('studio');
  };

  const handleDeleteClip = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
    if (currentClip?.id === id) {
      setCurrentClip(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <Header
        activeView={activeView}
        onChangeView={setActiveView}
        onResetStudio={handleResetStudio}
        libraryCount={clips.length}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeView === 'studio' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
                  حوّل قصتك أو سكربت الفيديو إلى صوت طبيعي
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  اختر نوع المقطع والأسلوب والشخصية، اكتب النص وابدأ الإنشاء خلال ثوانٍ.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Right Column in RTL: Setup & Characters */}
              <div className="lg:col-span-5">
                <SetupPanel config={config} onChange={setConfig} />
              </div>

              {/* Left Column in RTL: Script Editor & Audio Studio Player */}
              <div className="lg:col-span-7 space-y-6">
                <ScriptEditor
                  config={config}
                  scriptText={scriptText}
                  dialogueLines={dialogueLines}
                  onChangeScriptText={setScriptText}
                  onChangeDialogueLines={setDialogueLines}
                  onApplyStarterTemplate={handleApplyTemplateById}
                />

                <AudioPlayerPanel
                  currentClip={currentClip}
                  isGenerating={isGenerating}
                  error={genError}
                  canGenerate={canGenerate}
                  onGenerate={handleGenerate}
                />
              </div>
            </div>
          </div>
        )}

        {activeView === 'templates' && (
          <TemplatesView onSelectTemplate={applyTemplate} />
        )}

        {activeView === 'library' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                المقاطع المحفوظة
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                يمكنك إعادة تشغيل مقاطع الجلسة الحالية، تحميلها، أو فتح أي نص وإعداداته في المحرر.
              </p>
            </div>
            <ClipLibrary
              clips={clips}
              activeClipId={currentClip?.id ?? null}
              onSelectClip={handleSelectClip}
              onDeleteClip={handleDeleteClip}
              onReloadToEditor={handleReloadClip}
            />
          </div>
        )}
      </main>
    </div>
  );
}
