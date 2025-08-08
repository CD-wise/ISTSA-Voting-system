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
    // Get total students count (remove any default limits)
    const { count: totalStudents, error: studentsCountError } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })

    if (studentsCountError) {
      console.error("Error counting students:", studentsCountError)
    }

    // Get voted students count
    const { count: votedStudents, error: votedCountError } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("has_voted", true)

    if (votedCountError) {
      console.error("Error counting voted students:", votedCountError)
    }

    // Alternative method if count doesn't work - fetch all and count
    let totalStudentsCount = totalStudents || 0
    let votedStudentsCount = votedStudents || 0

    if (totalStudentsCount === 0) {
      const { data: allStudents, error: allStudentsError } = await supabase
        .from("students")
        .select("student_id, has_voted")

      if (!allStudentsError && allStudents) {
        totalStudentsCount = allStudents.length
        votedStudentsCount = allStudents.filter(s => s.has_voted === true).length
      }
    }

    // Get voting statistics from your voting_statistics view/table
    const { data: votingStats, error: votingStatsError } = await supabase
      .from("voting_statistics")
      .select("*")

    if (votingStatsError) {
      console.error("Error fetching voting stats:", votingStatsError)
    }

    // Get category-wise vote counts
    const { data: categoryStats, error: categoryStatsError } = await supabase
      .from("voting_statistics")
      .select("category_name, vote_count")

    if (categoryStatsError) {
      console.error("Error fetching category stats:", categoryStatsError)
    }

    // Calculate category totals
    const categoryTotals = categoryStats?.reduce(
      (acc: Record<string, number>, curr: { category_name: string; vote_count: number }) => {
        acc[curr.category_name] = (acc[curr.category_name] || 0) + curr.vote_count
        return acc
      }, {}
    ) || {}

    // Calculate turnout percentage
    const turnoutPercentage = totalStudentsCount > 0 
      ? Math.round((votedStudentsCount / totalStudentsCount) * 100) 
      : 0

    console.log("Dashboard Stats:", {
      totalStudents: totalStudentsCount,
      votedStudents: votedStudentsCount,
      turnoutPercentage
    })

    return {
      totalStudents: totalStudentsCount,
      votedStudents: votedStudentsCount,
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
    // Get all students who have voted
    const { data: votedStudents, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .eq("has_voted", true)

    if (studentsError) {
      console.error("Error fetching students:", studentsError)
      return []
    }

    if (!votedStudents || votedStudents.length === 0) {
      return []
    }

    // Get all voting categories
    const { data: categories, error: categoriesError } = await supabase
      .from("voting_categories")
      .select("id, name")
      .order("display_order")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      return []
    }

    // Get all candidates
    const { data: candidates, error: candidatesError } = await supabase
      .from("candidates")
      .select("id, name, category_id")

    if (candidatesError) {
      console.error("Error fetching candidates:", candidatesError)
      return []
    }

    // Get all votes
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("student_id, candidate_id, category_id")

    if (votesError) {
      console.error("Error fetching votes:", votesError)
      return []
    }

    // Create candidate lookup map
    const candidateMap = new Map()
    candidates?.forEach(candidate => {
      candidateMap.set(candidate.id, candidate.name)
    })

    // Create category lookup map
    const categoryMap = new Map()
    categories?.forEach(category => {
      categoryMap.set(category.id, category.name)
    })

    // Transform the data
    const transformedData = votedStudents.map(student => {
      const studentVotes = votes?.filter(vote => vote.student_id === student.student_id) || []
      
      // Create votes object for this student
      const votesByCategory: Record<string, string> = {}
      
      studentVotes.forEach(vote => {
        const categoryName = categoryMap.get(vote.category_id)
        const candidateName = candidateMap.get(vote.candidate_id)
        
        if (categoryName && candidateName) {
          votesByCategory[categoryName] = candidateName
        }
      })

      // Add individual category fields for backward compatibility
      const result: any = {
        student_id: student.student_id,
        student_name: student.name || student.full_name,
        phone: student.phone,
        email: student.email,
        programme: student.programme,
        level: student.level,
        votes: votesByCategory
      }

      // Add individual category fields (convert to snake_case for consistency)
      categories?.forEach(category => {
        const categoryKey = category.name.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/-/g, '_')
          .replace(/\./g, '')
        
        result[categoryKey] = votesByCategory[category.name] || "No Vote"
      })

      return result
    })

    return transformedData

  } catch (error) {
    console.error("Error in getTransformedStudentData:", error)
    return []
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
