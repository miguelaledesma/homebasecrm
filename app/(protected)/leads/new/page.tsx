"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type SourceType = "CALL_IN" | "WALK_IN" | "REFERRAL"
type LeadType = "FLOOR" | "KITCHEN" | "BATH" | "CARPET" | "PAINTING" | "LANDSCAPING" | "MONTHLY_YARD_MAINTENANCE" | "ROOFING" | "STUCCO" | "ADUS" | "OTHER"

export default function NewLeadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    // Customer info
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    sourceType: "CALL_IN" as SourceType,
    // Lead info
    leadTypes: [] as LeadType[],
    description: "",
    // Referral info
    referrerFirstName: "",
    referrerLastName: "",
    referrerPhone: "",
    referrerEmail: "",
  })
  
  const [referrerMatch, setReferrerMatch] = useState<{
    found: boolean
    isCustomer: boolean
    customer?: {
      id: string
      firstName: string
      lastName: string
      phone: string | null
      email: string | null
    }
  } | null>(null)
  const [searchingReferrer, setSearchingReferrer] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    // Validate: if OTHER is selected, description is required
    if (formData.leadTypes.includes("OTHER") && !formData.description.trim()) {
      setError("Description is required when 'Other' is selected")
      return
    }
    
    // Validate: at least one lead type must be selected
    if (formData.leadTypes.length === 0) {
      setError("Please select at least one work type")
      return
    }
    
    setLoading(true)

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create lead")
      }

      const data = await response.json()
      router.push(`/leads/${data.lead.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }
  
  const handleLeadTypeChange = (leadType: LeadType, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        leadTypes: [...formData.leadTypes, leadType],
      })
    } else {
      setFormData({
        ...formData,
        leadTypes: formData.leadTypes.filter((type) => type !== leadType),
      })
    }
  }
  
  // Search for referrer when phone or email changes
  const searchReferrer = useCallback(
    async (phone: string, email: string) => {
      if (!phone && !email) {
        setReferrerMatch(null)
        return
      }

      setSearchingReferrer(true)
      try {
        const params = new URLSearchParams()
        if (phone) params.append("phone", phone)
        if (email) params.append("email", email)

        const response = await fetch(`/api/referrers/search?${params.toString()}`)
        const data = await response.json()

        if (response.ok) {
          setReferrerMatch(data)
          // Auto-populate name if customer found
          if (data.found && data.isCustomer && data.customer) {
            setFormData((prev) => ({
              ...prev,
              referrerFirstName: data.customer.firstName,
              referrerLastName: data.customer.lastName,
            }))
          }
        } else {
          setReferrerMatch(null)
        }
      } catch (error) {
        console.error("Error searching referrer:", error)
        setReferrerMatch(null)
      } finally {
        setSearchingReferrer(false)
      }
    },
    []
  )

  // Debounced search for referrer
  useEffect(() => {
    if (formData.sourceType !== "REFERRAL") {
      setReferrerMatch(null)
      return
    }

    const timeoutId = setTimeout(() => {
      searchReferrer(formData.referrerPhone, formData.referrerEmail)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [formData.referrerPhone, formData.referrerEmail, formData.sourceType, searchReferrer])
  
  const leadTypeOptions: { value: LeadType; label: string }[] = [
    { value: "FLOOR", label: "Floor" },
    { value: "KITCHEN", label: "Kitchen" },
    { value: "BATH", label: "Bath" },
    { value: "CARPET", label: "Carpet" },
    { value: "PAINTING", label: "Painting" },
    { value: "LANDSCAPING", label: "Landscaping" },
    { value: "MONTHLY_YARD_MAINTENANCE", label: "Monthly Yard Maintenance" },
    { value: "ROOFING", label: "Roofing" },
    { value: "STUCCO", label: "Stucco" },
    { value: "ADUS", label: "ADU's" },
    { value: "OTHER", label: "Other" },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">New Lead</h1>
        <p className="text-sm md:text-base text-muted-foreground">Capture a new lead and customer information</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Enter the customer&apos;s contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine1: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine2: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) =>
                      setFormData({ ...formData, zip: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sourceType">Source Type *</Label>
                <Select
                  id="sourceType"
                  value={formData.sourceType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sourceType: e.target.value as SourceType,
                    })
                  }
                  required
                >
                  <option value="CALL_IN">Call In</option>
                  <option value="WALK_IN">Walk In</option>
                  <option value="REFERRAL">Referral</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Referral Information - Only show when sourceType is REFERRAL */}
          {formData.sourceType === "REFERRAL" && (
            <Card>
              <CardHeader>
                <CardTitle>Referrer Information</CardTitle>
                <CardDescription>
                  Who referred this customer? Enter phone or email to check if they&apos;re an existing customer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="referrerFirstName">Referrer First Name</Label>
                    <Input
                      id="referrerFirstName"
                      value={formData.referrerFirstName}
                      onChange={(e) =>
                        setFormData({ ...formData, referrerFirstName: e.target.value })
                      }
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="referrerLastName">Referrer Last Name</Label>
                    <Input
                      id="referrerLastName"
                      value={formData.referrerLastName}
                      onChange={(e) =>
                        setFormData({ ...formData, referrerLastName: e.target.value })
                      }
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="referrerPhone">Referrer Phone</Label>
                    <Input
                      id="referrerPhone"
                      type="tel"
                      value={formData.referrerPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, referrerPhone: e.target.value })
                      }
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="referrerEmail">Referrer Email</Label>
                    <Input
                      id="referrerEmail"
                      type="email"
                      value={formData.referrerEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, referrerEmail: e.target.value })
                      }
                      placeholder="referrer@example.com"
                    />
                  </div>
                </div>

                {/* Show referrer match status */}
                {formData.referrerPhone || formData.referrerEmail ? (
                  <div className="mt-2">
                    {searchingReferrer ? (
                      <p className="text-sm text-muted-foreground">Searching...</p>
                    ) : referrerMatch?.found && referrerMatch?.isCustomer ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-3 rounded-md">
                        <span>✓</span>
                        <span>
                          Found as existing customer:{" "}
                          <strong>
                            {referrerMatch.customer?.firstName}{" "}
                            {referrerMatch.customer?.lastName}
                          </strong>
                        </span>
                      </div>
                    ) : referrerMatch?.found === false ? (
                      <p className="text-sm text-muted-foreground">
                        New referrer (not in system)
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enter phone or email to check if referrer is an existing customer
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
              <CardDescription>What are they here for?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Work Type *</Label>
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {leadTypeOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`leadType-${option.value}`}
                          checked={formData.leadTypes.includes(option.value)}
                          onChange={(e) =>
                            handleLeadTypeChange(option.value, e.target.checked)
                          }
                        />
                        <Label
                          htmlFor={`leadType-${option.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="description">
                  Description
                  {formData.leadTypes.includes("OTHER") && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  placeholder="Additional details about the lead..."
                  required={formData.leadTypes.includes("OTHER")}
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Lead"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

