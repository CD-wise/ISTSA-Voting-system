"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Vote, Home } from "lucide-react"
import Image from "next/image"

interface StudentDetails {
  studentId: string
  name: string
  phone: string
  email: string
  programme: string
  level: string
  degree_type: string
}

export default function ConfirmationPage() {
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null)
  const router = useRouter()

  useEffect(() => {
    const studentDetailsData = sessionStorage.getItem("studentDetails")

    if (!studentDetailsData) {
      router.push("/")
      return
    }

    setStudentDetails(JSON.parse(studentDetailsData))
  }, [router])

  const handleReturnHome = () => {
    // Clear session storage
    sessionStorage.clear()
    router.push("/")
  }

  if (!studentDetails) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Voting Complete!</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Your votes have been successfully submitted
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3 mb-3">
                <Vote className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Voting Summary</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Student:</span>
                  <span className="font-medium">{studentDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Student ID:</span>
                  <span className="font-medium">{studentDetails.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Programme:</span>
                  <span className="font-medium">{studentDetails.programme}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Level:</span>
                  <span className="font-medium">Level {studentDetails.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Degree Type:</span>
                  <span className="font-medium">{studentDetails.degree_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Voting Time:</span>
                  <span className="font-medium">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Important:</strong> Your votes are confidential and cannot be changed. Thank you for
                  participating in the ISTSA elections.
                </p>
              </div>

              <Button onClick={handleReturnHome} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Home className="w-4 h-4 mr-2" />
                Return to Home
              </Button>
            </div>

            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <Image
                  src="/images/ISTSA-logo.png"
                  alt="ISTSA & Accra Technical University Logo"
                  width={80}
                  height={80}
                  className="object-contain opacity-60"
                />
              </div>
              <p className="text-xs text-gray-500">ISTSA Voting System © 2025</p>
              <p className="text-xs text-gray-400">Accra Technical University</p>
            </div>
          </CardContent>
        </Card>
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
