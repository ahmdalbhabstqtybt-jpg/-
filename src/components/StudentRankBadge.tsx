import React from 'react';
import { Award, Crown, Medal, Sparkles } from 'lucide-react';
import { getStudentRank, type StudentRankTier } from '../lib/constants';

interface StudentRankBadgeProps {
  points: number;
  compact?: boolean;
  showProgress?: boolean;
}

const RANK_STYLES: Record<
  StudentRankTier['id'],
  {
    container: string;
    iconBg: string;
    text: string;
    bar: string;
  }
> = {
  beginner: {
    container: 'bg-slate-50 border-slate-200',
    iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
    text: 'text-slate-700',
    bar: 'bg-slate-500',
  },
  active: {
    container: 'bg-blue-50/70 border-blue-200',
    iconBg: 'bg-blue-100 text-[#2563EB] border-blue-200',
    text: 'text-[#1D4ED8]',
    bar: 'bg-[#2563EB]',
  },
  silver: {
    container: 'bg-emerald-50/70 border-emerald-200',
    iconBg: 'bg-emerald-100 text-[#059669] border-emerald-200',
    text: 'text-[#047857]',
    bar: 'bg-[#059669]',
  },
  gold: {
    container: 'bg-[#FFFBEB] border-[#FDE68A]',
    iconBg: 'bg-amber-100 text-[#D97706] border-amber-200',
    text: 'text-[#B45309]',
    bar: 'bg-[#D97706]',
  },
};

function renderRankIcon(id: StudentRankTier['id'], className: string) {
  if (id === 'gold') return <Crown className={className} />;
  if (id === 'silver') return <Award className={className} />;
  if (id === 'active') return <Medal className={className} />;
  return <Sparkles className={className} />;
}

export const StudentRankBadge: React.FC<StudentRankBadgeProps> = ({
  points,
  compact = false,
  showProgress = false,
}) => {
  const rank = getStudentRank(points);
  const style = RANK_STYLES[rank.current.id];

  if (compact) {
    return (
      <span
        title={rank.current.description}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-bold whitespace-nowrap shrink-0 ${style.container} ${style.text}`}
      >
        {renderRankIcon(rank.current.id, 'w-3.5 h-3.5 shrink-0')}
        <span>{rank.current.title}</span>
        <span className="font-mono-nums opacity-80">· {points} نقطة</span>
      </span>
    );
  }

  return (
    <div className={`p-3.5 rounded-xl border space-y-2.5 ${style.container}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${style.iconBg}`}
          >
            {renderRankIcon(rank.current.id, 'w-4 h-4')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-display text-sm font-bold ${style.text}`}>
                {rank.current.title}
              </span>
              <span className="font-mono-nums text-[11px] font-semibold text-slate-500">
                المستوى {rank.current.level} من 4
              </span>
            </div>
            <p className="text-[11px] text-slate-600">{rank.current.description}</p>
          </div>
        </div>

        <div className="text-right sm:text-left font-mono-nums">
          <span className={`text-sm font-bold ${style.text}`}>{points} نقطة</span>
        </div>
      </div>

      {showProgress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            {rank.next ? (
              <span>
                التقدم نحو رتبة <strong className="text-[#0F172A]">{rank.next.title}</strong> (
                <span className="font-mono-nums">{rank.next.minPoints} نقطة</span>)
              </span>
            ) : (
              <span className="font-semibold text-[#B45309]">
                تهانينا! وصلت إلى أعلى رتبة على منصة دراستي
              </span>
            )}
            <span className="font-mono-nums font-semibold">
              {rank.next ? `يتبقى ${rank.pointsToNext} نقطة` : '100%'}
            </span>
          </div>
          <div className="h-2 w-full bg-white/80 border border-slate-200/70 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${style.bar}`}
              style={{ width: `${rank.progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
