// FlowTrade Customer Types
// Sprint 3 Phase 3A - Customer Management

export interface Customer {
  id: string
  user_id: string
  
  // Basic Info
  business_name: string
  contact_name: string
  email: string | null
  phone: string | null
  
  // Address
  address_line1: string | null
  address_line2: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  country: string
  
  // Business Details
  abn: string | null
  notes: string | null
  
  // Metadata
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
}

export interface CustomerFormData {
  business_name: string
  contact_name: string
  email: string
  phone: string
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
  business_name: string
  contact_name: string
  email?: string | null
  phone?: string | null
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
