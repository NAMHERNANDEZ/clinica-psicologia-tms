# Auth API

## Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@clinica.com",
  "password": process.env.ADMIN_PASSWORD
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@clinica.com",
      "role": "admin"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Logout

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

## Get Current User

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

## Role Permissions

| Role | Permissions |
|------|-------------|
| admin | All permissions |
| therapist | patients:read, appointments:read, tms:read/write, clinical:read/write, reports:read |
| reception | patients:read/write, therapists:read, appointments:read/write |
| patient | appointments:read |
