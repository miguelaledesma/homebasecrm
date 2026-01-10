/**
 * Storage abstraction for file uploads
 * Supports both Railway Storage Buckets (S3-compatible) and mock storage for development
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export interface StorageService {
  uploadFile(file: File, path: string): Promise<string>
  deleteFile(url: string): Promise<void>
  getFileUrl(path: string, expiresIn?: number): Promise<string>
}

/**
 * Railway Storage Buckets (S3-compatible) service
 * Uses Railway's S3-compatible endpoint for file storage
 */
export class RailwayS3StorageService implements StorageService {
  private s3Client: S3Client
  private bucket: string

  constructor() {
    // Get Railway bucket credentials from environment variables
    const accessKeyId = process.env.RAILWAY_STORAGE_ACCESS_KEY_ID
    const secretAccessKey = process.env.RAILWAY_STORAGE_SECRET_ACCESS_KEY
    // Railway may say "auto" for region, use us-east-1 as default for S3 SDK
    const region = process.env.RAILWAY_STORAGE_REGION === "auto" 
      ? "us-east-1" 
      : (process.env.RAILWAY_STORAGE_REGION || "us-east-1")
    const endpoint = process.env.RAILWAY_STORAGE_ENDPOINT
    this.bucket = process.env.RAILWAY_STORAGE_BUCKET || ""

    if (!accessKeyId || !secretAccessKey || !this.bucket) {
      throw new Error(
        "Railway storage credentials not configured. Please set RAILWAY_STORAGE_ACCESS_KEY_ID, RAILWAY_STORAGE_SECRET_ACCESS_KEY, and RAILWAY_STORAGE_BUCKET environment variables."
      )
    }

    // Create S3 client configured for Railway's endpoint
    this.s3Client = new S3Client({
      region,
      endpoint: endpoint || undefined, // Railway provides custom endpoint
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Railway uses S3-compatible API but may need forcePathStyle
      forcePathStyle: !endpoint || endpoint.includes("railway"), // Use path-style if Railway endpoint
    })
  }

  async uploadFile(file: File, path: string): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
      Metadata: {
        originalName: file.name,
      },
    })

    await this.s3Client.send(command)

    // Return the path (not a URL) - we'll generate presigned URLs when needed
    return path
  }

  async deleteFile(urlOrPath: string): Promise<void> {
    // Extract key from URL or use path directly
    let key = urlOrPath
    if (urlOrPath.includes("/")) {
      // If it's a full URL, extract the key part
      try {
        const url = new URL(urlOrPath)
        key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname
      } catch {
        // Not a URL, assume it's already a key/path
        key = urlOrPath
      }
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    await this.s3Client.send(command)
  }

  async getFileUrl(path: string, expiresIn: number = 3600): Promise<string> {
    // Generate presigned URL for secure file access
    // Railway buckets are private, so we need presigned URLs
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    })

    const url = await getSignedUrl(this.s3Client, command, { expiresIn })
    return url
  }
}

/**
 * Mock storage service for development/local testing
 * Converts files to data URLs (stores in database)
 * NOT recommended for production
 */
export class MockStorageService implements StorageService {
  async uploadFile(file: File, path: string): Promise<string> {
    // For MVP/development, convert to data URL
    // In production, this should NOT be used
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
    // No-op for mock storage
    return Promise.resolve()
  }

  async getFileUrl(path: string): Promise<string> {
    // For mock storage, the path is already a data URL
    return Promise.resolve(path)
  }
}

/**
 * Factory function to create the appropriate storage service
 * Uses Railway S3 if credentials are available, otherwise falls back to mock
 */
function createStorageService(): StorageService {
  // Check if Railway storage credentials are configured
  const hasRailwayConfig =
    process.env.RAILWAY_STORAGE_ACCESS_KEY_ID &&
    process.env.RAILWAY_STORAGE_SECRET_ACCESS_KEY &&
    process.env.RAILWAY_STORAGE_BUCKET

  if (hasRailwayConfig) {
    try {
      return new RailwayS3StorageService()
    } catch (error) {
      console.error("Failed to initialize Railway S3 storage, falling back to mock:", error)
      return new MockStorageService()
    }
  }

  // Always fall back to mock storage if credentials not configured
  // This allows the app to build and run locally without Railway credentials
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "⚠️  Using mock storage service. Configure Railway storage credentials for production."
    )
  }
  
  return new MockStorageService()
}

// Use a lazy getter to avoid initialization errors during build
let storageInstance: StorageService | null = null

function getStorage(): StorageService {
  if (!storageInstance) {
    storageInstance = createStorageService()
  }
  return storageInstance
}

export const storage = new Proxy({} as StorageService, {
  get(target, prop) {
    const instance = getStorage()
    const value = (instance as any)[prop]
    if (typeof value === "function") {
      return value.bind(instance)
    }
    return value
  },
})
