/**
 * Simple storage abstraction for file uploads
 * For MVP, we'll use in-memory storage (just store file URLs)
 * Later this can be abstracted to S3, Supabase Storage, etc.
 */

export interface StorageService {
  uploadFile(file: File, path: string): Promise<string>
  deleteFile(url: string): Promise<void>
}

/**
 * Mock storage service that just returns a data URL
 * In production, this would upload to S3/Supabase and return the public URL
 */
export class MockStorageService implements StorageService {
  async uploadFile(file: File, path: string): Promise<string> {
    // For MVP, convert to data URL
    // In production, upload to S3/Supabase and return public URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async deleteFile(url: string): Promise<void> {
    // For MVP, no-op since we're using data URLs
    // In production, delete from S3/Supabase
    return Promise.resolve()
  }
}

export const storage = new MockStorageService()

