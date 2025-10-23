import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BASIQ_API_URL = 'https://au-api.basiq.io';

interface InstitutionsRequest {
  accessToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken }: InstitutionsRequest = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 }
      );
    }

    // Fetch available institutions
    const response = await axios.get(
      `${BASIQ_API_URL}/institutions`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    const institutions = response.data.data || [];

    return NextResponse.json({
      institutions: institutions.map((inst: any) => ({
        id: inst.id,
        name: inst.name,
        shortName: inst.shortName,
        country: inst.country,
        logo: inst.logo
      }))
    });
  } catch (error: any) {
    console.error('Basiq institutions error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to fetch institutions' },
      { status: 500 }
    );
  }
}
