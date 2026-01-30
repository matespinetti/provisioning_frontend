# Sona Business Provisioning API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
   - [2.1 Client Authentication (JWT)](#21-client-authentication-jwt)
   - [2.2 PMNL Authentication (Behind the Scenes)](#22-pmnl-authentication-behind-the-scenes)
3. [Endpoints](#endpoints)
   - [3.1 Authentication Endpoints](#31-authentication-endpoints)
   - [3.2 Subscriber Management](#32-subscriber-management)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limits](#rate-limits)
7. [Changelog](#changelog)

---

## 1. Overview

The Sona Business Provisioning API is a FastAPI-based gateway that provides secure access to mobile subscriber provisioning functionality powered by the PMNL v5 API. This API acts as an intermediary layer, handling authentication, validation, and request forwarding to the upstream PMNL provisioning system.

**Key Features:**
- JWT-based user authentication
- Comprehensive request validation
- Asynchronous request processing support
- Transparent OAuth2 + API key authentication to PMNL
- RESTful API design following modern best practices
- Complete audit logging for compliance and debugging
- Secure error handling with sanitized responses

**Target Audience:**
- Developers integrating client applications with the provisioning system
- System administrators managing subscriber lifecycle
- Partners requiring programmatic access to subscriber management

**Related Documentation:**
- [PMNL v5 Quick-Start Guide](pmnl-guide.md) - PMNL API authentication details
- [Migration Guide](MIGRATION_GUIDE.md) - v4 to v5 migration information
- [API Specification](API_SPECIFICATION.md) - Legacy v4 specification (for reference)

---

## 2. Authentication

The API implements a two-layer authentication architecture to ensure security at both the client and upstream service levels.

### 2.1 Client Authentication (JWT)

All API requests (except registration and login) require a valid JWT (JSON Web Token) for authentication.

#### How to Obtain a JWT Token

**Step 1: Register a User**

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_secure_password"
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "your_username",
  "is_active": true,
  "created_at": "2025-01-29T10:30:00Z"
}
```

**Step 2: Login**

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "your_username"
  }
}
```

#### Using the JWT Token

Include the access token in the `Authorization` header of all subsequent requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Token Lifecycle

- **Access Token Expiration**: Access tokens expire after **1 hour**
- **Refresh Token Expiration**: Refresh tokens expire after **7 days**
- **Refresh Mechanism**: Use the refresh token to obtain new access tokens via `/api/auth/refresh`
- **Handling Expiry**: When an access token expires (401 response), use your refresh token to get a new one
- **Session Management**: Logout invalidates the refresh token via `/api/auth/logout`

#### Token Format

**Access Token JWT Claims:**
- `sub`: User ID (UUID)
- `username`: Username string
- `exp`: Expiration timestamp (1 hour from issuance)
- `iat`: Issued at timestamp

**Refresh Token JWT Claims:**
- `sub`: User ID (UUID)
- `jti`: Unique token identifier (JWT ID)
- `type`: Token type ("refresh")
- `exp`: Expiration timestamp (7 days from issuance)
- `iat`: Issued at timestamp

### 2.2 PMNL Authentication (Behind the Scenes)

**Note:** This authentication is completely transparent to API clients. It's handled automatically by our API when forwarding requests to PMNL.

#### How It Works

When you make an authenticated request to our API, the following happens automatically:

1. Our API validates your JWT token
2. Our API obtains an OAuth2 access token from the PMNL authorization server (cached for efficiency)
3. Our API forwards your request to PMNL with both:
   - `Authorization: Bearer <oauth2_access_token>`
   - `x-api-key: <pmnl_api_key>`
4. PMNL processes the request and returns a response
5. Our API forwards the response back to you

#### OAuth2 Client Credentials Flow

The API uses the **OAuth2 Client Credentials Grant** to authenticate with PMNL:

- **Token Endpoint**: `https://auth.api.pmfactory.eu/oauth2/token`
- **Grant Type**: `client_credentials`
- **Token Lifetime**: Typically 1 hour (varies by PMNL configuration)
- **Caching**: Tokens are cached with a 30-second buffer before expiry
- **Thread Safety**: Token refresh uses async locks to prevent concurrent requests

#### Security Benefits

This dual-authentication approach provides:
- **Credential Isolation**: PMNL credentials are never exposed to clients
- **Token Management**: Automatic token refresh without client intervention
- **Audit Trail**: User actions are tracked via JWT identity
- **Security Layers**: Both user-level and service-level authentication

#### Authentication Flow Diagram

```
┌─────────────────┐
│ Client App      │
└────────┬────────┘
         │ (1) POST /auth/login
         │     username + password
         ▼
┌─────────────────────────┐
│ Sona Provisioning API   │
└────────┬────────────────┘
         │ (2) Validate credentials
         │     Query PostgreSQL
         │
         │ (3) Return JWT token
         ▼
┌─────────────────┐
│ Client App      │
└────────┬────────┘
         │ (4) POST /api/v1/subscribers
         │     Authorization: Bearer <JWT>
         ▼
┌─────────────────────────┐
│ Sona Provisioning API   │
└────────┬────────────────┘
         │ (5) Verify JWT
         │ (6) Get OAuth2 token (cached)
         ▼
┌─────────────────────────┐
│ PMNL OAuth2 Server      │
└────────┬────────────────┘
         │ (7) Return access_token
         ▼
┌─────────────────────────┐
│ Sona Provisioning API   │
└────────┬────────────────┘
         │ (8) POST /subscribers
         │     Authorization: Bearer <OAuth2>
         │     x-api-key: <API_KEY>
         ▼
┌─────────────────────────┐
│ PMNL v5 API             │
└────────┬────────────────┘
         │ (9) Process request
         │ (10) Return 200/202
         ▼
┌─────────────────────────┐
│ Sona Provisioning API   │
└────────┬────────────────┘
         │ (11) Forward response
         ▼
┌─────────────────┐
│ Client App      │
└─────────────────┘
```

---

## 3. Endpoints

### 3.1 Authentication Endpoints

#### POST /api/auth/register

Create a new user account.

**Authentication Required:** No

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required, min 8 characters)"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "username": "string",
  "is_active": true,
  "created_at": "iso8601_datetime"
}
```

**Error Responses:**
- `409 Conflict`: Username already exists
- `422 Validation Error`: Invalid request format

---

#### POST /api/auth/login

Authenticate and receive a JWT token.

**Authentication Required:** No

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "username": "string"
  }
}
```

**Response Fields:**
- `success`: Boolean indicating success
- `access_token`: JWT token for API requests (1 hour validity)
- `refresh_token`: JWT token for obtaining new access tokens (7 day validity)
- `expires_in`: Access token expiration time in seconds (3600 = 1 hour)
- `user`: User information object

**Error Responses:**
- `400 Bad Request`: Invalid username or password
- `422 Validation Error`: Invalid request format

---

#### POST /api/auth/refresh

Get a new access token using a valid refresh token.

**Authentication Required:** No (uses refresh token in request body)

**Request Body:**
```json
{
  "refresh_token": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

**Response Fields:**
- `success`: Boolean indicating success
- `access_token`: New JWT access token (1 hour validity)
- `expires_in`: Token expiration time in seconds

**Error Responses:**
- `401 Unauthorized`: Invalid, expired, or revoked refresh token

**Usage Example:**
```bash
curl -X POST http://localhost:8000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

**Best Practices:**
- Store refresh tokens securely (encrypted storage, secure cookies)
- Use the refresh endpoint proactively before access token expires
- Handle 401 errors by prompting user to re-authenticate
- Never expose refresh tokens in URLs or logs

---

#### POST /api/auth/logout

Logout by revoking a refresh token.

**Authentication Required:** Yes (JWT Bearer token)

**Request Body:**
```json
{
  "refresh_token": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "msg": "Logged out successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid token format
- `401 Unauthorized`: Missing or invalid access token in Authorization header
- `404 Not Found`: Token not found or already revoked

**Usage Example:**
```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

**Security Notes:**
- Logout invalidates the refresh token in the database
- The access token remains valid until expiration (cannot be revoked)
- For complete logout, client should also discard the access token
- Maximum 5 active refresh tokens per user (oldest auto-revoked)

---

### 3.2 Audit Log Endpoints

#### GET /api/v1/audit

Retrieve paginated audit logs for the authenticated user.

**Authentication Required:** Yes (JWT Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `skip` | integer | No | 0 | Number of records to skip for pagination |
| `limit` | integer | No | 100 | Max records to return (max: 1000) |
| `operation` | string | No | - | Filter by operation type |
| `resource_type` | string | No | - | Filter by resource type (subscriber, request) |
| `status` | string | No | - | Filter by status (success, failed) |
| `resource_id` | string | No | - | Filter by resource ID (ICCID, request_id) |
| `from_date` | ISO 8601 | No | - | Start date for filtering |
| `to_date` | ISO 8601 | No | - | End date for filtering |
| `sort_order` | string | No | desc | Sort direction (asc, desc) |

**Operation Values:**
- `CREATE` - Subscriber creation
- `READ` - Subscriber read
- `UPDATE_AOR` - AOR settings update
- `UPDATE_STATE` - Subscriber state change
- `UPDATE_APN` - APN settings update
- `UPDATE_NETWORK_ACCESS_LIST` - Network access zones update
- `UPDATE_CREDIT` - Credit settings update
- `UPDATE_BLOCK_DATA_USAGE` - Data blocking change
- `DELETE` - Subscriber deletion

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "username": "john_doe",
      "operation": "CREATE",
      "resource_type": "subscriber",
      "resource_id": "89312400000001715969",
      "status": "success",
      "request_body": {
        "iccid": "89312400000001715969",
        "msisdn": "31658011998",
        "aor": {
          "domain_id": 84,
          "auth_username": "+31658011998",
          "auth_password": "[REDACTED]"
        }
      },
      "response_status": "202",
      "error_message": null,
      "created_at": "2026-01-30T14:30:00Z"
    }
  ],
  "total": 42,
  "skip": 0,
  "limit": 100
}
```

**Example Requests:**

```bash
# Get latest 50 audit logs
curl -X GET "http://localhost:8000/api/v1/audit?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get failed operations only
curl -X GET "http://localhost:8000/api/v1/audit?status=failed" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get CREATE operations for specific ICCID
curl -X GET "http://localhost:8000/api/v1/audit?operation=CREATE&resource_id=89312400000001715969" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get audit logs from last 7 days
curl -X GET "http://localhost:8000/api/v1/audit?from_date=2026-01-23T00:00:00Z&to_date=2026-01-30T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Pagination: get next page
curl -X GET "http://localhost:8000/api/v1/audit?skip=100&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Security Notes:**
- Users can only view their own audit logs
- Sensitive fields (passwords, tokens, secrets) are automatically redacted from `request_body`
- Original unredacted data remains in database for admin/debugging purposes

**Performance Considerations:**
- Date range filtering recommended for large audit log datasets
- Maximum limit of 1000 records per request
- Queries optimized using database indexes on: user_id, operation, resource_type, status, created_at

---

### 3.3 Subscriber Management

**Endpoint summary (synchronous by default):**

- `POST /api/v1/subscribers` — create subscriber (set `queue_request=true` to process async)
- `GET /api/v1/subscribers/{id}` — read by ICCID or MSISDN
- `PATCH /api/v1/subscribers/{id}/aor` — update AOR settings
- `PATCH /api/v1/subscribers/{id}/state` — activate/deactivate subscriber
- `PATCH /api/v1/subscribers/{id}/apn` — update APN settings
- `PATCH /api/v1/subscribers/{id}/network-access-list` — update zone access
- `PATCH /api/v1/subscribers/{id}/credit` — update credit limit
- `PATCH /api/v1/subscribers/{id}/block-data-usage` — block/unblock roaming data
- `DELETE /api/v1/subscribers/{id}` — delete subscriber

**Legacy facade (kept for backward compatibility, proxies to v1):**
- `POST /api/pmnl/createsub` → `POST /api/v1/subscribers`
- `POST /api/pmnl/readsub` → `GET /api/v1/subscribers/{id}`
- `POST /api/pmnl/updatesub` → appropriate v1 `PATCH` based on payload
- `DELETE /api/pmnl/deletesub/{iccid}` → `DELETE /api/v1/subscribers/{id}`

> Note: Legacy endpoints accept the older payload shapes (camelCase fields) and are translated server-side to the new schemas.

#### POST /api/v1/subscribers

Create a new mobile subscriber in the PMNL provisioning system.

**Authentication Required:** Yes (JWT Bearer token)

**Endpoint:** `POST /api/v1/subscribers`

**Tags:** Subscribers

---

##### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `queue_request` | boolean | No | `false` | Process asynchronously (`true`) or synchronously (`false`) |

---

##### Request Body

**Content-Type:** `application/json`

**Schema:**

```json
{
  "iccid": "string",
  "msisdn": "string",
  "cust_id": "string",
  "admin_info": "string",
  "aor": {
    "domain_id": "integer",
    "auth_username": "string",
    "auth_password": "string"
  },
  "apn": {
    "name": "string",
    "speed_up": "integer | 'max'",
    "speed_down": "integer | 'max'"
  },
  "subscriber_state": "boolean",
  "network_access_list": {
    "zoneNL": "boolean",
    "zone1": "boolean",
    "zone2": "boolean",
    "zone3": "boolean",
    "zone4": "boolean",
    "zone5": "boolean"
  },
  "contract": {
    "service_package": "integer",
    "service_profile": "integer",
    "duration": "integer"
  },
  "credit": {
    "max_credit": "float"
  }
}
```

---

##### Field Validation Rules

**iccid** (required)
- **Type:** String
- **Pattern:** `^8931\d{16}$`
- **Description:** Integrated Circuit Card Identifier (SIM card number)
- **Format:** Must start with `8931` followed by 16 additional digits (total 20 digits)
- **Example:** `"89312400000001234567"`

**msisdn** (required)
- **Type:** String
- **Pattern:** `^(316\d{8}|31970\d{8})$`
- **Description:** Mobile Subscriber Integrated Services Digital Network Number (phone number)
- **Format:** Either:
  - `316` followed by 8 digits (11 digits total), OR
  - `31970` followed by 8 digits (13 digits total)
- **Examples:** `"31612345678"`, `"31970012345678"`

**cust_id** (required)
- **Type:** String
- **Pattern:** `^9[0-9]{6}$`
- **Description:** Customer identifier
- **Format:** Must start with `9` followed by 6 additional digits (total 7 digits)
- **Example:** `"9123456"`

**admin_info** (required)
- **Type:** String
- **Max Length:** 24 characters
- **Description:** Administrative information or notes about the subscriber
- **Example:** `"Test Subscriber Alpha"`

**aor** (required)
- **Type:** Object
- **Description:** Address of Record authentication settings for SIP/VoIP services
- **Fields:**
  - `domain_id` (integer, required): Domain ID for routing, range 1-99999
  - `auth_username` (string, required): Authentication username, 4-16 characters, pattern `^\+?[a-zA-Z0-9\-.@*#]{4,16}$`
  - `auth_password` (string, required): Authentication password, 4-16 characters, pattern `^\+?[a-zA-Z0-9\-.@*#]{4,16}$`
- **Example:**
  ```json
  {
    "domain_id": 101,
    "auth_username": "+31612345678",
    "auth_password": "secure_pass123"
  }
  ```

**apn** (optional)
- **Type:** Object or null
- **Description:** Access Point Name settings for data/voice services
- **Can be null when:** `service_profile` is 0, 2, 4, or 6 (no data service)
- **Fields:**
  - `name` (string, required): APN domain name, pattern `^([a-z0-9\-.]){2,43}\.[a-z]{2,10}$`
  - `speed_up` (integer or "max", required): Upload speed in kbps or literal string "max"
  - `speed_down` (integer or "max", required): Download speed in kbps or literal string "max"
- **Validation:** Speed values must be >= 1 kbps if integer
- **Example:**
  ```json
  {
    "name": "data.test.net",
    "speed_up": 1024,
    "speed_down": 2048
  }
  ```
  Or with unlimited speed:
  ```json
  {
    "name": "data.test.net",
    "speed_up": "max",
    "speed_down": "max"
  }
  ```

**subscriber_state** (required)
- **Type:** Boolean
- **Description:** Active/inactive state of the subscriber
- **Values:**
  - `true`: Subscriber is active (can use services)
  - `false`: Subscriber is inactive (services disabled)
- **Example:** `true`

**network_access_list** (required)
- **Type:** Object
- **Description:** Network zone access permissions
- **Fields:** All 6 zones are required
  - `zoneNL` (boolean): Access to Netherlands zone
  - `zone1` (boolean): Access to zone 1
  - `zone2` (boolean): Access to zone 2
  - `zone3` (boolean): Access to zone 3
  - `zone4` (boolean): Access to zone 4
  - `zone5` (boolean): Access to zone 5
- **Example:**
  ```json
  {
    "zoneNL": true,
    "zone1": true,
    "zone2": false,
    "zone3": false,
    "zone4": false,
    "zone5": false
  }
  ```

**contract** (required)
- **Type:** Object
- **Description:** Subscriber contract settings
- **Fields:**
  - `service_package` (integer, required): 7-digit service package ID
  - `service_profile` (integer, required): Service profile type, range 0-7
    - `0`: No services
    - `1`: Data only
    - `2`: SMS only
    - `3`: Data + SMS
    - `4`: Voice only
    - `5`: Voice + Data
    - `6`: Voice + SMS
    - `7`: Voice + Data + SMS (full service)
  - `duration` (integer, required): Contract duration in months
    - **Allowed values:** `[0, 1, 12, 18, 24, 36, 48, 60]`
    - `0` means indefinite/no fixed term
- **Example:**
  ```json
  {
    "service_package": 1234567,
    "service_profile": 7,
    "duration": 12
  }
  ```

**credit** (required)
- **Type:** Object
- **Description:** Credit limit settings for the subscriber
- **Fields:**
  - `max_credit` (float, required): Maximum credit limit, range 0.00 to 99999.99
- **Example:**
  ```json
  {
    "max_credit": 50.00
  }
  ```

---

##### Complete Request Example

```http
POST /api/v1/subscribers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "iccid": "89312400000001234567",
  "msisdn": "31612345678",
  "cust_id": "9123456",
  "admin_info": "Test Subscriber Alpha",
  "aor": {
    "domain_id": 101,
    "auth_username": "+31612345678",
    "auth_password": "secure_password"
  },
  "apn": {
    "name": "data.test.net",
    "speed_up": 1024,
    "speed_down": 2048
  },
  "subscriber_state": true,
  "network_access_list": {
    "zoneNL": true,
    "zone1": true,
    "zone2": false,
    "zone3": false,
    "zone4": false,
    "zone5": false
  },
  "contract": {
    "service_package": 1234567,
    "service_profile": 7,
    "duration": 12
  },
  "credit": {
    "max_credit": 50.00
  }
}
```

---

##### Response (202 Accepted - Async Processing)

Returned when `queue_request=true`. The request has been accepted and will be processed asynchronously.

**Status Code:** `202 Accepted`

**Response Body:**
```json
{
  "request_id": "9f22cdcb-fb14-4f54-9dd4-01234567890ab",
  "progress": null,
  "status": "queued",
  "last_updated": "2025-01-29T14:30:45+00:00",
  "request_info": "Request has been queued and will be processed soon."
}
```

**Fields:**
- `request_id`: Unique identifier to track the request status
- `progress`: Processing progress (null when queued)
- `status`: Current status - can be `"queued"`, `"processing"`, `"completed"`, `"failed"`, or `"enriched"`
- `last_updated`: ISO 8601 timestamp of last status update
- `request_info`: Human-readable status message

**Next Steps:**
Poll the request status using `GET /api/v1/requests/{request_id}` endpoint (when implemented) to check completion.

---

##### Response (200 OK - Sync Processing)

Returned when `queue_request=false`. The request was processed synchronously.

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "request_id": "9f22cdcb-fb14-4f54-9dd4-01234567890ab",
  "progress": "100%",
  "status": "completed",
  "last_updated": "2025-01-29T14:30:48+00:00"
}
```

---

##### Error Responses

| Status Code | Description | Example Response |
|-------------|-------------|------------------|
| **401 Unauthorized** | JWT token is invalid, expired, or missing | `{"detail": "Invalid or expired token"}` |
| **403 Forbidden** | User lacks permission to perform this action | `{"message": "Access denied"}` |
| **409 Conflict** | Subscriber with this ICCID already exists | `{"message": "Subscriber with this ICCID already exists"}` |
| **422 Validation Error** | Request body validation failed | See validation error format below |
| **500 Internal Server Error** | Unexpected server error | `{"detail": "An unexpected error occurred. Please try again later."}` |
| **503 Service Unavailable** | Cannot connect to PMNL API | `{"detail": "Unable to connect to provisioning service. Please try again later."}` |
| **504 Gateway Timeout** | Request to PMNL API timed out | `{"detail": "Request to provisioning service timed out. Please try again later."}` |

**Validation Error Format (422):**

```json
{
  "detail": [
    {
      "loc": ["body", "iccid"],
      "msg": "string does not match regex '^8931\\d{16}$'",
      "type": "value_error.str.regex"
    },
    {
      "loc": ["body", "apn", "speed_up"],
      "msg": "Speed must be at least 1 kbps",
      "type": "value_error"
    },
    {
      "loc": ["body", "contract", "duration"],
      "msg": "Invalid duration",
      "type": "value_error"
    }
  ]
}
```

Each error object contains:
- `loc`: Path to the invalid field (array notation)
- `msg`: Human-readable error message
- `type`: Error type identifier

---

##### Usage Patterns

**Asynchronous Processing (Recommended)**

Use `queue_request=true` for long-running operations or to avoid client timeouts:

```python
import requests
import time

# Login
login_response = requests.post(
    "https://api.example.com/api/auth/login",
    json={"username": "your_username", "password": "your_password"}
)
jwt_token = login_response.json()["token"]

# Create subscriber (async)
create_response = requests.post(
    "https://api.example.com/api/v1/subscribers?queue_request=true",
    headers={
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    },
    json={
        "iccid": "89312400000001234567",
        "msisdn": "31612345678",
        "cust_id": "9123456",
        "admin_info": "Test Subscriber",
        "aor": {
            "domain_id": 101,
            "auth_username": "+31612345678",
            "auth_password": "secure_pass"
        },
        "apn": {
            "name": "data.test.net",
            "speed_up": 1024,
            "speed_down": 2048
        },
        "subscriber_state": True,
        "network_access_list": {
            "zoneNL": True,
            "zone1": True,
            "zone2": False,
            "zone3": False,
            "zone4": False,
            "zone5": False
        },
        "contract": {
            "service_package": 1234567,
            "service_profile": 7,
            "duration": 12
        },
        "credit": {
            "max_credit": 50.00
        }
    }
)

if create_response.status_code == 202:
    request_id = create_response.json()["request_id"]
    print(f"Request queued: {request_id}")

    # Poll for completion (implement exponential backoff in production)
    max_attempts = 30
    attempt = 0
    while attempt < max_attempts:
        # Note: GET /requests/{id} endpoint needs to be implemented
        status_response = requests.get(
            f"https://api.example.com/api/v1/requests/{request_id}",
            headers={"Authorization": f"Bearer {jwt_token}"}
        )

        if status_response.status_code == 200:
            status = status_response.json()["status"]
            print(f"Status: {status}")

            if status == "completed":
                print("✓ Subscriber created successfully!")
                break
            elif status == "failed":
                print("✗ Subscriber creation failed!")
                print(status_response.json())
                break

        time.sleep(2)  # Poll every 2 seconds
        attempt += 1
else:
    print(f"Error: {create_response.status_code}")
    print(create_response.json())
```

**Synchronous Processing**

Use `queue_request=false` when you need immediate confirmation:

```python
create_response = requests.post(
    "https://api.example.com/api/v1/subscribers?queue_request=false",
    headers={
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    },
    json={...}  # Same request body
)

if create_response.status_code == 200:
    print("✓ Subscriber created successfully!")
    print(create_response.json())
```

---

##### cURL Examples

**Asynchronous Request:**

```bash
# Step 1: Login and get JWT token
JWT_TOKEN=$(curl -s -X POST https://api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  | jq -r '.token')

# Step 2: Create subscriber
REQUEST_ID=$(curl -s -X POST "https://api.example.com/api/v1/subscribers?queue_request=true" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "iccid": "89312400000001234567",
    "msisdn": "31612345678",
    "cust_id": "9123456",
    "admin_info": "Test Subscriber",
    "aor": {
      "domain_id": 101,
      "auth_username": "+31612345678",
      "auth_password": "secure_pass"
    },
    "apn": {
      "name": "data.test.net",
      "speed_up": 1024,
      "speed_down": 2048
    },
    "subscriber_state": true,
    "network_access_list": {
      "zoneNL": true,
      "zone1": true,
      "zone2": false,
      "zone3": false,
      "zone4": false,
      "zone5": false
    },
    "contract": {
      "service_package": 1234567,
      "service_profile": 7,
      "duration": 12
    },
    "credit": {
      "max_credit": 50.00
    }
  }' | jq -r '.request_id')

echo "Request ID: $REQUEST_ID"

# Step 3: Check status (when GET /requests/{id} is implemented)
curl -s -X GET "https://api.example.com/api/v1/requests/$REQUEST_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq '.'
```

**Synchronous Request:**

```bash
curl -X POST "https://api.example.com/api/v1/subscribers?queue_request=false" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}' \  # Same request body
  | jq '.'
```

---

##### Audit Logging

**Automatic Audit Trail**

All operations on this endpoint are automatically logged to the `audit_logs` database table. Each audit log entry includes:

- **User Information**: User ID and username who performed the operation
- **Operation Details**: Operation type (CREATE), resource type (subscriber), resource ID (ICCID or request_id)
- **Request Data**: Complete request payload for full traceability
- **Response Information**: HTTP status code (200, 202, etc.)
- **Status**: Success or failed
- **Error Details**: Error message if the operation failed
- **Timestamp**: When the operation was performed

**Benefits:**
- Complete compliance and security audit trail
- Debugging capabilities for failed operations
- User action tracking and accountability
- Historical record of all provisioning activities

**Querying Audit Logs:**
```sql
-- View recent audit logs for a user
SELECT * FROM audit_logs
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC
LIMIT 10;

-- View all failed create operations
SELECT * FROM audit_logs
WHERE operation = 'CREATE'
  AND status = 'failed'
ORDER BY created_at DESC;

-- View audit logs for a specific subscriber
SELECT * FROM audit_logs
WHERE resource_id = '89312400000001234567'
ORDER BY created_at DESC;
```

---

##### Best Practices

1. **Always Validate Client-Side First**
   - Validate ICCID, MSISDN, and cust_id formats before sending
   - Check service_profile and duration are within allowed values
   - Ensure apn is null when service_profile has no data service (0, 2, 4, 6)

2. **Use Async Processing**
   - Set `queue_request=true` for better performance on heavy operations
   - Implement exponential backoff when polling for status
   - Don't poll more frequently than every 2 seconds

3. **Handle Token Expiry**
   - JWT tokens expire after 1 hour
   - Catch 401 responses and re-authenticate
   - Consider implementing token refresh logic

4. **Set Appropriate Timeouts**
   - Use at least 30-second timeout for create operations
   - Longer timeouts for sync processing (queue_request=false)

5. **Error Handling**
   - Always check response status codes
   - Parse validation errors to show user-friendly messages
   - Implement retry logic with exponential backoff for 5xx errors

6. **Security**
   - Never log or expose JWT tokens
   - Use HTTPS for all API requests
   - Store credentials securely (environment variables, secrets managers)

---

##### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | JWT token expired (>1 hour old) | Re-authenticate via `/api/auth/login` |
| 409 Conflict | Subscriber with ICCID already exists | Use different ICCID or delete existing subscriber first |
| 422 Validation Error (ICCID) | Invalid ICCID format | Ensure ICCID starts with 8931 and has exactly 20 digits |
| 422 Validation Error (MSISDN) | Invalid phone number format | Use format 316XXXXXXXX (11 digits) or 31970XXXXXXXX (13 digits) |
| 422 Validation Error (duration) | Invalid contract duration | Use only: 0, 1, 12, 18, 24, 36, 48, or 60 |
| 422 Validation Error (apn) | APN required but null | Provide APN when service_profile is 1, 3, 5, or 7 |
| 500 Internal Server Error | Server or database error | Retry with exponential backoff, contact support if persists |
| 503 Service Unavailable | Cannot connect to PMNL API | Retry with exponential backoff (connection error) |
| 504 Gateway Timeout | Request to PMNL API timed out | Retry with exponential backoff or use async processing |
| Timeout (Client) | Request takes longer than client timeout | Use async processing (`queue_request=true`) or increase client timeout |

---

#### GET /api/v1/subscribers/{id}

Retrieve detailed subscriber information by ICCID or MSISDN.

**Authentication Required:** Yes (JWT Bearer token)

**Endpoint:** `GET /api/v1/subscribers/{id}`

**Tags:** Subscribers

---

##### Path Parameters

| Parameter | Type | Pattern | Required | Description |
|-----------|------|---------|----------|-------------|
| `id` | string | `^(8931\d{16}|316\d{8}|31970\d{8})$` | Yes | ICCID or MSISDN identifier |

**Supported Identifier Formats:**
- **ICCID**: 20 digits starting with `8931` (e.g., `89312400000001234567`)
- **MSISDN (11 digits)**: Starting with `316` (e.g., `31658011998`)
- **MSISDN (13 digits)**: Starting with `31970` (e.g., `3197058010199`)

---

##### Response (200 OK)

Returns detailed subscriber information including all settings and current status.

**Response Schema:** `SubscriberReadResource`

```json
{
  "data": {
    "iccid": "89312400000001234567",
    "imsi": "204121234567890",
    "msisdn": "31612345678",
    "cust_id": "9123456",
    "admin_info": "Test Subscriber Alpha",
    "aor": {
      "domain_id": 101,
      "auth_username": "+31612345678",
      "auth_password": "secretpassword"
    },
    "apn": {
      "name": "data.test.net",
      "speed_up": 1024,
      "speed_down": 2048
    },
    "subscriber_state": true,
    "network_access_list": {
      "zoneNL": true,
      "zone1": true,
      "zone2": false,
      "zone3": false,
      "zone4": false,
      "zone5": false
    },
    "block_data_usage": {
      "enabled": false,
      "block_until": null,
      "scope": null
    },
    "contract": {
      "service_package": 1234567,
      "service_profile": 7,
      "contract_start": "2025-05-19T14:30:45+02:00",
      "duration": 12
    },
    "credit": {
      "max_credit": 50.00
    }
  },
  "status": "completed",
  "reason": "OK",
  "request_id": "a03a7c76-34be-4ae9-8418-c438e1b959bf",
  "cached": false
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | object | Subscriber data object containing all details |
| `data.iccid` | string | Subscriber's ICCID (20 digits) |
| `data.imsi` | string | Subscriber's IMSI |
| `data.msisdn` | string | Subscriber's phone number |
| `data.cust_id` | string | Customer ID (7 digits starting with 9) |
| `data.admin_info` | string | Administrative information (max 24 chars) |
| `data.aor` | object | Address of Record settings for VoIP |
| `data.apn` | object\|null | APN settings (null if no data service enabled) |
| `data.subscriber_state` | boolean | Activation state (true=active, false=inactive) |
| `data.network_access_list` | object | Zone access permissions (NL + zones 1-5) |
| `data.block_data_usage` | object | Data blocking configuration for EU regulation |
| `data.block_data_usage.enabled` | boolean | Whether data blocking is active |
| `data.block_data_usage.block_until` | string\|null | RFC3339 timestamp when blocking expires |
| `data.block_data_usage.scope` | string\|null | Blocking scope: "outside_eu_regulation" or "all" |
| `data.contract` | object | Contract details |
| `data.contract.service_package` | integer | 7-digit service package ID |
| `data.contract.service_profile` | integer | Service profile (0-7) |
| `data.contract.contract_start` | string | Contract start date (RFC3339 timestamp) |
| `data.contract.duration` | integer | Contract duration in months |
| `data.credit` | object | Credit settings |
| `data.credit.max_credit` | float | Maximum credit allowed (0.00-99999.99) |
| `status` | string | Request status (always "completed" for 200 responses) |
| `reason` | string\|null | Status reason (e.g., "OK") |
| `request_id` | string | Unique request identifier (UUID) |
| `cached` | boolean | Whether response was served from PMNL cache |

---

##### Error Responses

| Status Code | Description | Response Body |
|-------------|-------------|---------------|
| 401 Unauthorized | Missing or invalid JWT token | `{"detail": "Could not validate credentials"}` |
| 404 Not Found | Subscriber doesn't exist | `{"detail": {"message": "Subscriber not found"}}` |
| 422 Unprocessable Entity | Invalid identifier format | FastAPI validation error with pattern details |
| 503 Service Unavailable | Cannot connect to PMNL API | `{"detail": "Unable to connect to provisioning service. Please try again later."}` |
| 504 Gateway Timeout | Request to PMNL timed out | `{"detail": "Request to provisioning service timed out. Please try again later."}` |

**Example 404 Error:**
```json
{
  "detail": {
    "message": "Subscriber not found"
  }
}
```

**Example 422 Validation Error:**
```json
{
  "detail": [
    {
      "loc": ["path", "id"],
      "msg": "string does not match regex '^(8931\\d{16}|316\\d{8}|31970\\d{8})$'",
      "type": "value_error.str.regex",
      "ctx": {
        "pattern": "^(8931\\d{16}|316\\d{8}|31970\\d{8})$"
      }
    }
  ]
}
```

---

##### Complete Request Examples

**Read by ICCID:**
```bash
curl -X GET "http://localhost:8000/api/v1/subscribers/89312400000001234567" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Read by MSISDN (316 format):**
```bash
curl -X GET "http://localhost:8000/api/v1/subscribers/31658011998" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Read by MSISDN (31970 format):**
```bash
curl -X GET "http://localhost:8000/api/v1/subscribers/3197058010199" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Python Example:**
```python
import httpx

# 1. Login first
login_response = httpx.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "your_username", "password": "your_password"}
)
token = login_response.json()["token"]

# 2. Read subscriber by ICCID
response = httpx.get(
    "http://localhost:8000/api/v1/subscribers/89312400000001234567",
    headers={"Authorization": f"Bearer {token}"}
)

subscriber = response.json()
print(f"Subscriber state: {'active' if subscriber['data']['subscriber_state'] else 'inactive'}")
print(f"MSISDN: {subscriber['data']['msisdn']}")
print(f"Contract start: {subscriber['data']['contract']['contract_start']}")
```

---

##### Implementation Notes

1. **Caching**: The PMNL API may return cached results for performance optimization. The `cached` field indicates whether the response was served from cache. Cached responses are automatically refreshed when subscribers are created or deleted.

2. **Identifier Flexibility**: You can query by either ICCID or MSISDN. The path parameter accepts all three supported formats. Use whichever identifier you have available.

3. **APN Field**: The `apn` field can be `null` when the subscriber has no data or voice (VoLTE) service enabled. Service profiles 0, 2, 4, and 6 typically have null APN.

4. **Data Blocking**: The `block_data_usage` object contains EU regulation compliance settings. When `enabled` is true, data usage may be blocked outside EU regulation zones until the `block_until` timestamp.

5. **Audit Logging**: All read operations are logged to the audit trail with operation type "READ". Both successful reads and failures (404, connection errors) are recorded for compliance.

6. **Read-Only Operation**: This endpoint only retrieves information and does not modify subscriber data. It is always **synchronous** (no `queue_request` parameter like the create endpoint).

---

##### Migration from Legacy API

This endpoint replaces the legacy `POST /api/pmnl/readsub` endpoint. Key differences:

| Aspect | Legacy (v4) | New (v5) |
|--------|-------------|----------|
| **Method** | POST | GET |
| **Input** | JSON body with `Iccid` or `MsIsdn` | Path parameter `{id}` |
| **Field Names** | Capitalized (e.g., `Iccid`, `MsIsdn`) | Lowercase in response (e.g., `iccid`, `msisdn`) |
| **Format** | XML → JSON conversion | Native JSON REST API |
| **Validation** | Exactly one field required in body | Single path parameter with regex validation |
| **Response** | Custom format | PMNL v5 standard format with metadata |

**Legacy Request (v4):**
```http
POST /api/pmnl/readsub
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "Iccid": "89312400000001234567"
}
```

**New Request (v5):**
```http
GET /api/v1/subscribers/89312400000001234567
Authorization: Bearer JWT_TOKEN
```

---

##### Best Practices

1. **Use Available Identifier**: Query by whichever identifier you have (ICCID or MSISDN). Don't make unnecessary lookups to convert between them.

2. **Handle 404 Gracefully**: Subscriber not found is a normal case. Your application should handle it with appropriate user feedback.

3. **Cache Awareness**: The `cached` field tells you if data might be slightly stale. For critical operations, you may want to note this to users.

4. **Timeout Handling**: Set appropriate client timeouts (recommended: 10-15 seconds). Handle 504 errors with retry logic.

5. **Error Logging**: Log subscriber read errors with the `request_id` from error responses for troubleshooting with PMNL support.

6. **Validation Client-Side**: Validate identifier format client-side before making requests to provide faster feedback to users and reduce unnecessary API calls.

---

## 4. Data Models

### CreateSubscriberRequest

Complete schema for creating a subscriber.

```typescript
{
  iccid: string;              // Pattern: ^8931\d{16}$
  msisdn: string;             // Pattern: ^(316\d{8}|31970\d{8})$
  cust_id: string;            // Pattern: ^9[0-9]{6}$
  admin_info: string;         // Max length: 24
  aor: AorSettings;           // Required
  apn: ApnSettings | null;    // Optional, can be null
  subscriber_state: boolean;  // true=active, false=inactive
  network_access_list: ZoneAccessListSettings;
  contract: ContractSettings;
  credit: CreditSettings;
}
```

### AorSettings

Address of Record authentication settings.

```typescript
{
  domain_id: number;         // Range: 1-99999
  auth_username: string;     // Pattern: ^\+?[a-zA-Z0-9\-.@*#]{4,16}$
  auth_password: string;     // Pattern: ^\+?[a-zA-Z0-9\-.@*#]{4,16}$
}
```

### ApnSettings

Access Point Name settings for data/voice.

```typescript
{
  name: string;              // Pattern: ^([a-z0-9\-.]){2,43}\.[a-z]{2,10}$
  speed_up: number | "max";  // Upload speed in kbps or "max"
  speed_down: number | "max"; // Download speed in kbps or "max"
}
```

### ZoneAccessListSettings

Network zone access permissions.

```typescript
{
  zoneNL: boolean;  // Netherlands zone
  zone1: boolean;   // Zone 1
  zone2: boolean;   // Zone 2
  zone3: boolean;   // Zone 3
  zone4: boolean;   // Zone 4
  zone5: boolean;   // Zone 5
}
```

### ContractSettings

Subscriber contract configuration.

```typescript
{
  service_package: number;   // 7-digit service package ID
  service_profile: number;   // Range: 0-7
                            // 0=none, 1=data, 2=sms, 3=data+sms
                            // 4=voice, 5=voice+data, 6=voice+sms, 7=all
  duration: number;         // Allowed: [0, 1, 12, 18, 24, 36, 48, 60]
}
```

### CreditSettings

Credit limit configuration.

```typescript
{
  max_credit: number;  // Range: 0.00-99999.99
}
```

### UserRequestResource

Response for asynchronous processing (202).

```typescript
{
  request_id: string;             // UUID for tracking
  progress: string | null;        // Progress percentage
  status: "queued" | "processing" | "completed" | "failed" | "enriched";
  last_updated: string;           // ISO 8601 timestamp
  request_info: string | null;    // Status message
}
```

### CompletedUserRequestResource

Response for synchronous processing (200).

```typescript
{
  request_id: string;       // UUID for tracking
  progress: string | null;  // Should be "100%"
  status: string;           // Should be "completed"
  last_updated: string;     // ISO 8601 timestamp
}
```

**For complete PMNL v5 API schemas:** See [swagger.json](swagger.json)

---

## 5. Error Handling

### HTTP Status Codes

| Code | Meaning | When It Occurs |
|------|---------|----------------|
| 200 | OK | Successful synchronous request |
| 201 | Created | User registration successful |
| 202 | Accepted | Request accepted for async processing |
| 400 | Bad Request | Invalid credentials or request format |
| 401 | Unauthorized | Missing, invalid, or expired JWT token |
| 403 | Forbidden | User lacks required permissions |
| 409 | Conflict | Resource already exists (e.g., duplicate ICCID) |
| 422 | Unprocessable Entity | Request validation failed |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | PMNL API unavailable or under maintenance |

### Error Response Format

All error responses follow a consistent format:

**Simple Error:**
```json
{
  "detail": "Error message here"
}
```

**Validation Error (422):**
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "Error description",
      "type": "error_type"
    }
  ]
}
```

### Troubleshooting Guide

#### Authentication Errors (401)

**Symptoms:** `{"detail": "Invalid or expired token"}`

**Causes:**
- Token expired (>1 hour old)
- Token malformed or tampered with
- User was deactivated
- Token was generated with different secret key

**Solutions:**
- Re-authenticate via `/api/auth/login`
- Check token format (should start with `eyJ`)
- Verify user is still active in database
- Ensure API server hasn't been restarted with different JWT secret

#### Validation Errors (422)

**Symptoms:** Detailed error array in response

**Common Validation Issues:**

1. **ICCID Format Error**
   ```json
   {"loc": ["body", "iccid"], "msg": "string does not match regex '^8931\\d{16}$'"}
   ```
   **Fix:** ICCID must be exactly 20 digits starting with "8931"

2. **MSISDN Format Error**
   ```json
   {"loc": ["body", "msisdn"], "msg": "string does not match regex..."}
   ```
   **Fix:** Use format 316XXXXXXXX or 31970XXXXXXXX

3. **Invalid Duration**
   ```json
   {"loc": ["body", "contract", "duration"], "msg": "Invalid duration"}
   ```
   **Fix:** Use only 0, 1, 12, 18, 24, 36, 48, or 60

4. **Speed Validation**
   ```json
   {"loc": ["body", "apn", "speed_up"], "msg": "Speed must be at least 1 kbps"}
   ```
   **Fix:** Use positive integer or string "max"

#### Conflict Errors (409)

**Symptoms:** `{"message": "Subscriber with this ICCID already exists"}`

**Solutions:**
- Use a different ICCID
- Delete the existing subscriber first (if appropriate)
- Check if this is a duplicate request

#### Service Unavailable (503)

**Symptoms:** `{"detail": "Upstream service unavailable"}`

**Causes:**
- PMNL API is under maintenance
- PMNL API is experiencing downtime
- Network connectivity issues

**Solutions:**
- Implement exponential backoff retry logic
- Check PMNL status page
- Contact support if issue persists >30 minutes

---

## 6. Rate Limits

**Current Status:** Rate limiting is not currently implemented in this API.

**Recommended Limits (for future implementation):**
- **Authentication endpoints:** 5 requests per minute per IP
- **Subscriber operations:** 100 requests per minute per user
- **Request status polling:** 30 requests per minute per user

**Best Practices:**
- Implement client-side request throttling
- Use exponential backoff for retries
- Cache responses when appropriate
- Batch operations when possible

---

## 7. Changelog

### 2025-01-29 - Refresh Token Authentication

**Enhanced Authentication:**
- ✅ **Dual Token System**: Access tokens (1 hour) + refresh tokens (7 days)
  - Access tokens for API requests (short-lived for security)
  - Refresh tokens for obtaining new access tokens (long-lived for UX)
- ✅ `POST /api/auth/refresh` - Get new access token using refresh token
  - Validates refresh token JWT structure and signature
  - Checks token hasn't been revoked or expired
  - Verifies user still exists and is active
  - Returns new access token
- ✅ `POST /api/auth/logout` - Revoke refresh token
  - Requires valid access token in Authorization header
  - Revokes specified refresh token in database
  - Soft delete with audit trail (revoked_at, revoked_reason)
- ✅ **Breaking Change**: Login response field renamed from `token` to `access_token`
  - Also returns `refresh_token` and `expires_in` fields
  - Updated response schema with dual tokens

**Security Features:**
- ✅ **Refresh Token Storage**: Separate `refresh_tokens` database table
  - Tokens stored as SHA-256 hash of JWT's `jti` claim
  - User relationship with CASCADE delete
  - Device tracking (user_agent, ip_address)
  - Soft delete for audit trail
- ✅ **Token Management**:
  - Maximum 5 active refresh tokens per user
  - Automatic cleanup of expired tokens on login
  - Oldest tokens auto-revoked when limit exceeded
  - Revocation tracking with reason codes
- ✅ **Type Validation**: Separate token types prevent misuse
  - Access tokens have no `type` claim
  - Refresh tokens have `type: "refresh"` claim
  - Cannot use access token as refresh token

**Database Changes:**
- ✅ New table: `refresh_tokens`
  - Columns: id, token_hash, user_id, expires_at, revoked_at, revoked_reason, user_agent, ip_address, created_at
  - Indexes: token_hash (unique), user_id, expires_at, revoked_at, composite (user_id + revoked_at)
  - Foreign key: user_id → users.id (CASCADE)

### 2025-01-29 - Read Subscriber Endpoint

**New Endpoint:**
- ✅ `GET /api/v1/subscribers/{id}` - Read subscriber details by ICCID or MSISDN
  - Path parameter validation with regex pattern matching
  - Supports three identifier formats: ICCID (20 digits), MSISDN (11 or 13 digits)
  - Returns comprehensive subscriber information including contract, APN, credit settings
  - Comprehensive error handling (404 for not found, 422 for invalid format, 503/504 for connection issues)
  - Audit logging for all read operations
  - Response caching awareness (PMNL may serve cached data)
  - Replaces legacy POST /api/pmnl/readsub endpoint

**Documentation:**
- ✅ Complete endpoint documentation with examples
- ✅ Request/response schemas documented
- ✅ Migration guide from legacy v4 API
- ✅ Python and cURL code examples
- ✅ Best practices for read operations

### 2025-01-29 - Critical Improvements

**Security & Reliability Enhancements:**
- ✅ **Audit Logging**: Complete audit trail for all subscriber operations
  - Tracks user, operation, request data, response status, and errors
  - Stored in `audit_logs` database table with indexes
  - Enables compliance, debugging, and security monitoring
- ✅ **Error Sanitization**: Prevents internal PMNL error exposure
  - Sanitizes error responses to only expose safe fields
  - Logs full errors server-side for debugging
  - Protects against information disclosure vulnerabilities
- ✅ **Comprehensive Exception Handling**: Robust error handling
  - Handles connection errors (503 Service Unavailable)
  - Handles timeouts (504 Gateway Timeout)
  - Handles HTTP errors with sanitized responses
  - Catches unexpected errors with graceful degradation
  - All errors logged to audit table

### 2025-01-29 - Initial Implementation

**Implemented Endpoints:**
- ✅ `POST /api/auth/register` - User registration
- ✅ `POST /api/auth/login` - User authentication
- ✅ `POST /api/v1/subscribers` - Create subscriber (async/sync)
- ✅ `GET /api/v1/subscribers/{id}` - Read subscriber by ICCID or MSISDN
- ✅ `GET /api/v1/requests/{request_id}` - Poll async request status
- ✅ `GET /api/v1/requests` - List all requests for current user

**Authentication:**
- ✅ JWT-based authentication for clients
- ✅ OAuth2 + API key authentication to PMNL v5
- ✅ Token caching with automatic refresh

**Validation:**
- ✅ Comprehensive Pydantic schemas matching PMNL v5 spec
- ✅ Regex patterns for ICCID, MSISDN, cust_id
- ✅ Service profile and contract duration validation
- ✅ APN speed validation

**Features:**
- ✅ Asynchronous request processing support
- ✅ Synchronous request processing support
- ✅ Proper HTTP status codes (200, 202, 401, 422, 500, 503, 504)
- ✅ Secure error handling with sanitization

### Future Roadmap

**Planned Endpoints:**
- 🔜 `GET /api/v1/subscribers` - List subscribers
- 🔜 `GET /api/v1/subscribers/{id}` - Read subscriber details
- 🔜 `PATCH /api/v1/subscribers/{id}/aor` - Update AoR settings
- 🔜 `PATCH /api/v1/subscribers/{id}/state` - Update subscriber state
- 🔜 `PATCH /api/v1/subscribers/{id}/apn` - Update APN settings
- 🔜 `PATCH /api/v1/subscribers/{id}/network-access-list` - Update zone access
- 🔜 `PATCH /api/v1/subscribers/{id}/credit` - Update credit limit
- 🔜 `PATCH /api/v1/subscribers/{id}/block-data-usage` - Block/unblock data
- 🔜 `DELETE /api/v1/subscribers/{id}` - Delete subscriber
- 🔜 `GET /api/v1/requests` - List async requests
- 🔜 `GET /api/v1/requests/{request_id}` - Get request status
- 🔜 `GET /api/v1/user/authorizations` - Get user authorization mappings
- 🔜 `GET /api/v1/audit` - List audit logs (with pagination)
- 🔜 `POST /api/v1/audit` - Create audit entry

**Planned Improvements:**
- 🔜 Audit logging for all operations
- 🔜 Request ID tracking in database
- 🔜 Response validation against schemas
- 🔜 Enhanced error handling with sanitization
- 🔜 Rate limiting implementation
- 🔜 Token refresh mechanism for JWT
- 🔜 Webhook notifications for async request completion
- 🔜 API key authentication (in addition to JWT)
- 🔜 OpenAPI/Swagger UI documentation endpoint

---

## Contact & Support

For questions, issues, or feature requests:
- **Project Repository:** [GitHub Link]
- **Support Email:** support@example.com
- **PMNL Support:** support@pmfactory.nl

---

**Last Updated:** 2025-01-29
**API Version:** 1.0.0
**PMNL API Version:** v5-test
