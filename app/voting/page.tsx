"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getVotingData, submitVote, getStudentVotes, markStudentAsVoted } from "@/lib/actions"
import { Check, Vote } from 'lucide-react'
import type { VotingCategory, Candidate } from "@/lib/supabase"

interface StudentDetails {
  studentId: string
  name: string
  phone: string
  email: string
  programme: string
  level: string
  degree_type: string
}

export default function VotingPage() {
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null)
  const [categories, setCategories] = useState<VotingCategory[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [votes, setVotes] = useState<Record<number, number>>({})
  const [studentVotes, setStudentVotes] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("")
  const [votingOpen, setVotingOpen] = useState(true)

  useEffect(() => {
    const studentDetailsData = sessionStorage.getItem("studentDetails")

    if (!studentDetailsData) {
      router.push("/")
      return
    }

    const studentObj = JSON.parse(studentDetailsData)
    setStudentDetails(studentObj)

    loadVotingData(studentObj.studentId)
  }, [router])

  // Add new useEffect to set initial active tab
  useEffect(() => {
    if (categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].id.toString())
    }
  }, [categories, activeTab])

  const loadVotingData = async (studentId: string) => {
    try {
      const [votingData, existingVotes] = await Promise.all([getVotingData(), getStudentVotes(studentId)])
      setVotingOpen((votingData as { votingOpen?: boolean }).votingOpen ?? true) // votingOpen from backend

      // Sort categories by id ascending
      const sortedCategories = votingData.categories.sort((a, b) => a.id - b.id)

      setCategories(sortedCategories)
      setCandidates(votingData.candidates)
      setStudentVotes(existingVotes)
    } catch (error) {
      console.error("Failed to load voting data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Block voting actions
  const handleVote = async (candidateId: number, categoryId: number) => {
    if (!studentDetails || !votingOpen) return

    setSubmitting(true)

    try {
      const result = await submitVote(studentDetails.studentId, candidateId, categoryId)

      if (result.success) {
        setVotes((prev) => ({ ...prev, [categoryId]: candidateId }))
        setStudentVotes((prev) => [...prev, categoryId])
      }
    } catch (error) {
      console.error("Failed to submit vote:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinishVoting = async () => {
    if (!studentDetails) return

    setSubmitting(true)

    try {
      await markStudentAsVoted(studentDetails.studentId)
      router.push("/confirmation")
    } catch (error) {
      console.error("Failed to finish voting:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const getCandidatesForCategory = (categoryId: number) => {
    return candidates.filter((candidate) => candidate.category_id === categoryId)
  }

  const hasVotedInCategory = (categoryId: number) => {
    return studentVotes.includes(categoryId)
  }

  const getVotedCandidate = (categoryId: number) => {
    return votes[categoryId]
  }

  // Add this function after the existing helper functions
  const getNextUnvotedCategory = () => {
    const currentIndex = categories.findIndex((cat) => cat.id.toString() === activeTab)

    // Find next unvoted category starting from current position
    for (let i = currentIndex + 1; i < categories.length; i++) {
      if (!hasVotedInCategory(categories[i].id)) {
        return categories[i].id.toString()
      }
    }

    // If no unvoted categories after current, check from beginning
    for (let i = 0; i < currentIndex; i++) {
      if (!hasVotedInCategory(categories[i].id)) {
        return categories[i].id.toString()
      }
    }

    return null // All categories voted
  }

  const handleNextCategory = () => {
    const nextCategory = getNextUnvotedCategory()
    if (nextCategory) {
      setActiveTab(nextCategory)
    }
  }

  useEffect(() => {
    const activeTabButton = document.querySelector(`[data-tab-trigger="${activeTab}"]`)
    if (activeTabButton) {
      activeTabButton.scrollIntoView({ behavior: "smooth", inline: "center" })
    }
  }, [activeTab])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Vote className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading voting system...</p>
        </div>
      </div>
    )
  }

  // Show message if voting is closed
  if (!votingOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Voting is closed</h2>
            <p className="text-gray-700">You cannot vote at this time.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalVoted = studentVotes.length
  const totalCategories = categories.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Cast Your Vote</CardTitle>
              <CardDescription>Welcome, {studentDetails?.name}. Vote for candidates in each category.</CardDescription>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">
                  Progress: {totalVoted}/{totalCategories} categories completed
                </span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(totalVoted / totalCategories) * 100}%` }}
                  />
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Voting Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full overflow-x-auto">
            <TabsList className="flex w-max min-w-full space-x-1 p-1">
              {categories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id.toString()}
                  className="text-xs relative min-w-[100px] px-3 py-2 whitespace-nowrap flex-shrink-0"
                  data-tab-trigger={category.id.toString()}
                >
                  <span className="truncate">{category.name}</span>
                  {hasVotedInCategory(category.id) && (
                    <Check className="w-3 h-3 text-green-600 absolute -top-1 -right-1" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id.toString()}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                  <CardDescription>
                    {hasVotedInCategory(category.id)
                      ? "You have voted in this category"
                      : "Select one candidate to vote for"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {getCandidatesForCategory(category.id).map((candidate) => {
                      const isVoted = hasVotedInCategory(category.id)
                      const isSelected = getVotedCandidate(category.id) === candidate.id

                      return (
                        <Card
                          key={candidate.id}
                          className={`transition-all duration-200 ${
                            isSelected
                              ? "ring-2 ring-green-500 bg-green-50"
                              : isVoted
                                ? "opacity-50"
                                : "hover:shadow-lg hover:scale-105"
                          }`}
                        >
                          <CardContent className="p-0">
                            {/* Square image container */}
                            <div className="relative aspect-square w-full">
                              <img
                                src={candidate.photo_url || "/placeholder.svg"}
                                alt={candidate.name}
                                className="w-full h-full object-cover rounded-t-lg"
                              />
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                                  <Check className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Candidate info and vote button */}
                            <div className="p-4 space-y-3">
                              <div className="text-center">
                                <h3 className="font-bold text-lg text-gray-900">{candidate.name}</h3>
                                <p className="text-sm text-gray-600">{category.name}</p>
                              </div>

                              <div className="flex justify-center">
                                {isSelected ? (
                                  <div className="flex items-center space-x-2 text-green-600 bg-green-100 px-4 py-2 rounded-full">
                                    <Check className="w-4 h-4" />
                                    <span className="text-sm font-medium">Voted</span>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => handleVote(candidate.id, category.id)}
                                    disabled={isVoted || submitting}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full"
                                  >
                                    Vote
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
              {/* Add this after the candidates grid in each TabsContent */}
              {hasVotedInCategory(category.id) && (
                <div className="mt-6 flex justify-center">
                  {getNextUnvotedCategory() ? (
                    <Button
                      onClick={handleNextCategory}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-full flex items-center space-x-2"
                    >
                      <span>Next Category</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        const finishSection = document.querySelector("[data-finish-voting]")
                        finishSection?.scrollIntoView({ behavior: "smooth" })
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-full flex items-center space-x-2"
                    >
                      <span>Review All Votes</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Finish Voting Button */}
        {totalVoted === totalCategories && (
          <div className="mt-6" data-finish-voting>
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-green-600 mb-2">All votes cast successfully!</h3>
                <p className="text-gray-600 mb-4">
                  You have voted in all {totalCategories} categories. Click below to submit your votes.
                </p>
                <Button
                  onClick={handleFinishVoting}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
                >
                  {submitting ? "Submitting..." : "Submit All Votes"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
