"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk"

interface MultiSelectProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  onSearch?: (term: string) => void
  closeOnSelect?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className,
  disabled = false,
  onSearch,
  closeOnSelect = false
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = React.useState("")

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setInputValue("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <Command className="overflow-visible bg-transparent" shouldFilter={!onSearch}>
        <div
          className={cn(
            "group flex min-h-[48px] w-full items-center justify-between rounded-xl border-2 px-1 transition-all duration-200 outline-none cursor-pointer",
            open
              ? "border-green-600 ring-4 ring-green-600/10 bg-white"
              : "border-gray-100 bg-gray-50/50 hover:border-green-200 hover:bg-white shadow-sm",
            disabled && "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200"
          )}
          onClick={() => {
              if (!disabled) setOpen(true)
          }}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1.5 p-1.5 overflow-hidden">
             {selected.length > 0 ? (
                 selected.map((item) => (
                    <Badge variant="secondary" key={item} className="mr-1 mb-1 bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
                      {item}
                      <button
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUnselect(item)
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            handleUnselect(item)
                        }}
                      >
                        <X className="h-3 w-3 text-green-600 hover:text-green-800" />
                      </button>
                    </Badge>
                  ))
             ) : (
                <div className="flex items-center gap-2 px-1.5 text-gray-400">
                    <div className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors",
                         open ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-400 group-hover:bg-green-100 group-hover:text-green-500"
                    )}>
                       <Search className="h-3.5 w-3.5" />
                    </div>
                </div>
             )}
          
          <CommandInput
            placeholder={selected.length === 0 ? placeholder : ""}
            value={inputValue}
            onValueChange={(val) => {
                 setInputValue(val)
                 if (onSearch) onSearch(val)
                 if (!open) setOpen(true)
            }}
            onFocus={() => {
                if(!disabled) setOpen(true)
            }}
            disabled={disabled}
            className="flex-1 bg-transparent text-base font-medium outline-none placeholder:text-gray-400 border-none focus:ring-0 disabled:cursor-not-allowed min-w-[120px]"
          />
         </div>
         
         <div className="flex items-center gap-1 pr-2">
             {selected.length > 0 && !disabled && (
                  <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange([])
                    setInputValue("")
                  }}
                  className="p-1 text-gray-300 hover:text-gray-500 rounded-full hover:bg-gray-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
             )}
             {!disabled && (
                <ChevronsUpDown className={cn(
                    "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
                    open && "rotate-180 text-green-600"
                )} />
             )}
         </div>

        </div>

        {open && (
           <div className="absolute left-0 right-0 top-full z-[9999] mt-2 max-h-[260px] overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
            <CommandList className="max-h-[210px] overflow-y-auto overflow-x-hidden pt-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              <CommandEmpty className="py-6 text-center text-sm text-gray-500">No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(
                        selected.includes(option)
                          ? selected.filter((item) => item !== option)
                          : [...selected, option]
                      )
                      setInputValue("")
                      if (closeOnSelect) setOpen(false)
                    }}
                    className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors",
                        "hover:bg-green-50 hover:text-green-700 data-[selected=true]:bg-green-50 data-[selected=true]:text-green-700",
                        selected.includes(option) ? "bg-green-50 text-green-700" : "text-gray-700"
                    )}
                  >
                    <span className="truncate">{option}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4 shrink-0 text-green-600",
                        selected.includes(option) ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="mt-2 border-t border-gray-50 pt-2 px-1 pb-1">
                <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
                    {selected.length} Selected
                </p>
             </div>
          </div>
        )}
      </Command>
    </div>
  )
}
