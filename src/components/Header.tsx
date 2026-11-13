import { Plus } from 'lucide-react';

export type ActiveView = 'studio' | 'library' | 'templates';

interface HeaderProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  onResetStudio: () => void;
  libraryCount: number;
}

export function Header({
  activeView,
  onChangeView,
  onResetStudio,
  libraryCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onChangeView('studio')}
          className="font-display text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          راوي
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
          <button
            type="button"
            onClick={() => onChangeView('studio')}
            className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'studio'
                ? 'border-blue-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            الاستوديو
          </button>
          <button
            type="button"
            onClick={() => onChangeView('templates')}
            className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'templates'
                ? 'border-blue-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            قوالب جاهزة
          </button>
          <button
            type="button"
            onClick={() => onChangeView('library')}
            className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              activeView === 'library'
                ? 'border-blue-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            المقاطع المحفوظة ({libraryCount})
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onResetStudio}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Plus className="w-4 h-4" />
            <span>مقطع جديد</span>
          </button>
        </div>
      </div>
    </header>
  );
}
