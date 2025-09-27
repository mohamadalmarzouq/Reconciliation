import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-xero-signature')
    
    // Verify webhook signature
    const webhookKey = process.env.XERO_WEBHOOK_KEY
    if (!webhookKey) {
      console.error('XERO_WEBHOOK_KEY not configured')
      return NextResponse.json({ error: 'Webhook key not configured' }, { status: 500 })
    }
    
    // Verify the signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookKey)
      .update(body)
      .digest('base64')
    
    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // Parse the webhook payload
    const payload = JSON.parse(body)
    console.log('Received Xero webhook:', payload)
    
    // Handle different webhook events
    for (const event of payload.events || []) {
      switch (event.eventType) {
        case 'CREATE':
        case 'UPDATE':
        case 'DELETE':
          console.log(`Handling ${event.eventType} for ${event.eventCategory}`)
          // Here you would process the specific event
          // For now, just log it
          break
        default:
          console.log(`Unknown event type: ${event.eventType}`)
      }
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

export async function GET() {
  // Handle webhook verification
  return NextResponse.json({ message: 'Xero webhook endpoint is active' })
}
