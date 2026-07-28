"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useLeads } from "@/hooks/use-leads"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { BackButton } from "@/components/back-button"
import { Plus, Search, Eye, Phone, MessageSquare, Calendar, AlertTriangle, TrendingUp } from "lucide-react"
import type { Lead, LeadSource, LeadStatus } from "@/types/lead"

export default function LeadsPage() {
  const { user, isLoading, hasPermission, getAllUsers } = useAuth()
  const { leads, stats, createLead, updateLead, assignLead, addRemark, scheduleFollowUp, searchLeads } = useLeads()
  const router = useRouter()
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterSource, setFilterSource] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [remarkText, setRemarkText] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")

  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("leads.view"))) {
      router.push("/dashboard")
    }
  }, [user, isLoading, hasPermission, router])

  useEffect(() => {
    let filtered = leads

    // Filter by company if not admin
    if (user && !user.permissions.includes("all")) {
      filtered = filtered.filter((lead) => lead.company === user.company)
    }

    // Filter by assigned agent if sales agent
    if (user?.role === "sales_agent") {
      filtered = filtered.filter((lead) => lead.assignedTo === user.id)
    }

    // Apply search
    if (searchTerm) {
      filtered = searchLeads(searchTerm)
    }

    // Apply filters
    if (filterStatus !== "all") {
      filtered = filtered.filter((lead) => lead.status === filterStatus)
    }
    if (filterSource !== "all") {
      filtered = filtered.filter((lead) => lead.source === filterSource)
    }
    if (filterPriority !== "all") {
      filtered = filtered.filter((lead) => lead.priority === filterPriority)
    }

    setFilteredLeads(filtered)
  }, [leads, searchTerm, filterStatus, filterSource, filterPriority, user, searchLeads])

  const getStatusColor = (status: LeadStatus) => {
    const colors = {
      new: "bg-blue-100 text-blue-800",
      assigned: "bg-yellow-100 text-yellow-800",
      contacted: "bg-green-100 text-green-800",
      follow_up: "bg-orange-100 text-orange-800",
      converted: "bg-emerald-100 text-emerald-800",
      cold: "bg-gray-100 text-gray-800",
      not_connected: "bg-red-100 text-red-800",
      delayed: "bg-purple-100 text-purple-800",
      untouched: "bg-slate-100 text-slate-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    }
    return colors[priority] || "bg-gray-100 text-gray-800"
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user || !hasPermission("leads.view")) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Lead Management</h1>
            <p className="text-muted-foreground">Manage and track your leads</p>
          </div>
          {hasPermission("leads.create") && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Lead</DialogTitle>
                  <DialogDescription>Add a new lead to the system</DialogDescription>
                </DialogHeader>
                <LeadForm
                  onSubmit={async (leadData) => {
                    await createLead(leadData)
                    setIsCreateDialogOpen(false)
                  }}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.conversionRate.toFixed(1)}% conversion rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Leads</CardTitle>
              <Badge variant="secondary">{stats.new}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.new}</div>
              <p className="text-xs text-muted-foreground">Awaiting assignment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follow Ups</CardTitle>
              <Badge variant="outline">{stats.followUp}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.followUp}</div>
              <p className="text-xs text-muted-foreground">Pending follow up</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <Badge variant="default">{stats.converted}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.converted}</div>
              <p className="text-xs text-muted-foreground">Successfully closed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">TAT Breached</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.tatBreached}</div>
              <p className="text-xs text-muted-foreground">Over 4 hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="google_ads">Google Ads</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="walk_in">Walk In</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Results</Label>
                <div className="text-2xl font-bold">{filteredLeads.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leads ({filteredLeads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Details</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className={lead.tatBreached ? "bg-red-50" : ""}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {lead.name}
                          {lead.isDuplicate && (
                            <Badge variant="destructive" className="text-xs">
                              Duplicate
                            </Badge>
                          )}
                          {lead.tatBreached && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground">{lead.email}</div>
                        <div className="text-sm text-muted-foreground">{lead.phone}</div>
                        <Badge variant="outline" className="text-xs">
                          {lead.company}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {lead.source.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(lead.priority)}>{lead.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.status)}>{lead.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {lead.assignedTo ? (
                        <div className="text-sm">
                          {getAllUsers().find((u) => u.id === lead.assignedTo)?.name || "Unknown"}
                        </div>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{new Date(lead.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLead(lead)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {hasPermission("calls.make") && (
                          <Button variant="ghost" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Lead Details Dialog */}
        {selectedLead && (
          <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Lead Details - {selectedLead.name}</DialogTitle>
                <DialogDescription>
                  {selectedLead.company} • {selectedLead.source} • Created{" "}
                  {new Date(selectedLead.createdAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Contact Information</Label>
                    <div className="space-y-1 text-sm">
                      <div>Email: {selectedLead.email}</div>
                      <div>Phone: {selectedLead.phone}</div>
                      {selectedLead.location && <div>Location: {selectedLead.location}</div>}
                    </div>
                  </div>
                  <div>
                    <Label>Lead Status</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Badge className={getPriorityColor(selectedLead.priority)}>
                          {selectedLead.priority} Priority
                        </Badge>
                        <Badge className={getStatusColor(selectedLead.status)}>
                          {selectedLead.status.replace("_", " ")}
                        </Badge>
                      </div>
                      {selectedLead.nextFollowUpAt && (
                        <div className="text-sm text-muted-foreground">
                          Next follow-up: {new Date(selectedLead.nextFollowUpAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedLead.requirements && (
                  <div>
                    <Label>Requirements</Label>
                    <p className="text-sm text-muted-foreground">{selectedLead.requirements}</p>
                  </div>
                )}

                <div>
                  <Label>Remarks ({selectedLead.remarks.length})</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedLead.remarks.map((remark, index) => (
                      <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                        {remark}
                      </div>
                    ))}
                  </div>
                </div>

                {hasPermission("leads.edit") && (
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label htmlFor="remark">Add Remark</Label>
                      <div className="flex gap-2">
                        <Textarea
                          id="remark"
                          placeholder="Add a remark..."
                          value={remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                        />
                        <Button
                          onClick={async () => {
                            if (remarkText.trim()) {
                              await addRemark(selectedLead.id, remarkText)
                              setRemarkText("")
                            }
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="followUp">Schedule Follow-up</Label>
                      <div className="flex gap-2">
                        <Input
                          id="followUp"
                          type="datetime-local"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                        <Button
                          onClick={async () => {
                            if (followUpDate) {
                              await scheduleFollowUp(selectedLead.id, followUpDate)
                              setFollowUpDate("")
                            }
                          }}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}

interface LeadFormProps {
  onSubmit: (leadData: Omit<Lead, "id" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
}

function LeadForm({ onSubmit, onCancel }: LeadFormProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: user?.company || ("KAPPL" as "KAPPL" | "KTAHV"),
    source: "website" as LeadSource,
    requirements: "",
    location: "",
    category: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      priority: "medium",
      urgency: "normal",
      status: "new",
      remarks: [],
      isDuplicate: false,
      tatBreached: false,
      tags: [],
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select
            value={formData.source}
            onValueChange={(value: LeadSource) => setFormData((prev) => ({ ...prev, source: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="google_ads">Google Ads</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="walk_in">Walk In</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements">Requirements</Label>
        <Textarea
          id="requirements"
          value={formData.requirements}
          onChange={(e) => setFormData((prev) => ({ ...prev, requirements: e.target.value }))}
          placeholder="Describe the lead's requirements..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Lead</Button>
      </div>
    </form>
  )
}
