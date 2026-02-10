import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { databaseService } from '../services/database';

interface ChangeRequest {
  id: string;
  agent_name: string;
  change_type: string;
  description: string;
  before_state: any;
  after_state: any;
  status: string;
  created_at: string;
}

export const ApprovalQueue: React.FC = () => {
  const [pendingChanges, setPendingChanges] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<ChangeRequest | null>(null);

  const loadPendingChanges = async () => {
    try {
      setLoading(true);
      const changes = await databaseService.getChangeLogs([
        { column: 'status', operator: '=', value: 'pending' }
      ]);
      setPendingChanges(changes);
    } catch (error) {
      console.error('Failed to load pending changes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingChanges();
    // Refresh every 5 seconds
    const interval = setInterval(loadPendingChanges, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (changeId: string) => {
    try {
      await databaseService.approveChange(changeId);
      await loadPendingChanges();
      setSelectedChange(null);
    } catch (error) {
      console.error('Failed to approve change:', error);
    }
  };

  const handleReject = async (changeId: string) => {
    try {
      await databaseService.getAdapter().update('change_log', changeId, {
        status: 'rejected'
      });
      await loadPendingChanges();
      setSelectedChange(null);
    } catch (error) {
      console.error('Failed to reject change:', error);
    }
  };

  if (loading && pendingChanges.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-900 h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Approval Queue</h2>
            <p className="text-sm text-gray-400">Review and approve agent-requested changes</p>
          </div>
          <button
            onClick={loadPendingChanges}
            className="flex items-center gap-2 px-4 py-2 text-blue-400 hover:bg-gray-700 rounded-lg transition"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Left: List of pending changes */}
        <div className="w-1/3 bg-gray-800 rounded-lg border border-gray-700 overflow-y-auto">
          {pendingChanges.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="mx-auto mb-4 text-green-400" size={48} />
              <p className="text-gray-300 font-semibold">All caught up!</p>
              <p className="text-sm text-gray-500 mt-2">No pending approvals at the moment</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {pendingChanges.map(change => (
                <div
                  key={change.id}
                  onClick={() => setSelectedChange(change)}
                  className={`p-4 cursor-pointer hover:bg-gray-700 transition ${
                    selectedChange?.id === change.id ? 'bg-gray-700 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Clock className="text-amber-400 mt-1" size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-200 truncate">{change.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-blue-900 text-blue-300 text-xs rounded font-medium">
                          {change.agent_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {change.change_type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(change.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Change details */}
        <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 overflow-y-auto">
          {selectedChange ? (
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {selectedChange.description}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-900 text-blue-300 text-sm rounded-full font-semibold">
                      {selectedChange.agent_name} Agent
                    </span>
                    <span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-full">
                      {selectedChange.change_type}
                    </span>
                  </div>
                </div>
                <AlertTriangle className="text-amber-400" size={32} />
              </div>

              {/* Before State */}
              {selectedChange.before_state && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-300 mb-2">Current State</h4>
                  <pre className="bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto border border-gray-700 text-gray-300">
                    {JSON.stringify(selectedChange.before_state, null, 2)}
                  </pre>
                </div>
              )}

              {/* After State */}
              {selectedChange.after_state && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-300 mb-2">Proposed Changes</h4>
                  <pre className="bg-blue-900 bg-opacity-30 p-4 rounded-lg text-sm overflow-x-auto border border-blue-800 text-blue-200">
                    {JSON.stringify(selectedChange.after_state, null, 2)}
                  </pre>
                </div>
              )}

              {/* Warning */}
              <div className="bg-amber-900 bg-opacity-30 border border-amber-700 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertTriangle className="text-amber-400 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-semibold text-amber-300 mb-1">Review Carefully</p>
                    <p className="text-sm text-amber-400">
                      This change will modify your database schema. Make sure you understand the impact before approving.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(selectedChange.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  <CheckCircle size={20} />
                  Approve Change
                </button>
                <button
                  onClick={() => handleReject(selectedChange.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  <XCircle size={20} />
                  Reject Change
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 h-full flex flex-col items-center justify-center">
              <Clock className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-400">Select a change request to review details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalQueue;
