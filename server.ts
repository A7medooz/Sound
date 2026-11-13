import 'dotenv/config';
import express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('مفتاح GEMINI_API_KEY غير مهيأ على الخادم.');
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Simple in-memory cache for short voice previews so repeated clicks are instant
const previewCache = new Map<string, string>();

const DIALECT_DIRECTIONS: Record<string, string> = {
  'ar-msa': 'Modern Standard Arabic (Fus-ha) with clear eloquent pronunciation',
  'ar-gulf': 'Natural Gulf Arabic (Khaleeji) dialect and rhythm',
  'ar-eg': 'Natural Egyptian Arabic dialect and cadence',
  'ar-lev': 'Natural Levantine Arabic dialect and cadence',
  en: 'Natural, articulate English',
};

const STYLE_DIRECTIONS: Record<string, string> = {
  dramatic: 'Dramatic, suspenseful, expressive storyteller with rich pacing',
  calm: 'Warm, calm, soothing, intimate narrator',
  energetic: 'Energetic, fast-paced, captivating creator voice',
  documentary: 'Composed, authoritative, crisp documentary narrator',
  friendly: 'Warm, smiling, natural conversational tone',
  'animated-doc':
    'Engaging, witty, crystal-clear animated documentary storyteller with crisp pacing, curious build-ups, lighthearted dry humor, and warm conversational Arabic clarity',
};

const CLIP_DIRECTIONS: Record<string, string> = {
  story: 'storytelling and narrative fiction',
  reels: 'short-form social video (Reels / TikTok / Shorts)',
  youtube: 'YouTube video and documentary narration',
  ad: 'persuasive commercial advertisement',
  podcast: 'conversational podcast episode',
};

function buildStylePrompt(params: {
  clipType?: string;
  languageDialect?: string;
  stylePreset?: string;
  customStyle?: string;
  speakerStyleNote?: string;
}): string {
  const dialect = DIALECT_DIRECTIONS[params.languageDialect || 'ar-msa'] || DIALECT_DIRECTIONS['ar-msa'];
  const style = STYLE_DIRECTIONS[params.stylePreset || 'dramatic'] || STYLE_DIRECTIONS.dramatic;
  const clip = CLIP_DIRECTIONS[params.clipType || 'story'] || CLIP_DIRECTIONS.story;
  const extras = [params.speakerStyleNote?.trim(), params.customStyle?.trim()]
    .filter(Boolean)
    .join(', ');

  return `${style} tailored for ${clip}, speaking in ${dialect}${extras ? `. Additional direction: ${extras}` : ''}.`;
}

function isRateLimitError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429');
}

async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelayMs = 1200
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err) || attempt === retries) {
        throw err;
      }
      const waitMs = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastErr;
}

function stripExpressiveTags(text: string): string {
  return text
    .replace(/<breath>/gi, '...')
    .replace(/<(laugh|gasp)>/gi, '')
    .replace(/\|(mhm|yeah)\|/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseApiErrorMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  console.error('[Gemini API Error]:', raw);
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message: 'تعذر التحقق من مفتاح Gemini API. يرجى التأكد من إعداد المفتاح في لوحة Settings > Secrets.',
    };
  }
  if (isRateLimitError(err)) {
    return {
      status: 429,
      message:
        'تم تجاوز حد الطلبات المؤقت (429). انتظر 20–30 ثانية ثم أعد المحاولة، أو فعّل مفتاح API مدفوع من Settings > Secrets لزيادة الحصة.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      message: 'النموذج الصوتي المطلوب غير متاح حالياً.',
    };
  }
  return {
    status: 500,
    message: raw || 'حدث خطأ غير متوقع أثناء المعالجة.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // 1. Enhance Script & Formatting Pauses
  app.post('/api/script/enhance', async (req, res) => {
    try {
      const {
        text,
        dialogueLines,
        speakerMode = 'single',
        clipType = 'story',
        languageDialect = 'ar-msa',
        stylePreset = 'dramatic',
        customStyle = '',
        speakerAName = 'الراوي',
        speakerBName = 'المحاور',
      } = req.body ?? {};

      const hasDialogue = Array.isArray(dialogueLines) && dialogueLines.length > 0;
      const rawText =
        typeof text === 'string' && text.trim()
          ? text.trim()
          : hasDialogue
            ? dialogueLines.map((l: { speaker: string; text: string }) => `${l.speaker === 'B' ? speakerBName : speakerAName}: ${l.text}`).join('\n')
            : '';

      if (!rawText) {
        res.status(400).json({ error: 'يرجى كتابة نص أولاً قبل التحسين.' });
        return;
      }

      const ai = getGeminiClient();
      const dialectLabel = DIALECT_DIRECTIONS[languageDialect] || DIALECT_DIRECTIONS['ar-msa'];
      const styleLabel = STYLE_DIRECTIONS[stylePreset] || STYLE_DIRECTIONS.dramatic;
      const clipLabel = CLIP_DIRECTIONS[clipType] || CLIP_DIRECTIONS.story;

      if (speakerMode === 'dual') {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Convert or refine the following script into a natural two-speaker dialogue for ${clipLabel} in ${dialectLabel} with a ${styleLabel} tone${customStyle ? ` (${customStyle})` : ''}.
Speaker A is "${speakerAName}" and Speaker B is "${speakerBName}".
Preserve the user's meaning and language/dialect faithfully!
Add natural pacing punctuation (...) and subtle expressive markers ONLY where natural (such as <breath>, <laugh>, <gasp>, |mhm|, |yeah| for English or natural Arabic punctuation/partial tashkeel to aid pronunciation). Do not overdo markers.

Input script:
${rawText}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                lines: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING, description: 'Either "A" or "B"' },
                      text: { type: Type.STRING, description: 'The spoken line with natural pauses and optional vocal cues' },
                    },
                    required: ['speaker', 'text'],
                  },
                },
              },
              required: ['lines'],
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '{"lines":[]}').trim()) as {
          lines?: Array<{ speaker: string; text: string }>;
        };
        const cleanLines = (parsed.lines || [])
          .filter((l) => l && typeof l.text === 'string' && l.text.trim())
          .map((l, idx) => ({
            id: `enh-${Date.now()}-${idx}`,
            speaker: l.speaker === 'B' ? 'B' : 'A',
            text: l.text.trim(),
          }));

        res.json({ dialogueLines: cleanLines });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `You are a voiceover script editor. Refine the following script for ${clipLabel} in ${dialectLabel} with a ${styleLabel} tone${customStyle ? ` (${customStyle})` : ''}.
Rules:
- Keep the exact same language/dialect and preserve the user's ideas without translating or rewriting it into a different topic.
- Improve punctuation and natural pause points ("..." or commas) for smooth spoken rhythm.
- For Arabic text, add helpful light diacritics (تشكيل) only on ambiguous words to guarantee accurate TTS pronunciation.
- Sparingly insert 1-3 natural TTS cues like <breath> where a speaker naturally pauses or inhales.
- Return ONLY the refined script text, with no commentary or quotes.

Script:
${rawText}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const enhancedText = (response.text ?? rawText).trim();
      res.json({ text: enhancedText });
    } catch (err) {
      const { status, message } = parseApiErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. Short Voice Preview (cached)
  app.post('/api/tts/preview', async (req, res) => {
    try {
      const {
        voiceId = 'Charon',
        personaId = '',
        languageDialect = 'ar-msa',
        sampleText,
        styleNote = '',
      } = req.body ?? {};
      if (!sampleText || typeof sampleText !== 'string') {
        res.status(400).json({ error: 'نص المعاينة مطلوب.' });
        return;
      }

      const cacheKey = `${personaId || voiceId}:${languageDialect}:${styleNote}:${sampleText}`;
      const cached = previewCache.get(cacheKey);
      if (cached) {
        res.json({ audioBase64: cached, mimeType: 'audio/wav', cached: true });
        return;
      }

      const ai = getGeminiClient();
      const stylePrompt = buildStylePrompt({
        clipType: styleNote ? 'youtube' : 'story',
        languageDialect,
        stylePreset: styleNote ? 'animated-doc' : 'friendly',
        speakerStyleNote: typeof styleNote === 'string' ? styleNote : '',
      });

      // Use high-throughput lite TTS for short voice previews to preserve quota
      const cleanPreviewText = stripExpressiveTags(sampleText);
      const response = await withRateLimitRetry(
        () =>
          ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: cleanPreviewText,
                    speechMetadata: {
                      style: stylePrompt,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceId },
                },
              },
            },
          }),
        1,
        1000
      );

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: 'لم يتم استلام بيانات صوتية من النموذج.' });
        return;
      }

      previewCache.set(cacheKey, base64Audio);
      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', cached: false });
    } catch (err) {
      const { status, message } = parseApiErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 3. Generate Full Voiceover (Single or Dual Speaker)
  app.post('/api/tts/generate', async (req, res) => {
    try {
      const {
        clipType = 'story',
        speakerMode = 'single',
        languageDialect = 'ar-msa',
        stylePreset = 'dramatic',
        customStyle = '',
        primarySpeaker = { voiceId: 'Charon', name: 'الراوي', styleNote: '' },
        secondarySpeaker = { voiceId: 'Kore', name: 'ليلى', styleNote: '' },
        scriptText = '',
        dialogueLines = [],
      } = req.body ?? {};

      const ai = getGeminiClient();

      if (speakerMode === 'dual') {
        const lines = Array.isArray(dialogueLines)
          ? dialogueLines.filter((l: { text?: string }) => l && typeof l.text === 'string' && l.text.trim())
          : [];

        if (lines.length === 0) {
          res.status(400).json({ error: 'يرجى إضافة سطر حوار واحد على الأقل قبل إنشاء الصوت.' });
          return;
        }

        const speakerA = (primarySpeaker.name || 'المتحدث الأول').trim();
        let speakerB = (secondarySpeaker.name || 'المتحدث الثاني').trim();
        if (speakerB === speakerA) {
          speakerB = `${speakerB} 2`;
        }

        const styleA = buildStylePrompt({
          clipType,
          languageDialect,
          stylePreset,
          customStyle,
          speakerStyleNote: primarySpeaker.styleNote,
        });

        const styleB = buildStylePrompt({
          clipType,
          languageDialect,
          stylePreset,
          customStyle,
          speakerStyleNote: secondarySpeaker.styleNote,
        });

        const parts = lines.map((line: { speaker: string; text: string }) => {
          const isB = line.speaker === 'B';
          const speakerName = isB ? speakerB : speakerA;
          return {
            text: `${speakerName}: ${line.text.trim()}`,
            speechMetadata: {
              speaker: speakerName,
              style: isB ? styleB : styleA,
            },
          };
        });

        const modelUsed = 'gemini-3.8-flash-tts';
        const response = await withRateLimitRetry(
          () =>
            ai.models.generateContent({
              model: modelUsed,
              contents: [{ role: 'user', parts }],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                      {
                        speaker: speakerA,
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: primarySpeaker.voiceId || 'Charon' },
                        },
                      },
                      {
                        speaker: speakerB,
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: secondarySpeaker.voiceId || 'Kore' },
                        },
                      },
                    ],
                  },
                },
              },
            }),
          2,
          1200
        );

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          res.status(502).json({ error: 'تعذر توليد الملف الصوتي للحوار. حاول تبسيط النص أو إعادة المحاولة.' });
          return;
        }

        res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', modelUsed });
        return;
      }

      // Single Speaker Mode
      const cleanScript = typeof scriptText === 'string' ? scriptText.trim() : '';
      if (!cleanScript) {
        res.status(400).json({ error: 'يرجى كتابة النص المراد تحويله إلى صوت.' });
        return;
      }

      const hasExpressiveTags = /<(breath|laugh|gasp)>|\|(mhm|yeah)\|/i.test(cleanScript);
      const preferredModel = hasExpressiveTags
        ? 'gemini-3.8-flash-tts'
        : 'gemini-3.8-flash-lite-tts';

      const stylePrompt = buildStylePrompt({
        clipType,
        languageDialect,
        stylePreset,
        customStyle,
        speakerStyleNote: primarySpeaker.styleNote,
      });

      const callSingleTts = (modelName: string, textToSpeak: string) =>
        ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: textToSpeak,
                  speechMetadata: {
                    style: stylePrompt,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: primarySpeaker.voiceId || 'Charon' },
              },
            },
          },
        });

      let modelUsed = preferredModel;
      let response;
      try {
        response = await withRateLimitRetry(
          () => callSingleTts(preferredModel, cleanScript),
          1,
          1200
        );
      } catch (err) {
        // Automatic fallback to high-throughput lite-tts if flagship flash-tts hits 429
        if (preferredModel === 'gemini-3.8-flash-tts' && isRateLimitError(err)) {
          modelUsed = 'gemini-3.8-flash-lite-tts';
          response = await withRateLimitRetry(
            () => callSingleTts(modelUsed, stripExpressiveTags(cleanScript)),
            1,
            1200
          );
        } else {
          throw err;
        }
      }

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: 'لم يتم إرجاع صوت من النموذج. يرجى المحاولة مرة أخرى.' });
        return;
      }

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', modelUsed });
    } catch (err) {
      const { status, message } = parseApiErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rawi Voice Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
