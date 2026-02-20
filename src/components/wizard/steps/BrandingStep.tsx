'use client'

import { WizardStep } from '@/components/wizard/WizardStep'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColorPicker } from '@/components/ui/color-picker'
import { BrandingFormData } from '@/lib/validations/auction'
import { Palette, Type, Image, Wand2 } from 'lucide-react'

interface BrandingStepProps {
  data?: Partial<BrandingFormData>
  onChange: (data: Partial<BrandingFormData>) => void
  errors?: Record<string, string[]>
}

export function BrandingStep({ data = {}, onChange, errors = {} }: BrandingStepProps) {
  const handleInputChange = (field: keyof BrandingFormData, value: string) => {
    onChange({
      ...data,
      [field]: value
    })
  }

  const getFieldError = (field: string) => {
    return errors[field]?.[0]
  }

  const fontOptions = [
    { value: 'system', label: 'System Default' },
    { value: 'inter', label: 'Inter (Modern)' },
    { value: 'roboto', label: 'Roboto (Clean)' },
    { value: 'poppins', label: 'Poppins (Friendly)' },
    { value: 'playfair', label: 'Playfair Display (Elegant)' },
    { value: 'montserrat', label: 'Montserrat (Professional)' },
  ]

  const themePresets = [
    {
      value: 'cricket-classic',
      label: 'Cricket Classic',
      primary: '#2F855A',
      secondary: '#68D391',
      description: 'Traditional cricket green theme'
    },
    {
      value: 'ocean-blue',
      label: 'Ocean Blue',
      primary: '#2B6CB0',
      secondary: '#63B3ED',
      description: 'Professional blue theme'
    },
    {
      value: 'sunset-orange',
      label: 'Sunset Orange',
      primary: '#DD6B20',
      secondary: '#F6AD55',
      description: 'Energetic orange theme'
    },
    {
      value: 'royal-purple',
      label: 'Royal Purple',
      primary: '#6B46C1',
      secondary: '#A78BFA',
      description: 'Elegant purple theme'
    },
    {
      value: 'midnight-dark',
      label: 'Midnight Dark',
      primary: '#1A202C',
      secondary: '#4A5568',
      description: 'Sleek dark theme'
    },
  ]

  const applyThemePreset = (preset: any) => {
    onChange({
      ...data,
      themePreset: preset.value,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
    })
  }

  return (
    <WizardStep
      title="Branding & Themes (Optional)"
      description="Customize the look and feel of your auction"
      errors={errors}
    >
      <div className="space-y-6">
        {/* Theme Presets */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Wand2 className="h-5 w-5 text-purple-600" />
              <CardTitle>Quick Theme Presets</CardTitle>
            </div>
            <CardDescription>
              Choose a preset theme or customize your own colors below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themePresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  onClick={() => applyThemePreset(preset)}
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <div className="flex space-x-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-xs text-gray-500">{preset.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Color Customization */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-blue-600" />
              <CardTitle>Color Scheme</CardTitle>
            </div>
            <CardDescription>
              Customize your auction's primary color palette
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center space-x-2">
                  <ColorPicker
                    value={data.primaryColor || '#1B2A4A'}
                    onChange={(color) => handleInputChange('primaryColor', color)}
                  />
                  <Input
                    value={data.primaryColor || ''}
                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                    placeholder="#1B2A4A"
                    className="font-mono text-sm"
                    maxLength={7}
                  />
                </div>
                {getFieldError('primaryColor') && (
                  <p className="text-sm text-red-600">{getFieldError('primaryColor')}</p>
                )}
                <p className="text-xs text-gray-500">
                  Main brand color for buttons and highlights
                </p>
              </div>

              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex items-center space-x-2">
                  <ColorPicker
                    value={data.secondaryColor || '#3B82F6'}
                    onChange={(color) => handleInputChange('secondaryColor', color)}
                  />
                  <Input
                    value={data.secondaryColor || ''}
                    onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                    placeholder="#3B82F6"
                    className="font-mono text-sm"
                    maxLength={7}
                  />
                </div>
                {getFieldError('secondaryColor') && (
                  <p className="text-sm text-red-600">{getFieldError('secondaryColor')}</p>
                )}
                <p className="text-xs text-gray-500">
                  Accent color for secondary elements
                </p>
              </div>
            </div>

            {/* Color Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <div
                  className="w-16 h-16 rounded-lg border shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${data.primaryColor || '#1B2A4A'} 0%, ${data.secondaryColor || '#3B82F6'} 100%)`
                  }}
                />
                <div>
                  <div className="text-sm font-medium">Color Preview</div>
                  <div className="text-xs text-gray-600">
                    Primary: {data.primaryColor || '#1B2A4A'} |
                    Secondary: {data.secondaryColor || '#3B82F6'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Type className="h-5 w-5 text-green-600" />
              <CardTitle>Typography</CardTitle>
            </div>
            <CardDescription>
              Choose fonts for your auction interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="font">Primary Font</Label>
              <Select
                value={data.font || 'system'}
                onValueChange={(value) => handleInputChange('font', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a font" />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getFieldError('font') && (
                <p className="text-sm text-red-600">{getFieldError('font')}</p>
              )}
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <Label htmlFor="tagline">Auction Tagline (Optional)</Label>
              <Input
                id="tagline"
                placeholder="e.g., 'The Ultimate Cricket Draft'"
                maxLength={100}
                value={data.tagline || ''}
                onChange={(e) => handleInputChange('tagline', e.target.value)}
                className={getFieldError('tagline') ? 'border-red-500' : ''}
              />
              {getFieldError('tagline') && (
                <p className="text-sm text-red-600">{getFieldError('tagline')}</p>
              )}
              <p className="text-xs text-gray-500">
                Displayed on auction pages and shares
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Media Assets */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Image className="h-5 w-5 text-orange-600" />
              <CardTitle>Media Assets (Optional)</CardTitle>
            </div>
            <CardDescription>
              Upload custom images for a professional look
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={data.logo || ''}
                  onChange={(e) => handleInputChange('logo', e.target.value)}
                  className={getFieldError('logo') ? 'border-red-500' : ''}
                />
                {getFieldError('logo') && (
                  <p className="text-sm text-red-600">{getFieldError('logo')}</p>
                )}
                <p className="text-xs text-gray-500">
                  Square logo, ideally 200x200px or larger
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner">Banner URL</Label>
                <Input
                  id="banner"
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={data.banner || ''}
                  onChange={(e) => handleInputChange('banner', e.target.value)}
                  className={getFieldError('banner') ? 'border-red-500' : ''}
                />
                {getFieldError('banner') && (
                  <p className="text-sm text-red-600">{getFieldError('banner')}</p>
                )}
                <p className="text-xs text-gray-500">
                  Wide banner, ideally 1200x300px
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bgImage">Background Image URL</Label>
              <Input
                id="bgImage"
                type="url"
                placeholder="https://example.com/background.jpg"
                value={data.bgImage || ''}
                onChange={(e) => handleInputChange('bgImage', e.target.value)}
                className={getFieldError('bgImage') ? 'border-red-500' : ''}
              />
              {getFieldError('bgImage') && (
                <p className="text-sm text-red-600">{getFieldError('bgImage')}</p>
              )}
              <p className="text-xs text-gray-500">
                Subtle background image for auction pages
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Branding Tips */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Branding Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Skip if in a hurry:</strong> This step is completely optional - you can always customize later
              </li>
              <li>
                <strong>Contrast:</strong> Ensure colors have good contrast for readability
              </li>
              <li>
                <strong>Images:</strong> Use high-quality images for a professional appearance
              </li>
              <li>
                <strong>Consistency:</strong> Match your existing league or organization branding
              </li>
              <li>
                <strong>Mobile-friendly:</strong> Test how your branding looks on mobile devices
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </WizardStep>
  )
}