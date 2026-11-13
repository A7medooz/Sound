export type ClipType = 'story' | 'reels' | 'youtube' | 'ad' | 'podcast';

export type SpeakerMode = 'single' | 'dual';

export type LanguageDialect = 'ar-msa' | 'ar-gulf' | 'ar-eg' | 'ar-lev' | 'en';

export type StylePreset =
  | 'dramatic'
  | 'calm'
  | 'energetic'
  | 'documentary'
  | 'friendly'
  | 'animated-doc';

export type PrebuiltVoiceId = 'Charon' | 'Puck' | 'Fenrir' | 'Kore' | 'Zephyr';

export interface VoiceCharacter {
  personaId: string;
  id: PrebuiltVoiceId;
  nameAr: string;
  gender: 'male' | 'female';
  roleLabel: string;
  description: string;
  defaultStyleNote?: string;
  sampleAr: Record<LanguageDialect, string>;
}

export interface ClipTypeOption {
  id: ClipType;
  label: string;
  hint: string;
  defaultStyle: StylePreset;
  defaultMode: SpeakerMode;
}

export interface DialectOption {
  id: LanguageDialect;
  label: string;
  promptHint: string;
}

export interface StyleOption {
  id: StylePreset;
  label: string;
  promptHint: string;
}

export interface DialogueLine {
  id: string;
  speaker: 'A' | 'B';
  text: string;
}

export interface SpeakerConfig {
  personaId?: string;
  voiceId: PrebuiltVoiceId;
  name: string;
  styleNote: string;
}

export interface ClipConfig {
  clipType: ClipType;
  speakerMode: SpeakerMode;
  languageDialect: LanguageDialect;
  stylePreset: StylePreset;
  customStyle: string;
  primarySpeaker: SpeakerConfig;
  secondarySpeaker: SpeakerConfig;
}

export interface GeneratedClip {
  id: string;
  title: string;
  createdAt: number;
  config: ClipConfig;
  scriptText: string;
  dialogueLines: DialogueLine[];
  audioBase64?: string;
  durationSec?: number;
  modelUsed?: string;
}

export const CLIP_TYPES: ClipTypeOption[] = [
  {
    id: 'story',
    label: 'قصة ورواية',
    hint: 'سرد أدبي مشوق وإحساس عميق',
    defaultStyle: 'dramatic',
    defaultMode: 'single',
  },
  {
    id: 'reels',
    label: 'ريلز وشورتس',
    hint: 'إيقاع سريع وجاذب للانتباه',
    defaultStyle: 'energetic',
    defaultMode: 'single',
  },
  {
    id: 'youtube',
    label: 'يوتيوب ووثائقي',
    hint: 'إلقاء متزن وواضح للشرح',
    defaultStyle: 'documentary',
    defaultMode: 'single',
  },
  {
    id: 'ad',
    label: 'إعلان ترويجي',
    hint: 'نبرة إقناعية دافئة وحيوية',
    defaultStyle: 'energetic',
    defaultMode: 'single',
  },
  {
    id: 'podcast',
    label: 'بودكاست وحوار',
    hint: 'نقاش عفوي بين شخصيتين',
    defaultStyle: 'friendly',
    defaultMode: 'dual',
  },
];

export const DIALECTS: DialectOption[] = [
  {
    id: 'ar-msa',
    label: 'العربية الفصحى',
    promptHint: 'Modern Standard Arabic (Fus-ha), clear articulation and eloquent cadence',
  },
  {
    id: 'ar-gulf',
    label: 'اللهجة الخليجية',
    promptHint: 'Natural Gulf Arabic (Khaleeji) accent and warm conversational rhythm',
  },
  {
    id: 'ar-eg',
    label: 'اللهجة المصرية',
    promptHint: 'Natural Egyptian Arabic accent, expressive and engaging delivery',
  },
  {
    id: 'ar-lev',
    label: 'اللهجة الشامية',
    promptHint: 'Natural Levantine Arabic accent, smooth and approachable cadence',
  },
  {
    id: 'en',
    label: 'English',
    promptHint: 'Natural, crisp English narration',
  },
];

export const STYLE_PRESETS: StyleOption[] = [
  {
    id: 'dramatic',
    label: 'مشوق ودرامي',
    promptHint: 'Dramatic, suspenseful storyteller with expressive pauses and emotional depth',
  },
  {
    id: 'calm',
    label: 'هادئ ودافئ',
    promptHint: 'Warm, soothing, gentle and intimate pace',
  },
  {
    id: 'energetic',
    label: 'حماسي وسريع',
    promptHint: 'Upbeat, energetic, punchy and engaging short-form creator cadence',
  },
  {
    id: 'documentary',
    label: 'وثائقي رصين',
    promptHint: 'Authoritative, composed, informative documentary narrator',
  },
  {
    id: 'friendly',
    label: 'مرح وودود',
    promptHint: 'Friendly, natural, smiling conversational tone',
  },
  {
    id: 'animated-doc',
    label: 'سرد قصصي مبسّط (وثائقي كرتوني)',
    promptHint:
      'Engaging, witty, crystal-clear animated documentary storyteller with crisp pacing, curious build-ups, lighthearted dry humor, and warm conversational Arabic clarity',
  },
];

export const VOICE_CHARACTERS: VoiceCharacter[] = [
  {
    personaId: 'hussein-abdullah',
    id: 'Puck',
    nameAr: 'حسين عبدالله',
    gender: 'male',
    roleLabel: 'أسلوب السرد المبسّط (تصميم صوتي)',
    description: 'محاكاة لأسلوب السرد التاريخي والعلمي المبسّط بنبرة هادئة، واضحة، وخفة ظل.',
    defaultStyleNote:
      'Warm, articulate Saudi/Arabic animated-documentary narrator (similar to OverSimplified Arabic storytelling): calm yet engaging pace, curious questioning inflection, light dry humor, and clear emphasis on key moments',
    sampleAr: {
      'ar-msa': 'في عام ألف وتسعمئة وأربعة عشر، كان الجميع يظن أن الأزمة ستنتهي خلال أسابيع... <breath> لكن القصة كانت أكبر بكثير!',
      'ar-gulf': 'تخيل معي، كل هالأحداث الكبيرة بدأت بسبب موقف واحد بسيط... <breath> خلنا نرجع من البداية ونشوف وش صار.',
      'ar-eg': 'تخيل إن العالم كله اتغير بسبب قرار واحد في لحظة محدش توقعها... <breath> تعالى نحكي الحكاية من الأول.',
      'ar-lev': 'تخيل معي إنو كل هالقصة الكبيرة بلشت من تفصيلة صغيرة ما حدا انتبهلا... <breath> خلينا نرجع للبداية.',
      en: 'Picture this: everyone thought the crisis would blow over in a week... <breath> spoiler alert, it did not.',
    },
  },
  {
    personaId: 'charon-tariq',
    id: 'Charon',
    nameAr: 'طارق',
    gender: 'male',
    roleLabel: 'راوي عميق ورصين',
    description: 'نبرة رجالية هادئة وعميقة تناسب القصص والوثائقيات.',
    sampleAr: {
      'ar-msa': 'مرحباً بكم، في هذه الليلة سنروي حكايةً لم تُحكَ من قبل.',
      'ar-gulf': 'يا هلا فيكم، اليوم بنسولف عن قصة بتشدكم من أول ثانية.',
      'ar-eg': 'أهلاً بيكم، النهاردة هنحكي حكاية مختلفة تماماً عن أي حاجة سمعتوها.',
      'ar-lev': 'أهلاً فيكم، اليوم رح نحكي قصة بتاخدنا لعالم تاني.',
      en: 'Welcome. Tonight, we uncover a story that stayed hidden for years.',
    },
  },
  {
    personaId: 'puck-zaid',
    id: 'Puck',
    nameAr: 'زيد',
    gender: 'male',
    roleLabel: 'شاب حيوي وسريع',
    description: 'صوت شبابي واضح ونشيط، مثالي للريلز والبودكاست.',
    sampleAr: {
      'ar-msa': 'توقف لحظة! هل تعلم أن فكرةً صغيرةً قد تغيّر يومك بالكامل؟',
      'ar-gulf': 'اسمعني زين، هالحركة البسيطة بتوفر عليك وقت وجهد كبير!',
      'ar-eg': 'استنى ثانية! تعرف إن تفصيلة صغيرة ممكن تغيّر النتيجة تماماً؟',
      'ar-lev': 'وقف شوي! بتعرف إنو فكرة صغيرة ممكن تغيّر كل شي بيومك؟',
      en: 'Hold on! Did you know one tiny change can transform your entire video?',
    },
  },
  {
    personaId: 'fenrir-faisal',
    id: 'Fenrir',
    nameAr: 'فيصل',
    gender: 'male',
    roleLabel: 'قوي ومؤثر',
    description: 'إلقاء واثق وحازم للإعلانات القوية ومشاهد التشويق.',
    sampleAr: {
      'ar-msa': 'اللحظة الحاسمة تقترب، ولا مجال للتردد بعد الآن.',
      'ar-gulf': 'الحين وقت الجد، والفرصة ما تتكرر مرتين!',
      'ar-eg': 'دي اللحظة اللي هتفرق في كل حاجة، استعد للبداية الجديدة.',
      'ar-lev': 'هلأ صار وقت القرار الحقيقي، بدون أي تردد.',
      en: 'This is the turning point. Bold ideas demand an unforgettable voice.',
    },
  },
  {
    personaId: 'kore-layla',
    id: 'Kore',
    nameAr: 'ليلى',
    gender: 'female',
    roleLabel: 'أنثوي متزن ودافئ',
    description: 'صوت نسائي ناعم وواضح، ممتاز للروايات والشرح الهادئ.',
    sampleAr: {
      'ar-msa': 'في هدوء الفجر، تبدأ أجمل الحكايات التي تلامس القلب.',
      'ar-gulf': 'في هدوء الصبح، دايماً تبدأ أجمل القصص اللي تسكن الذاكرة.',
      'ar-eg': 'في اللحظات الهادية دي، بنسمع صوت أفكارنا بوضوح أكبر.',
      'ar-lev': 'بهدوء الصبح، بتبلش أحلى الحكايات اللي بتضل بالبال.',
      en: 'In the quiet of the morning, the clearest stories begin to unfold.',
    },
  },
  {
    personaId: 'zephyr-noor',
    id: 'Zephyr',
    nameAr: 'نور',
    gender: 'female',
    roleLabel: 'أنثوي مشرق وودود',
    description: 'نبرة نسائية حيوية وقريبة للقلب للحوارات والإعلانات.',
    sampleAr: {
      'ar-msa': 'أهلاً بك! يسعدني أن أشاركك هذه التجربة الملهمة اليوم.',
      'ar-gulf': 'هلا والله! متحمسة مرّة أشارككم هالفكرة الرهيبة اليوم.',
      'ar-eg': 'أهلاً بيكم! مبسوطة جداً إني معاكم النهاردة في حلقة جديدة.',
      'ar-lev': 'مرحبا! كتير مبسوطة إني عم شارككم هالتجربة الحلوة اليوم.',
      en: 'Hey there! So excited to share this story with you today.',
    },
  },
];

export interface StarterTemplate {
  id: string;
  label: string;
  clipType: ClipType;
  speakerMode: SpeakerMode;
  languageDialect: LanguageDialect;
  stylePreset: StylePreset;
  preferredPersonaId?: string;
  scriptText: string;
  dialogueLines: DialogueLine[];
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'story-night',
    label: 'قصة قصيرة مشوقة',
    clipType: 'story',
    speakerMode: 'single',
    languageDialect: 'ar-msa',
    stylePreset: 'dramatic',
    scriptText:
      'عند منتصف الليل، توقف المطر فجأة عن طرق النوافذ... <breath> التفت سالم نحو الممر المظلم، وشعر أن الرسالة التي وجدها صباحاً لم تكن مجرد مزحة عابرة.',
    dialogueLines: [],
  },
  {
    id: 'reels-hook',
    label: 'سكربت ريلز سريع',
    clipType: 'reels',
    speakerMode: 'single',
    languageDialect: 'ar-gulf',
    stylePreset: 'energetic',
    scriptText:
      'ثلاث ثواني بس كفيلة تخلّي المشاهد يكمل الفيديو للآخر! <breath> السر مب في المونتاج المعقد، السر في أول جملة تقولها ونبرة صوتك.',
    dialogueLines: [],
  },
  {
    id: 'doc-space',
    label: 'مقدمة وثائقية',
    clipType: 'youtube',
    speakerMode: 'single',
    languageDialect: 'ar-msa',
    stylePreset: 'documentary',
    scriptText:
      'منذ آلاف السنين، نظر الإنسان إلى السماء متسائلاً عن سر تلك النقاط المضيئة. واليوم، نقف على أعتاب اكتشاف قد يعيد رسم خريطة الكون.',
    dialogueLines: [],
  },
  {
    id: 'hussein-animated-history',
    label: 'تاريخ مبسّط (أسلوب السرد الكرتوني)',
    clipType: 'youtube',
    speakerMode: 'single',
    languageDialect: 'ar-gulf',
    stylePreset: 'animated-doc',
    preferredPersonaId: 'hussein-abdullah',
    scriptText:
      'في بدايات القرن العشرين، كانت أوروبا أشبه ببرميل بارود ينتظر شرارة واحدة... <breath> والمضحك في القصة، إن القادة وقتها كانوا متأكدين إن أي نزاع بينتهي قبل موسم الأعياد! لكن اللي صار بعدها قلب موازين العالم كله.',
    dialogueLines: [],
  },
  {
    id: 'podcast-duo',
    label: 'حوار بودكاست ثنائي',
    clipType: 'podcast',
    speakerMode: 'dual',
    languageDialect: 'ar-msa',
    stylePreset: 'friendly',
    scriptText: '',
    dialogueLines: [
      {
        id: 'd1',
        speaker: 'A',
        text: 'أهلاً بكم في حلقة جديدة! <breath> اليوم نتحدث عن سر الصوت الجذاب في صناعة المحتوى.',
      },
      {
        id: 'd2',
        speaker: 'B',
        text: '|yeah| بالفعل، كثيرون يركزون على الصورة وينسون أن نصف تأثير الفيديو يأتي من الصوت.',
      },
      {
        id: 'd3',
        speaker: 'A',
        text: 'صحيح تماماً، وعندما تضيف وقفات طبيعية ونبرة صادقة، يتفاعل المستمع فوراً. <laugh>',
      },
    ],
  },
  {
    id: 'story-duo',
    label: 'مشهد حواري في قصة',
    clipType: 'story',
    speakerMode: 'dual',
    languageDialect: 'ar-eg',
    stylePreset: 'dramatic',
    scriptText: '',
    dialogueLines: [
      {
        id: 's1',
        speaker: 'A',
        text: 'انتي متأكدة إن المفتاح كان هنا امبارح؟ <gasp>',
      },
      {
        id: 's2',
        speaker: 'B',
        text: 'أيوه طبعاً! حطيته بنفسي على الترابيزة قبل ما النور يقطع.',
      },
      {
        id: 's3',
        speaker: 'A',
        text: '<breath> يبقى حد تاني دخل الأوضة دي قبلنا.',
      },
    ],
  },
];
