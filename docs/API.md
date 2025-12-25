# FlowTrade API Reference

API endpoints and usage documentation.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limits](#rate-limits)

---

## Overview

### Base URL

```
https://flowtrade.com.au/api
```

### Request Format

All requests use JSON:

```http
Content-Type: application/json
```

### Response Format

All responses return JSON:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

---

## Authentication

### Method

Supabase Auth with session cookies.

### Protected Endpoints

All `/api/*` endpoints require authentication except:
- `/api/health`
- `/api/auth/*`

### Session Validation

```typescript
// Server-side session check
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const supabase = createServerClient(...)
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // Continue with authenticated request
}
```

---

## Endpoints

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-25T10:00:00Z"
  }
}
```

---

### Authentication

#### Send Magic Link

```http
POST /api/auth/magic-link
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Magic link sent"
  }
}
```

#### Sign Out

```http
POST /api/auth/signout
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Signed out"
  }
}
```

---

### Quotes

#### List Quotes

```http
GET /api/quotes
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| customer_id | uuid | Filter by customer |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response:**
```json
{
  "success": true,
  "data": {
    "quotes": [
      {
        "id": "uuid",
        "quote_number": "Q-2025-001",
        "customer": { "id": "uuid", "name": "John Doe" },
        "status": "sent",
        "total": 1500.00,
        "created_at": "2025-12-20T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

#### Get Quote

```http
GET /api/quotes/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "quote_number": "Q-2025-001",
    "customer": { ... },
    "line_items": [ ... ],
    "subtotal": 1363.64,
    "tax": 136.36,
    "total": 1500.00,
    "status": "sent",
    "valid_until": "2025-01-20",
    "notes": "..."
  }
}
```

#### Create Quote

```http
POST /api/quotes
```

**Request:**
```json
{
  "customer_id": "uuid",
  "line_items": [
    {
      "description": "Labor - 4 hours",
      "quantity": 4,
      "unit_price": 85.00
    }
  ],
  "valid_days": 30,
  "notes": "Quote notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "quote_number": "Q-2025-002"
  }
}
```

#### Update Quote

```http
PUT /api/quotes/:id
```

**Request:**
```json
{
  "line_items": [ ... ],
  "notes": "Updated notes"
}
```

#### Send Quote

```http
POST /api/quotes/:id/send
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Quote sent to customer@example.com"
  }
}
```

---

### Customers

#### List Customers

```http
GET /api/customers
```

#### Get Customer

```http
GET /api/customers/:id
```

#### Create Customer

```http
POST /api/customers
```

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "0412345678",
  "address": {
    "street": "123 Main St",
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000"
  }
}
```

#### Update Customer

```http
PUT /api/customers/:id
```

---

### Jobs

#### List Jobs

```http
GET /api/jobs
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| assigned_to | uuid | Filter by technician |
| date | string | Filter by scheduled date |

#### Get Job

```http
GET /api/jobs/:id
```

#### Create Job

```http
POST /api/jobs
```

**Request:**
```json
{
  "customer_id": "uuid",
  "quote_id": "uuid",
  "assigned_to": "uuid",
  "scheduled_date": "2025-12-30",
  "scheduled_time": "09:00",
  "estimated_duration": "2 hours",
  "description": "Job description"
}
```

#### Update Job Status

```http
PATCH /api/jobs/:id/status
```

**Request:**
```json
{
  "status": "completed"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { ... }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid input |
| CONFLICT | 409 | Resource conflict |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limits

### Limits

| Endpoint | Limit |
|----------|-------|
| `/api/auth/*` | 10 requests/minute |
| `/api/quotes/*` | 100 requests/minute |
| `/api/jobs/*` | 100 requests/minute |
| All others | 200 requests/minute |

### Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1735125600
```

### Rate Limited Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retry_after": 60
  }
}
```

---

© 2025 FlowTech AI PTY LTD
