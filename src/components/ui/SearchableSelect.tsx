"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover"

// Shim for popover since we don't have Radix Primitives installed yet for Popover
// Wait, I should probably install radix-popover and cmdk properly or build a simple accessible one.
// Let's stick to a simple custom implementation if I don't want to install heavier deps, 
// BUT cmdk is great. I will assume we can install basic radix parts or just build a simple one.
// Actually, for speed and standard, I'll use a standard HTML datalist or a simple custom div-based one if dependencies are an issue.
// BUT the user asked for "searchable". 
// I will build a custom one using standard React state to avoid complex shadcn setup if I haven't set it all up.
// Actually, let's use a standard Select with search or a filtered list.

export function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select..." 
}: { 
  options: string[], 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string 
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  
  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative">
      <div 
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setOpen(!open)}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
            {value || placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
           <div className="sticky top-0 bg-white p-2 border-b">
              <input 
                autoFocus
                className="w-full p-1 text-sm border-none focus:outline-none"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           {filteredOptions.length === 0 ? (
             <div className="relative cursor-default select-none py-2 px-4 text-gray-700">No results found.</div>
           ) : (
             filteredOptions.map((option) => (
                <div
                  key={option}
                  className={cn(
                    "relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-green-100 cursor-pointer",
                    value === option ? "bg-green-50 text-green-900" : "text-gray-900"
                  )}
                  onClick={() => {
                    onChange(option)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <span className="block truncate">{option}</span>
                  {value === option && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-green-600">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
             ))
           )}
        </div>
      )}
      
      {/* Overlay to close */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}
