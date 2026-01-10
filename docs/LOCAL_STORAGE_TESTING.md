# Testing File Uploads Locally

This guide explains how to test the file upload functionality locally before deploying to Railway.

## Option 1: Mock Storage (Easiest - Recommended for Local Testing)

The application automatically falls back to **mock storage** when Railway credentials are not configured. This is the easiest way to test locally.

### How It Works

- Files are converted to **data URLs** (base64 encoded)
- Data URLs are stored directly in the database
- No external storage service needed
- Works immediately without any setup

### Setup

**No setup required!** Just start the app:

```bash
npm run dev
```

The app will automatically use mock storage and you'll see this warning in the console:
```
⚠️  Using mock storage service. Configure Railway storage credentials for production.
```

### Testing

1. Navigate to any quote detail page: `http://localhost:3000/quotes/[quote-id]`
2. Click the **"Upload"** button in the Files section
3. Select a file (PDF, Word, Excel, Image, or Text file)
4. File should upload successfully
5. Click **"Download"** to view the file
6. Click **"Delete"** to remove the file

### Limitations of Mock Storage

- Files are stored as data URLs in the database (bloats DB)
- Not suitable for production
- Large files (>1MB) may cause issues
- Files are lost if database is reset

**But perfect for local development and testing!**

---

## Option 2: Test with Railway Storage (Real Integration)

If you want to test with actual Railway Storage Buckets locally:

### Step 1: Create Railway Bucket

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Bucket"**
3. Choose a region and create the bucket

### Step 2: Get Credentials

1. Click on the bucket
2. Go to **"Credentials"** tab
3. Copy the values for:
   - `BUCKET`
   - `ACCESS_KEY_ID`
   - `SECRET_ACCESS_KEY`
   - `REGION`
   - `ENDPOINT`

### Step 3: Configure Local Environment

Create a `.env.local` file in the project root (or update existing `.env`):

```env
# Railway Storage Bucket Credentials
RAILWAY_STORAGE_BUCKET=your-bucket-name
RAILWAY_STORAGE_ACCESS_KEY_ID=your-access-key-id
RAILWAY_STORAGE_SECRET_ACCESS_KEY=your-secret-access-key
RAILWAY_STORAGE_REGION=us-east-1
RAILWAY_STORAGE_ENDPOINT=https://your-endpoint.railway.app

# Your existing env vars
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

Now the app will use Railway Storage Buckets instead of mock storage!

### Testing with Railway Storage

1. Upload files as described above
2. Files will be stored in your Railway bucket
3. Download generates presigned URLs (valid for 1 hour)
4. Files persist in Railway (not in database)

---

## Option 3: Local S3-Compatible Service (Advanced)

For completely local testing without Railway, you can use **LocalStack** or **MinIO**:

### Using LocalStack

1. **Install LocalStack:**
   ```bash
   docker run --rm -it -p 4566:4566 -p 4571:4571 localstack/localstack
   ```

2. **Update `.env.local`:**
   ```env
   RAILWAY_STORAGE_BUCKET=test-bucket
   RAILWAY_STORAGE_ACCESS_KEY_ID=test
   RAILWAY_STORAGE_SECRET_ACCESS_KEY=test
   RAILWAY_STORAGE_REGION=us-east-1
   RAILWAY_STORAGE_ENDPOINT=http://localhost:4566
   ```

3. **Create bucket:**
   ```bash
   aws --endpoint-url=http://localhost:4566 s3 mb s3://test-bucket
   ```

This is more complex but tests the full S3 integration locally.

---

## Quick Test Checklist

Use this checklist to verify everything works:

### Upload Testing
- [ ] Can upload a PDF file (< 10MB)
- [ ] Can upload a Word document
- [ ] Can upload an Excel file
- [ ] Can upload an image (JPG/PNG)
- [ ] Cannot upload file > 10MB (shows error)
- [ ] Cannot upload unsupported file type (shows error)
- [ ] Upload button only visible if user has permission

### Download Testing
- [ ] Can download uploaded file
- [ ] File opens correctly in browser
- [ ] Download works for all file types

### Delete Testing
- [ ] Can delete own uploaded files (SALES_REP)
- [ ] ADMIN can delete any file
- [ ] Cannot delete files uploaded by others (SALES_REP)
- [ ] File is removed from list after deletion

### Permission Testing
- [ ] ADMIN can upload to any quote
- [ ] SALES_REP can upload to their own quotes
- [ ] SALES_REP cannot upload to other quotes
- [ ] Files show correct uploader information

---

## Troubleshooting

### "Storage service not configured" Error

This shouldn't happen with mock storage fallback. If you see this:
1. Check that `NODE_ENV` is not set to `"production"` locally
2. Ensure you're running `npm run dev` (not `npm run build && npm start`)
3. Check console for the mock storage warning

### Files Not Uploading

1. **Check file size:** Must be under 10MB
2. **Check file type:** Only PDF, Word, Excel, Images, Text allowed
3. **Check browser console:** Look for error messages
4. **Check server logs:** Look for upload errors
5. **Verify permissions:** Ensure user can upload to that quote

### Files Not Downloading

1. **Check browser console:** Look for presigned URL errors
2. **Verify file exists:** Check database for file record
3. **Try refreshing:** Presigned URLs expire after 1 hour

### Mock Storage Files Not Showing

1. **Check database:** Verify `QuoteFile` records exist
2. **Refresh page:** File list should update
3. **Check browser console:** Look for fetch errors

---

## Testing Different Scenarios

### Test as ADMIN User

1. Sign in as admin (usually `admin@homebasecrm.com`)
2. Navigate to any quote
3. Should see "Upload" button
4. Should be able to upload files
5. Should be able to delete any file

### Test as SALES_REP User

1. Sign in as sales rep
2. Navigate to a quote assigned to you
3. Should see "Upload" button
4. Should be able to upload files
5. Should be able to delete files you uploaded
6. Navigate to a quote NOT assigned to you
7. Should NOT see "Upload" button (if viewing quote detail page)

---

## Best Practice for Local Development

**Recommended approach:**
1. Use **mock storage** for most local development (Option 1)
2. Test with **Railway Storage** before deploying (Option 2)
3. Only use **LocalStack** if you need to test S3-specific features (Option 3)

Mock storage is sufficient for:
- UI/UX testing
- File validation testing
- Permission testing
- Basic functionality testing

Railway Storage testing is needed for:
- Presigned URL generation
- Actual file persistence
- Production-like behavior
- Performance testing with large files

---

## Example Test Flow

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Create a test quote:**
   - Navigate to a lead
   - Create a quote
   - Or use an existing quote

3. **Test upload:**
   - Go to quote detail page
   - Click "Upload" button
   - Select a test PDF (small file, < 1MB)
   - Verify file appears in list

4. **Test download:**
   - Click download icon next to file
   - Verify file opens in new tab
   - Verify file content is correct

5. **Test delete:**
   - Click delete icon next to file
   - Confirm deletion
   - Verify file disappears from list

6. **Test validation:**
   - Try uploading a file > 10MB (should fail)
   - Try uploading an unsupported type (should fail)
   - Verify error messages are clear

---

## Next Steps

After local testing:
1. Deploy to Railway
2. Configure Railway bucket credentials in Railway dashboard
3. Test in production environment
4. Monitor Railway bucket usage and costs

