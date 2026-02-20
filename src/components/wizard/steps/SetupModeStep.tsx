'use client'

import { WizardStep } from '@/components/wizard/WizardStep'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Settings, Clock, Target, Users, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SetupModeStepProps {
  selected?: 'WIZARD' | 'MANUAL'
  onChange: (mode: 'WIZARD' | 'MANUAL') => void
}

export function SetupModeStep({ selected, onChange }: SetupModeStepProps) {
  return (
    <WizardStep
      title="Choose your setup approach"
      description="We'll help you configure the perfect auction either way"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Wizard */}
        <Card
          className={cn(
            "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
            selected === 'WIZARD'
              ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "hover:border-blue-300"
          )}
          onClick={() => onChange('WIZARD')}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl font-bold flex items-center justify-center space-x-2">
              <span>Configuration Wizard</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Recommended
              </Badge>
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              Answer a few questions and get personalized recommendations
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Smart budget and tier recommendations</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Optimal settings for your league size</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Balanced competition guarantees</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Guided explanation of all settings</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-green-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">5 mins</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Setup time</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-blue-600">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Optimal</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Balance</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-purple-600">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">Any size</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">League</p>
              </div>
            </div>

            {selected === 'WIZARD' && (
              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  ✨ Great choice! We'll ask you 5 quick questions to create the perfect auction setup.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Configuration */}
        <Card
          className={cn(
            "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
            selected === 'MANUAL'
              ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "hover:border-blue-300"
          )}
          onClick={() => onChange('MANUAL')}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-700 rounded-lg flex items-center justify-center mb-4">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl font-bold">Manual Configuration</CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              Full control over every setting and parameter
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Complete customization freedom</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Access to all advanced options</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Use proven configuration presets</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Perfect for experienced organizers</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-orange-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">10-15 mins</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Setup time</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-blue-600">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Custom</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Balance</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-purple-600">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">Expert</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Level</p>
              </div>
            </div>

            {selected === 'MANUAL' && (
              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  🎛️ You're in control! Configure every aspect of your auction manually.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold mb-4 text-center">Quick Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Configuration Wizard
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Manual Configuration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  Ease of Use
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Very Easy
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Requires Knowledge
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  Customization
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Smart Defaults
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Full Control
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  Best For
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                  First-time organizers
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                  Experienced users
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Not sure which to choose?</strong> The Configuration Wizard is perfect for most users and will create
          a well-balanced auction. You can always switch to manual mode later if you need more control.
        </p>
      </div>
    </WizardStep>
  )
}