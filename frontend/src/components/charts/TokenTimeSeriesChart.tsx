import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { AnalyticsSummary } from '../../api/client'

interface Props {
  data: AnalyticsSummary['by_day']
  showCost?: boolean
}

export default function TokenTimeSeriesChart({ data, showCost = false }: Props) {
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' },
      formatter: (params: any[]) => {
        const date = params[0]?.axisValue
        const lines = params.map((p: any) =>
          `<div style="display:flex;justify-content:space-between;gap:16px">
             <span style="color:${p.color}">${p.seriesName}</span>
             <strong>${p.data?.toLocaleString()}</strong>
           </div>`
        ).join('')
        return `<div><div style="margin-bottom:4px;color:#94a3b8">${date}</div>${lines}</div>`
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      icon: 'roundRect',
    },
    grid: { top: 16, right: 16, bottom: 48, left: 60 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: showCost ? 'USD' : 'Tokens',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: {
        color: '#64748b',
        fontSize: 11,
        formatter: showCost
          ? (v: number) => `$${v.toFixed(v < 0.1 ? 4 : 2)}`
          : (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v),
      },
    },
    series: showCost
      ? [{
          name: 'Cost (USD)',
          type: 'line',
          data: data.map(d => d.cost),
          smooth: true,
          lineStyle: { color: '#a78bfa', width: 2 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(167,139,250,0.3)' }, { offset: 1, color: 'rgba(167,139,250,0)' }] } },
          symbolSize: 4,
          itemStyle: { color: '#a78bfa' },
        }]
      : [
          {
            name: 'Input tokens',
            type: 'bar',
            stack: 'tokens',
            data: data.map(d => d.input_tokens),
            itemStyle: { color: '#6366f1' },
          },
          {
            name: 'Output tokens',
            type: 'bar',
            stack: 'tokens',
            data: data.map(d => d.output_tokens),
            itemStyle: { color: '#22d3ee' },
          },
        ],
  }), [data, showCost])

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} theme="dark" />
}
