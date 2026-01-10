# Railway Storage Buckets Setup Guide

This guide explains how to set up Railway Storage Buckets for file uploads in the quotes system.

## Overview

The application uses Railway Storage Buckets (S3-compatible) for storing quote files. The storage service automatically falls back to mock storage for local development if Railway credentials are not configured.

## Setup Steps

### 1. Create Storage Bucket in Railway

1. Go to your Railway project dashboard
2. Click **"+ New"** button
3. Select **"Bucket"**
4. Choose a region (e.g., `us-east-1`)
5. Optionally set a custom display name
6. Click **"Create"**

### 2. Get Bucket Credentials

Once the bucket is created:

1. Click on the bucket in your Railway project
2. Go to the **"Credentials"** tab
3. You'll see the following environment variables:
   - `BUCKET` - The bucket name
   - `ACCESS_KEY_ID` - Access key for authentication
   - `SECRET_ACCESS_KEY` - Secret key for authentication
   - `REGION` - Region (e.g., `us-east-1`)
   - `ENDPOINT` - S3-compatible endpoint URL

### 3. Configure Environment Variables

#### Option A: Use Railway Variable References (Recommended)

1. Go to your **app service** (not the bucket)
2. Click on **"Variables"** tab
3. Add the following variables using Railway's variable reference syntax:

```bash
RAILWAY_STORAGE_BUCKET=${BUCKET.BUCKET}
RAILWAY_STORAGE_ACCESS_KEY_ID=${BUCKET.ACCESS_KEY_ID}
RAILWAY_STORAGE_SECRET_ACCESS_KEY=${BUCKET.SECRET_ACCESS_KEY}
RAILWAY_STORAGE_REGION=${BUCKET.REGION}
RAILWAY_STORAGE_ENDPOINT=${BUCKET.ENDPOINT}
```

Replace `BUCKET` with your actual bucket service name if different.

#### Option B: Manual Configuration

If variable references don't work, manually copy the values:

```bash
RAILWAY_STORAGE_BUCKET=your-bucket-name
RAILWAY_STORAGE_ACCESS_KEY_ID=your-access-key-id
RAILWAY_STORAGE_SECRET_ACCESS_KEY=your-secret-access-key
RAILWAY_STORAGE_REGION=us-east-1
RAILWAY_STORAGE_ENDPOINT=https://your-endpoint.railway.app
```

### 4. For Local Development

Create a `.env.local` file with the credentials:

```env
RAILWAY_STORAGE_BUCKET=your-bucket-name
RAILWAY_STORAGE_ACCESS_KEY_ID=your-access-key-id
RAILWAY_STORAGE_SECRET_ACCESS_KEY=your-secret-access-key
RAILWAY_STORAGE_REGION=us-east-1
RAILWAY_STORAGE_ENDPOINT=https://your-endpoint.railway.app
```

**Note:** For local development, if you don't set these variables, the app will use mock storage (files stored as data URLs in the database).

## How It Works

1. **Upload Flow:**
   - User uploads a file from the quote detail page
   - File is validated (size limit: 10MB, allowed types: PDF, Word, Excel, Images, Text)
   - File is uploaded to Railway bucket with path: `quotes/{quoteId}/{timestamp}-{filename}`
   - File path is stored in database (`QuoteFile` table)
   - Presigned URL (valid for 1 hour) is returned to client

2. **Download Flow:**
   - When files are fetched, presigned URLs are generated (valid for 1 hour)
   - Users can download files using these temporary URLs
   - URLs automatically expire after 1 hour for security

3. **Delete Flow:**
   - File is deleted from Railway bucket
   - File record is removed from database

## File Validation

- **Max file size:** 10 MB
- **Allowed types:**
  - PDF (`application/pdf`)
  - Word documents (`doc`, `docx`)
  - Excel files (`xls`, `xlsx`)
  - Images (`jpg`, `jpeg`, `png`, `gif`)
  - Text files (`txt`)

## Permissions

- **Upload:**
  - ADMIN: Can upload to any quote
  - SALES_REP: Can upload to their own quotes only

- **Delete:**
  - ADMIN: Can delete any file
  - SALES_REP: Can delete files they uploaded

- **View:**
  - ADMIN: Can view all files
  - SALES_REP: Can view files for their own quotes

## Storage Costs

Railway Storage Buckets pricing:
- **Storage:** $0.015 per GB per month
- **Egress:** Free (no bandwidth charges)
- **Operations:** Free (PUT, GET requests)

**Example costs:**
- 1 GB stored: $0.015/month
- 10 GB stored: $0.15/month
- 100 GB stored: $1.50/month

## Troubleshooting

### Files not uploading

1. Check that all environment variables are set correctly
2. Verify bucket credentials are valid
3. Check Railway bucket logs for errors
4. Ensure file size is under 10MB limit
5. Verify file type is allowed

### Presigned URLs not working

1. Check that `RAILWAY_STORAGE_ENDPOINT` is set correctly
2. Verify S3 client is configured properly
3. Check that file path stored in database matches the bucket key

### Fallback to mock storage

If Railway credentials are not configured, the app will automatically use mock storage. You'll see a warning in the console:
```
⚠️  Using mock storage service. Configure Railway storage credentials for production.
```

This is fine for local development but should be fixed for production.

## Security Notes

- Files are stored in private buckets (not publicly accessible)
- Presigned URLs expire after 1 hour
- Only authenticated users can access files
- File access is controlled by quote permissions
- File deletion requires proper permissions

## Next Steps

1. Set up the Railway bucket following steps above
2. Configure environment variables
3. Test file upload/download functionality
4. Monitor storage usage in Railway dashboard

