"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getStudentDetails, checkEmailAvailability, saveStudentDetails } from "@/lib/actions"
import { Loader2, Check, AlertCircle } from 'lucide-react'
import Image from "next/image"

interface StudentInfo {
  name: string
  programme: string
  level: string
}

export default function StudentDetailsPage() {
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [email, setEmail] = useState("")
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadStudentDetails = async () => {
      try {
        const studentId = sessionStorage.getItem("verifiedStudentId")
        
        console.log("Loading student details for:", studentId)
        
        if (!studentId) {
          console.log("No verified student ID found")
          setError("No verified student ID found. Please start over.")
          setTimeout(() => router.push("/"), 3000)
          return
        }

        const result = await getStudentDetails(studentId)
        console.log("Student details result:", result)
        
        if (result.success && result.student) {
          setStudentInfo(result.student)
          console.log("Student info set:", result.student)
        } else {
          console.error("Failed to load student details:", result.message)
          setError(result.message || "Failed to load student details")
        }
      } catch (error) {
        console.error("Error loading student details:", error)
        setError("An error occurred while loading your details.")
      } finally {
        setLoading(false)
      }
    }

    loadStudentDetails()
  }, [router])

  const checkEmail = async (emailValue: string) => {
    if (!emailValue || !emailValue.includes("@")) {
      setEmailStatus("idle")
      return
    }

    setEmailStatus("checking")
    
    try {
      const result = await checkEmailAvailability(emailValue)
      setEmailStatus(result.success ? "available" : "taken")
    } catch (error) {
      console.error("Error checking email:", error)
      setEmailStatus("idle")
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    
    // Debounce email checking
    const timeoutId = setTimeout(() => {
      checkEmail(value)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !isValidEmail(email) || emailStatus !== "available") {
      setError("Please enter a valid and available email address.")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const studentId = sessionStorage.getItem("verifiedStudentId")
      
      console.log("Submitting details for student:", studentId, "with email:", email)
      
      if (!studentId) {
        setError("Session expired. Please start over.")
        return
      }

      const result = await saveStudentDetails(studentId, email)
      console.log("Save details result:", result)
      
      if (result.success) {
        console.log("Details saved successfully, setting completion flag")
        
        // Create complete student details object for voting page
        const completeStudentDetails = {
          studentId: studentId,
          name: studentInfo?.name ?? "",
          phone: "", // Will be loaded from database if needed
          email: email,
          programme: studentInfo?.programme ?? "",
          level: studentInfo?.level ?? "",
          
        }
        
        // Set the studentDetails object that voting page expects
        sessionStorage.setItem("studentDetails", JSON.stringify(completeStudentDetails))
        
        // Also set completion flag
        sessionStorage.setItem("detailsCompleted", "true")
        
        console.log("Session storage after save:", {
          studentDetails: sessionStorage.getItem("studentDetails"),
          detailsCompleted: sessionStorage.getItem("detailsCompleted")
        })
        
        setSuccess(true)
        
        // Redirect to voting page after 2 seconds
        setTimeout(() => {
          console.log("Redirecting to voting page")
          router.push("/voting")
        }, 2000)
      } else {
        if ("message" in result && result.message) {
          console.error("Failed to save details:", result.message)
          setError(result.message)
        } else {
          console.error("Failed to save details")
          setError("Failed to save details")
        }
      }
    } catch (error) {
      console.error("Error saving details:", error)
      setError("An error occurred while saving your details.")
    } finally {
      setSubmitting(false)
    }
  }

  function isValidEmail(email: string) {
    // Simple email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading your details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">Details Saved Successfully!</h3>
            <p className="text-sm text-green-700 mb-4">
              Redirecting to voting page...
            </p>
            <div className="flex justify-center mb-4">
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            </div>
            <Button
              onClick={() => router.push("/voting")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Go to Voting Now
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-32 h-32 flex items-center justify-center">
              <Image
                src="/images/ISTSA-logo.png"
                alt="ISTSA & Accra Technical University Logo"
                width={128}
                height={128}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Complete Your Details
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Please verify your information and add your email address
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {studentInfo && (
              <div className="space-y-4">
                {/* Pre-filled Student Information */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-medium text-green-900 mb-3">Your Information</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-green-800">Name</Label>
                      <p className="text-black-700">{studentInfo.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-green-800">Programme</Label>
                      <p className="text-black-700">{studentInfo.programme}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-green-800">Level</Label>
                      <p className="text-black-700">{studentInfo.level}</p>
                    </div>
                  </div>
                </div>

                {/* Email Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address *
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="Enter your email address"
                        className="pr-10"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {emailStatus === "checking" && (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        )}
                        {emailStatus === "available" && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                        {emailStatus === "taken" && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {emailStatus === "available" && (
                      <p className="text-xs text-green-600 mt-1">Email is available</p>
                    )}
                    {emailStatus === "taken" && (
                      <p className="text-xs text-red-600 mt-1">This email is already in use</p>
                    )}
                    {email && !isValidEmail(email) && (
                      <p className="text-xs text-red-600 mt-1">Please enter a valid email address.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      submitting ||
                      !email.trim() ||
                      !isValidEmail(email) ||
                      emailStatus !== "available"
                    }
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving Details...
                      </>
                    ) : (
                      "Proceed to Voting"
                    )}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <span>Knowledge, Creativity & Excellence</span>
          </div>
        </div>
      </div>
    </div>
  )
}
