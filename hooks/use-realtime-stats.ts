"use client"

import { useState, useEffect } from "react"
import { getDashboardStats } from "@/lib/admin-actions"

export function useRealtimeStats(intervalMs = 30000) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats()
        setStats(data)
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchStats()

    // Set up interval for real-time updates
    const interval = setInterval(fetchStats, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMs])

  return { stats, loading, refetch: () => getDashboardStats().then(setStats) }
}
