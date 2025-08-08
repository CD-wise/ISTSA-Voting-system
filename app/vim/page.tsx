"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, RefreshCw, Vote, ArrowLeft, Home } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"
import {
  verifyStudentId,
  getVotingData,
  submitVote,
  markStudentAsVoted,
  getStudentVotes,
} from "@/lib/actions"

interface Student {
  student_id: string
  name: string
  phone: string
  programme: string
  level: number
}

interface VotingCategory {
  id: number
  name: string
  display_order: number
}

interface Candidate {
  id: number
  name: string
  category_id: number
  photo_url: string
}

export default function VimVoting() {
  const [step, setStep] = useState(1)
  const [studentId, setStudentId] = useState("")
  const [student, setStudent] = useState<Student | null>(null)
  const [categories, setCategories] = useState<VotingCategory[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedVotes, setSelectedVotes] = useState<Record<number, number>>({})
  const [submittedCategories, setSubmittedCategories] = useState<number[]>([])
  const [votingOpen, setVotingOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (step === 5) {
      loadVotingData()
      loadStudentVotes()
    }
  }, [step])

  const loadVotingData = async () => {
    const data = await getVotingData()
    setCategories(data.categories)
    setCandidates(data.candidates)
    setVotingOpen(data.votingOpen)
  }

  const loadStudentVotes = async () => {
    if (student) {
      const votes = await getStudentVotes(student.student_id)
      setSubmittedCategories(votes)
    }
  }

  const handleStudentIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId.trim()) {
      setError("Please enter your student ID")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    const result = await verifyStudentId(studentId)
    if (result.success && result.student) {
      setStudent(result.student)
      setStep(5)
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  const handleVoteSubmit = async (categoryId: number, candidateId: number) => {
    setLoading(true)
    setError("")

    const result = await submitVote(studentId, candidateId, categoryId)
    if (result.success) {
      setSubmittedCategories([...submittedCategories, categoryId])
      setSelectedVotes({ ...selectedVotes, [categoryId]: candidateId })
      
      if (submittedCategories.length + 1 === categories.length) {
        await markStudentAsVoted(studentId)
        sessionStorage.setItem("votingComplete", "true")
        sessionStorage.setItem("studentName", student?.name || "")
        router.push("/confirmation")
      }
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  const getCandidatesForCategory = (categoryId: number) => {
    return candidates.filter(candidate => candidate.category_id === categoryId)
  }

  const isVotingComplete = submittedCategories.length === categories.length

  const resetVotingSession = () => {
    setStep(1)
    setStudentId("")
    setStudent(null)
    setSubmittedCategories([])
    setSelectedVotes({})
    setError("")
    setSuccess("")
  }

  if (!votingOpen && step >= 5) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Vote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Voting is Currently Closed</h2>
            <p className="text-gray-600">The voting period has ended. Thank you for your interest.</p>
            <Button onClick={() => router.push("/")} className="mt-4">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image
                src="/images/compssa-logo.png"
                alt="COMPSSA Logo"
                width={60}
                height={60}
                className="rounded-full"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">VIM Voting</h1>
                <p className="text-sm text-gray-600">Computer Science Students Association</p>
              </div>
            </div>
            <Button onClick={() => router.push("/")} variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 py-8">
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Student Verification</CardTitle>
              <CardDescription>Enter student ID to begin the voting process</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStudentIdSubmit} className="space-y-4">
                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID
                  </label>
                  <Input
                    id="studentId"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter student ID"
                    className="w-full"
                    disabled={loading}
                  />
                </div>
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Student ID & Start Voting"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{student?.name}</h3>
                    <p className="text-sm text-gray-600">{student?.programme} - Level {student?.level}</p>
                    <p className="text-xs text-gray-500">Student ID: {student?.student_id}</p>
                  </div>
                  <Badge variant={isVotingComplete ? "default" : "secondary"}>
                    {isVotingComplete ? "Voting Complete" : `${submittedCategories.length}/${categories.length} Categories`}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cast Your Votes</CardTitle>
                <CardDescription>Select your preferred candidate for each position</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={categories[0]?.id.toString()} className="w-full">
                  <TabsList className="w-max min-w-full overflow-x-auto">
                    {categories.map((category) => (
                      <TabsTrigger
                        key={category.id}
                        value={category.id.toString()}
                        className="flex-shrink-0 whitespace-nowrap relative"
                      >
                        {category.name}
                        {submittedCategories.includes(category.id) && (
                          <CheckCircle className="w-4 h-4 ml-2 text-green-600" />
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {categories.map((category) => (
                    <TabsContent key={category.id} value={category.id.toString()} className="mt-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                        
                        {submittedCategories.includes(category.id) ? (
                          <Alert className="border-green-200 bg-green-50">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                              Vote successfully submitted for this category.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="grid gap-4">
                            {getCandidatesForCategory(category.id).map((candidate) => (
                              <div
                                key={candidate.id}
                                className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                              >
                                <Image
                                  src={candidate.photo_url || "/images/no-vote.jpeg"}
                                  alt={candidate.name}
                                  width={60}
                                  height={60}
                                  className="rounded-full object-cover"
                                />
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{candidate.name}</h4>
                                </div>
                                <Button
                                  onClick={() => handleVoteSubmit(category.id, candidate.id)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {loading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Vote"
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                {error && (
                  <Alert className="border-red-200 bg-red-50 mt-4">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex justify-center">
                  <Button 
                    onClick={resetVotingSession}
                    variant="outline"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Start New Voting Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Knowledge, Creativity & Excellence</p>
            <p className="text-xs text-gray-500">© 2025 All rights reserved</p>
            <p className="text-xs text-gray-500">
              Designed by{" "}
              <Link 
                href="https://neubridgeai.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                NeubridgeAI
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
