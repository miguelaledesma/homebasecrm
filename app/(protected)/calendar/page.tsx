import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CalendarContent } from "./CalendarContent"

export default async function CalendarPage() {
  const session = await getServerSession(authOptions)

  // Only admins can access this page
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return <CalendarContent />
}
