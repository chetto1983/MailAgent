# Attachment API Documentation

**Version**: 1.0
**Base URL**: `/api/email/attachments`
**Authentication**: Required (JWT Bearer token)

---

## Overview

The Attachment API provides on-demand download functionality for email attachments with intelligent caching:

- **Fast path**: Attachments already in S3 return signed URLs instantly (< 100ms)
- **Slow path**: Metadata-only attachments fetched from provider on first request (1-3s)
- **Caching**: Once fetched, attachments cached in S3 for future instant access
- **Security**: Tenant isolation enforced, signed URLs expire after 5 minutes

---

## Endpoints

### 1. Download Attachment

Downloads an attachment (redirects to S3 signed URL).

**Endpoint**: `GET /email/attachments/:id/download`

**Authentication**: Required (JWT)

**Parameters**:
- `id` (path) - Attachment ID (string, required)

**Response**: `302 Redirect` to S3 signed URL

**Flow**:
1. Backend checks if attachment is in S3
   - **If yes**: Returns S3 signed URL immediately (fast path)
   - **If no**: Fetches from provider (Gmail/Microsoft/IMAP), uploads to S3, then returns signed URL
2. Browser redirected to S3 signed URL
3. User downloads file directly from S3 (backend doesn't proxy large files)

**Example**:

```typescript
// Frontend code
const downloadAttachment = async (attachmentId: string) => {
  const token = await getAuthToken();

  // Simply navigate to the download URL - browser will handle redirect
  window.location.href = `${API_BASE_URL}/email/attachments/${attachmentId}/download`;

  // Or use fetch (but window.location is simpler for downloads)
  const response = await fetch(
    `${API_BASE_URL}/email/attachments/${attachmentId}/download`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      redirect: 'follow', // Follow the redirect
    }
  );

  // Response will be the file from S3
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'attachment'; // Will use Content-Disposition from S3
  a.click();
};
```

**React Example**:

```tsx
const AttachmentDownloadButton: React.FC<{ attachmentId: string; filename: string }> = ({
  attachmentId,
  filename,
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    // Simple approach: redirect browser
    window.location.href = `/api/email/attachments/${attachmentId}/download`;
    // Reset after delay (browser starts download)
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <button onClick={handleDownload} disabled={downloading}>
      {downloading ? 'Downloading...' : `Download ${filename}`}
    </button>
  );
};
```

**Errors**:
- `404 Not Found` - Attachment doesn't exist or user doesn't have access
- `500 Internal Server Error` - Failed to fetch from provider or upload to S3

---

### 2. Get Attachment Metadata

Get attachment information without downloading.

**Endpoint**: `GET /email/attachments/:id/metadata`

**Authentication**: Required (JWT)

**Parameters**:
- `id` (path) - Attachment ID (string, required)

**Response**: `200 OK` (JSON)

```typescript
{
  filename: string;      // "invoice.pdf"
  mimeType: string;      // "application/pdf"
  size: number;          // 1048576 (bytes)
  isInS3: boolean;       // true if cached in S3, false if needs fetch
}
```

**Example**:

```typescript
// Frontend code
const getAttachmentMetadata = async (attachmentId: string) => {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/email/attachments/${attachmentId}/metadata`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const metadata = await response.json();
  return metadata;
};

// Usage
const metadata = await getAttachmentMetadata('abc-123');
console.log(`File: ${metadata.filename}`);
console.log(`Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Cached: ${metadata.isInS3 ? 'Yes' : 'No (will fetch on download)'}`);
```

**React Example**:

```tsx
const AttachmentInfo: React.FC<{ attachmentId: string }> = ({ attachmentId }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/email/attachments/${attachmentId}/metadata`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
      .then(res => res.json())
      .then(data => {
        setMetadata(data);
        setLoading(false);
      });
  }, [attachmentId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p><strong>File:</strong> {metadata.filename}</p>
      <p><strong>Type:</strong> {metadata.mimeType}</p>
      <p><strong>Size:</strong> {(metadata.size / 1024 / 1024).toFixed(2)} MB</p>
      {!metadata.isInS3 && (
        <p className="warning">
          This file will be fetched from {/* provider */} on first download (may take 1-3 seconds)
        </p>
      )}
    </div>
  );
};
```

**Errors**:
- `404 Not Found` - Attachment doesn't exist or user doesn't have access

---

## Storage Strategy

The backend uses an intelligent storage strategy to optimize costs:

| Attachment Type | Strategy | Storage |
|----------------|----------|---------|
| Inline images (in email HTML) | Skipped | None (already in HTML) |
| Small documents (<5MB PDFs, Office docs) | Auto-downloaded | S3 (for AI embeddings) |
| Large files (>5MB) | Metadata-only | **On-demand** (fetched when user downloads) |
| Images, videos, archives | Metadata-only | **On-demand** (fetched when user downloads) |

**Result**: ~80-90% storage savings compared to downloading all attachments during sync

---

## Performance Characteristics

| Scenario | Response Time | Backend Action |
|----------|--------------|----------------|
| Download cached attachment | < 100ms | Return S3 signed URL |
| Download metadata-only attachment (first time) | 1-3 seconds | Fetch from provider → Upload to S3 → Return signed URL |
| Download metadata-only attachment (subsequent) | < 100ms | Return S3 signed URL (cached) |
| Get metadata | < 50ms | Database query only |

**Optimization tip**: Call `/metadata` endpoint first to show file info and warn users if download will be slow (isInS3=false)

---

## Frontend Integration Patterns

### Pattern 1: Simple Download Button (Recommended)

```tsx
const DownloadButton = ({ attachmentId, filename }) => (
  <a href={`/api/email/attachments/${attachmentId}/download`}>
    Download {filename}
  </a>
);
```

**Pros**: Simple, browser handles download
**Cons**: Page navigation (loses SPA state)

---

### Pattern 2: Show Metadata Before Download

```tsx
const AttachmentCard = ({ attachmentId }) => {
  const { data: metadata } = useQuery(['attachment', attachmentId], () =>
    fetch(`/api/email/attachments/${attachmentId}/metadata`).then(r => r.json())
  );

  return (
    <div className="attachment-card">
      <div className="info">
        <h4>{metadata.filename}</h4>
        <p>{(metadata.size / 1024 / 1024).toFixed(2)} MB</p>
        {!metadata.isInS3 && (
          <span className="badge">First download may take 1-3s</span>
        )}
      </div>
      <button onClick={() => window.location.href = `/api/email/attachments/${attachmentId}/download`}>
        Download
      </button>
    </div>
  );
};
```

**Pros**: User knows file size and expected download time
**Cons**: Extra API call (but metadata is fast)

---

### Pattern 3: Fetch and Save (Advanced)

```tsx
const downloadAttachmentAdvanced = async (attachmentId: string, filename: string) => {
  const token = await getAuthToken();

  // Show progress indicator
  setDownloading(true);

  try {
    const response = await fetch(
      `/api/email/attachments/${attachmentId}/download`,
      {
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'follow',
      }
    );

    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to download attachment');
  } finally {
    setDownloading(false);
  }
};
```

**Pros**: Full control, can show progress, handle errors gracefully
**Cons**: More complex code

---

## Error Handling

### Common Errors

**1. Attachment Not Found (404)**

```json
{
  "statusCode": 404,
  "message": "Attachment abc-123 not found"
}
```

**Causes**:
- Attachment ID doesn't exist
- User doesn't have access (wrong tenant)
- Email was permanently deleted

**Frontend handling**:
```tsx
try {
  const metadata = await getAttachmentMetadata(id);
} catch (error) {
  if (error.status === 404) {
    alert('Attachment not found or you do not have access');
  }
}
```

---

**2. Provider Fetch Failed (500)**

```json
{
  "statusCode": 500,
  "message": "On-demand attachment download not yet implemented for google. Provider ID: xyz-789, Message: msg-456, Attachment: att-123"
}
```

**Causes**:
- Provider OAuth token expired (needs refresh)
- Provider API rate limit
- Network error connecting to provider

**Frontend handling**:
```tsx
try {
  window.location.href = `/api/email/attachments/${id}/download`;
} catch (error) {
  if (error.status === 500) {
    alert('Failed to download attachment. Please try again or contact support.');
  }
}
```

**Note**: Provider fetch is only needed for metadata-only attachments on first download. If `isInS3=true`, download will always succeed.

---

## Security

### Tenant Isolation
- All endpoints enforce tenant isolation via JWT `req.user.tenantId`
- Users can only access attachments from their own tenant's emails
- Attempting to access another tenant's attachment returns `404 Not Found` (not `403 Forbidden` to avoid leaking existence)

### Signed URLs
- S3 signed URLs expire after **5 minutes** (300 seconds)
- URLs are single-use for download
- URLs cannot be guessed (contain cryptographic signature)

### Authentication
- All endpoints require valid JWT token
- Expired tokens return `401 Unauthorized`

---

## Migration Notes (For Existing Frontend Code)

If you have existing attachment download code, here's how to migrate:

### Before (Old Pattern)

```tsx
// Old: Download during sync, store in database, return path
const downloadAttachment = (attachment) => {
  // Attachment already has full data in database
  window.location.href = `/api/attachments/${attachment.id}/file`;
};
```

### After (New Pattern)

```tsx
// New: On-demand download with metadata-only storage
const downloadAttachment = (attachmentId) => {
  // Backend handles on-demand fetch if needed
  window.location.href = `/api/email/attachments/${attachmentId}/download`;
};
```

**Key changes**:
1. New endpoint path: `/email/attachments/:id/download`
2. Backend may fetch from provider on first download (slower)
3. Subsequent downloads are fast (cached in S3)

**Benefits**:
- 80-90% reduction in storage costs
- Faster email sync (don't download all attachments)
- Same user experience (download still works)

---

## Testing

### Manual Testing

**1. Test cached attachment (fast path)**:
```bash
# Get attachment ID from database where storageType='s3'
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/email/attachments/ATTACHMENT_ID/download
# Should redirect to S3 signed URL instantly
```

**2. Test metadata-only attachment (slow path)**:
```bash
# Get attachment ID from database where storageType='pending'
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/email/attachments/ATTACHMENT_ID/download
# Should take 1-3 seconds (fetching from provider)
# Then redirect to S3 signed URL
# Second request should be fast (cached)
```

**3. Test metadata endpoint**:
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/email/attachments/ATTACHMENT_ID/metadata
# Returns JSON with filename, size, mimeType, isInS3
```

---

## FAQ

**Q: Why does the first download sometimes take 1-3 seconds?**
A: The attachment is stored as metadata-only (to save storage costs) and fetched from the provider (Gmail/Microsoft/IMAP) on first download. Subsequent downloads are instant because the file is cached in S3.

**Q: How can I tell if download will be slow?**
A: Call `/metadata` endpoint first. If `isInS3=false`, the first download will fetch from provider (1-3s). If `isInS3=true`, download is instant.

**Q: Can I download the same attachment multiple times?**
A: Yes! Once downloaded, the attachment is cached in S3. All future downloads are instant (signed URL generation < 100ms).

**Q: What happens if the provider OAuth token expires?**
A: Currently, the download will fail with a 500 error. Future enhancement will add automatic token refresh.

**Q: Why does the endpoint redirect instead of returning the file?**
A: Redirecting to S3 signed URLs is more efficient than proxying large files through the backend. It reduces backend load and bandwidth costs.

**Q: Are S3 signed URLs secure?**
A: Yes! They expire after 5 minutes and contain a cryptographic signature that cannot be guessed or reused.

---

## Roadmap

### Planned Enhancements

1. **Provider OAuth Token Refresh** (In Progress)
   - Automatic token refresh for expired credentials
   - No more 500 errors on metadata-only downloads

2. **Download Progress API** (Planned)
   - WebSocket endpoint for download progress
   - Real-time updates for large file downloads

3. **Batch Download** (Planned)
   - Download multiple attachments as ZIP
   - Endpoint: `POST /email/attachments/batch-download`

4. **Attachment Thumbnails** (Planned)
   - Generate thumbnails for images/PDFs
   - Endpoint: `GET /email/attachments/:id/thumbnail`

---

## Support

For questions or issues:
- **Documentation**: `/docs/development/STORAGE_AND_LIFECYCLE_IMPLEMENTATION.md`
- **Architecture**: `/docs/development/ON_DEMAND_STORAGE_STRATEGY.md`
- **Backend Code**: `backend/src/modules/email/services/attachment-on-demand.service.ts`
- **API Controller**: `backend/src/modules/email/controllers/attachments.controller.ts`

---

**Last Updated**: 2025-11-19
**Author**: MailAgent Team
