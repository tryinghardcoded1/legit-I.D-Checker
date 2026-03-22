import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search } from '../types';
import { ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

export default function SharedResult() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<Search | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'searches', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setResult(docSnap.data() as Search);
        } else {
          setError('This shared result does not exist or has been removed.');
        }
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Result Not Found</h2>
        <p className="text-stone-600 mb-6">{error}</p>
        <Link to="/" className="px-6 py-3 bg-emerald-700 text-white rounded-xl font-medium hover:bg-emerald-800 transition-colors">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center text-emerald-700 hover:text-emerald-800 font-medium mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Legit ID Checker
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
          <div className={`p-6 md:p-8 text-white ${
            result.trustScore >= 8 ? 'bg-emerald-600' :
            result.trustScore >= 5 ? 'bg-amber-500' : 'bg-red-600'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-1">Trust Score: {result.trustScore}/10</h2>
                <p className="text-white/90 text-lg mb-2">
                  {result.trustScore >= 8 ? 'Looks safe to proceed.' :
                   result.trustScore >= 5 ? 'Proceed with caution.' : 'High risk of fraud.'}
                </p>
                {result.idType && (
                  <div className="inline-flex items-center bg-white/20 px-3 py-1 rounded-full text-sm font-medium mt-1">
                    <span className="text-white/80 mr-2">Detected ID:</span>
                    <span className="text-white font-bold">{result.idType}</span>
                  </div>
                )}
              </div>
              {result.trustScore >= 8 ? <ShieldCheck className="w-16 h-16 opacity-80" /> :
               result.trustScore >= 5 ? <AlertTriangle className="w-16 h-16 opacity-80" /> :
               <ShieldAlert className="w-16 h-16 opacity-80" />}
            </div>
          </div>

          <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="flex items-center text-lg font-bold text-red-700 mb-4">
                <AlertTriangle className="w-5 h-5 mr-2" /> Red Flags
              </h3>
              {result.redFlags.length > 0 ? (
                <ul className="space-y-3">
                  {result.redFlags.map((flag, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-red-500 mr-2 mt-1">•</span>
                      <span className="text-stone-700">{flag}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-stone-500 italic">No significant red flags detected.</p>
              )}
            </div>

            <div>
              <h3 className="flex items-center text-lg font-bold text-emerald-700 mb-4">
                <CheckCircle className="w-5 h-5 mr-2" /> Green Flags
              </h3>
              {result.greenFlags.length > 0 ? (
                <ul className="space-y-3">
                  {result.greenFlags.map((flag, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-emerald-500 mr-2 mt-1">•</span>
                      <span className="text-stone-700">{flag}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-stone-500 italic">No significant green flags detected.</p>
              )}
            </div>
          </div>

          {result.reasoning && (
            <div className="px-6 md:px-8 pb-6 md:pb-8">
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-2">AI Reasoning</h3>
                <p className="text-stone-700 leading-relaxed">{result.reasoning}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
