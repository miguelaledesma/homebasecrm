# Testing File Uploads Locally

This guide explains how to test the file upload functionality for quotes locally.

## Quick Start: Testing with Mock Storage (Easiest)

The simplest way to test locally is using **mock storage** (no Railway setup needed).

### Steps:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **The app will automatically use mock storage** (you'll see a warning in console):
   ```
   ⚠️  Using mock storage service. Configure Railway storage credentials for production.
   ```

3. **Test file upload:**
   - Navigate to a quote detail page (e.g., `/quotes/[quoteId]`)
   - Click the "Upload" button
   - Select a file (PDF, Word, Excel, Image, or Text file)
   - File should upload and appear in the file list

### What to Expect with Mock Storage:

- ✅ **Upload works** - Files are converted to data URLs (base64)
- ✅ **Files are stored in database** - File URLs stored as data URLs
- ✅ **Download works** - Files can be downloaded (data URLs)
- ✅ **Delete works** - Files can be deleted from database
- ⚠️ **Limitation** - Files stored as base64 in database (not production-ready)
- ⚠️ **Limitation** - Large files may cause issues (database size limits)

### File Validation (Still Active):

Even with mock storage, file validation is enforced:
- ✅ **Max file size:** 10 MB
- ✅ **Allowed types:** PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Images (.jpg, .png, .gif), Text (.txt)
- ❌ **Invalid files will be rejected** with error messages

## Testing with Railway Storage (More Realistic)

To test with actual Railway storage locally, you need to set up Railway credentials.

### Prerequisites:

1. **Create a Railway Storage Bucket** (see `RAILWAY_STORAGE_SETUP.md`)
2. **Get bucket credentials** from Railway dashboard

### Steps:

1. **Create `.env.local` file** in the project root:

   ```env
   # Railway Storage Configuration
   RAILWAY_STORAGE_BUCKET=your-bucket-name-here
   RAILWAY_STORAGE_ACCESS_KEY_ID=your-access-key-id-here
   RAILWAY_STORAGE_SECRET_ACCESS_KEY=your-secret-access-key-here
   RAILWAY_STORAGE_REGION=us-east-1
   RAILWAY_STORAGE_ENDPOINT=https://your-endpoint.railway.app
   ```

2. **Replace the placeholder values** with your actual Railway bucket credentials

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Verify Railway storage is being used:**
   - You should **NOT** see the mock storage warning
   - Check the browser console and server logs for any errors

5. **Test file upload:**
   - Navigate to a quote detail page
   - Upload a file
   - File should be uploaded to Railway bucket
   - Presigned URLs should be generated for downloads

### What to Expect with Railway Storage:

- ✅ **Upload works** - Files uploaded to Railway bucket
- ✅ **Files stored in bucket** - Not in database (only paths stored)
- ✅ **Presigned URLs** - Generated for secure file access (1 hour expiry)
- ✅ **Download works** - Files downloadable via presigned URLs
- ✅ **Delete works** - Files deleted from bucket
- ✅ **Production-ready** - Same as production environment

## Testing Different Scenarios

### 1. Test Valid File Upload

**What to test:**
- Upload a PDF file (< 10 MB)
- Upload a Word document
- Upload an Excel file
- Upload an image

**Expected result:**
- File appears in the file list
- File name is displayed correctly
- Download button works
- File can be deleted

### 2. Test File Size Limit

**What to test:**
- Upload a file larger than 10 MB

**Expected result:**
- Error message: "File size exceeds 10 MB limit"
- File is not uploaded

### 3. Test Invalid File Type

**What to test:**
- Upload an unsupported file type (e.g., `.exe`, `.zip`, `.mp4`)

**Expected result:**
- Error message: "File type not allowed. Allowed types: PDF, Word, Excel, Images, or Text files"
- File is not uploaded

### 4. Test Permissions (Admin)

**What to test:**
- As ADMIN, upload a file to any quote
- Delete any file from any quote

**Expected result:**
- Upload button visible on all quotes
- Delete button visible on all files

### 5. Test Permissions (Sales Rep)

**What to test:**
- As SALES_REP, upload a file to your own quote
- As SALES_REP, try to upload to someone else's quote
- As SALES_REP, delete your own uploaded file
- As SALES_REP, try to delete someone else's file

**Expected result:**
- Can upload to your own quotes ✅
- Cannot upload to others' quotes ❌ (403 Forbidden)
- Can delete your own files ✅
- Cannot delete others' files ❌ (403 Forbidden)

### 6. Test File Download

**What to test:**
- Click download button on an uploaded file

**Expected result:**
- File opens in new tab (presigned URL)
- File downloads correctly
- File content matches uploaded file

### 7. Test File Delete

**What to test:**
- Upload a file
- Delete the file

**Expected result:**
- File disappears from list
- File deleted from storage (if using Railway)
- Can upload new file with same name

### 8. Test Multiple Files

**What to test:**
- Upload multiple files to the same quote

**Expected result:**
- All files appear in the list
- Each file has unique name (timestamp prefix)
- All files can be downloaded/deleted independently

## Troubleshooting

### File upload not working

**Check:**
1. File size is under 10 MB
2. File type is allowed
3. You have permission to upload (ADMIN or own quote for SALES_REP)
4. Browser console for errors
5. Server logs for errors

### Mock storage warning appears

**If using Railway credentials:**
- Check `.env.local` file exists
- Verify environment variables are set correctly
- Restart the dev server after changing `.env.local`

**If not using Railway credentials:**
- This is expected! Mock storage is fine for local testing

### Presigned URLs not working

**If using Railway storage:**
- Check `RAILWAY_STORAGE_ENDPOINT` is correct
- Verify bucket credentials are valid
- Check Railway bucket logs for errors

### Files not displaying

**Check:**
1. File upload was successful (check server logs)
2. File record exists in database (check `quote_files` table)
3. Presigned URL generation is working
4. Browser console for errors

## Testing Checklist

- [ ] Upload valid PDF file (< 10 MB)
- [ ] Upload valid Word document
- [ ] Upload valid Excel file
- [ ] Upload valid image file
- [ ] Test file size limit (upload > 10 MB file)
- [ ] Test invalid file type
- [ ] Test download functionality
- [ ] Test delete functionality
- [ ] Test as ADMIN (upload to any quote)
- [ ] Test as SALES_REP (upload to own quote only)
- [ ] Test permissions (SALES_REP cannot upload to others' quotes)
- [ ] Test file deletion permissions
- [ ] Upload multiple files to same quote
- [ ] Verify filenames display correctly

## Quick Test Script

Here's a quick way to test the upload API directly:

```bash
# Replace QUOTE_ID with an actual quote ID
QUOTE_ID="your-quote-id-here"

# Test file upload
curl -X POST http://localhost:3000/api/quotes/$QUOTE_ID/files \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -F "file=@/path/to/test-file.pdf"

# Test file list
curl http://localhost:3000/api/quotes/$QUOTE_ID/files \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Test file delete (replace FILE_ID)
FILE_ID="your-file-id-here"
curl -X DELETE http://localhost:3000/api/quotes/$QUOTE_ID/files/$FILE_ID \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## Database Check

To verify files are stored correctly:

```bash
# Connect to database and check quote_files table
npx prisma studio

# Or use psql
psql $DATABASE_URL
SELECT * FROM quote_files WHERE "quoteId" = 'your-quote-id';
```

## Next Steps

Once local testing is complete:
1. Set up Railway Storage Bucket in production
2. Configure environment variables in Railway
3. Test file uploads in production environment
4. Monitor storage usage in Railway dashboard

