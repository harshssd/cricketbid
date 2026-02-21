'use client'

import { useState } from 'react'
import { WizardStep, FormSection } from '@/components/wizard/WizardStep'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { BasicInfoFormData } from '@/lib/validations/auction'
import { Globe, Lock, Shield, Users } from 'lucide-react'

interface BasicInfoStepProps {
  data: Partial<BasicInfoFormData>
  onChange: (data: Partial<BasicInfoFormData>) => void
  errors?: Record<string, string[]>
}

export function BasicInfoStep({ data, onChange, errors = {} }: BasicInfoStepProps) {
  const [isPrivate, setIsPrivate] = useState(data.visibility === 'PRIVATE')

  const handleInputChange = (field: keyof BasicInfoFormData, value: any) => {
    onChange({ ...data, [field]: value })
  }

  const handleVisibilityChange = (isPrivate: boolean) => {
    setIsPrivate(isPrivate)
    handleInputChange('visibility', isPrivate ? 'PRIVATE' : 'PUBLIC')
  }

  return (
    <WizardStep
      title="Let's start with the basics"
      description="Set up your auction information"
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
              <p className="text-sm text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">
                Add context about your tournament, league rules, or special instructions
              </p>
            </div>
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
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label className="text-base font-medium">
                    {isPrivate ? 'Private Auction' : 'Public Auction'}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isPrivate
                    ? 'Only people with the link can join'
                    : 'Anyone can discover and view this auction'
                  }
                </p>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={handleVisibilityChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-success/30 bg-success/10">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success-foreground">
                      Public Benefits
                    </span>
                  </div>
                  <ul className="text-sm text-success-foreground space-y-1">
                    <li>- Discoverable by cricket community</li>
                    <li>- Easy to share and promote</li>
                    <li>- Great for open tournaments</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-info/30 bg-info/10">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-info-foreground">
                      Private Benefits
                    </span>
                  </div>
                  <ul className="text-sm text-info-foreground space-y-1">
                    <li>- Complete control over access</li>
                    <li>- Perfect for club leagues</li>
                    <li>- Invitation-only participation</li>
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
