"use client"

import * as React from "react"
import { Check, Search, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk"

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Search value chains..." 
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = React.useState(value)

  // Sync internal input value with external value
  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setInputValue(value) // Reset to actual selected value on blur/close
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [value])

  return (
    <div className="relative w-full" ref={containerRef}>
      <Command className="overflow-visible bg-transparent">
        {/* Main Search Input / Trigger */}
        <div className={cn(
          "group flex h-12 w-full items-center justify-between rounded-xl border-2 px-1 transition-all duration-200 outline-none",
          open 
            ? "border-green-600 ring-4 ring-green-600/10 bg-white" 
            : "border-gray-100 bg-gray-50/50 hover:border-green-200 hover:bg-white shadow-sm"
        )}>
          <div className="flex flex-1 items-center gap-2 overflow-hidden px-3">
             <div className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors",
              open ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-400 group-hover:bg-green-100 group-hover:text-green-500"
            )}>
              <Search className="h-3.5 w-3.5" />
            </div>
            <CommandInput
              value={inputValue}
              onValueChange={(val) => {
                setInputValue(val)
                if (!open) setOpen(true)
              }}
              onFocus={() => {
                setOpen(true)
                setInputValue("") // Clear on focus to allow fresh search
              }}
              placeholder={placeholder}
              className="flex h-10 w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400 border-none focus:ring-0"
            />
          </div>
          
          <div className="flex items-center gap-1 pr-2">
            {inputValue && (
              <button 
                type="button"
                onClick={() => {
                  onChange("")
                  setInputValue("")
                }}
                className="p-1 text-gray-300 hover:text-gray-500 rounded-full hover:bg-gray-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
              open && "rotate-180 text-green-600"
            )} />
          </div>
        </div>

        {/* Dropdown Menu */}
        {open && (
          <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[260px] overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
            <CommandList className="max-h-[210px] overflow-y-auto overflow-x-hidden pt-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              <CommandEmpty className="py-6 text-center text-sm text-gray-500">
                No value chains found.
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(option)
                      setInputValue(option)
                      setOpen(false)
                    }}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors",
                      "hover:bg-green-50 hover:text-green-700 data-[selected=true]:bg-green-50 data-[selected=true]:text-green-700",
                      value === option ? "bg-green-50 text-green-700" : "text-gray-700"
                    )}
                  >
                    <span className="truncate">{option}</span>
                    {value === option && (
                      <Check className="ml-auto h-4 w-4 shrink-0 text-green-600" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            
            <div className="mt-2 border-t border-gray-50 pt-2 px-1 pb-1">
              <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
                 {options.length} Varieties Available
              </p>
            </div>
          </div>
        )}
      </Command>
    </div>
  )
}
