import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '../../../lib/supabase';

const BASIQ_API_URL = 'https://au-api.basiq.io';

interface TransactionsRequest {
  accessToken: string;
  userId: string;
  connectionId: string;
  fromDate?: string;
  toDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, userId, connectionId, fromDate, toDate }: TransactionsRequest = await request.json();

    if (!accessToken || !userId || !connectionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Calculate date range (default to last 90 days)
    const to = toDate || new Date().toISOString().split('T')[0];
    const from = fromDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch transactions from Basiq
    const response = await axios.get(
      `${BASIQ_API_URL}/users/${userId}/transactions`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        params: {
          'filter': `connection.id.eq('${connectionId}'),postDate.gte('${from}'),postDate.lte('${to}')`,
          'limit': 500
        }
      }
    );

    const transactions = response.data.data || [];
    
    // Transform Basiq transactions to our format
    const transformedTransactions = transactions.map((tx: any) => ({
      id: `basiq-${tx.id}`,
      type: tx.direction === 'credit' ? 'income' : 'expense',
      amount: Math.abs(parseFloat(tx.amount || '0')),
      note: tx.description || tx.subClass?.title || 'Basiq Transaction',
      date: tx.postDate,
      source: 'basiq',
      basiqId: tx.id,
      accountId: tx.account?.id,
      institutionId: tx.connection?.institution?.id
    }));

    // Get current user from Supabase
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 401 });
    }

    // Save transactions to Supabase (with duplicate prevention)
    const savedTransactions = [];
    for (const transaction of transformedTransactions) {
      try {
        // Check if transaction already exists
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('basiq_id', transaction.basiqId)
          .single();

        if (existing) {
          console.log('Transaction already exists, skipping:', transaction.basiqId);
          continue;
        }

        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: transaction.type,
            amount: transaction.amount,
            note: transaction.note,
            date: transaction.date,
            source: transaction.source,
            basiq_id: transaction.basiqId,
            account_id: transaction.accountId,
            institution_id: transaction.institutionId
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving transaction:', error);
          continue;
        }

        savedTransactions.push(data);
      } catch (error) {
        console.error('Error processing transaction:', error);
      }
    }

    return NextResponse.json({
      imported: savedTransactions.length,
      total: transformedTransactions.length,
      transactions: savedTransactions
    });
  } catch (error: any) {
    console.error('Basiq transactions error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
