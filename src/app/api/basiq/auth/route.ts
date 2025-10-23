import { NextResponse } from 'next/server';

// Get Basiq access token
export async function GET() {
  const BASIQ_API_KEY = process.env.BASIQ_API_KEY;
  
  console.log('Basiq auth endpoint called');
  console.log('BASIQ_API_KEY exists:', !!BASIQ_API_KEY);
  
  if (!BASIQ_API_KEY) {
    console.error('BASIQ_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'BASIQ_API_KEY environment variable is required' },
      { status: 500 }
    );
  }
  
  try {
    console.log('Attempting to authenticate with Basiq...');
    console.log('API Key:', BASIQ_API_KEY);
    
    // Decode the API key to get the clientId:secret format
    const decoded = Buffer.from(BASIQ_API_KEY, 'base64').toString('utf8');
    console.log('Decoded API key:', decoded);
    
    // According to Basiq API docs: Use clientId:secret format for Basic auth
    const authString = decoded;
    const encodedAuth = Buffer.from(authString).toString('base64');
    console.log('Auth string:', authString);
    console.log('Encoded auth:', encodedAuth);
    
    const response = await fetch('https://au-api.basiq.io/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'basiq-version': '3.0'
      },
      body: '{}'
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Basiq API error response:', errorData);
      throw new Error(`Basiq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Basiq authentication successful');
    
    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in
    });
  } catch (error: any) {
    console.error('Basiq auth error:', error.message);
    return NextResponse.json(
      { error: 'Failed to authenticate with Basiq', details: error.message },
      { status: 500 }
    );
  }
}
