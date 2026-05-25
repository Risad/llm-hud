import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { AnalyticsSummary } from '../../api/client'

interface Props {
  data: AnalyticsSummary['by_day']
}

export default function UsageHeatmap({ data }: Props) {
  const maxTokens = Math.max(...data.map(d => d.tokens), 1)

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' },
      formatter: (p: any) => {
        const [date, tokens] = p.data
        return `<div><strong>${date}</strong><br/>${Number(tokens).toLocaleString()} tokens</div>`
      },
    },
    visualMap: {
      min: 0,
      max: maxTokens,
      calculable: true,
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      textStyle: { color: '#94a3b8', fontSize: 10 },
      inRange: { color: ['#1e293b', '#6366f1', '#a78bfa'] },
    },
    calendar: {
      top: 20,
      left: 40,
      right: 40,
      bottom: 40,
      range: data.length > 0 ? [data[0].date, data[data.length - 1].date] : new Date().getFullYear(),
      cellSize: ['auto', 18],
      itemStyle: { borderColor: '#0f172a', borderWidth: 2 },
      yearLabel: { textStyle: { color: '#64748b' } },
      monthLabel: { textStyle: { color: '#64748b', fontSize: 10 } },
      dayLabel: { textStyle: { color: '#475569', fontSize: 10 } },
    },
    series: [{
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: data.map(d => [d.date, d.tokens]),
    }],
  }), [data, maxTokens])

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">No data</div>
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme="dark" />
}
