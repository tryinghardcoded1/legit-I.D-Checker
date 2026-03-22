import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Search } from '../types';
import { History as HistoryIcon, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../services/firestore';

export default function History() {
  const { user } = useAuth();
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'searches'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: Search[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Search);
      });
      setSearches(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'searches');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><div className="animate-pulse text-emerald-600 font-bold text-xl">Loading History...</div></div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <HistoryIcon className="w-8 h-8 text-emerald-700" />
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Your Search History</h1>
        </div>

        {searches.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-stone-200">
            <p className="text-stone-500 text-lg">You haven't made any searches yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {searches.map((search) => (
              <div key={search.id} className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-stone-900">{search.query}</h3>
                      {search.idType && (
                        <span className="bg-stone-100 text-stone-600 text-xs font-bold px-2 py-1 rounded-md border border-stone-200">
                          {search.idType}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500">
                      {new Date(search.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className={`flex items-center px-4 py-2 rounded-lg font-bold ${
                    search.trustScore >= 8 ? 'bg-emerald-100 text-emerald-800' :
                    search.trustScore >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {search.trustScore >= 8 ? <ShieldCheck className="w-5 h-5 mr-2" /> :
                     search.trustScore >= 5 ? <AlertTriangle className="w-5 h-5 mr-2" /> :
                     <ShieldAlert className="w-5 h-5 mr-2" />}
                    Score: {search.trustScore}/10
                  </div>
                </div>
                
                {(search.thumbnail || search.backThumbnail || search.reasoning) && (
                  <div className="mt-2 pt-4 border-t border-stone-100">
                    <div className="flex flex-col md:flex-row gap-6">
                      {(search.thumbnail || search.backThumbnail) && (
                        <div className="flex gap-2 shrink-0">
                          {search.thumbnail && (
                            <img src={search.thumbnail} alt="Front ID" className="h-20 w-auto object-cover rounded-md border border-stone-200" />
                          )}
                          {search.backThumbnail && (
                            <img src={search.backThumbnail} alt="Back ID" className="h-20 w-auto object-cover rounded-md border border-stone-200" />
                          )}
                        </div>
                      )}
                      {search.reasoning && (
                        <div className="flex-grow">
                          <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">AI Reasoning</h4>
                          <p className="text-sm text-stone-700">{search.reasoning}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
