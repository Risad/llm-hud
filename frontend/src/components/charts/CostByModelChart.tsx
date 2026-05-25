import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { AnalyticsSummary } from '../../api/client'

const COLORS = ['#6366f1', '#22d3ee', '#a78bfa', '#34d399', '#f59e0b', '#f87171', '#60a5fa', '#fb923c']

interface Props {
  data: AnalyticsSummary['by_model']
  mode?: 'cost' | 'tokens'
}

export default function CostByModelChart({ data, mode = 'cost' }: Props) {
  const items = data.slice(0, 8)

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' },
      formatter: (p: any) => {
        const val = mode === 'cost'
          ? `$${p.data.value.toFixed(4)}`
          : p.data.value.toLocaleString() + ' tokens'
        return `<div><strong style="color:${p.color}">${p.data.name}</strong><br/>${val} (${p.percent}%)</div>`
      },
    },
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'center',
      textStyle: { color: '#94a3b8', fontSize: 11 },
      formatter: (name: string) => name.length > 16 ? name.slice(0, 16) + '…' : name,
    },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['38%', '50%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { label: { show: false } },
      data: items.map((d, i) => ({
        name: d.model,
        value: mode === 'cost' ? d.cost : d.tokens,
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
    }],
  }), [items, mode])

  if (items.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">No data</div>
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme="dark" />
}
