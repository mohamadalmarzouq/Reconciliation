import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { promises as fsPromises } from 'fs'

const UPLOAD_DIR = '/app/uploads'

// Ensure upload directory exists
export async function ensureUploadDir() {
  try {
    await fsPromises.access(UPLOAD_DIR)
  } catch {
    await fsPromises.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function saveUploadedFile(file: formidable.File): Promise<string> {
  await ensureUploadDir()
  
  const timestamp = Date.now()
  const filename = `${timestamp}-${file.originalFilename || 'upload'}`
  const filepath = path.join(UPLOAD_DIR, filename)
  
  // Move file from temp location to persistent storage
  await fsPromises.rename(file.filepath, filepath)
  
  return filepath
}

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase()
}

export function isSupportedFileType(filename: string): boolean {
  const supportedExtensions = ['.pdf', '.csv', '.xlsx', '.xls']
  const extension = getFileExtension(filename)
  return supportedExtensions.includes(extension)
}

export function getFileType(filename: string): string {
  const extension = getFileExtension(filename)
  switch (extension) {
    case '.pdf':
      return 'application/pdf'
    case '.csv':
      return 'text/csv'
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case '.xls':
      return 'application/vnd.ms-excel'
    default:
      return 'application/octet-stream'
  }
}