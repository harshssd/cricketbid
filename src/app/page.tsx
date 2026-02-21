'use client'

import { useEffect, useState } from 'react'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Timer, Eye, Zap, Shield, LogIn, UserPlus } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/PageTransition'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
      <div className="min-h-screen bg-gradient-to-b from-background to-card flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const features = [
    { icon: Zap, color: 'text-blue-400', title: 'Sealed Bidding', description: 'Fair and strategic sealed-bid system with smart budget validation, tier constraints, and automatic tie-breaking.' },
    { icon: Eye, color: 'text-rose-400', title: 'Live Streaming', description: 'Share your auction live with animated draft boards, social media integration, and OBS-ready stream views.' },
    { icon: Users, color: 'text-emerald-400', title: 'Team Management', description: 'Complete role-based access for owners, moderators, captains, and viewers. Custom branding and team colors included.' },
    { icon: Shield, color: 'text-amber-400', title: 'Dry Run Simulator', description: 'Test your auction settings with AI captains and famous cricketers before going live. Get balance recommendations.' },
    { icon: Timer, color: 'text-cyan-400', title: 'Configuration Wizard', description: 'Smart recommendations for budgets, tiers, and constraints based on your league size and competition level.' },
    { icon: Trophy, color: 'text-purple-400', title: 'Export & Share', description: 'Professional team sheets, social media cards, and shareable results. CSV exports for detailed analysis.' },
  ]

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-background to-card">
        {/* Navigation Header */}
        <header className="relative z-10">
          <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Trophy className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold text-foreground">TossUp</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground">
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
                  <Button asChild size="sm" className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500">
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mb-8"
            >
              <Trophy className="h-16 w-16 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl"
            >
              TossUp
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-lg leading-8 text-muted-foreground"
            >
              The complete cricket management platform. Manage clubs, organize tournaments,
              run auctions, and track performance - all in one powerful solution.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-10 flex items-center justify-center gap-x-6"
            >
              {user ? (
                <>
                  <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/auction/create">Create Auction</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500">
                    <Link href="/auth/signup">Get Started Free</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/demo">Watch Demo</Link>
                  </Button>
                </>
              )}
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything you need for cricket auctions
              </h2>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Professional auction management with real-time bidding, live streaming, and comprehensive analytics.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="bg-card/50 border-border">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${feature.color}`} />
                          <CardTitle className="text-foreground">{feature.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-muted-foreground">
                          {feature.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Ready to run your cricket auction?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                Join cricket clubs worldwide using TossUp for professional auctions.
                Get started in minutes with our easy setup wizard.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                {user ? (
                  <>
                    <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500">
                      <Link href="/auction/create">Create Your Auction</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link href="/leagues/create">Start a League</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500">
                      <Link href="/auth/signup">Join TossUp</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link href="/features">See All Features</Link>
                    </Button>
                  </>
                )}
              </div>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Badge variant="secondary">
                  No credit card required
                </Badge>
                <Badge variant="secondary">
                  Setup in 5 minutes
                </Badge>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
