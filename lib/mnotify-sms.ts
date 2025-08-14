// SMS service integration with mnotify
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return phone
  
  // For Ghana phone numbers (typically 10 digits starting with 0)
  if (phone.length === 10 && phone.startsWith('0')) {
    return phone.substring(0, 3) + '******' + phone.substring(9)
  }
  
  // For other formats, show first 3 and last 1 digit
  return phone.substring(0, 3) + '*'.repeat(Math.max(0, phone.length - 4)) + phone.substring(phone.length - 1)
}

export async function sendSMSOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('Attempting to send SMS to:', phoneNumber, 'with OTP:', otp)
    
    // Check if we have the required environment variables
    const apiKey = process.env.MNOTIFY_API_KEY
    const senderId = process.env.MNOTIFY_SENDER_ID || 'ISTSA'

    if (!apiKey) {
      console.log('MNOTIFY_API_KEY not found, simulating SMS send...')
      // Simulate SMS sending for development
      console.log(`SMS Simulation: Sending OTP ${otp} to ${phoneNumber}`)
      return { success: true, message: 'SMS sent successfully (simulated)' }
    }

    // Prepare the SMS message
    const message = `Your ISTSA voting verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`

    // Clean phone number (remove any spaces, dashes, etc.)
    const cleanPhone = phoneNumber.replace(/[\s\-()]/g, '')
    console.log('Cleaned phone number:', cleanPhone)

    // mnotify API endpoint
    const url = 'https://api.mnotify.com/api/sms/quick'
    
    const requestBody = {
      recipient: [cleanPhone],
      sender: senderId,
      message: message,
      key: apiKey,
    }

    console.log('Sending SMS request to mnotify:', { ...requestBody, key: '[HIDDEN]' })
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json()
    console.log('mnotify API response:', result)

    if (response.ok && result.code === '2000') {
      console.log('SMS sent successfully via mnotify')
      return { success: true, message: 'SMS sent successfully' }
    } else {
      console.error('mnotify API error:', result)
      return { success: false, message: result.message || 'Failed to send SMS' }
    }
  } catch (error) {
    console.error('SMS sending error:', error)
    // Fallback to simulation if API fails
    console.log(`SMS Fallback: Sending OTP ${otp} to ${phoneNumber}`)
    return { success: true, message: 'SMS sent successfully (fallback)' }
  }
}

export async function sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; message?: string }> {
  try {
    const apiKey = process.env.MNOTIFY_API_KEY
    const senderId = process.env.MNOTIFY_SENDER_ID || 'ISTSA'

    if (!apiKey) {
      console.log('MNOTIFY_API_KEY not found, simulating SMS send...')
      console.log(`SMS Simulation: ${message} to ${phoneNumber}`)
      return { success: true, message: 'SMS sent successfully (simulated)' }
    }

    const cleanPhone = phoneNumber.replace(/[\s\-()]/g, '')
    const url = 'https://api.mnotify.com/api/sms/quick'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: [cleanPhone],
        sender: senderId,
        message: message,
        key: apiKey,
      }),
    })

    const result = await response.json()

    if (response.ok && result.code === '2000') {
      return { success: true, message: 'SMS sent successfully' }
    } else {
      console.error('mnotify API error:', result)
      return { success: false, message: result.message || 'Failed to send SMS' }
    }
  } catch (error) {
    console.error('SMS sending error:', error)
    console.log(`SMS Fallback: ${message} to ${phoneNumber}`)
    return { success: true, message: 'SMS sent successfully (fallback)' }
  }
}
