import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Flame } from 'lucide-react';
import { MAJOR_LABELS } from '../lib/constants';
import { GAZA_INSTITUTIONS } from '../lib/gazaUniversities';
import type { StudyMaterial } from '../types/dirasati';

interface GazaDepartmentsActivityChartProps {
  materials: StudyMaterial[];
  studentUniversity: string;
  onSelectDepartment?: (department: string, university?: string) => void;
  onSelectFaculty?: (faculty: string, university?: string) => void;
}

interface DepartmentChartDatum {
  department: string;
  shortDepartment: string;
  university: string;
  faculty: string;
  uploadsCount: number;
  studentUploadsCount: number;
  downloadsCount: number;
  rank: number;
}

type ChartScope = 'all_gaza' | 'deanships' | 'my_uni';

function shortenArabicLabel(label: string, maxLen = 28): string {
  const cleaned = label.replace(/^قسم\s+|^دائرة\s+|^تخصص\s+|^وحدة\s+|^مركز\s+|^عمادة\s+/, '');
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1)}…`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DepartmentChartDatum }>;
}

const DepartmentTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-lg text-right max-w-xs space-y-1.5">
      <div className="text-xs font-semibold text-[#2563EB]">
        {item.rank === 1 && item.uploadsCount > 0
          ? 'الأكثر نشاطاً في الرفع'
          : item.rank <= 3 && item.uploadsCount > 0
            ? `نشاط مرتفع · المركز #${item.rank}`
            : 'توزيع الرفع'}
      </div>
      <div className="font-display text-sm font-bold text-[#0F172A]">{item.department}</div>
      <div className="text-xs text-slate-600">
        {item.university}
        {item.faculty && item.faculty !== item.department ? ` · ${item.faculty}` : ''}
      </div>
      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-4 text-xs">
        <span className="text-slate-600">إجمالي الملفات المرفوعة</span>
        <strong className="font-mono-nums text-[#0F172A]">{item.uploadsCount} ملف</strong>
      </div>
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="text-slate-600">ملخصات الطلبة</span>
        <strong className="font-mono-nums text-[#059669]">{item.studentUploadsCount}</strong>
      </div>
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="text-slate-600">إجمالي التحميلات</span>
        <strong className="font-mono-nums text-slate-700">{item.downloadsCount}</strong>
      </div>
    </div>
  );
};

export const GazaDepartmentsActivityChart: React.FC<GazaDepartmentsActivityChartProps> = ({
  materials,
  studentUniversity,
  onSelectDepartment,
  onSelectFaculty,
}) => {
  const [scope, setScope] = useState<ChartScope>('all_gaza');

  const chartData = useMemo(() => {
    const map = new Map<
      string,
      {
        department: string;
        university: string;
        faculty: string;
        uploadsCount: number;
        studentUploadsCount: number;
        downloadsCount: number;
      }
    >();

    for (const mat of materials) {
      if (scope === 'my_uni' && mat.university !== studentUniversity) continue;
      if (scope === 'deanships') {
        const deanName = mat.faculty?.trim() || MAJOR_LABELS[mat.majorId];
        const key = `${deanName}::${mat.university}`;
        const existing = map.get(key);
        if (existing) {
          existing.uploadsCount += 1;
          existing.studentUploadsCount += mat.authorRole === 'student' ? 1 : 0;
          existing.downloadsCount += mat.downloadsCount || 0;
        } else {
          map.set(key, {
            department: deanName,
            university: mat.university,
            faculty: deanName,
            uploadsCount: 1,
            studentUploadsCount: mat.authorRole === 'student' ? 1 : 0,
            downloadsCount: mat.downloadsCount || 0,
          });
        }
        continue;
      }

      const deptName = mat.department?.trim() || MAJOR_LABELS[mat.majorId];
      const key = scope === 'my_uni' ? deptName : `${deptName}::${mat.university}`;
      const existing = map.get(key);
      if (existing) {
        existing.uploadsCount += 1;
        existing.studentUploadsCount += mat.authorRole === 'student' ? 1 : 0;
        existing.downloadsCount += mat.downloadsCount || 0;
      } else {
        map.set(key, {
          department: deptName,
          university: mat.university,
          faculty: mat.faculty || '',
          uploadsCount: 1,
          studentUploadsCount: mat.authorRole === 'student' ? 1 : 0,
          downloadsCount: mat.downloadsCount || 0,
        });
      }
    }

    // In "my_uni" mode, fill up to 8 departments from that Gaza institution so the chart stays informative
    if (scope === 'my_uni') {
      const inst = GAZA_INSTITUTIONS.find((i) => i.name === studentUniversity);
      if (inst) {
        for (const dean of inst.deanships) {
          for (const dept of dean.departments) {
            if (map.size >= 8) break;
            if (!map.has(dept)) {
              map.set(dept, {
                department: dept,
                university: inst.name,
                faculty: dean.name,
                uploadsCount: 0,
                studentUploadsCount: 0,
                downloadsCount: 0,
              });
            }
          }
          if (map.size >= 8) break;
        }
      }
    }

    const sorted = Array.from(map.values())
      .sort((a, b) => {
        if (b.uploadsCount !== a.uploadsCount) return b.uploadsCount - a.uploadsCount;
        return b.downloadsCount - a.downloadsCount;
      })
      .slice(0, 10)
      .map((entry, idx) => ({
        ...entry,
        shortDepartment: shortenArabicLabel(entry.department),
        rank: idx + 1,
      }));

    return sorted;
  }, [materials, scope, studentUniversity]);

  const topDepartment = chartData[0];
  const chartHeight = Math.max(260, chartData.length * 38 + 40);

  return (
    <div className="pt-6 border-t border-slate-200 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#2563EB] shrink-0" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#0F172A]">
              {scope === 'deanships'
                ? 'توزيع الملفات المرفوعة حسب العمادات والكليات في قطاع غزة'
                : 'توزيع الملفات المرفوعة حسب الأقسام الجامعية في قطاع غزة'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            تمييز بصري للأقسام والعمادات الأكثر نشاطاً في رفع الملخصات والمحاضرات — اضغط على أي شريط للانتقال مباشرة إلى ملفاته.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setScope('all_gaza')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              scope === 'all_gaza'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الأقسام الأكثر نشاطاً
          </button>
          <button
            type="button"
            onClick={() => setScope('deanships')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              scope === 'deanships'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            العمادات الأكثر نشاطاً
          </button>
          <button
            type="button"
            onClick={() => setScope('my_uni')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 max-w-[230px] truncate ${
              scope === 'my_uni'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title={`أقسام ${studentUniversity}`}
          >
            أقسام {studentUniversity}
          </button>
        </div>
      </div>

      {/* Top Active Highlight + Legend Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs">
        {topDepartment && topDepartment.uploadsCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-[#0F172A]">
            <Flame className="w-4 h-4 text-[#D97706] shrink-0" />
            <span>
              {scope === 'deanships' ? 'العمادة الأكثر نشاطاً حالياً:' : 'القسم الأكثر نشاطاً حالياً:'}
            </span>
            <button
              type="button"
              onClick={() => {
                if (scope === 'deanships') {
                  onSelectFaculty?.(topDepartment.faculty, topDepartment.university);
                } else {
                  onSelectDepartment?.(
                    topDepartment.department,
                    scope === 'my_uni' ? topDepartment.university : undefined,
                  );
                }
              }}
              className="font-bold text-[#B45309] hover:underline underline-offset-4"
            >
              {topDepartment.department} ({topDepartment.university})
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="font-mono-nums font-semibold text-[#059669]">
              {topDepartment.uploadsCount} ملفات مرفوعة
            </span>
          </div>
        ) : (
          <span className="text-slate-500">
            لا توجد ملفات مرفوعة بعد في أقسام هذه المؤسسة — كن أول المبادرين برفع ملخص!
          </span>
        )}

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#D97706]" aria-hidden="true" />
            <span>الأكثر نشاطاً (#1)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#059669]" aria-hidden="true" />
            <span>نشاط مرتفع (#2–#3)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" aria-hidden="true" />
            <span>أقسام نشطة</span>
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      {chartData.length === 0 ? (
        <div className="p-8 bg-[#F8FAFC] border border-slate-200 rounded-xl text-center text-sm text-slate-500">
          لا تتوفر بيانات رفع ملفات ضمن النطاق المختار حالياً.
        </div>
      ) : (
        <div
          className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 sm:p-5"
          dir="ltr"
        >
          <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: '#475569', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortDepartment"
                  width={175}
                  tick={{ fill: '#0F172A', fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <Tooltip
                  content={<DepartmentTooltip />}
                  cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
                />
                <Bar
                  dataKey="uploadsCount"
                  name="عدد الملفات المرفوعة"
                  radius={[0, 6, 6, 0]}
                  barSize={22}
                  className="cursor-pointer"
                  onClick={(data) => {
                    const entry = data as unknown as DepartmentChartDatum | undefined;
                    if (entry?.department && entry.uploadsCount > 0) {
                      if (scope === 'deanships') {
                        onSelectFaculty?.(entry.faculty, entry.university);
                      } else {
                        onSelectDepartment?.(
                          entry.department,
                          scope === 'my_uni' ? entry.university : undefined,
                        );
                      }
                    }
                  }}
                >
                  {chartData.map((entry) => {
                    const fill =
                      entry.uploadsCount === 0
                        ? '#CBD5E1'
                        : entry.rank === 1
                          ? '#D97706'
                          : entry.rank <= 3
                            ? '#059669'
                            : '#2563EB';
                    return <Cell key={`${entry.department}-${entry.university}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Clickable Quick-Filter Department / Deanship Buttons */}
          <div
            className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2"
            dir="rtl"
          >
            <span className="text-xs font-semibold text-slate-600 ml-1">
              {scope === 'deanships'
                ? 'تصفية سريعة حسب العمادة الأكثر نشاطاً:'
                : 'تصفية سريعة حسب القسم الأكثر نشاطاً:'}
            </span>
            {chartData
              .filter((d) => d.uploadsCount > 0)
              .slice(0, 6)
              .map((entry) => (
                <button
                  key={`${entry.department}-${entry.university}-btn`}
                  type="button"
                  onClick={() => {
                    if (scope === 'deanships') {
                      onSelectFaculty?.(entry.faculty, entry.university);
                    } else {
                      onSelectDepartment?.(
                        entry.department,
                        scope === 'my_uni' ? entry.university : undefined,
                      );
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                    entry.rank === 1
                      ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E] hover:border-[#D97706]'
                      : entry.rank <= 3
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-[#059669]'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-[#2563EB] hover:text-[#2563EB]'
                  }`}
                >
                  <span>{entry.shortDepartment}</span>
                  <span className="font-mono-nums">({entry.uploadsCount})</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
