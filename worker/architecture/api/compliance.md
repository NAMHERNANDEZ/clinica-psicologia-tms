# Compliance API

## Dashboard

```http
GET /api/compliance/dashboard
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 85,
    "overallScore": 85,
    "alerts": {
      "open": 17,
      "critical": 10,
      "high": 6,
      "medium": 1,
      "low": 0
    },
    "rulesExecuted": 18,
    "norms": {
      "nom004": { "score": 85, "alerts": 5, "label": "NOM-004" },
      "cofepris": { "score": 100, "alerts": 0, "label": "COFEPRIS" },
      "iso9001": { "score": 100, "alerts": 0, "label": "ISO 9001" },
      "iso27001": { "score": 100, "alerts": 0, "label": "ISO 27001" }
    },
    "operative": {
      "criticalAlerts": 10,
      "patientsPending": 1,
      "consentsExpiring": 0,
      "recordsIncomplete": 1,
      "successfulCrons": 0,
      "lastBackup": "2026-07-25T23:37:09",
      "lastAudit": "2026-07-25T23:15:49"
    }
  }
}
```

## Score Calculation

```
score = max(0, 100 - (critical * 30) - (high * 15) - (open * 5))
```

## Reports

```http
GET /api/compliance/report?format=json
Authorization: Bearer <accessToken>
```

```http
GET /api/compliance/report?format=csv
Authorization: Bearer <accessToken>
```

## Run Compliance Manually

```http
POST /api/compliance/run
Authorization: Bearer <accessToken>
```

## Alerts

```http
GET /api/compliance/alerts
Authorization: Bearer <accessToken>
```
