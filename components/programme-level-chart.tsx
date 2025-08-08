"use client"

import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface ProgrammeStats {
  programme: string
  total: number
  voted: number
  turnout: number
}

interface LevelStats {
  level: string
  total: number
  voted: number
  turnout: number
}

interface ProgrammeLevelChartProps {
  programmeStats: ProgrammeStats[]
  levelStats: LevelStats[]
}

export function ProgrammeLevelChart({ programmeStats, levelStats }: ProgrammeLevelChartProps) {
  // Sanitize and ensure numbers are properly rounded
  const sanitizedProgrammeStats = programmeStats?.map(stat => ({
    ...stat,
    total: Math.round(Number(stat.total) || 0),
    voted: Math.round(Number(stat.voted) || 0),
    turnout: Math.round((Number(stat.turnout) || 0) * 10) / 10 // Round to 1 decimal
  })) || [];

  const sanitizedLevelStats = levelStats?.map(stat => ({
    ...stat,
    total: Math.round(Number(stat.total) || 0),
    voted: Math.round(Number(stat.voted) || 0),
    turnout: Math.round((Number(stat.turnout) || 0) * 10) / 10 // Round to 1 decimal
  })) || [];

  const programmeChartData = {
    labels: sanitizedProgrammeStats.map(stat => stat.programme),
    datasets: [
      {
        label: "Total Students",
        data: sanitizedProgrammeStats.map(stat => stat.total),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: "Voted Students",
        data: sanitizedProgrammeStats.map(stat => stat.voted),
        backgroundColor: "rgba(34, 197, 94, 0.7)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const levelChartData = {
    labels: sanitizedLevelStats.map(stat => `Level ${stat.level}`),
    datasets: [
      {
        label: "Total Students",
        data: sanitizedLevelStats.map(stat => stat.total),
        backgroundColor: "rgba(168, 85, 247, 0.7)",
        borderColor: "rgba(168, 85, 247, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: "Voted Students",
        data: sanitizedLevelStats.map(stat => stat.voted),
        backgroundColor: "rgba(34, 197, 94, 0.7)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            return `${datasetLabel}: ${value}`;
          },
          afterLabel: function(context: any) {
            const dataIndex = context.dataIndex;
            const isProgram = context.chart.canvas.getAttribute('data-chart-type') === 'programme';
            const stats = isProgram ? sanitizedProgrammeStats[dataIndex] : sanitizedLevelStats[dataIndex];
            
            if (stats && context.dataset.label === 'Voted Students') {
              return `Turnout: ${stats.turnout}%`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: {
            size: 11
          }
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 11
          },
          callback: function(value: any) {
            return Math.round(value); // Ensure whole numbers on Y-axis
          }
        },
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      },
    },
  };

  // Check if we have any data to display
  if (!sanitizedProgrammeStats.length && !sanitizedLevelStats.length) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-gray-500">No programme or level data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Programme Chart */}
        {sanitizedProgrammeStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Voting by Programme</CardTitle>
              <CardDescription>
                Student participation across programmes • Total: {sanitizedProgrammeStats.reduce((sum, stat) => sum + stat.total, 0)} students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar 
                  data={programmeChartData} 
                  options={chartOptions}
                  data-chart-type="programme"
                />
              </div>

            </CardContent>
          </Card>
        )}
        
        {/* Level Chart */}
        {sanitizedLevelStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Voting by Academic Level</CardTitle>
              <CardDescription>
                Student participation across levels • Total: {sanitizedLevelStats.reduce((sum, stat) => sum + stat.total, 0)} students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar 
                  data={levelChartData} 
                  options={chartOptions}
                  data-chart-type="level"
                />
              </div>

            </CardContent>
          </Card>
        )}
      </div>


    </div>
  )
}

export default ProgrammeLevelChart