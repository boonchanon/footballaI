"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export function SearchInput({ placeholder }: { placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input placeholder={placeholder} className="pl-10 h-12 text-base" />
    </div>
  )
}
