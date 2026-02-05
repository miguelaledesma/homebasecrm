"use client"

import { X, MessageSquare, Users, Bell, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

type MessagesPanelProps = {
  onClose: () => void
}

export function MessagesPanel({ onClose }: MessagesPanelProps) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 md:w-96 max-w-sm rounded-md border bg-background shadow-lg z-50">
      {/* Header */}
      <div className="p-3 md:p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="p-6 flex flex-col items-center text-center">
        {/* Animated Icon */}
        <div className="relative mb-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-400 flex items-center justify-center animate-pulse">
            <Sparkles className="h-3 w-3 text-amber-900" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Coming Soon!
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6">
          Team messaging is on the way. Stay connected with your colleagues right from the CRM.
        </p>

        {/* Feature List */}
        <div className="w-full space-y-3 text-left">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium">Direct Messages</div>
              <div className="text-xs text-muted-foreground">Chat one-on-one with teammates</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-medium">Group Conversations</div>
              <div className="text-xs text-muted-foreground">Create team channels and groups</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Bell className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm font-medium">Instant Notifications</div>
              <div className="text-xs text-muted-foreground">Never miss an important message</div>
            </div>
          </div>
        </div>

        {/* Preview Mockup */}
        <div className="w-full mt-6 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
          <div className="text-xs text-muted-foreground mb-2 font-medium">Preview</div>
          <div className="space-y-2">
            {/* Mock conversation 1 */}
            <div className="flex items-center gap-2 p-2 rounded bg-background border">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-medium">
                JS
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">John Smith</span>
                  <span className="text-[10px] text-muted-foreground">2m</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Hey, the Johnson quote is ready...</p>
              </div>
            </div>
            {/* Mock conversation 2 */}
            <div className="flex items-center gap-2 p-2 rounded bg-background border opacity-60">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-medium">
                ST
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">Sales Team</span>
                  <span className="text-[10px] text-muted-foreground">1h</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Great job on closing the deal!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
