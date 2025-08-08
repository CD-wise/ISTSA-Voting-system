"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CategoryPieChartProps {
  categoryName: string
  data: Array<{
    name: string
    value: number
    position: number
  }>
  colors: string[]
}

export default function CategoryPieChart({ categoryName, data, colors }: CategoryPieChartProps) {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <Card className="h-full min-w-[350px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">{categoryName}</CardTitle>
          <CardDescription className="text-sm">No data available</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 flex items-center justify-center h-64">
          <p className="text-gray-500">No votes recorded for this category</p>
        </CardContent>
      </Card>
    )
  }

  // Prepare data with colors
  const chartData = data.map((item, index) => ({
    ...item,
    fill: colors[index % colors.length],
  }))

  const totalVotes = data.reduce((sum, item) => sum + (item.value || 0), 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percentage = totalVotes > 0 ? Math.round((data.value / totalVotes) * 100) : 0
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg" role="tooltip">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} votes ({percentage}%)
          </p>
          <p className="text-xs text-gray-500">Position: #{data.position}</p>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    // Only show label if percentage is greater than 5%
    if (percent < 0.05) return null

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }} // Better text visibility
      >
        {`${value}`}
      </text>
    )
  }

  const getPositionBadgeStyle = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case 2:
        return "bg-gray-100 text-gray-700 border-gray-200"
      case 3:
        return "bg-orange-100 text-orange-700 border-orange-200"
      default:
        return "bg-blue-100 text-blue-700 border-blue-200"
    }
  }

  return (
    <Card className="h-full min-w-[350px]" role="region" aria-label={`${categoryName} voting results`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{categoryName}</CardTitle>
        <CardDescription className="text-sm">
          Total votes: <span className="font-medium">{totalVotes}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Enhanced Legend */}
        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto" role="list" aria-label="Voting results breakdown">
          {chartData
            .sort((a, b) => a.position - b.position) // Sort by position for better readability
            .map((entry, index) => {
              const percentage = totalVotes > 0 ? Math.round((entry.value / totalVotes) * 100) : 0
              return (
                <div 
                  key={index} 
                  className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-gray-50 transition-colors"
                  role="listitem"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow-sm" 
                      style={{ backgroundColor: entry.fill }}
                      role="img"
                      aria-label={`Color indicator for ${entry.name}`}
                    />
                    <span className="font-medium truncate" title={entry.name}>
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className="text-gray-600 font-medium min-w-0">
                      {entry.value}
                    </span>
                    <span className="text-gray-500 text-xs min-w-0">
                      ({percentage}%)
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getPositionBadgeStyle(entry.position)}`}
                      title={`Position ${entry.position}`}
                    >
                      #{entry.position}
                    </span>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Summary stats */}
        {totalVotes > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Leading: {chartData[0]?.name}</span>
              <span>{chartData.length} candidates</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}