// FlowTrade Customer Types
// Updated: 2025-12-11 - Aligned with actual database schema

export interface Customer {
  id: string
  org_id: string
  
  // Basic Info
  customer_type: string
  company_name: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  mobile: string | null
  
  // Address
  address_line1: string | null
  address_line2: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  street_address: string | null
  
  // Business Details
  source: string | null
  abn: string | null
  notes: string | null
  tags: string[] | null
  country: string | null
  
  // Metadata
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
}

export interface CustomerFormData {
  company_name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  mobile: string
  address_line1: string
  address_line2: string
  suburb: string
  state: string
  postcode: string
  country: string
  abn: string
  notes: string
}

export interface CreateCustomerData {
  company_name: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
  address_line1?: string | null
  address_line2?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
  country?: string
  abn?: string | null
  notes?: string | null
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  status?: 'active' | 'inactive' | 'archived'
}

// Australian states for dropdown
export const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
] as const
