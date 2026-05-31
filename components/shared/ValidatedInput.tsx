'use client'

import { useState, forwardRef, InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { validateEmail, validatePhone, isValidEmail, isValidPhone } from '@/lib/validation'

type Variant = 'email' | 'phone' | 'text'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  variant?: Variant
  value: string
  onChange: (value: string) => void
  onValidChange?: (valid: boolean) => void
  required?: boolean
  /** Show inline validation icon when the field is non-empty + valid */
  showSuccessIcon?: boolean
}

/**
 * Drop-in replacement for shadcn Input that adds inline validation for
 * email / phone variants. Shows the error message under the field once
 * the user blurs out, and surfaces success state with a green checkmark.
 */
export const ValidatedInput = forwardRef<HTMLInputElement, Props>(function ValidatedInput(
  {
    variant = 'text',
    value,
    onChange,
    onValidChange,
    required = false,
    showSuccessIcon = true,
    className = '',
    placeholder,
    ...rest
  },
  ref,
) {
  const [touched, setTouched] = useState(false)

  let error: string | null = null
  if (variant === 'email') error = validateEmail(value, { required })
  if (variant === 'phone') error = validatePhone(value, { required })

  const isValid =
    variant === 'email' ? isValidEmail(value) :
    variant === 'phone' ? isValidPhone(value) :
    value.trim().length > 0

  // Push validity up to parent forms that gate the submit button.
  if (onValidChange) onValidChange(error === null)

  const showError   = touched && error !== null
  const showSuccess = showSuccessIcon && value.trim() !== '' && isValid && !showError

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={variant === 'email' ? 'email' : variant === 'phone' ? 'tel' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        inputMode={variant === 'phone' ? 'tel' : undefined}
        autoComplete={variant === 'email' ? 'email' : variant === 'phone' ? 'tel' : undefined}
        placeholder={placeholder ?? (variant === 'email' ? 'nombre@dominio.com' : variant === 'phone' ? '+507 6000-0000' : undefined)}
        className={`${showError ? 'border-red-400 focus-visible:ring-red-300' : showSuccess ? 'border-emerald-400/70' : ''} ${className}`}
        aria-invalid={showError || undefined}
        {...rest}
      />
      {(showError || showSuccess) && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {showError ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
        </div>
      )}
      {showError && (
        <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  )
})
