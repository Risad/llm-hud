import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { BalanceRecord } from '../../api/client'
import { format } from 'date-fns'

interface Props {
  data: BalanceRecord[]
}

export default function BalanceTrendChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => a.fetched_at.localeCompare(b.fetched_at))

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' },
      formatter: (params: any[]) => {
        const p = params[0]
        return `<div><div style="color:#94a3b8;margin-bottom:2px">${p.axisValue}</div>
                <strong style="color:#34d399">$${p.data?.toFixed(4)}</strong></div>`
      },
    },
    grid: { top: 16, right: 16, bottom: 40, left: 72 },
    xAxis: {
      type: 'category',
      data: sorted.map(d => format(new Date(d.fetched_at), 'MM/dd HH:mm')),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: 'Balance (USD)',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 11, formatter: (v: number) => `$${v.toFixed(2)}` },
    },
    series: [{
      name: 'Balance',
      type: 'line',
      data: sorted.map(d => d.balance_usd),
      smooth: true,
      lineStyle: { color: '#34d399', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(52,211,153,0.25)' }, { offset: 1, color: 'rgba(52,211,153,0)' }] } },
      symbolSize: 5,
      itemStyle: { color: '#34d399' },
    }],
  }), [sorted])

  if (sorted.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">No balance data</div>
  }

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme="dark" />
}
