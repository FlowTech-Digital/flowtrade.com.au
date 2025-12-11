// FlowTrade Customer Service
// Updated: 2025-12-11 - Fixed column names to match database schema

import { createClient } from '@/lib/supabase/client'

// Types matching actual database schema
export interface Customer {
  id: string
  org_id: string
  customer_type: string
  company_name: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  mobile: string | null
  address_line1: string | null
  address_line2: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  street_address: string | null
  source: string | null
  notes: string | null
  tags: string[] | null
  status: string
  created_at: string
  updated_at: string
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
  notes?: string | null
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  status?: string
}

export const customerService = {
  // Get all customers for current org
  async getCustomers(): Promise<Customer[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .neq('status', 'archived')
      .order('company_name', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Get single customer by ID
  async getCustomer(id: string): Promise<Customer | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create new customer
  async createCustomer(customerData: CreateCustomerData): Promise<Customer> {
    const supabase = createClient()
    
    // Get user's org_id from users table
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    const { data, error } = await supabase
      .from('customers')
      .insert({
        ...customerData,
        org_id: userData?.org_id,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update existing customer
  async updateCustomer(id: string, customerData: UpdateCustomerData): Promise<Customer> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Soft delete (archive) customer
  async archiveCustomer(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .update({ status: 'archived' })
      .eq('id', id)

    if (error) throw error
  },

  // Hard delete customer (use with caution)
  async deleteCustomer(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Search customers by name
  async searchCustomers(query: string): Promise<Customer[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .neq('status', 'archived')
      .or(`company_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .order('company_name', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Get customer count
  async getCustomerCount(): Promise<number> {
    const supabase = createClient()
    const { count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'archived')

    if (error) throw error
    return count || 0
  },
}
