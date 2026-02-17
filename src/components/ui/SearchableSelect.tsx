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
  placeholder = "Select crop..." 
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "group flex h-12 w-full items-center justify-between rounded-xl border-2 px-4 py-2 transition-all duration-200 outline-none",
          open 
            ? "border-green-600 ring-4 ring-green-600/10 bg-white" 
            : "border-gray-100 bg-gray-50/50 hover:border-green-200 hover:bg-white shadow-sm"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors",
            value ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-400 group-hover:bg-green-100 group-hover:text-green-500"
          )}>
            <Search className="h-3.5 w-3.5" />
          </div>
          <span className={cn(
            "truncate text-sm font-medium transition-colors",
            value ? "text-gray-900" : "text-gray-400 group-hover:text-gray-500"
          )}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
          open && "rotate-180 text-green-600"
        )} />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[300px] overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
          <Command className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center border-b border-gray-50 px-3 pb-2 pt-1">
              <Search className="mr-2 h-4 w-4 shrink-0 text-gray-400" />
              <CommandInput
                placeholder={placeholder}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {open && (
                <button 
                  onClick={() => setOpen(false)}
                  className="ml-2 rounded-full p-1 text-gray-300 hover:bg-gray-50 hover:text-gray-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <CommandList className="max-h-[220px] overflow-y-auto overflow-x-hidden pt-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
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
          </Command>
          
          <div className="mt-2 border-t border-gray-50 pt-2 px-1 pb-1">
            <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
               {options.length} Varieties Available
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
