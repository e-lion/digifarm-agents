'use client'

import React from 'react'
import PhoneInputOriginal, { isValidPhoneNumber } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  error?: string
}

export function PhoneInput({ value, onChange, className, placeholder, error }: PhoneInputProps) {
  return (
    <div className={cn("relative", className)}>
      <PhoneInputOriginal
        defaultCountry="KE"
        flags={flags}
        international
        withCountryCallingCode
        value={value || undefined}
        onChange={(val) => onChange(val || '')}
        placeholder={placeholder}
        className={cn(
          "flex h-12 w-full rounded-xl border-2 bg-gray-50/50 px-3 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-within:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          error 
            ? "border-red-300 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10" 
            : "border-gray-100 hover:border-green-200 hover:bg-white focus-within:border-green-600 focus-within:ring-4 focus-within:ring-green-600/10"
        )}
        numberInputProps={{
          className: "flex-1 bg-transparent border-none focus:ring-0 p-0 outline-none text-gray-900 placeholder:text-gray-400 h-full ml-2"
        }}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export { isValidPhoneNumber }
