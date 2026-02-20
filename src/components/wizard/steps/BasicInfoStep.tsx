'use client'

import { useState, useEffect } from 'react'
import { WizardStep, FormSection } from '@/components/wizard/WizardStep'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DateTimePicker, TimePresets } from '@/components/ui/date-time-picker'
import { Card, CardContent } from '@/components/ui/card'
import { BasicInfoFormData } from '@/lib/validations/auction'
import { Calendar, Globe, Lock, Shield, Users, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

// Common timezones
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'British Time' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
  { value: 'Asia/Singapore', label: 'Singapore Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time' },
]

interface BasicInfoStepProps {
  data: Partial<BasicInfoFormData>
  onChange: (data: Partial<BasicInfoFormData>) => void
  errors?: Record<string, string[]>
}

export function BasicInfoStep({ data, onChange, errors = {} }: BasicInfoStepProps) {
  const [isPrivate, setIsPrivate] = useState(data.visibility === 'PRIVATE')

  // Auto-detect timezone
  useEffect(() => {
    if (!data.timezone) {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      onChange({ ...data, timezone: detectedTimezone })
    }
  }, [data, onChange])

  const handleInputChange = (field: keyof BasicInfoFormData, value: any) => {
    onChange({ ...data, [field]: value })
  }

  const handleVisibilityChange = (isPrivate: boolean) => {
    setIsPrivate(isPrivate)
    handleInputChange('visibility', isPrivate ? 'PRIVATE' : 'PUBLIC')
    if (!isPrivate) {
      handleInputChange('passcode', undefined)
    }
  }

  const [scheduleType, setScheduleType] = useState<'now' | 'later'>(
    data.scheduledAt ? 'later' : 'now'
  )

  const minDate = new Date()

  const handleScheduleTypeChange = (type: 'now' | 'later') => {
    setScheduleType(type)
    if (type === 'now') {
      handleInputChange('scheduledAt', undefined)
    }
  }

  return (
    <WizardStep
      title="Let's start with the basics"
      description="Set up your auction information and schedule"
      errors={errors}
    >
      <div className="space-y-8">
        {/* Auction Details */}
        <FormSection
          title="Auction Details"
          description="Basic information about your cricket auction"
          required
        >
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="auction-name">Auction Name</Label>
              <Input
                id="auction-name"
                placeholder="e.g., Rakka League 2026 Auction"
                value={data.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-lg"
              />
              <p className="text-sm text-gray-500">
                Give your auction a memorable name that participants will recognize
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Tell participants about your league, tournament, or event..."
                value={data.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
              <p className="text-sm text-gray-500">
                Add context about your tournament, league rules, or special instructions
              </p>
            </div>
          </div>
        </FormSection>

        {/* Schedule */}
        <FormSection
          title="Schedule"
          description="When will your auction take place?"
        >
          <div className="space-y-4">
            {/* Schedule Type Toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleScheduleTypeChange('now')}
                className={cn(
                  'flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors',
                  scheduleType === 'now'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <Zap className="h-4 w-4" />
                <span className="font-medium text-sm">Start when ready</span>
              </button>
              <button
                type="button"
                onClick={() => handleScheduleTypeChange('later')}
                className={cn(
                  'flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors',
                  scheduleType === 'later'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <Calendar className="h-4 w-4" />
                <span className="font-medium text-sm">Schedule for later</span>
              </button>
            </div>

            {scheduleType === 'now' ? (
              <p className="text-sm text-gray-500">
                You can start the auction manually anytime after setup is complete.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Auction Date & Time</Label>
                    <DateTimePicker
                      value={data.scheduledAt}
                      onChange={(date) => handleInputChange('scheduledAt', date)}
                      minDate={minDate}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={data.timezone}
                      onValueChange={(value) => handleInputChange('timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <TimePresets
                    onTimeSelect={(date) => handleInputChange('scheduledAt', date)}
                  />

                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Timing Tips
                        </span>
                      </div>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-6">
                        <li>• Allow 1-3 hours for the auction</li>
                        <li>• Choose a time when all captains can attend</li>
                        <li>• Consider running a dry run first</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* Privacy & Access */}
        <FormSection
          title="Privacy & Access"
          description="Control who can find and join your auction"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  {isPrivate ? (
                    <Lock className="h-4 w-4 text-gray-600" />
                  ) : (
                    <Globe className="h-4 w-4 text-gray-600" />
                  )}
                  <Label className="text-base font-medium">
                    {isPrivate ? 'Private Auction' : 'Public Auction'}
                  </Label>
                </div>
                <p className="text-sm text-gray-500">
                  {isPrivate
                    ? 'Only people with the link or passcode can join'
                    : 'Anyone can discover and view this auction'
                  }
                </p>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={handleVisibilityChange}
              />
            </div>

            {isPrivate && (
              <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Label htmlFor="passcode">Access Passcode (Optional)</Label>
                <Input
                  id="passcode"
                  type="password"
                  placeholder="Enter a passcode for extra security"
                  value={data.passcode || ''}
                  onChange={(e) => handleInputChange('passcode', e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Leave empty to allow access with just the invitation link
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Public Benefits
                    </span>
                  </div>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• Discoverable by cricket community</li>
                    <li>• Easy to share and promote</li>
                    <li>• Great for open tournaments</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Private Benefits
                    </span>
                  </div>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Complete control over access</li>
                    <li>• Perfect for club leagues</li>
                    <li>• Added security with passcodes</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </FormSection>
      </div>
    </WizardStep>
  )
}