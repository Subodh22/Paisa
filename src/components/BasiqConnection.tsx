"use client";

import React, { useState, useEffect } from 'react';
import { useBasiq } from '../lib/contexts/BasiqContext';

interface BasiqConnectionProps {
  onTransactionsImported?: (count: number) => void;
}

export default function BasiqConnection({ onTransactionsImported }: BasiqConnectionProps) {
  const { 
    accessToken, 
    institutions, 
    connections, 
    loading, 
    error, 
    authenticate, 
    fetchInstitutions, 
    createConnection, 
    fetchTransactions,
    clearError 
  } = useBasiq();

  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    if (accessToken && institutions.length === 0) {
      fetchInstitutions();
    }
  }, [accessToken, institutions.length, fetchInstitutions]);

  const handleConnect = async () => {
    if (!selectedInstitution) return;

    setIsConnecting(true);
    clearError();

    try {
      await createConnection(selectedInstitution);
      setSelectedInstitution('');
    } catch (err) {
      console.error('Connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleImportTransactions = async (connectionId: string) => {
    setIsImporting(true);
    setImportProgress({ current: 0, total: 1 });
    clearError();

    try {
      // Calculate date range for last 90 days
      const toDate = new Date().toISOString().split('T')[0];
      const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const result = await fetchTransactions(connectionId, fromDate, toDate);
      
      setImportProgress({ current: 1, total: 1 });
      
      if (onTransactionsImported) {
        onTransactionsImported(result.imported);
      }
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  if (!accessToken) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Connect to Basiq</h3>
            <p className="text-blue-700 text-sm">Import your bank transactions automatically</p>
          </div>
          <button
            onClick={authenticate}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect to Basiq'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-red-900 font-medium">Error</h4>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Institution Selection */}
      {institutions.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Select Your Bank</h3>
          <div className="space-y-2">
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="w-full border rounded px-3 py-2"
              disabled={isConnecting}
            >
              <option value="">Choose your bank...</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleConnect}
              disabled={!selectedInstitution || isConnecting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Bank Account'}
            </button>
          </div>
        </div>
      )}

      {/* Active Connections */}
      {connections.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Connected Accounts</h3>
          <div className="space-y-3">
            {connections.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{connection.institutionName}</div>
                  <div className="text-sm text-gray-500">
                    Status: <span className={`capitalize ${connection.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {connection.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {connection.status === 'active' && (
                    <button
                      onClick={() => handleImportTransactions(connection.id)}
                      disabled={isImporting}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isImporting ? 'Importing...' : 'Import Transactions'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Progress */}
      {importProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-900 font-medium">Importing Transactions</span>
            <span className="text-blue-700 text-sm">
              {importProgress.current} / {importProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
