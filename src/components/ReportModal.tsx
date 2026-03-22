import React, { useState } from 'react';
import { submitReport } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { X, Loader2 } from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

export default function ReportModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [scammerName, setScammerName] = useState('');
  const [scammerDetails, setScammerDetails] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await submitReport({
        userId: user.uid,
        scammerName,
        scammerDetails,
        description,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit report', error);
      alert(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-stone-100">
          <h2 className="text-2xl font-bold text-stone-900">Report a Scammer</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Report Submitted</h3>
            <p className="text-stone-600">Thank you for helping keep the community safe. Our team will review this shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Scammer Name (if known)</label>
              <input
                type="text"
                required
                value={scammerName}
                onChange={(e) => setScammerName(e.target.value)}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., Juan Dela Cruz"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Details (Phone, GCash, ID)</label>
              <input
                type="text"
                required
                value={scammerDetails}
                onChange={(e) => setScammerDetails(e.target.value)}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., 09171234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Description of Scam</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                placeholder="Describe what happened..."
              />
            </div>
            <div className="pt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
