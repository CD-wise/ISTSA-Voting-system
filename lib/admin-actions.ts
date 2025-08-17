"use server"

import { supabase } from "./supabase"
import { cookies } from "next/headers"

export async function adminLogin(username: string, password: string) {
  // In production, use proper password hashing (bcrypt)
  const { data: admin, error } = await supabase.from("admin_users").select("*").eq("username", username).single()

  if (error || !admin) {
    return { success: false, message: "Invalid credentials" }
  }

  // Simple password check (use bcrypt in production)
  if (password !== "admin123") {
    return { success: false, message: "Invalid credentials" }
  }

  // Set admin session cookie
  const cookieStore = await cookies()
  cookieStore.set("admin_session", admin.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return { success: true, admin: { id: admin.id, username: admin.username, full_name: admin.full_name } }
}

export async function verifyAdminSession() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("admin_session")?.value

  if (!sessionId) {
    return { success: false, message: "No session found" }
  }

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("id, username, full_name")
    .eq("id", sessionId)
    .single()

  if (error || !admin) {
    return { success: false, message: "Invalid session" }
  }

  return { success: true, admin }
}

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete("admin_session")
  return { success: true }
}

export async function setVotingStatus(isOpen: boolean) {
  const { error } = await supabase
    .from("voting_status")
    .update({ is_open: isOpen })
    .eq("id", 1)
  return { success: !error, error }
}

export async function getDashboardStats() {
  try {
    // Get total students count
    const { data: allStudents, error: studentsError } = await supabase
      .from("students")
      .select("student_id, has_voted")

    if (studentsError) {
      console.error("Error fetching students:", studentsError)
      return {
        totalStudents: 0,
        votedStudents: 0,
        turnoutPercentage: 0,
        votingStats: [],
        categoryTotals: {},
      }
    }

    const totalStudents = allStudents?.length || 0
    const votedStudents = allStudents?.filter(s => s.has_voted === true).length || 0
    const turnoutPercentage = totalStudents > 0 ? Math.round((votedStudents / totalStudents) * 100) : 0

    // Get voting statistics from your voting_statistics view
    const { data: votingStats, error: votingStatsError } = await supabase
      .from("voting_statistics")
      .select("*")

    if (votingStatsError) {
      console.error("Error fetching voting stats:", votingStatsError)
    }

    // Get category-wise vote counts
    const categoryTotals = votingStats?.reduce(
      (acc: Record<string, number>, curr: { category_name: string; vote_count: number }) => {
        acc[curr.category_name] = (acc[curr.category_name] || 0) + curr.vote_count
        return acc
      }, {}
    ) || {}

    console.log("Dashboard Stats:", {
      totalStudents,
      votedStudents,
      turnoutPercentage
    })

    return {
      totalStudents,
      votedStudents,
      turnoutPercentage,
      votingStats: votingStats || [],
      categoryTotals,
    }
  } catch (error) {
    console.error("Error in getDashboardStats:", error)
    return {
      totalStudents: 0,
      votedStudents: 0,
      turnoutPercentage: 0,
      votingStats: [],
      categoryTotals: {},
    }
  }
}
export async function getProgrammeLevelStats() {
  try {
    // Get all students with their programme and level info
    const { data: allStudents, error: studentsError } = await supabase
      .from("students")
      .select("programme, level, has_voted")

    if (studentsError) {
      console.error("Error fetching students for stats:", studentsError)
      return {
        programmeStats: [],
        levelStats: [],
      }
    }

    if (!allStudents || allStudents.length === 0) {
      return {
        programmeStats: [],
        levelStats: [],
      }
    }

    // Group by programme
    const programmeMap = new Map()
    const levelMap = new Map()

    allStudents.forEach(student => {
      // Programme stats
      if (student.programme) {
        if (!programmeMap.has(student.programme)) {
          programmeMap.set(student.programme, {
            programme: student.programme,
            total: 0,
            voted: 0
          })
        }
        
        const progStats = programmeMap.get(student.programme)
        progStats.total += 1
        if (student.has_voted === true) {
          progStats.voted += 1
        }
      }

      // Level stats
      if (student.level) {
        const levelKey = student.level.toString()
        if (!levelMap.has(levelKey)) {
          levelMap.set(levelKey, {
            level: levelKey,
            total: 0,
            voted: 0
          })
        }
        
        const levelStats = levelMap.get(levelKey)
        levelStats.total += 1
        if (student.has_voted === true) {
          levelStats.voted += 1
        }
      }
    })

    // Convert to arrays and calculate turnout
    const programmeStats = Array.from(programmeMap.values())
      .map(stat => ({
        ...stat,
        turnout: stat.total > 0 ? (stat.voted / stat.total) * 100 : 0
      }))
      .sort((a, b) => a.programme.localeCompare(b.programme))

    const levelStats = Array.from(levelMap.values())
      .map(stat => ({
        ...stat,
        turnout: stat.total > 0 ? (stat.voted / stat.total) * 100 : 0
      }))
      .sort((a, b) => {
        // Sort levels numerically
        const aNum = parseInt(a.level)
        const bNum = parseInt(b.level)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum
        }
        return a.level.localeCompare(b.level)
      })

    console.log("Programme Level Stats:", {
      programmeStats: programmeStats.length,
      levelStats: levelStats.length
    })

    return {
      programmeStats,
      levelStats,
    }
  } catch (error) {
    console.error("Error in getProgrammeLevelStats:", error)
    return {
      programmeStats: [],
      levelStats: [],
    }
  }
}

export async function getCategoryWiseStats() {
  const { data: votingStats } = await supabase.from("voting_statistics").select("*")

  // Group by category
  const categoryData =
    votingStats?.reduce((acc: Record<string, any[]>, curr) => {
      if (!acc[curr.category_name]) {
        acc[curr.category_name] = []
      }
      acc[curr.category_name].push({
        name: curr.candidate_name,
        value: curr.vote_count,
        position: curr.position,
      })
      return acc
    }, {}) || {}

  return categoryData
}

export async function getStudentVotingDetails() {
  const { data: details } = await supabase.from("student_voting_details").select("*")

  return details || []
}

export async function getTransformedStudentData() {
  try {
    // Use the new voting summary view
    const { data: votingSummary, error: summaryError } = await supabase
      .from("voted_students_summary")
      .select("*")
      .order("student_id")

    if (summaryError) {
      console.error("Error fetching voting summary:", summaryError)
      return []
    }

    if (!votingSummary || votingSummary.length === 0) {
      console.log("No students have voted yet")
      return []
    }

    console.log(`Found ${votingSummary.length} students who have voted`)

    // Transform the data to match the expected format
    const transformedData = votingSummary.map(student => {
      // Create votes object for backward compatibility
      const votes: Record<string, string> = {
        'Presidential': student.presidential || 'No Vote',
        'Vice President': student.vice_president || 'No Vote',
        'Financial Secretary': student.financial_secretary || 'No Vote',
        'General Secretary': student.general_secretary || 'No Vote',
        'General Organizers': student.general_organizers || 'No Vote',
        'WOCOM': student.wocom || 'No Vote',
        'PRO': student.pro || 'No Vote',
        'Project Officer': student.project_officer || 'No Vote'
      }

      return {
        student_id: student.student_id,
        student_name: student.student_name || "N/A",
        phone: student.phone || "N/A", 
        email: student.email || "N/A",
        programme: student.programme || "N/A",
        level: student.level || "N/A",
        votes: votes,
        // Individual category fields for the UI
        presidential: student.presidential || "No Vote",
        vice_president: student.vice_president || "No Vote",
        financial_secretary: student.financial_secretary || "No Vote",
        general_secretary: student.general_secretary || "No Vote",
        general_organizers: student.general_organizers || "No Vote",
        wocom: student.wocom || "No Vote",
        pro: student.pro || "No Vote",
        project_officer: student.project_officer || "No Vote"
      }
    })

    console.log(`Successfully transformed ${transformedData.length} student voting records`)
    return transformedData

  } catch (error) {
    console.error("Error in getTransformedStudentData:", error)
    return []
  }
}
export async function generateVotingSummaryCSV() {
  try {
    const { data: votingSummary, error } = await supabase
      .from("voted_students_summary")
      .select("*")
      .order("student_id")

    if (error) {
      console.error("Error fetching voting summary for CSV:", error)
      return { success: false, message: "Failed to fetch voting data" }
    }

    if (!votingSummary || votingSummary.length === 0) {
      return { success: false, message: "No voting data available" }
    }

    // Create CSV header
    const headers = [
      "Student ID", 
      "Name", 
      "Phone", 
      "Email", 
      "Programme", 
      "Level",
      "Presidential",
      "Vice President", 
      "Financial Secretary",
      "General Secretary",
      "General Organizers",
      "WOCOM",
      "PRO",
      "Project Officer"
    ]

    // Create CSV rows
    const csvRows = [
      headers.join(","),
      ...votingSummary.map(student => [
        student.student_id,
        `"${student.student_name || ""}"`,
        student.phone || "",
        student.email || "",
        `"${student.programme || ""}"`,
        student.level || "",
        `"${student.presidential || "No Vote"}"`,
        `"${student.vice_president || "No Vote"}"`,
        `"${student.financial_secretary || "No Vote"}"`,
        `"${student.general_secretary || "No Vote"}"`,
        `"${student.general_organizers || "No Vote"}"`,
        `"${student.wocom || "No Vote"}"`,
        `"${student.pro || "No Vote"}"`,
        `"${student.project_officer || "No Vote"}"`
      ].join(","))
    ]

    const csvContent = csvRows.join("\n")
    return { 
      success: true, 
      csvContent,
      filename: `voting_summary_${new Date().toISOString().split("T")[0]}.csv`,
      recordCount: votingSummary.length
    }

  } catch (error) {
    console.error("Error generating CSV:", error)
    return { success: false, message: "Failed to generate CSV" }
  }
}
export async function generateResultsData() {
  const { data: results } = await supabase.from("voting_statistics").select("*").order("category_name, position")

  // Group by category
  const groupedResults =
    results?.reduce((acc: Record<string, any[]>, curr) => {
      if (!acc[curr.category_name]) {
        acc[curr.category_name] = []
      }
      acc[curr.category_name].push(curr)
      return acc
    }, {}) || {}

  return groupedResults
}
