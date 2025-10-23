import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BASIQ_API_URL = 'https://au-api.basiq.io';

interface ConnectRequest {
  accessToken: string;
  userId: string;
  institutionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, userId, institutionId }: ConnectRequest = await request.json();

    if (!accessToken || !userId || !institutionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Create a connection request
    const response = await axios.post(
      `${BASIQ_API_URL}/users/${userId}/connections`,
      {
        institution: {
          id: institutionId
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    return NextResponse.json({
      connectionId: response.data.id,
      status: response.data.status,
      links: response.data.links
    });
  } catch (error: any) {
    console.error('Basiq connection error:', error.response?.data || error.message);
    
    // Check if it's a connections not enabled error
    if (error.response?.data?.data?.[0]?.code === 'access-denied') {
      return NextResponse.json(
        { 
          error: 'Connections feature not enabled',
          details: 'Please contact Basiq support to enable the Connections feature for your API key.',
          basiqError: error.response.data
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create connection', details: error.response?.data || error.message },
      { status: 500 }
    );
  }
}
