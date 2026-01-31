# Public Lead Submission API Specification

## Overview

This API endpoint allows public landing pages to submit leads directly into the CRM system. The endpoint is designed to be secure, rate-limited, and protected against spam.

**Endpoint:** `POST /api/public/leads`

**Base URL:** `https://your-crm-domain.com`

**Authentication:** None required (public endpoint)

---

## Request

### Headers

```
Content-Type: application/json
```

### Request Body

All fields should be sent as JSON in the request body.

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `firstName` | string | Customer's first name |
| `lastName` | string | Customer's last name |
| `leadTypes` | string[] | Array of lead types (see Lead Types below) |
| `captchaToken` | string | reCAPTCHA v3 token (if CAPTCHA is enabled) |

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `phone` | string | Customer's phone number |
| `email` | string | Customer's email address |
| `addressLine1` | string | Street address line 1 |
| `addressLine2` | string | Street address line 2 |
| `city` | string | City |
| `state` | string | State (2-letter code recommended) |
| `zip` | string | ZIP/Postal code |
| `description` | string | Additional details about the lead (required if `leadTypes` includes "OTHER") |
| `hearAboutUs` | string | How customer heard about you (see Hear About Us options below) |
| `hearAboutUsOther` | string | Custom text when `hearAboutUs` is "OTHER" |
| `isMilitaryFirstResponder` | boolean | Whether customer is military/first responder |

### Lead Types

The `leadTypes` field accepts an array of one or more of the following values:

- `"FLOOR"` - Flooring
- `"CARPET"` - Carpet
- `"TILE_STONE"` - Tile/Stone
- `"MATERIALS"` - Materials
- `"KITCHEN"` - Kitchen
- `"BATH"` - Bathroom
- `"ADUS"` - ADU's
- `"PAINTING"` - Painting
- `"ROOFING"` - Roofing
- `"STUCCO"` - Stucco
- `"CONCRETE"` - Concrete
- `"TURF"` - Turf
- `"LANDSCAPING"` - Landscaping
- `"MONTHLY_YARD_MAINTENANCE"` - Monthly Yard Maintenance
- `"LABOR"` - Labor Only
- `"OTHER"` - Other (requires `description` field)

### Hear About Us Options

The `hearAboutUs` field accepts one of the following values:

- `"YELP"` - Yelp
- `"FACEBOOK"` - Facebook
- `"DRIVING_BY"` - Driving By
- `"RETURNING_CUSTOMER"` - Returning Customer
- `"OTHER"` - Other (requires `hearAboutUsOther` field)

### Example Request

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "555-123-4567",
  "email": "john.doe@example.com",
  "addressLine1": "123 Main Street",
  "addressLine2": "Apt 4B",
  "city": "San Diego",
  "state": "CA",
  "zip": "92101",
  "leadTypes": ["LANDSCAPING", "TURF"],
  "description": "Need landscaping for backyard renovation",
  "hearAboutUs": "FACEBOOK",
  "isMilitaryFirstResponder": false,
  "captchaToken": "03AGdBq25..."
}
```

---

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "lead": {
    "id": "clx1234567890",
    "customerNumber": "105-000123",
    "status": "NEW"
  },
  "message": "Lead submitted successfully"
}
```

### Error Responses

#### 400 Bad Request - Missing Required Fields

```json
{
  "error": "Missing required fields: firstName, lastName, and at least one leadType"
}
```

#### 400 Bad Request - Description Required for OTHER

```json
{
  "error": "Description is required when 'Other' is selected"
}
```

#### 400 Bad Request - CAPTCHA Verification Failed

```json
{
  "error": "CAPTCHA verification failed"
}
```

#### 400 Bad Request - CAPTCHA Token Missing

```json
{
  "error": "CAPTCHA token is required"
}
```

#### 429 Too Many Requests - Rate Limit Exceeded

```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 450
}
```

**Headers:**
- `Retry-After: 450` (seconds until retry is allowed)

#### 500 Internal Server Error

```json
{
  "error": "An error occurred while submitting your request. Please try again later."
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit:** 5 requests per IP address per 15 minutes (configurable)
- **Response:** 429 Too Many Requests when limit exceeded
- **Retry-After Header:** Included in 429 responses, indicates seconds until retry is allowed

**Configuration (Environment Variables):**
- `RATE_LIMIT_MAX_REQUESTS` - Maximum requests per window (default: 5)
- `RATE_LIMIT_WINDOW_MS` - Time window in milliseconds (default: 900000 = 15 minutes)

---

## CAPTCHA Verification

The API supports Google reCAPTCHA v3 for spam protection.

### Setup

1. Get reCAPTCHA keys from [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Set environment variables:
   - `CAPTCHA_SECRET_KEY` - Your reCAPTCHA secret key
   - `CAPTCHA_ENABLED` - Set to `"true"` to enable (default: enabled if secret key exists)
   - `CAPTCHA_SCORE_THRESHOLD` - Minimum score for v3 (default: 0.5, range: 0.0-1.0)

### Frontend Integration

On your landing page, you need to:

1. Load the reCAPTCHA script:
```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
```

2. Get a token before submitting the form:
```javascript
grecaptcha.ready(function() {
  grecaptcha.execute('YOUR_SITE_KEY', {action: 'submit_lead'})
    .then(function(token) {
      // Include token in your API request
      submitLead({...formData, captchaToken: token});
    });
});
```

3. Include the token in your API request as `captchaToken`.

---

## CORS Configuration

The API supports Cross-Origin Resource Sharing (CORS) for requests from different domains.

### Configuration

Set the `ALLOWED_ORIGINS` environment variable to a comma-separated list of allowed origins:

```
ALLOWED_ORIGINS=https://your-landing-page.com,https://www.your-landing-page.com
```

If not set, all origins are allowed (development only - not recommended for production).

### Preflight Requests

The API handles OPTIONS preflight requests automatically. No action needed from the client.

---

## Customer Matching

The API automatically checks if a customer already exists based on phone number or email address:

- If a match is found, the existing customer record is updated with any new information provided
- If no match is found, a new customer record is created
- Multiple leads can be associated with the same customer

---

## Lead Status

All leads submitted through this API are created with:

- **Status:** `NEW` (unassigned)
- **Assigned Sales Rep:** `null` (unassigned - admins will assign)
- **Source Type:** `CALL_IN` (for new customers)
- **Created By:** `null` (public submission)

---

## Error Handling Best Practices

### Client-Side Recommendations

1. **Validate required fields** before submitting
2. **Handle rate limiting** - Show user-friendly message and retry after `retryAfter` seconds
3. **Handle CAPTCHA errors** - Re-fetch CAPTCHA token and retry
4. **Show success message** - Confirm submission to user
5. **Log errors** - For debugging, log error responses (but don't expose to users)

### Example Error Handling

```javascript
async function submitLead(formData) {
  try {
    // Get CAPTCHA token
    const captchaToken = await getCaptchaToken();
    
    const response = await fetch('https://your-crm-domain.com/api/public/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData,
        captchaToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited
        const retryAfter = data.retryAfter || 60;
        showError(`Too many requests. Please try again in ${retryAfter} seconds.`);
      } else if (response.status === 400 && data.error.includes('CAPTCHA')) {
        // CAPTCHA failed - retry
        showError('Verification failed. Please try again.');
        // Retry with new CAPTCHA token
      } else {
        // Other error
        showError(data.error || 'An error occurred. Please try again.');
      }
      return;
    }

    // Success
    showSuccess('Thank you! Your request has been submitted successfully.');
    resetForm();
  } catch (error) {
    console.error('Error submitting lead:', error);
    showError('Network error. Please check your connection and try again.');
  }
}
```

---

## Testing

### Test with cURL

```bash
curl -X POST https://your-crm-domain.com/api/public/leads \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "555-1234",
    "leadTypes": ["LANDSCAPING"],
    "captchaToken": "test-token"
  }'
```

### Test Rate Limiting

Submit 6 requests quickly from the same IP to trigger rate limiting.

---

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CAPTCHA_SECRET_KEY` | Google reCAPTCHA secret key | - | No (if CAPTCHA disabled) |
| `CAPTCHA_ENABLED` | Enable/disable CAPTCHA | `"true"` | No |
| `CAPTCHA_SCORE_THRESHOLD` | Minimum score for v3 (0.0-1.0) | `"0.5"` | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `"5"` | No |
| `RATE_LIMIT_WINDOW_MS` | Time window in milliseconds | `"900000"` | No |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | `"*"` | No |

---

## Security Considerations

1. **Rate Limiting:** Prevents abuse and spam
2. **CAPTCHA:** Verifies human submissions
3. **Input Validation:** All inputs are validated and sanitized
4. **CORS:** Restricts origins in production
5. **Error Messages:** Don't expose internal system details
6. **Logging:** All submissions are logged for monitoring

---

## Support

For issues or questions about this API, contact your CRM administrator.
