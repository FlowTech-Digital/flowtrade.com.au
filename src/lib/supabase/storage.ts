import { createClient } from './client'

const LOGO_BUCKET = 'logos'
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']

export type UploadResult = {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload organization logo to Supabase Storage
 * @param file - File to upload
 * @param orgId - Organization ID (used as folder name)
 * @returns Upload result with public URL or error
 */
export async function uploadLogo(file: File, orgId: string): Promise<UploadResult> {
  const supabase = createClient()
  if (!supabase) {
    return { success: false, error: 'Storage not available' }
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      success: false, 
      error: `Invalid file type. Allowed: PNG, JPG, SVG, WebP` 
    }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      success: false, 
      error: `File too large. Maximum size: 2MB` 
    }
  }

  // Generate unique filename with timestamp
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const timestamp = Date.now()
  const filePath = `${orgId}/logo-${timestamp}.${ext}`

  try {
    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Replace if exists
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: uploadError.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(filePath)

    return { 
      success: true, 
      url: urlData.publicUrl 
    }
  } catch (err) {
    console.error('Storage error:', err)
    return { 
      success: false, 
      error: 'Failed to upload file. Please try again.' 
    }
  }
}

/**
 * Delete organization logo from Supabase Storage
 * @param logoUrl - Full URL of the logo to delete
 * @param orgId - Organization ID
 * @returns Success status
 */
export async function deleteLogo(logoUrl: string, orgId: string): Promise<boolean> {
  const supabase = createClient()
  if (!supabase) return false

  try {
    // Extract file path from URL
    const url = new URL(logoUrl)
    const pathMatch = url.pathname.match(/\/logos\/(.+)$/)
    if (!pathMatch) return false

    const filePath = pathMatch[1]
    
    // Verify the file belongs to this org
    if (!filePath.startsWith(orgId + '/')) return false

    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove([filePath])

    return !error
  } catch {
    return false
  }
}

/**
 * Update organization logo_url in database
 * @param orgId - Organization ID
 * @param logoUrl - New logo URL (or null to remove)
 */
export async function updateOrgLogo(orgId: string, logoUrl: string | null): Promise<boolean> {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('organizations')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('id', orgId)

  return !error
}
