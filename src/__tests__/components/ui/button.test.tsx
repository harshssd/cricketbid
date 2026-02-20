import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>)

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Click me')).toBeInTheDocument()
    })

    it('should render as button element by default', () => {
      render(<Button>Test Button</Button>)

      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('should have default data attributes', () => {
      render(<Button>Test</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button).toHaveAttribute('data-variant', 'default')
      expect(button).toHaveAttribute('data-size', 'default')
    })
  })

  describe('Variants', () => {
    it('should apply default variant styling', () => {
      render(<Button>Default</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
    })

    it('should apply destructive variant styling', () => {
      render(<Button variant="destructive">Destructive</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive', 'text-white')
      expect(button).toHaveAttribute('data-variant', 'destructive')
    })

    it('should apply outline variant styling', () => {
      render(<Button variant="outline">Outline</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('border', 'bg-background')
      expect(button).toHaveAttribute('data-variant', 'outline')
    })

    it('should apply secondary variant styling', () => {
      render(<Button variant="secondary">Secondary</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground')
      expect(button).toHaveAttribute('data-variant', 'secondary')
    })

    it('should apply ghost variant styling', () => {
      render(<Button variant="ghost">Ghost</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
      expect(button).toHaveAttribute('data-variant', 'ghost')
    })

    it('should apply link variant styling', () => {
      render(<Button variant="link">Link</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-primary', 'underline-offset-4')
      expect(button).toHaveAttribute('data-variant', 'link')
    })
  })

  describe('Sizes', () => {
    it('should apply default size styling', () => {
      render(<Button>Default Size</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9', 'px-4', 'py-2')
      expect(button).toHaveAttribute('data-size', 'default')
    })

    it('should apply xs size styling', () => {
      render(<Button size="xs">Extra Small</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-6', 'px-2', 'text-xs')
      expect(button).toHaveAttribute('data-size', 'xs')
    })

    it('should apply sm size styling', () => {
      render(<Button size="sm">Small</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-8', 'px-3')
      expect(button).toHaveAttribute('data-size', 'sm')
    })

    it('should apply lg size styling', () => {
      render(<Button size="lg">Large</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10', 'px-6')
      expect(button).toHaveAttribute('data-size', 'lg')
    })

    it('should apply icon size styling', () => {
      render(<Button size="icon">🔥</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('size-9')
      expect(button).toHaveAttribute('data-size', 'icon')
    })

    it('should apply icon-xs size styling', () => {
      render(<Button size="icon-xs">🔥</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('size-6')
      expect(button).toHaveAttribute('data-size', 'icon-xs')
    })

    it('should apply icon-sm size styling', () => {
      render(<Button size="icon-sm">🔥</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('size-8')
      expect(button).toHaveAttribute('data-size', 'icon-sm')
    })

    it('should apply icon-lg size styling', () => {
      render(<Button size="icon-lg">🔥</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('size-10')
      expect(button).toHaveAttribute('data-size', 'icon-lg')
    })
  })

  describe('Custom Styling', () => {
    it('should accept custom className', () => {
      render(<Button className="custom-class">Custom</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
      expect(button).toHaveClass('bg-primary') // Should still have base classes
    })

    it('should combine variant, size, and custom classes', () => {
      render(
        <Button variant="outline" size="lg" className="custom-class">
          Combined
        </Button>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('border') // outline variant
      expect(button).toHaveClass('h-10') // lg size
      expect(button).toHaveClass('custom-class') // custom class
    })
  })

  describe('Disabled State', () => {
    it('should apply disabled styling when disabled', () => {
      render(<Button disabled>Disabled</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
    })

    it('should not trigger click events when disabled', () => {
      const handleClick = jest.fn()
      render(<Button disabled onClick={handleClick}>Disabled</Button>)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Event Handling', () => {
    it('should handle click events', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Clickable</Button>)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should handle other events', () => {
      const handleMouseOver = jest.fn()
      render(<Button onMouseOver={handleMouseOver}>Hoverable</Button>)

      const button = screen.getByRole('button')
      fireEvent.mouseOver(button)

      expect(handleMouseOver).toHaveBeenCalledTimes(1)
    })
  })

  describe('AsChild Functionality', () => {
    it('should render as Slot component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
      expect(link).toHaveClass('bg-primary') // Should still have button styles
      expect(link).toHaveAttribute('data-slot', 'button')
    })

    it('should transfer button props to child when asChild is true', () => {
      render(
        <Button asChild variant="outline" size="lg">
          <a href="/test">Styled Link</a>
        </Button>
      )

      const link = screen.getByRole('link')
      expect(link).toHaveClass('border') // outline variant
      expect(link).toHaveClass('h-10') // lg size
      expect(link).toHaveAttribute('data-variant', 'outline')
      expect(link).toHaveAttribute('data-size', 'lg')
    })
  })

  describe('Accessibility', () => {
    it('should have button role by default', () => {
      render(<Button>Accessible</Button>)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should support ARIA attributes', () => {
      render(
        <Button aria-label="Save document" aria-describedby="save-help">
          Save
        </Button>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Save document')
      expect(button).toHaveAttribute('aria-describedby', 'save-help')
    })

    it('should have focus-visible styles', () => {
      render(<Button>Focusable</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:border-ring', 'focus-visible:ring-ring/50')
    })

    it('should handle aria-invalid state', () => {
      render(<Button aria-invalid="true">Invalid</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('aria-invalid:ring-destructive/20')
    })
  })

  describe('Icon Support', () => {
    it('should style SVG icons correctly', () => {
      render(
        <Button>
          <svg data-testid="icon" />
          Button with Icon
        </Button>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('[&_svg]:pointer-events-none')
    })

    it('should handle buttons with only icons', () => {
      render(
        <Button size="icon">
          <svg data-testid="icon" />
        </Button>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('size-9')
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })
  })

  describe('Type Attribute', () => {
    it('should default to button type', () => {
      render(<Button>Default Type</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('should support submit type', () => {
      render(<Button type="submit">Submit</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('should support reset type', () => {
      render(<Button type="reset">Reset</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'reset')
    })
  })

  describe('Form Integration', () => {
    it('should work within forms', () => {
      const handleSubmit = jest.fn(e => e.preventDefault())

      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit Form</Button>
        </form>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleSubmit).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button />)

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toBeEmptyDOMElement()
    })

    it('should handle null/undefined variant gracefully', () => {
      render(<Button variant={undefined}>Test</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary') // Should fall back to default
    })

    it('should handle null/undefined size gracefully', () => {
      render(<Button size={undefined}>Test</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9') // Should fall back to default
    })

    it('should handle complex children', () => {
      render(
        <Button>
          <span>Complex</span>
          <strong>Children</strong>
        </Button>
      )

      const button = screen.getByRole('button')
      expect(screen.getByText('Complex')).toBeInTheDocument()
      expect(screen.getByText('Children')).toBeInTheDocument()
    })
  })
})