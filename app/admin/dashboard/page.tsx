"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  adminLogout,
  generateResultsData,
  getCategoryWiseStats,
  getDashboardStats,
  getProgrammeLevelStats,
  getTransformedStudentData,
  setVotingStatus,
  verifyAdminSession,
} from "@/lib/admin-actions"
import { Download, FileText, LogOut, RefreshCw, TrendingUp, Users, Vote, Award } from 'lucide-react'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import CategoryPieChart from "@/components/category-pie-chart"
import ProgrammeLevelChart from "@/components/programme-level-chart"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface DashboardStats {
  totalStudents: number
  votedStudents: number
  turnoutPercentage: number
  votingStats: any[]
  categoryTotals: Record<string, number>
}

interface AdminUser {
  id: number
  username: string
  full_name: string
}

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#ca8a04", "#9333ea", "#c2410c", "#0891b2", "#be123c"]

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [programmeLevelStats, setProgrammeLevelStats] = useState<any>({ programmeStats: [], levelStats: [] })
  const [categoryStats, setCategoryStats] = useState<Record<string, any[]>>({})
  const [transformedStudentData, setTransformedStudentData] = useState<any[]>([])
  const [resultsData, setResultsData] = useState<Record<string, any[]>>({})
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false) // for widget/card loading
  const [refreshing, setRefreshing] = useState(false)
  const [votingOpen, setVotingOpen] = useState<boolean | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAdminAuth()
  }, [])

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase.from("voting_status").select("is_open").eq("id", 1).single()
      setVotingOpen(data?.is_open ?? null)
    }
    fetchStatus()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('public:votes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        (payload) => {
          // Call your data refresh function here
          refreshData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const checkAdminAuth = async () => {
    const result = await verifyAdminSession()
    if (!result.success) {
      router.push("/admin")
      return
    }
    setAdmin(result.admin ?? null)
    await loadDashboardData(true) // pass true for initial load
  }

  const loadDashboardData = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true)
    else setLoading(true)
    try {
      const [dashboardStats, progLevelStats, categoryWiseStats, transformedData, results] = await Promise.all([
        getDashboardStats(),
        getProgrammeLevelStats(),
        getCategoryWiseStats(),
        getTransformedStudentData(),
        generateResultsData(),
      ])

      setStats(dashboardStats)
      setProgrammeLevelStats(progLevelStats)
      setCategoryStats(categoryWiseStats)
      setTransformedStudentData(transformedData)
      setResultsData(results)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      if (isInitial) setInitialLoading(false)
      else setLoading(false)
    }
  }

  const refreshData = async () => {
    setLoading(true)
    await loadDashboardData()
    setLoading(false)
  }

  const handleLogout = async () => {
    await adminLogout()
    router.push("/admin")
  }

  const handleToggleVoting = async () => {
    if (votingOpen === null) return
    setStatusLoading(true)
    const { success } = await setVotingStatus(!votingOpen)
    if (success) setVotingOpen(!votingOpen)
    setStatusLoading(false)
  }

  const generatePDF = async () => {
    try {
      // Dynamically import jsPDF
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF()

      // PDF Configuration
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const margin = 20
      let yPosition = margin

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
          return true
        }
        return false
      }

      // Header Section
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("ISTSA ELECTION RESULTS", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 10

      doc.setFontSize(14)
      doc.setFont("helvetica", "normal")
      doc.text("Information Systems & Technology Association", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 8
      doc.text("Accra Technical University", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 15

      // Summary Statistics
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("ELECTION SUMMARY", margin, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`Total Registered Students: ${stats?.totalStudents || 0}`, margin, yPosition)
      yPosition += 6
      doc.text(`Students Who Voted: ${stats?.votedStudents || 0}`, margin, yPosition)
      yPosition += 6
      doc.text(`Voter Turnout: ${stats?.turnoutPercentage || 0}%`, margin, yPosition)
      yPosition += 6
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition)
      yPosition += 15

      // Results by Category
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("DETAILED RESULTS", margin, yPosition)
      yPosition += 15

      // Iterate through each category
      Object.entries(resultsData).forEach(([categoryName, candidates], categoryIndex) => {
        checkPageBreak(60) // Check if we need a new page

        // Category Header
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text(`${categoryIndex + 1}. ${categoryName.toUpperCase()}`, margin, yPosition)
        yPosition += 10

        // Table Header
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")

        // Table structure
        const tableStartY = yPosition
        const colWidths = [20, 80, 30, 30]
        const colPositions = [
          margin,
          margin + colWidths[0],
          margin + colWidths[0] + colWidths[1],
          margin + colWidths[0] + colWidths[1] + colWidths[2],
        ]

        // Draw table header
        doc.rect(
          margin,
          yPosition - 5,
          colWidths.reduce((a, b) => a + b, 0),
          8,
        )
        doc.text("POS", colPositions[0] + 2, yPosition)
        doc.text("CANDIDATE NAME", colPositions[1] + 2, yPosition)
        doc.text("VOTES", colPositions[2] + 2, yPosition)
        doc.text("PERCENTAGE", colPositions[3] + 2, yPosition)
        yPosition += 8

        // Calculate total votes for percentage
        const totalCategoryVotes = candidates.reduce((sum, candidate) => sum + candidate.vote_count, 0)

        // Table rows
        doc.setFont("helvetica", "normal")
        candidates.forEach((candidate, index) => {
          const percentage =
            totalCategoryVotes > 0 ? ((candidate.vote_count / totalCategoryVotes) * 100).toFixed(1) : "0.0"

          // Highlight winner (position 1)
          if (candidate.position === 1) {
            doc.setFillColor(220, 252, 231) // Light green background
            doc.rect(
              margin,
              yPosition - 5,
              colWidths.reduce((a, b) => a + b, 0),
              8,
              "F",
            )
            doc.setFont("helvetica", "bold")
          } else {
            doc.setFont("helvetica", "normal")
          }

          // Draw table borders
          doc.rect(margin, yPosition - 5, colWidths[0], 8)
          doc.rect(margin + colWidths[0], yPosition - 5, colWidths[1], 8)
          doc.rect(margin + colWidths[0] + colWidths[1], yPosition - 5, colWidths[2], 8)
          doc.rect(margin + colWidths[0] + colWidths[1] + colWidths[2], yPosition - 5, colWidths[3], 8)

          // Add text
          doc.text(candidate.position.toString(), colPositions[0] + 10, yPosition, { align: "center" })
          doc.text(candidate.candidate_name, colPositions[1] + 2, yPosition)
          doc.text(candidate.vote_count.toString(), colPositions[2] + 15, yPosition, { align: "center" })
          doc.text(`${percentage}%`, colPositions[3] + 15, yPosition, { align: "center" })

          yPosition += 8
        })

        // Winner announcement
        const winner = candidates.find((c) => c.position === 1)
        if (winner) {
          yPosition += 5
          doc.setFontSize(11)
          doc.setFont("helvetica", "bold")
          doc.setTextColor(22, 163, 74) // Green color
          doc.text(`🏆 WINNER: ${winner.candidate_name} (${winner.vote_count} votes)`, margin, yPosition)
          doc.setTextColor(0, 0, 0) // Reset to black
        }

        yPosition += 20
      })

      // Footer
      checkPageBreak(30)
      yPosition = pageHeight - 40

      doc.setFontSize(10)
      doc.setFont("helvetica", "italic")
      doc.text(
        "This is an official election result document generated by the ISTSA Voting System.",
        pageWidth / 2,
        yPosition,
        { align: "center" },
      )
      yPosition += 6
      doc.text("Accra Technical University - Computer Science Department", pageWidth / 2, yPosition, {
        align: "center",
      })
      yPosition += 10

      // Signature lines
      doc.setFont("helvetica", "normal")
      doc.line(margin, yPosition, margin + 60, yPosition)
      doc.line(pageWidth - margin - 60, yPosition, pageWidth - margin, yPosition)
      yPosition += 6
      doc.setFontSize(9)
      doc.text("Electoral Commissioner", margin + 30, yPosition, { align: "center" })
      doc.text("ISTSA President", pageWidth - margin - 30, yPosition, { align: "center" })

      // Save the PDF
      const fileName = `ISTSA_Election_Results_${new Date().toISOString().split("T")[0]}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Error generating PDF. Please try again.")
    }
  }

  // Replace the generateVotingSummaryCSV function in your dashboard component with this:

const generateVotingSummaryCSV = async () => {
  try {
    // Use the server action to get CSV data
    const result = await import("@/lib/admin-actions").then(mod => mod.generateVotingSummaryCSV())

    if (!result.success) {
      alert(result.message || "Failed to generate CSV")
      return
    }

    // Create and download the CSV file
    const element = document.createElement("a")
    const file = new Blob([result.csvContent ?? ""], { type: "text/csv" })
    element.href = URL.createObjectURL(file)
    element.download = result.filename ?? "voting_summary.csv"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    
    console.log(`CSV generated successfully with ${result.recordCount} records`)
  } catch (error) {
    console.error("Error generating CSV:", error)
    alert("Error generating CSV. Please try again.")
  }
}

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {admin?.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={refreshData}
                variant="outline"
                size="sm"
                disabled={refreshing}
                className="flex items-center space-x-2 bg-transparent"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Voting Status Toggle */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={handleToggleVoting}
            disabled={statusLoading || votingOpen === null}
            className={votingOpen ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
          >
            {statusLoading
              ? "Updating..."
              : votingOpen
              ? "Close Voting"
              : "Open Voting"}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalStudents}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Vote className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Voted</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.votedStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Turnout</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.turnoutPercentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Award className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-2xl font-bold text-gray-900">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="voting-summary">Voting Summary</TabsTrigger>
            <TabsTrigger value="exports">Exports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Programme/Level Statistics */}
            <CardContent>
              {loading ? (
                <div className="h-32 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
                </div>
              ) : (
                <ProgrammeLevelChart
                  programmeStats={programmeLevelStats.programmeStats}
                  levelStats={programmeLevelStats.levelStats}
                />
              )}
            </CardContent>

            {/* Category Pie Charts Grid */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Category-wise Vote Distribution</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(categoryStats).map(([categoryName, data], index) => (
                  <CategoryPieChart key={categoryName} categoryName={categoryName} data={data} colors={COLORS} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <div className="grid gap-6">
              {Object.entries(resultsData).map(([category, candidates]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-xl">{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {candidates.map((candidate, index) => (
                        <div
                          key={candidate.candidate_id}
                          className={`flex items-center justify-between p-4 rounded-lg ${
                            index === 0 ? "bg-green-50 border border-green-200" : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                index === 0 ? "bg-green-600" : index === 1 ? "bg-blue-600" : "bg-gray-600"
                              }`}
                            >
                              {candidate.position}
                            </div>
                            <span className="font-medium">{candidate.candidate_name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-gray-900">{candidate.vote_count}</span>
                            <p className="text-sm text-gray-600">votes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="voting-summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voting Summary</CardTitle>
                <CardDescription>
                  Complete voting summary showing each student's votes across all categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transformedStudentData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No students have voted yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-2 font-semibold">Student ID</th>
                          <th className="text-left p-2 font-semibold">Name</th>
                          <th className="text-left p-2 font-semibold">Programme</th>
                          <th className="text-left p-2 font-semibold">Level</th>
                          <th className="text-left p-2 font-semibold">Presidential</th>
                          <th className="text-left p-2 font-semibold">Vice President</th>
                          <th className="text-left p-2 font-semibold">Financial Secretary</th>
                          <th className="text-left p-2 font-semibold">General Secretary</th>
                          <th className="text-left p-2 font-semibold">General Organizers</th>
                          <th className="text-left p-2 font-semibold">WOCOM</th>
                          <th className="text-left p-2 font-semibold">PRO</th>
                          <th className="text-left p-2 font-semibold">Project Officer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transformedStudentData.slice(0, 20).map((student, index) => (
                          <tr key={student.student_id || index} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-mono font-semibold">{student.student_id}</td>
                            <td className="p-2 font-medium">{student.student_name}</td>
                            <td className="p-2 text-xs">{student.programme}</td>
                            <td className="p-2 text-center">{student.level}</td>
                            <td className="p-2 text-xs">
                              <span className={`px-2 py-1 rounded text-xs ${
                                (student.votes?.['Presidential'] || student.presidential) !== "No Vote" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {student.votes?.['Presidential'] || student.presidential || "No Vote"}
                              </span>
                            </td>
                            <td className="p-2 text-xs">
                              <span className={`px-2 py-1 rounded text-xs ${
                                (student.votes?.['Vice President'] || student.vice_president) !== "No Vote" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {student.votes?.['Vice President'] || student.vice_president || "No Vote"}
                              </span>
                            </td>
                            <td className="p-2 text-xs">
                              <span className={`px-2 py-1 rounded text-xs ${
                                (student.votes?.['Financial Secretary'] || student.financial_secretary) !== "No Vote" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {student.votes?.['Financial Secretary'] || student.financial_secretary || "No Vote"}
                              </span>
                            </td>
                            <td className="p-2 text-xs">
                              <span className={`px-2 py-1 rounded text-xs ${
                                (student.votes?.['General Secretary'] || student.general_secretary) !== "No Vote" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {student.votes?.['General Secretary'] || student.general_secretary || "No Vote"}
                              </span>
                            </td>
                            <td className="p-2 text-xs">
                              <span className={`px-2 py-1 rounded text-xs ${
                                (student.votes?.['General Organizers'] || student.general_organizers) !== "No Vote" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {student.votes?.['General Organizers'] || student.general_organizers || "No Vote"}
                              </span>
                            </td>
                            <td className="p-2 text-xs">
                              <span className={`px-2 py-1 rounded text-xs ${
                                (student.votes?.['WOCOM'] || student.wocom) !== "No Vote" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {student.votes?.['WOCOM'] || student.wocom || "No Vote"}
                              </span>
                            </td>
                            <td className="p-2 text-xs">
                              <span className={`px-2 py-1 rounded text-xs ${
                                (student.votes?.['PRO'] || student.pro) !== "No Vote" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {student.votes?.['PRO'] || student.pro || "No Vote"}
                              </span>
                            </td>
                            <td className="p-2 text-xs">
                              <span className={`px-2 py-1 rounded text-xs ${
                                (student.votes?.['Project Officer'] || student.project_officer) !== "No Vote" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {student.votes?.['Project Officer'] || student.project_officer || "No Vote"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {transformedStudentData.length > 20 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800 text-center">
                          📊 Showing first 20 entries out of {transformedStudentData.length} students who have voted. 
                          Use the CSV export below for complete data.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-red-600" />
                    <span>Official Results PDF</span>
                  </CardTitle>
                  <CardDescription>Generate professional PDF report with complete election results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">PDF Contents:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• ISTSA & ATU official headers</li>
                        <li>• Election summary & turnout statistics</li>
                        <li>• Detailed results by category with positions</li>
                        <li>• Winner announcements & vote percentages</li>
                        <li>• Professional formatting with signature lines</li>
                        <li>• Generated timestamp & official footer</li>
                      </ul>
                    </div>
                    <Button onClick={generatePDF} className="w-full bg-red-600 hover:bg-red-700">
                      <Download className="w-4 h-4 mr-2" />
                      Generate Official Results PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="w-5 h-5 text-green-600" />
                    <span>Voting Summary CSV</span>
                  </CardTitle>
                  <CardDescription>Export complete voting summary with student votes across all categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">CSV Layout:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Student information (ID, name, programme, level)</li>
                        <li>• Each voting category as a column</li>
                        <li>• Candidate names for each student's votes</li>
                        <li>• Complete voting summary in spreadsheet format</li>
                        <li>• Easy to analyze in Excel/Google Sheets</li>
                      </ul>
                    </div>
                    <Button 
                      onClick={generateVotingSummaryCSV} 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={transformedStudentData.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Voting Summary CSV ({transformedStudentData.length} students)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Export Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{stats?.totalStudents}</p>
                    <p className="text-sm text-gray-600">Total Students</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats?.votedStudents}</p>
                    <p className="text-sm text-gray-600">Voted Students</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{Object.keys(resultsData).length}</p>
                    <p className="text-sm text-gray-600">Categories</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{stats?.votingStats.length}</p>
                    <p className="text-sm text-gray-600">Total Candidates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
