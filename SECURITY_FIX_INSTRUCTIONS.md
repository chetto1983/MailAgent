# Security Fix Instructions

## Critical XSS Vulnerability Fix

### Issue
`EmailDetail.tsx` was using `dangerouslySetInnerHTML` without HTML sanitization, creating an XSS vulnerability.

### Fix Applied
Added DOMPurify sanitization before rendering email HTML content.

### Required Installation

Before running the application, install the required dependency:

```bash
cd frontend
npm install isomorphic-dompurify --save
# or with pnpm
pnpm add isomorphic-dompurify
```

### Why isomorphic-dompurify?

- **isomorphic-dompurify**: Works in both browser and Node.js (SSR compatible with Next.js)
- **Size**: ~45KB minified
- **Security**: Industry standard for HTML sanitization
- **Configuration**: Configurable allowlists for tags and attributes

### Files Modified

- `frontend/components/email/EmailDetail/EmailDetail.tsx` - Added DOMPurify sanitization

### Configuration

The sanitization is configured to:
- ✅ **Allow**: Safe HTML tags (p, strong, em, links, images, tables)
- ✅ **Allow**: Safe attributes (href, src, alt, title, class, style)
- ❌ **Block**: Script tags, iframes, objects, embeds
- ❌ **Block**: Event handlers (onclick, onerror, onload, etc.)
- ❌ **Block**: Data attributes

### Testing

After installation, test with potentially malicious email content:

```html
<!-- This should be sanitized -->
<img src=x onerror="alert('XSS')">
<script>alert('XSS')</script>
<a href="javascript:alert('XSS')">Click me</a>
```

All script execution should be prevented while safe HTML is rendered correctly.

### Build & Lint

Run these commands to verify the fix:

```bash
cd frontend
npm install
npm run lint
npm run build
```

## Additional Security Improvements

### 1. Content Security Policy (CSP)

Add to `next.config.js`:

```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 2. Rate Limiting for Email Viewing

Implement rate limiting to prevent email scraping:

```typescript
// backend/src/modules/email/controllers/emails.controller.ts
@Throttle(100, 60) // 100 requests per minute
@Get(':id')
async getEmail(@Param('id') id: string) {
  // ...
}
```

### 3. Email Link Safety

Warn users about external links in emails:

```typescript
// Optional: Add rel="noopener noreferrer" to all external links
ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style', 'rel'],
ADD_ATTR: ['target', 'rel'],
// In sanitize config, set: ADD_ATTR: ['rel'] and hook to set rel="noopener noreferrer"
```

## References

- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
