"use server"

import { supabase } from "./supabase"
import { sendSMSOTP, maskPhoneNumber } from "./mnotify-sms"

export async function verifyStudentId(studentId: string) {
  try {
    const { data: students, error } = await supabase
      .from("students")
      .select("student_id, name, phone, programme, level, has_voted")
      .eq("student_id", studentId.toLowerCase().trim())

    if (error) {
      console.error('Student verification error:', error)
      return { success: false, message: "Database error. Please try again." }
    }

    if (!students || students.length === 0) {
      return { success: false, message: "Student ID not found. Please check your ID and try again." }
    }

    if (students.length > 1) {
      console.error('Multiple students found for ID:', studentId)
      return { success: false, message: "Multiple records found. Please contact administrator." }
    }

    const student = students[0]

    if (student.has_voted) {
      return { success: false, message: "You have already voted in this election." }
    }

    // Check if student has required data
    if (!student.name || !student.phone || !student.programme || !student.level) {
      return { success: false, message: "Student record is incomplete. Please contact the administrator." }
    }

    return { 
      success: true, 
      student: {
        student_id: student.student_id,
        name: student.name,
        phone: student.phone,
        programme: student.programme,
        level: student.level
      },
      maskedPhone: maskPhoneNumber(student.phone)
    }
  } catch (error) {
    console.error('Error in verifyStudentId:', error)
    return { success: false, message: "An error occurred. Please try again." }
  }
}

export async function verifyPhoneNumber(studentId: string, phoneNumber: string) {
  try {
    const { data: students, error } = await supabase
      .from("students")
      .select("phone")
      .eq("student_id", studentId.toLowerCase().trim())

    if (error || !students || students.length === 0) {
      return { success: false, message: "Student not found." }
    }

    const student = students[0]

    // Clean phone numbers for comparison (remove spaces, dashes, parentheses)
    const cleanInputPhone = phoneNumber.replace(/[\s\-()]/g, '').trim()
    const cleanStoredPhone = student.phone.replace(/[\s\-()]/g, '').trim()

    if (cleanInputPhone !== cleanStoredPhone) {
      return { success: false, message: "Phone number does not match our records. Please check and try again." }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in verifyPhoneNumber:', error)
    return { success: false, message: "An error occurred. Please try again." }
  }
}

export async function generateSMSOTP(studentId: string) {
  try {
    const cleanStudentId = studentId.toLowerCase().trim()
    console.log('Generating OTP for student:', cleanStudentId)
    
    // First, invalidate any existing unused OTPs for this student
    const { error: invalidateError } = await supabase
      .from("sms_otps")
      .update({ used: true })
      .eq("student_id", cleanStudentId)
      .eq("used", false)

    if (invalidateError) {
      console.error('Error invalidating old OTPs:', invalidateError)
    }

    // Check for recent OTP requests (within last 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    const { data: recentOTPs, error: recentError } = await supabase
      .from("sms_otps")
      .select("created_at")
      .eq("student_id", cleanStudentId)
      .gt("created_at", twoMinutesAgo.toISOString())
      .order("created_at", { ascending: false })

    if (recentError) {
      console.error('Error checking recent OTPs:', recentError)
    }

    if (recentOTPs && recentOTPs.length > 0) {
      const lastOTPTime = new Date(recentOTPs[0].created_at)
      const timeDiff = Math.ceil((Date.now() - lastOTPTime.getTime()) / 1000)
      const waitTime = 120 - timeDiff // 2 minutes = 120 seconds
      
      if (waitTime > 0) {
        console.log('Rate limit hit, wait time:', waitTime)
        return { 
          success: false, 
          message: `Please wait ${waitTime} seconds before requesting another OTP.` 
        }
      }
    }

    // Check for too many OTP requests in the last hour (max 3)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const { data: hourlyOTPs, error: hourlyError } = await supabase
      .from("sms_otps")
      .select("id")
      .eq("student_id", cleanStudentId)
      .gt("created_at", oneHourAgo.toISOString())

    if (hourlyError) {
      console.error('Error checking hourly OTPs:', hourlyError)
    }

    if (hourlyOTPs && hourlyOTPs.length >= 3) {
      console.log('Hourly limit exceeded')
      return { 
        success: false, 
        message: "Too many OTP requests. Please try again after 1 hour or contact support." 
      }
    }

    // Get student's phone number
    const { data: students, error } = await supabase
      .from("students")
      .select("phone")
      .eq("student_id", cleanStudentId)

    if (error || !students || students.length === 0) {
      return { success: false, message: "Student not found." }
    }

    const student = students[0]

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    console.log('Generated OTP:', otp, 'for phone:', student.phone)

    // Store OTP in database FIRST
    const { data: otpData, error: otpError } = await supabase
      .from("sms_otps")
      .insert({
        student_id: cleanStudentId,
        phone: student.phone,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
      })
      .select()

    if (otpError) {
      console.error('Error storing OTP:', otpError)
      return { success: false, message: "Failed to generate verification code. Please try again." }
    }

    console.log('OTP stored in database:', otpData)

    // Send SMS only after successful database storage
    const smsResult = await sendSMSOTP(student.phone, otp)
    
    if (!smsResult.success) {
      console.error('SMS sending failed, marking OTP as used')
      // Mark the OTP as used since SMS failed
      await supabase
        .from("sms_otps")
        .update({ used: true })
        .eq("student_id", cleanStudentId)
        .eq("otp_code", otp)
      
      return { success: false, message: "Failed to send SMS verification code. Please try again." }
    }

    console.log('SMS sent successfully')
    return { success: true, message: "Verification code sent to your phone number." }
  } catch (error) {
    console.error('Error in generateSMSOTP:', error)
    return { success: false, message: "An error occurred. Please try again." }
  }
}

export async function verifySMSOTP(studentId: string, otpCode: string) {
  try {
    const { data: otpRecords, error } = await supabase
      .from("sms_otps")
      .select("*")
      .eq("student_id", studentId.toLowerCase().trim())
      .eq("otp_code", otpCode.trim())
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)

    if (error || !otpRecords || otpRecords.length === 0) {
      return { success: false, message: "Invalid or expired verification code. Please try again." }
    }

    const otpRecord = otpRecords[0]

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from("sms_otps")
      .update({ used: true })
      .eq("id", otpRecord.id)

    if (updateError) {
      console.error('Error updating OTP:', updateError)
      return { success: false, message: "Failed to verify code. Please try again." }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in verifySMSOTP:', error)
    return { success: false, message: "An error occurred. Please try again." }
  }
}

export async function getStudentDetails(studentId: string) {
  try {
    const { data: students, error } = await supabase
      .from("students")
      .select("name, programme, level")
      .eq("student_id", studentId.toLowerCase().trim())

    if (error || !students || students.length === 0) {
      return { success: false, message: "Student not found." }
    }

    const student = students[0]

    return { 
      success: true, 
      student: {
        name: student.name,
        programme: student.programme,
        level: student.level
      }
    }
  } catch (error) {
    console.error('Error in getStudentDetails:', error)
    return { success: false, message: "An error occurred. Please try again." }
  }
}

export async function checkEmailAvailability(email: string) {
  try {
    const { data: existingEmails, error } = await supabase
      .from("student_details")
      .select("email")
      .eq("email", email.toLowerCase().trim())

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which means email is available
      console.error('Error checking email:', error)
      return { success: false, message: "Error checking email availability. Please try again." }
    }

    if (existingEmails && existingEmails.length > 0) {
      return { success: false, message: "This email address has already been used by another student." }
    }

    return { success: true, message: "Email is available." }
  } catch (error) {
    console.error('Error in checkEmailAvailability:', error)
    return { success: false, message: "Error checking email availability. Please try again." }
  }
}

export async function saveStudentDetails(studentId: string, email: string) {
  try {
    console.log('Saving student details for:', studentId, 'with email:', email)
    
    // First check if email is already used
    const emailCheck = await checkEmailAvailability(email)
    if (!emailCheck.success) {
      console.log('Email check failed:', emailCheck.message)
      return emailCheck
    }

    // Get student info from students table
    const { data: students, error: studentError } = await supabase
      .from("students")
      .select("name, phone, programme, level")
      .eq("student_id", studentId.toLowerCase().trim())

    if (studentError || !students || students.length === 0) {
      console.log('Student not found:', studentError)
      return { success: false, message: "Student not found." }
    }

    const student = students[0]
    console.log('Found student:', student)

    // Insert student details
    const { data: insertData, error } = await supabase.from("student_details").insert({
      student_id: studentId.toLowerCase().trim(),
      name: student.name,
      phone: student.phone,
      programme: student.programme,
      level: student.level,
      email: email.toLowerCase().trim(),
    })

    if (error) {
      console.error('Error saving student details:', error)
      // Check if it's a unique constraint violation
      if (error.code === "23505") {
        if (error.message.includes("unique_student_email")) {
          return { success: false, message: "This email address has already been used by another student." }
        }
        if (error.message.includes("student_details_pkey")) {
          return { success: false, message: "You have already completed your details." }
        }
      }
      return { success: false, message: "Failed to save student details. Please try again." }
    }

    console.log('Student details saved successfully:', insertData)
    return { success: true }
  } catch (error) {
    console.error('Error in saveStudentDetails:', error)
    return { success: false, message: "An error occurred. Please try again." }
  }
}

export async function getVotingData() {
  try {
    console.log('Getting voting data...')
    
    // Check if voting is open
    const { data: votingStatus, error: statusError } = await supabase
      .from("voting_status")
      .select("is_open")
      .eq("id", 1)

    if (statusError) {
      console.error('Error getting voting status:', statusError)
    }

    const { data: categories, error: categoriesError } = await supabase
      .from("voting_categories")
      .select("*")
      .order("display_order")

    if (categoriesError) {
      console.error('Error getting categories:', categoriesError)
    }

    const { data: candidates, error: candidatesError } = await supabase
      .from("candidates")
      .select("*")

    if (candidatesError) {
      console.error('Error getting candidates:', candidatesError)
    }

    console.log('Voting data retrieved:', {
      categories: categories?.length || 0,
      candidates: candidates?.length || 0,
      votingOpen: votingStatus && votingStatus.length > 0 ? votingStatus[0].is_open : true
    })

    return { 
      categories: categories || [], 
      candidates: candidates || [],
      votingOpen: votingStatus && votingStatus.length > 0 ? votingStatus[0].is_open : true
    }
  } catch (error) {
    console.error('Error in getVotingData:', error)
    return { 
      categories: [], 
      candidates: [],
      votingOpen: true
    }
  }
}

export async function submitVote(studentId: string, candidateId: number, categoryId: number) {
  try {
    console.log('Submitting vote:', { studentId, candidateId, categoryId })
    
    if (!studentId || !candidateId || !categoryId) {
      console.error('Missing required parameters for vote submission')
      return { success: false, message: "Missing required information for voting." }
    }

    const cleanStudentId = studentId.toLowerCase().trim()

    // Check if student has already voted in this category
    const { data: existingVotes, error: checkError } = await supabase
      .from("votes")
      .select("*")
      .eq("student_id", cleanStudentId)
      .eq("category_id", categoryId)

    if (checkError) {
      console.error('Error checking existing votes:', checkError)
      return { success: false, message: "Error checking existing votes. Please try again." }
    }

    if (existingVotes && existingVotes.length > 0) {
      console.log('Student has already voted in this category')
      return { success: false, message: "You have already voted in this category." }
    }

    // Insert the vote
    const { data: voteData, error: insertError } = await supabase
      .from("votes")
      .insert({
        student_id: cleanStudentId,
        candidate_id: candidateId,
        category_id: categoryId,
      })
      .select()

    if (insertError) {
      console.error('Error inserting vote:', insertError)
      return { success: false, message: "Failed to submit vote. Please try again." }
    }

    console.log('Vote submitted successfully:', voteData)
    return { success: true }
  } catch (error) {
    console.error('Error in submitVote:', error)
    return { success: false, message: "An error occurred while submitting your vote. Please try again." }
  }
}

export async function markStudentAsVoted(studentId: string) {
  try {
    console.log('Marking student as voted:', studentId)
    
    const { data, error } = await supabase
      .from("students")
      .update({ has_voted: true })
      .eq("student_id", studentId.toLowerCase().trim())
      .select()

    if (error) {
      console.error('Error marking student as voted:', error)
      return { success: false }
    }

    console.log('Student marked as voted successfully:', data)
    return { success: true }
  } catch (error) {
    console.error('Error in markStudentAsVoted:', error)
    return { success: false }
  }
}

export async function getStudentVotes(studentId: string) {
  try {
    console.log('Getting student votes for:', studentId)
    
    const { data: votes, error } = await supabase
      .from("votes")
      .select("category_id")
      .eq("student_id", studentId.toLowerCase().trim())

    if (error) {
      console.error('Error getting student votes:', error)
      return []
    }

    const categoryIds = votes?.map((vote) => vote.category_id) || []
    console.log('Student votes found:', categoryIds)
    
    return categoryIds
  } catch (error) {
    console.error('Error in getStudentVotes:', error)
    return []
  }
}
