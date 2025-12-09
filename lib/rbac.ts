import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { UserRole } from "@prisma/client"
import { redirect } from "next/navigation"

export interface AuthUser {
  id: string
  email: string
  name?: string | null
  role: UserRole
}

/**
 * Get the current authenticated user
 * Throws if not authenticated
 */
export async function requireUser(): Promise<AuthUser> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return session.user as AuthUser
}

/**
 * Require the user to be an ADMIN
 * Throws if not authenticated or not admin
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser()

  if (user.role !== UserRole.ADMIN) {
    redirect("/dashboard")
  }

  return user
}

/**
 * Require the user to be a SALES_REP
 * Throws if not authenticated or not sales rep
 */
export async function requireSalesRep(): Promise<AuthUser> {
  const user = await requireUser()

  if (user.role !== UserRole.SALES_REP) {
    redirect("/dashboard")
  }

  return user
}

/**
 * Require the user to have one of the specified roles
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthUser> {
  const user = await requireUser()

  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard")
  }

  return user
}

