import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    // Read SVG from public folder
    const svgPath = join(process.cwd(), 'public', 'flowtrade-logo.svg')
    const svgContent = readFileSync(svgPath, 'utf-8')
    
    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    return new NextResponse('SVG not found', { status: 404 })
  }
}
