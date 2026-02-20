'use client'

import { useEffect, useState } from 'react'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Timer, Eye, Zap, Shield, LogIn, UserPlus } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Create supabase client only if environment variables are configured
  const supabase = typeof window !== 'undefined' &&
                   process.env.NEXT_PUBLIC_SUPABASE_URL &&
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                   !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') ?
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ) : null

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.warn('Auth error:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Navigation Header */}
      <header className="relative z-10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">TossUp</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-300">
                  Welcome back, {user.user_metadata?.name || user.email?.split('@')[0]}!
                </span>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/signin">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/auth/signup">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-12 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center mb-8">
            <Trophy className="h-16 w-16 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            TossUp
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            The complete cricket management platform. Manage clubs, organize tournaments,
            run auctions, and track performance - all in one powerful solution.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {user ? (
              <>
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/auction/create">Create Auction</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/auth/signup">Get Started Free</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/demo">Watch Demo</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need for cricket auctions
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Professional auction management with real-time bidding, live streaming, and comprehensive analytics.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-white">Sealed Bidding</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Fair and strategic sealed-bid system with smart budget validation,
                  tier constraints, and automatic tie-breaking.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-white">Live Streaming</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Share your auction live with animated draft boards,
                  social media integration, and OBS-ready stream views.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-white">Team Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Complete role-based access for owners, moderators, captains, and viewers.
                  Custom branding and team colors included.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-white">Dry Run Simulator</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Test your auction settings with AI captains and famous cricketers
                  before going live. Get balance recommendations.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-white">Configuration Wizard</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Smart recommendations for budgets, tiers, and constraints based on
                  your league size and competition level.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-white">Export & Share</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-300">
                  Professional team sheets, social media cards, and shareable results.
                  CSV exports for detailed analysis.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to run your cricket auction?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Join cricket clubs worldwide using TossUp for professional auctions.
              Get started in minutes with our easy setup wizard.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {user ? (
                <>
                  <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/auction/create">Create Your Auction</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/leagues/create">Start a League</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/auth/signup">Join TossUp</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/features">See All Features</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Badge variant="secondary" className="bg-slate-700 text-gray-300">
                No credit card required
              </Badge>
              <Badge variant="secondary" className="bg-slate-700 text-gray-300">
                Setup in 5 minutes
              </Badge>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
