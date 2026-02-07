"use client"

import { MessageSquare, Users, Bell, Sparkles, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function MessagesPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] w-full">
      {/* Left Sidebar - Conversation List */}
      <div className="w-80 border-r bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </h1>
          </div>
          <Button className="w-full" disabled>
            <MessageSquare className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
              disabled
            />
          </div>
        </div>

        {/* Coming Soon Placeholder */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="relative mb-6 inline-block">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-400 flex items-center justify-center animate-pulse">
                <Sparkles className="h-3 w-3 text-amber-900" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Coming Soon!</h3>
            <p className="text-sm text-muted-foreground">
              Your conversations will appear here. Team messaging is on the way!
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Message Thread */}
      <div className="flex-1 flex flex-col bg-muted/30">
        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto border-dashed">
            <CardContent className="p-12 text-center">
              <div className="relative mb-6 inline-block">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto">
                  <MessageSquare className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-amber-400 flex items-center justify-center animate-pulse">
                  <Sparkles className="h-4 w-4 text-amber-900" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold mb-3">Team Messaging</h2>
              <p className="text-muted-foreground mb-8">
                Stay connected with your team right from the CRM. Direct messages and group conversations coming soon!
              </p>

              {/* Feature List */}
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Direct Messages</div>
                    <div className="text-xs text-muted-foreground">Chat one-on-one with teammates</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Group Conversations</div>
                    <div className="text-xs text-muted-foreground">Create team channels and groups</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Instant Notifications</div>
                    <div className="text-xs text-muted-foreground">Never miss an important message</div>
                  </div>
                </div>
              </div>

              {/* Preview Mockup */}
              <div className="mt-8 p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-background/50">
                <div className="text-xs text-muted-foreground mb-3 font-medium">Preview</div>
                <div className="space-y-2">
                  {/* Mock conversation 1 */}
                  <div className="flex items-center gap-2 p-2 rounded bg-background border text-left">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      JS
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate">John Smith</span>
                        <span className="text-[10px] text-muted-foreground ml-2">2m</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">Hey, the Johnson quote is ready...</p>
                    </div>
                  </div>
                  {/* Mock conversation 2 */}
                  <div className="flex items-center gap-2 p-2 rounded bg-background border text-left opacity-60">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      ST
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate">Sales Team</span>
                        <span className="text-[10px] text-muted-foreground ml-2">1h</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">Great job on closing the deal!</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
