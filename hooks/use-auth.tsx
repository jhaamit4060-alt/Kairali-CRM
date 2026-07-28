"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { toast } from "sonner"

export type UserRole =
  | "super_admin"
  | "admin"
  | "general_manager"
  | "department_head"
  | "sales_manager"
  | "sales_agent"
  | "operation_manager"
  | "operation_staff"
  | "account_manager"
  | "account_staff"
  | "doctor"
  | "front_office"
  | "hr_manager"
  | "villa_raag_manager"

export type Department =
  | "Administration"
  | "Sales"
  | "Operations"
  | "Accounts"
  | "Medical"
  | "Front Office"
  | "HR"
  | "IT"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  department: Department
  company: "KAPPL" | "KTAHV"
  permissions: string[]
  employeeId: string
  phone: string
  joinDate: string
  isActive: boolean
  reportingTo?: string
  shift?: "morning" | "evening" | "night"
  targets?: {
    daily?: number
    weekly?: number
    monthly?: number
  }
  action?: Record<string, string>
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, company: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasActionPermission: (page: string, action: string) => boolean
  isLoading: boolean
  getAllUsers: () => User[]
  createUser: (userData: Omit<User, "id">) => Promise<void>
  updateUser: (id: string, userData: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  rolePermissions: Record<string, string[]>
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Your Google Apps Script URL - REPLACE WITH YOUR ACTUAL URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzDC3m9yUuTeCska7osn17tIxixwtEt-sN_7tFLi9f8Yb34l9qEcxPg1dCF5KCwvH-i/exec"
//"approvalAll", "collectionAll",
// Action permissions configuration
const actionPermissionsByPageByRole: Record<string, Record<string, string[]>> = {
  ktahvPage: {
    sales_agent: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf","arrivalFlightSelf", "departureFlightSelf"],
    sales_manager: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf","arrivalFlightSelf", "departureFlightSelf"],
    account_manager: ["viewAll", "accountsVerify"],
    operation_manager: ["viewAll", "approvalAll", "collectionAll", "foVerify"],
    fo_manager: ["viewAll", "collectionAll", "checkOutVerify"],
    superVisor: ["viewAll"],
  },
  villaRaagPage: {
    sales_agent: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
    sales_manager: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
    account_manager: ["viewAll", "accountsVerify"],
    operation_manager: ["viewAll", "approvalAll", "collectionAll", "foVerify"],
    villa_raag_manager: ["viewAll", "editAll", "manageAll"],
  },
  kapplPage: {
    sales_agent: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
    sales_manager: ["viewSelf", "editSelf", "cancelSelf", "approvalSelf", "collectionSelf"],
    account_manager: ["viewAll", "accountsVerify"],
    operation_manager: ["viewAll", "approvalAll", "collectionAll", "foVerify"],
  },
}

// Fallback permissions (used if API fails)
const fallbackRolePermissions: Record<string, string[]> = {
  super_admin: ["all"],
  admin: [
    "users.view", "users.create", "users.edit", "users.delete",
    "leads.view", "leads.edit", "leads.assign", "leads.delete",
    "calls.view", "calls.make", "calls.monitor",
    "reports.view", "reports.export", "reports.admin",
    "fms.view", "fms.edit", "fms.admin",
    "helpdesk.view", "helpdesk.admin",
    "performance.view", "performance.admin",
    "marketing.view", "marketing.admin",
    "employee.tools",
  ],
  general_manager: [
    "leads.view", "leads.assign",
    "calls.monitor",
    "reports.view", "reports.export",
    "fms.view", "fms.approve",
    "performance.view",
    "escalations.handle",
    "marketing.view",
    "employee.tools",
  ],
  department_head: [
    "leads.view", "leads.assign",
    "calls.monitor",
    "reports.view",
    "fms.view", "fms.approve",
    "performance.view",
    "team.manage",
    "marketing.view",
    "employee.tools",
  ],
  sales_manager: [
    "dashboard.view",
    "leads.view", "leads.edit", "leads.assign",
    "calls.view", "calls.make", "calls.monitor",
    "reports.view",
    "performance.view",
    "team.manage",
    "marketing.view",
    "employee.tools",
  ],
  sales_agent: [
    "dashboard.view",
    "leads.view", "leads.edit",
    "calls.make",
    "reports.view",
    "performance.view",
    "employee.tools",
    "fms.view",
    "team.view",
    "bookings.view",
  ],
  operation_manager: [
    "fms.view", "fms.edit", "fms.approve",
    "bookings.view", "bookings.edit",
    "reports.view",
    "performance.view",
    "team.manage",
    "employee.tools",
  ],
  operation_staff: [
    "dashboard.view",
    "fms.view", "fms.edit",
    "performance.view",
    "bookings.view",
    "reports.view",
    "employee.tools",
    "team.view",
  ],
  account_manager: [
    "payments.view", "payments.edit",
    "invoices.view", "invoices.create",
    "reports.view",
    "performance.view",
    "team.manage",
    "employee.tools",
  ],
  account_staff: [
    "dashboard.view",
    "fms.view",
    "payments.view", "payments.edit",
    "invoices.view",
    "reports.view",
    "employee.tools",
    "bookings.view",
    "team.view",
  ],
  doctor: [
    "consultations.view", "consultations.edit",
    "prescriptions.create",
    "reports.view",
    "employee.tools",
  ],
  front_office: [
    "bookings.view", "bookings.edit",
    "guests.view",
    "reports.view",
    "employee.tools",
  ],
  hr_manager: [
    "users.view", "users.create", "users.edit",
    "performance.view",
    "reports.view",
    "team.manage",
    "marketing.view",
    "employee.tools",
  ],
  villa_raag_manager: [
    "dashboard.view",
    "villa_raag.view", "villa_raag.edit", "villa_raag.manage",
    "fms.view",
  ],
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(fallbackRolePermissions)
  const [users, setUsers] = useState<User[]>([])

  // Load role permissions from Google Sheets
  const loadRolePermissions = async () => {
    try {
      const url = new URL(SCRIPT_URL)
      url.searchParams.append("action", "getRolePermissions")

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.success && data.rolePermissions) {
        setRolePermissions(data.rolePermissions)
        console.log("✅ Role permissions loaded from Google Sheets")

        // Cache the permissions
        localStorage.setItem("cached_role_permissions", JSON.stringify({
          data: data.rolePermissions,
          timestamp: Date.now()
        }))

        return data.rolePermissions
      } else {
        console.warn("⚠️ Failed to load permissions from sheet, using fallback")
        return fallbackRolePermissions
      }
    } catch (error) {
      console.error("❌ Error loading role permissions:", error)
      console.log("📌 Using fallback permissions")
      return fallbackRolePermissions
    }
  }

  // Refresh permissions manually
  const refreshPermissions = async () => {
    const newPermissions = await loadRolePermissions()

    // If user is logged in, update their permissions
    if (user && user.email) {
      const updatedUser = {
        ...user,
        permissions: newPermissions[user.email] || user.permissions
      }
      setUser(updatedUser)
      localStorage.setItem("kairali_user", JSON.stringify(updatedUser))
      toast.success("Permissions updated")
    }
  }

  // Initialize: Load permissions and user
  useEffect(() => {
    const initAuth = async () => {
      // Try to load cached permissions first (faster)
      const cached = localStorage.getItem("cached_role_permissions")
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          const cacheAge = Date.now() - timestamp
          const ONE_HOUR = 60 * 60 * 1000

          if (cacheAge < ONE_HOUR) {
            setRolePermissions(data)
            console.log("✅ Using cached role permissions")
          }
        } catch (e) {
          console.warn("⚠️ Failed to parse cached permissions")
        }
      }

      // Load fresh permissions in background
      loadRolePermissions()

      // Load stored user (UI state only — the real session lives in the HttpOnly
      // cookie set by /api/auth/login; this local copy just avoids a flash of
      // logged-out UI while middleware/API auth independently verify the cookie)
      const storedUser = localStorage.getItem("kairali_user")
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
        } catch (e) {
          console.error("Failed to parse stored user")
          localStorage.removeItem("kairali_user")
        }
      }

      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string, company: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, company }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        // Set permissions from dynamically loaded rolePermissions
        if (data.user.email && rolePermissions[data.user.email]) {
          data.user.permissions = rolePermissions[data.user.email]
        } else {
          // Fallback to permissions from server or empty array
          data.user.permissions = data.user.permissions || []
        }
        // if (data.user.role && rolePermissions[data.user.role]) {
        //   data.user.permissions = rolePermissions[data.user.role]
        // } else {
        //   // Fallback to permissions from server or empty array
        //   data.user.permissions = data.user.permissions || []
        // }

        data.user.action = data.user.action || {}

        setUser(data.user)
        localStorage.setItem("kairali_user", JSON.stringify(data.user))
        // Session cookie is set server-side (HttpOnly) by /api/auth/login — see lib/session.ts

        toast.success("Login successful")
      } else {
        throw new Error(data.message || "Invalid credentials or inactive account")
      }
    } catch (error: any) {
      console.error("Login error:", error)

      // ✅ User-friendly error message
      toast.error(
        error?.message === "Invalid credentials or inactive account"
          ? "You have entered wrong Id / Password"
          : error?.message || "Login failed"
      )

      throw error
    }

  }

  const logout = async () => {
    // HttpOnly session cookie can't be cleared by client JS — clear it server-side first.
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (e) {
      console.error("Logout API call failed:", e)
    }
    setUser(null)
    localStorage.removeItem("kairali_user")
    toast.success("Logged out successfully")
  }

  const hasPermission = (permission: string) => {
    if (!user) return false

    // Super admin has all permissions
    if (user.permissions.includes("all")) return true

    // Check if user has the specific permission
    // console.log(user.permissions, permission)
    return user.permissions.includes(permission)
  }

  const hasActionPermission = (page: string, action: string): boolean => {
    if (!user || !user.action) return false

    // Get the roles for this page (can be comma-separated)
    const pageRolesString = user.action[page]
    if (!pageRolesString) return false

    // Split by comma and trim whitespace
    const pageRoles = pageRolesString.indexOf(",") !== -1
      ? pageRolesString.split(',').map(role => role.trim())
      : [pageRolesString.trim()]

    // Get the page permissions configuration
    const pagePermissions = actionPermissionsByPageByRole[page as keyof typeof actionPermissionsByPageByRole]
    if (!pagePermissions) return false

    // Check if ANY of the user's roles for this page have the required permission
    return pageRoles.some(role => {
      const rolePermissionsForPage = pagePermissions[role as keyof typeof pagePermissions]
      return rolePermissionsForPage && rolePermissionsForPage.includes(action)
    })
  }

  const getAllUsers = () => {
    return users.filter((u) => user?.company === u.company || user?.permissions.includes("all"))
  }

  const createUser = async (userData: Omit<User, "id">) => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      permissions: rolePermissions[userData.email] || [],
    }
    setUsers((prev) => [...prev, newUser])
    toast.success("User created successfully")
  }

  const updateUser = async (id: string, userData: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
            ...u,
            ...userData,
            permissions: userData.email ? rolePermissions[userData.email] : u.permissions
          }
          : u,
      ),
    )
    toast.success("User updated successfully")
  }

  const deleteUser = async (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
    toast.success("User deleted successfully")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        hasPermission,
        hasActionPermission,
        isLoading,
        getAllUsers,
        createUser,
        updateUser,
        deleteUser,
        rolePermissions,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
