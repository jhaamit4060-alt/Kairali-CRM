"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface BackButtonProps {
  className?: string
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

export function BackButton({ className = "", variant = "outline", size = "sm" }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  return (
    <Button onClick={handleBack} variant={variant} size={size} className={className}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  )
}
