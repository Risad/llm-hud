import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { AnalyticsSummary } from '../../api/client'

interface Props {
  data: AnalyticsSummary['by_model']
}

export default function ModelComparisonChart({ data }: Props) {
  const items = data.slice(0, 10)

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' },
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    grid: { top: 16, right: 16, bottom: 48, left: 16, containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v),
      },
    },
    yAxis: {
      type: 'category',
      data: items.map(d => d.model.length > 18 ? d.model.slice(0, 18) + '…' : d.model),
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    series: [
      {
        name: 'Total tokens',
        type: 'bar',
        data: items.map(d => d.tokens),
        itemStyle: { color: '#6366f1', borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          fontSize: 10,
          formatter: (p: any) => p.data >= 1_000 ? `${(p.data / 1_000).toFixed(0)}K` : p.data,
        },
      },
    ],
  }), [items])

  if (items.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">No data</div>
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme="dark" />
}
