"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface BasiqInstitution {
  id: string;
  name: string;
  shortName: string;
  country: string;
  logo?: string;
}

interface BasiqConnection {
  id: string;
  status: string;
  institutionId: string;
  institutionName: string;
}

interface BasiqContextType {
  accessToken: string | null;
  institutions: BasiqInstitution[];
  connections: BasiqConnection[];
  loading: boolean;
  error: string | null;
  
  // Actions
  authenticate: () => Promise<void>;
  fetchInstitutions: () => Promise<void>;
  createConnection: (institutionId: string) => Promise<BasiqConnection>;
  fetchTransactions: (connectionId: string, fromDate?: string, toDate?: string) => Promise<any>;
  clearError: () => void;
}

const BasiqContext = createContext<BasiqContextType | undefined>(undefined);

export function BasiqProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<BasiqInstitution[]>([]);
  const [connections, setConnections] = useState<BasiqConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    if (loading) return; // Prevent multiple simultaneous requests
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/basiq/auth');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }
      
      setAccessToken(data.accessToken);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const fetchInstitutions = async () => {
    if (!accessToken) {
      setError('Not authenticated with Basiq');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/basiq/institutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch institutions');
      }
      
      setInstitutions(data.institutions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createConnection = async (institutionId: string): Promise<BasiqConnection> => {
    if (!accessToken || !user) {
      throw new Error('Not authenticated');
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/basiq/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          accessToken, 
          userId: user.id,
          institutionId 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 403 && data.error === 'Connections feature not enabled') {
          throw new Error('Connections feature not enabled. Please contact Basiq support to enable this feature for your API key.');
        }
        throw new Error(data.error || 'Failed to create connection');
      }
      
      const connection: BasiqConnection = {
        id: data.connectionId,
        status: data.status,
        institutionId,
        institutionName: institutions.find(i => i.id === institutionId)?.name || 'Unknown'
      };
      
      setConnections(prev => [...prev, connection]);
      return connection;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (connectionId: string, fromDate?: string, toDate?: string) => {
    if (!accessToken || !user) {
      throw new Error('Not authenticated');
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/basiq/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          accessToken, 
          userId: user.id,
          connectionId,
          fromDate,
          toDate
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }
      
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  // Auto-authenticate when user is available
  useEffect(() => {
    if (user && !accessToken && !loading) {
      authenticate();
    }
  }, [user, accessToken, loading, authenticate]);

  const value: BasiqContextType = {
    accessToken,
    institutions,
    connections,
    loading,
    error,
    authenticate,
    fetchInstitutions,
    createConnection,
    fetchTransactions,
    clearError,
  };

  return (
    <BasiqContext.Provider value={value}>
      {children}
    </BasiqContext.Provider>
  );
}

export function useBasiq() {
  const context = useContext(BasiqContext);
  if (context === undefined) {
    throw new Error('useBasiq must be used within a BasiqProvider');
  }
  return context;
}
