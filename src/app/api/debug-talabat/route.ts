import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const talabatFile = formData.get('talabatFile') as File

    if (!talabatFile) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Debug: Received file:', {
      name: talabatFile.name,
      size: talabatFile.size,
      type: talabatFile.type
    })

    // Save file
    const uploadDir = '/app/uploads'
    await mkdir(uploadDir, { recursive: true })
    
    const fileName = `debug_talabat_${Date.now()}_${talabatFile.name}`
    const filePath = join(uploadDir, fileName)
    const buffer = Buffer.from(await talabatFile.arrayBuffer())
    await writeFile(filePath, buffer)

    console.log('Debug: File saved to:', filePath)

    let textContent = ''
    let extractionMethod = ''

    // Try AWS Textract first
    try {
      const { TextractClient, AnalyzeDocumentCommand } = await import('@aws-sdk/client-textract')
      const fs = await import('fs')
      
      const textractClient = new TextractClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })

      const fileBuffer = fs.readFileSync(filePath)
      
      const command = new AnalyzeDocumentCommand({
        Document: { Bytes: fileBuffer },
        FeatureTypes: ['TABLES', 'FORMS']
      })

      const result = await textractClient.send(command)
      
      if (result.Blocks) {
        textContent = result.Blocks
          .filter(block => block.BlockType === 'LINE')
          .map(block => block.Text)
          .join('\n')
        extractionMethod = 'AWS Textract'
        console.log('Debug: Textract extracted', result.Blocks.length, 'blocks')
      }
    } catch (textractError) {
      console.log('Debug: Textract failed:', textractError)
      extractionMethod = 'Textract Failed'
    }

    // Try basic file parsing fallback
    if (!textContent) {
      try {
        const { parseFile } = await import('@/lib/fileParser')
        const transactions = await parseFile(filePath, talabatFile.type)
        
        if (transactions.length > 0) {
          textContent = transactions.map(t => 
            `${t.date} | ${t.description} | ${t.amount} | ${t.type}`
          ).join('\n')
          extractionMethod = 'Basic File Parser'
          console.log('Debug: Basic parser found', transactions.length, 'transactions')
        }
      } catch (parseError) {
        console.log('Debug: Basic parsing failed:', parseError)
        extractionMethod = 'All Methods Failed'
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        fileName: talabatFile.name,
        fileSize: talabatFile.size,
        fileType: talabatFile.type,
        extractionMethod,
        textLength: textContent.length,
        sampleText: textContent.substring(0, 2000),
        hasAwsCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
        awsRegion: process.env.AWS_REGION || 'us-east-1'
      }
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
