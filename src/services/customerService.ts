// FlowTrade Customer Service
// Sprint 3 Phase 3A - Customer Management CRUD Operations

import { createClient } from '@/lib/supabase/client'
import type { Customer, CreateCustomerData, UpdateCustomerData } from '@/types/customer'

const supabase = createClient()

export const customerService = {
  // Get all customers for current user
  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .neq('status', 'archived')
      .order('business_name', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Get single customer by ID
  async getCustomer(id: string): Promise<Customer | null> {
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
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('customers')
      .insert({
        ...customerData,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update existing customer
  async updateCustomer(id: string, customerData: UpdateCustomerData): Promise<Customer> {
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
    const { error } = await supabase
      .from('customers')
      .update({ status: 'archived' })
      .eq('id', id)

    if (error) throw error
  },

  // Hard delete customer (use with caution)
  async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Search customers by name
  async searchCustomers(query: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .neq('status', 'archived')
      .or(`business_name.ilike.%${query}%,contact_name.ilike.%${query}%`)
      .order('business_name', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Get customer count
  async getCustomerCount(): Promise<number> {
    const { count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'archived')

    if (error) throw error
    return count || 0
  },
}
