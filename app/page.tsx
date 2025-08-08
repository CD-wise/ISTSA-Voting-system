"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { verifyStudentId, verifyPhoneNumber, generateSMSOTP, verifySMSOTP } from "@/lib/actions"
import { Copy, Check, Loader2, ArrowLeft, Clock } from 'lucide-react'
import Image from "next/image"

type Step = "id-verification" | "phone-verification" | "sms-otp" | "success"

interface StudentInfo {
  student_id: string
  name: string
  phone: string
  programme: string
  level: string
}

export default function WelcomePage() {
  const [currentStep, setCurrentStep] = useState<Step>("id-verification")
  const [studentId, setStudentId] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [maskedPhone, setMaskedPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [cooldownTime, setCooldownTime] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(cooldownTime - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownTime])

  const handleStudentIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId.trim() || loading) return

    setLoading(true)
    setError("")

    try {
      const result = await verifyStudentId(studentId)
      
      if (result.success && result.student) {
        setStudentInfo(result.student)
        setMaskedPhone(result.maskedPhone || "")
        setCurrentStep("phone-verification")
      } else {
        setError(result.message || "Verification failed")
      }
    } catch (error) {
      console.error("Error verifying student ID:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim() || isSubmitting || cooldownTime > 0) return

    setIsSubmitting(true)
    setLoading(true)
    setError("")

    try {
      // First verify the phone number
      const phoneResult = await verifyPhoneNumber(studentId, phoneNumber)
      
      if (!phoneResult.success) {
        setError(phoneResult.message || "Phone verification failed")
        return
      }

      // Then generate and send SMS OTP
      const otpResult = await generateSMSOTP(studentId)
      
      if (otpResult.success) {
        setCurrentStep("sms-otp")
        setCooldownTime(120) // 2 minutes cooldown
        setError("") // Clear any previous errors
      } else {
        setError(otpResult.message || "Failed to send OTP")
        // Check if it's a cooldown error and extract time
        const match = otpResult.message?.match(/wait (\d+) seconds/)
        if (match) {
          setCooldownTime(parseInt(match[1]))
        }
      }
    } catch (error) {
      console.error("Error in phone verification:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  const handleResendOTP = async () => {
    if (cooldownTime > 0 || isSubmitting) return

    setIsSubmitting(true)
    setLoading(true)
    setError("")

    try {
      const result = await generateSMSOTP(studentId)
      
      if (result.success) {
        setCooldownTime(120) // 2 minutes cooldown
        setError("New verification code sent!")
        // Clear success message after 3 seconds
        setTimeout(() => {
          setError("")
        }, 3000)
      } else {
        setError(result.message || "Failed to resend OTP")
        // Check if it's a cooldown error and extract time
        const match = result.message?.match(/wait (\d+) seconds/)
        if (match) {
          setCooldownTime(parseInt(match[1]))
        }
      }
    } catch (error) {
      console.error("Error resending OTP:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim() || loading) return

    setLoading(true)
    setError("")

    try {
      const result = await verifySMSOTP(studentId, otpCode)
      
      if (result.success) {
        setCurrentStep("success")
        // Store verified student ID for next page
        sessionStorage.setItem("verifiedStudentId", studentId)
        
        // Auto redirect after 2 seconds
        setTimeout(() => {
          router.push("/student-details")
        }, 2000)
      } else {
        setError(result.message || "OTP verification failed")
      }
    } catch (error) {
      console.error("Error verifying OTP:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const goBack = () => {
    setError("")
    if (currentStep === "phone-verification") {
      setCurrentStep("id-verification")
    } else if (currentStep === "sms-otp") {
      setCurrentStep("phone-verification")
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case "id-verification":
        return "COMPSSA Voting System"
      case "phone-verification":
        return "Phone Verification"
      case "sms-otp":
        return "SMS Verification"
      case "success":
        return "Verification Complete"
      default:
        return "COMPSSA Voting System"
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case "id-verification":
        return "Computer Science Students Association Elections"
      case "phone-verification":
        return "Enter your complete phone number to receive SMS verification"
      case "sms-otp":
        return "Enter the 6-digit code sent to your phone"
      case "success":
        return "You have been successfully verified. Redirecting..."
      default:
        return "Computer Science Students Association Elections"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-32 h-32 flex items-center justify-center">
                <Image
                  src="/images/compssa-logo.png"
                  alt="COMPSSA & Accra Technical University Logo"
                  width={128}
                  height={128}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {getStepTitle()}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  {getStepDescription()}
                </CardDescription>
                {currentStep === "id-verification" && (
                  <CardDescription className="text-sm text-gray-500 mt-1">
                    Accra Technical University
                  </CardDescription>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <div className={`p-3 border rounded-md ${
                  error.includes("sent!") 
                    ? "bg-green-50 border-green-200 text-green-600" 
                    : "bg-red-50 border-red-200 text-red-600"
                }`}>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Step 1: Student ID Verification */}
              {currentStep === "id-verification" && (
                <form onSubmit={handleStudentIdSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="studentId" className="text-sm font-medium text-gray-700">
                      Student ID
                    </Label>
                    <Input
                      id="studentId"
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g., 01200644D"
                      className="mt-1 text-center text-lg"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !studentId.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </form>
              )}

      {/* Step 2: Phone Verification */}
  {currentStep === "phone-verification" && studentInfo && (
  <div className="space-y-4">
    

    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
      <div className="text-center mb-3">
        <p className="text-sm font-medium text-black-800 mb-2">Your Phone Number Hint</p>
        <div className="flex items-center justify-center">
          <span className="text-2xl font-mono font-bold text-black-600">{maskedPhone}</span>
        </div>
      </div>
      <p className="text-xs text-yellow-700 text-center">
        Enter your complete phone number below to receive SMS verification.
      </p>
    </div>

    <form onSubmit={handlePhoneSubmit} className="space-y-4">
      <div>
        <Label htmlFor="phone" className="text-sm font-medium text-green-700">
          Complete Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="e.g., 0241234567"
          className="mt-1 text-center text-lg border-green-300 focus:ring-green-500 focus:border-green-500"
          required
        />
      </div>
      <Button
        type="submit"
        disabled={loading || !phoneNumber.trim() || isSubmitting || cooldownTime > 0}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending SMS...
          </>
        ) : cooldownTime > 0 ? (
          <>
            <Clock className="w-4 h-4 mr-2" />
            Wait {cooldownTime}s
          </>
        ) : (
          "Send SMS Verification"
        )}
      </Button>
    </form>
  </div>
)}

              {/* Step 3: SMS OTP Verification */}
              {currentStep === "sms-otp" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-green-600 mb-2">SMS Verification</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      We've sent a 6-digit verification code to your phone number.
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-center mb-3">
                      <p className="text-sm font-medium text-blue-800 mb-2">Enter SMS Verification Code</p>
                      <Input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="text-center text-2xl font-mono font-bold tracking-widest w-32 mx-auto"
                        maxLength={6}
                      />
                    </div>
                    <p className="text-xs text-blue-700 text-center mb-3">
                      This code expires in 10 minutes. Check your SMS messages.
                    </p>
                    
                    {/* Resend OTP Button */}
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResendOTP}
                        disabled={loading || cooldownTime > 0 || isSubmitting}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {cooldownTime > 0 ? (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Resend in {cooldownTime}s</span>
                          </div>
                        ) : (
                          "Resend Code"
                        )}
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={handleOTPSubmit} className="space-y-4">
                    <Button 
                      type="submit" 
                      disabled={loading || otpCode.length !== 6}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify SMS Code"
                      )}
                    </Button>
                  </form>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={goBack}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to phone verification
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Success */}
              {currentStep === "success" && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Verification Successful!</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Welcome <strong>{studentInfo?.name}</strong>! Redirecting to complete your details...
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                  </div>
                  <Button
                    onClick={() => router.push("/student-details")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Proceed to Enter Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-4">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <span>Knowledge, Creativity & Excellence</span>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>© 2025 All rights reserved</p>
              <p>
                Designed by{" "}
                <a 
                  href="https://neubridgeai.vercel.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  NeubridgeAI
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
