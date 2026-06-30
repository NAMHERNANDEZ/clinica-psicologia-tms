export interface ChartSeries {
  name: string;
  data: number[];
  color: string;
  dashed?: boolean;
}

interface ChartProps {
  series: ChartSeries[];
  width?: number;
  height?: number;
  maxVal?: number;
  yLabels?: number[];
  className?: string;
}

export function LineChart({ series, width = 600, height = 180, maxVal = 10, yLabels = [0, 5, 10], className }: ChartProps) {
  const pad = { top: 10, right: 20, bottom: 25, left: 40 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} style={{ maxHeight: height }}>
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="#e2e8f0" strokeWidth="1" />
      <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="#e2e8f0" strokeWidth="1" />

      {yLabels.map(v => {
        const y = pad.top + plotH - (v / maxVal) * plotH;
        return (
          <g key={v}>
            <line x1={pad.left - 4} y1={y} x2={pad.left} y2={y} stroke="#cbd5e1" strokeWidth="1" />
            <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{v}</text>
          </g>
        );
      })}

      {series.map(s => {
        const len = s.data.length;
        const path = s.data.map((v, i) => {
          const x = pad.left + (i / Math.max(len - 1, 1)) * plotW;
          const y = pad.top + plotH - (v / maxVal) * plotH;
          return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        }).join(' ');
        return <path key={s.name} d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? '6 3' : undefined} />;
      })}

      {series.map(s => {
        const len = s.data.length;
        return s.data.map((v, i) => {
          const x = pad.left + (i / Math.max(len - 1, 1)) * plotW;
          const y = pad.top + plotH - (v / maxVal) * plotH;
          return <circle key={`${s.name}-${i}`} cx={x} cy={y} r="3" fill={s.color} />;
        });
      })}

      {series.length > 1 && (
        <g transform={`translate(${width - 100}, ${pad.top})`}>
          {series.map((s, i) => (
            <g key={s.name} transform={`translate(0, ${i * 14})`}>
              {s.dashed ? (
                <line x1="0" y1="4" x2="10" y2="4" stroke={s.color} strokeWidth="1.5" strokeDasharray="4 2" />
              ) : (
                <rect x="0" y="0" width="10" height="8" rx="1" fill={s.color} />
              )}
              <text x="14" y="8" fontSize="9" fill="#64748b">{s.name}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
