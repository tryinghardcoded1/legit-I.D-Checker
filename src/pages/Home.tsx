import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle, Loader2, Upload, X, Image as ImageIcon, CreditCard, Lock, Crown, Share2, Copy, Cpu, Check, Scan, Ban, Briefcase, MapPin, ArrowRight, Info, Clock } from 'lucide-react';
import { analyzeQuery, detectIdType, ScamAnalysisResult } from '../services/ai';
import { saveSearch, checkBlacklist, decrementCredits, getRecentSearches } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { BlacklistEntry, Search as SearchType } from '../types';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

export default function Home() {
  const [selectedIdType, setSelectedIdType] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDetectingId, setIsDetectingId] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isDraggingFront, setIsDraggingFront] = useState(false);
  const [isDraggingBack, setIsDraggingBack] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [result, setResult] = useState<ScamAnalysisResult | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [savedSearchId, setSavedSearchId] = useState<string | null>(null);
  const [blacklistEntry, setBlacklistEntry] = useState<BlacklistEntry | null>(null);
  const [recentSearches, setRecentSearches] = useState<SearchType[]>([]);
  const [error, setError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const acknowledged = localStorage.getItem('privacyAcknowledged');
    if (!acknowledged) {
      setShowPrivacyModal(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      getRecentSearches(user.uid, 3).then(setRecentSearches);
    } else {
      setRecentSearches([]);
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      setLoadingMessage('');
      return;
    }
    const messages = [
      "Scanning holograms and microprints...",
      "Analyzing font kerning and layout...",
      "Checking for digital tampering...",
      "Verifying ID format and structure...",
      "Cross-referencing security features..."
    ];
    let i = 0;
    setLoadingMessage(messages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMessage(messages[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', 0.6));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processFile = async (file: File, side: 'front' | 'back') => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Invalid file type. Please upload a JPG, PNG, or WebP image.');
      return;
    }

    try {
      const compressed = await compressImage(file);
      if (side === 'front') {
        setFrontImage(compressed);
        setError('');
        
        // Auto-detect ID type
        if (!selectedIdType) {
          setIsDetectingId(true);
          try {
            const detectedType = await detectIdType(compressed);
            if (detectedType) {
              setSelectedIdType(detectedType);
            }
          } catch (err) {
            console.error('Failed to detect ID type', err);
          } finally {
            setIsDetectingId(false);
          }
        }
      } else {
        setBackImage(compressed);
        setError('');
      }
    } catch (err) {
      setError('Failed to process image.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) await processFile(file, side);
  };

  const onDragOver = (e: React.DragEvent, side: 'front' | 'back') => {
    e.preventDefault();
    side === 'front' ? setIsDraggingFront(true) : setIsDraggingBack(true);
  };

  const onDragLeave = (e: React.DragEvent, side: 'front' | 'back') => {
    e.preventDefault();
    side === 'front' ? setIsDraggingFront(false) : setIsDraggingBack(false);
  };

  const onDrop = async (e: React.DragEvent, side: 'front' | 'back') => {
    e.preventDefault();
    side === 'front' ? setIsDraggingFront(false) : setIsDraggingBack(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file, side);
  };

  const premiumIdTypes = [
    'Police Clearance',
    'NBI Clearance',
    'Birth Certificate (PSA)',
    'Company ID (private)',
    'Pag-IBIG ID',
    'Other document or ids'
  ];

  const handleIdTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (premiumIdTypes.includes(value)) {
      if (!userProfile || (userProfile.role !== 'premium' && userProfile.role !== 'admin')) {
        setShowPremiumModal(true);
        // Reset to previous value or empty
        return;
      }
    }
    setSelectedIdType(value);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdType || !frontImage) {
      setError('Please select an ID type and upload the Front ID.');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (userProfile && userProfile.credits <= 0) {
      setError('You have run out of credits. Please upgrade or contact support.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSavedSearchId(null);
    setBlacklistEntry(null);

    try {
      // Analyze with AI
      const analysis = await analyzeQuery(selectedIdType, selectedLanguage, frontImage || undefined, backImage || undefined);
      setResult(analysis);

      // Save search history if user is logged in
      if (user && userProfile) {
        const searchData: Omit<SearchType, 'id'> = {
          userId: user.uid,
          query: selectedIdType,
          hasImage: !!(frontImage || backImage),
          trustScore: analysis.trustScore,
          redFlags: analysis.redFlags,
          greenFlags: analysis.greenFlags,
          createdAt: new Date().toISOString()
        };
        
        if (frontImage) {
          searchData.thumbnail = frontImage;
        }
        if (backImage) {
          searchData.backThumbnail = backImage;
        }
        
        if (analysis.idType) {
          searchData.idType = analysis.idType;
        }
        if (analysis.reasoning) {
          searchData.reasoning = analysis.reasoning;
        }

        const newSearchId = await saveSearch(searchData);
        if (newSearchId) {
          setSavedSearchId(newSearchId);
        }
        
        // Deduct credit
        await decrementCredits(user.uid, userProfile.credits, userProfile.api_usage || 0);
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!savedSearchId) return;
    const shareUrl = `${window.location.origin}/shared/${savedSearchId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <main className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* HERO SECTION */}
        <div className="text-center mb-16 mt-8">
          <h1 className="text-4xl md:text-6xl font-extrabold text-[#065f46] tracking-tight mb-6">
            Stop Getting Scammed Online
          </h1>
          <p className="text-lg md:text-xl text-stone-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Buying or selling on Facebook Marketplace, Lazada, or any online platform?<br className="hidden md:block" />
            Verify IDs instantly before you trust.
          </p>
          
          <div className="flex flex-col items-center justify-center mb-12">
            <button 
              onClick={() => {
                const el = document.getElementById('upload-section');
                if (el) {
                  const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }}
              className="bg-[#6bbf9c] hover:bg-[#52a382] text-white text-xl font-bold py-4 px-10 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
            >
              Check ID Now — 100% Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-4 text-sm font-medium text-stone-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#065f46]" /> Safe • Private • No Data Stored
            </p>
            <p className="mt-3 text-sm text-stone-400 italic font-medium">"One upload can save you thousands."</p>
          </div>
        </div>

        <div id="upload-section" className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-20 border border-stone-200 scroll-mt-24">
          <form onSubmit={handleSearch} className="relative space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {isDetectingId ? (
                    <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-stone-400" />
                  )}
                </div>
                <select
                  value={selectedIdType}
                  onChange={handleIdTypeChange}
                  disabled={isDetectingId}
                  className="block w-full pl-11 pr-10 py-4 bg-stone-50 border border-stone-300 rounded-xl text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow appearance-none disabled:opacity-70"
                >
                  <option value="" disabled>{isDetectingId ? 'Detecting ID type...' : 'Choose an ID option...'}</option>
                  <optgroup label="PRIMARY">
                    <option value="PhilSys ID (National ID)">PhilSys ID (National ID)</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver's License">Driver's License</option>
                    <option value="UMID (SSS / GSIS)">UMID (SSS / GSIS)</option>
                    <option value="PRC ID">PRC ID (for licensed professionals)</option>
                  </optgroup>
                  <optgroup label="🟡 Secondary Valid IDs">
                    <option value="Voter's ID / Voter's Certificate">Voter's ID / Voter's Certificate</option>
                    <option value="Postal ID">Postal ID</option>
                    <option value="TIN ID">TIN ID</option>
                    <option value="PhilHealth ID">PhilHealth ID</option>
                    <option value="Senior Citizen ID">Senior Citizen ID</option>
                    <option value="PWD ID">PWD ID</option>
                    <option value="Barangay ID / Clearance">Barangay ID / Clearance</option>
                    <option value="School ID">School ID (with registration form)</option>
                  </optgroup>
                  <optgroup label="💳 Other Government / Supporting IDs (Premium)">
                    <option value="Police Clearance" title="Requires Premium Subscription">Police Clearance</option>
                    <option value="NBI Clearance" title="Requires Premium Subscription">NBI Clearance</option>
                    <option value="Birth Certificate (PSA)" title="Requires Premium Subscription">Birth Certificate (PSA)</option>
                    <option value="Company ID (private)" title="Requires Premium Subscription">Company ID (private)</option>
                    <option value="Pag-IBIG ID" title="Requires Premium Subscription">Pag-IBIG ID</option>
                  </optgroup>
                  <optgroup label="🔥 Easiest IDs to get (Premium)">
                    <option value="Other document or ids" title="Requires Premium Subscription">Other document or ids</option>
                  </optgroup>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-stone-50 border border-stone-200 rounded-xl p-4">
                <div className="flex items-center text-stone-700 font-medium mb-2 sm:mb-0">
                  <span className="mr-3">Output Language:</span>
                </div>
                <div className="flex bg-stone-200 rounded-lg p-1 w-full sm:w-auto">
                  {['English', 'Tagalog', 'Bisaya'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLanguage(lang)}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedLanguage === lang
                          ? 'bg-white text-emerald-700 shadow-sm'
                          : 'text-stone-600 hover:text-stone-800 hover:bg-stone-300'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3 mt-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900">For 80%+ Accuracy</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Please ensure your photos are <strong>clear, well-lit, and in-focus</strong>. Make sure all text is readable and the ID is not obstructed by glare or fingers.
                  </p>
                </div>
              </div>

              {/* Front ID Dropzone */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload Front ID image"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!frontImage) frontFileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => onDragOver(e, 'front')}
                onDragLeave={(e) => onDragLeave(e, 'front')}
                onDrop={(e) => onDrop(e, 'front')}
                onClick={() => !frontImage && frontFileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors min-h-[160px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  isDraggingFront ? 'border-emerald-600 bg-emerald-50' : 'border-stone-400 hover:bg-stone-50'
                } ${!frontImage ? 'cursor-pointer' : ''}`}
              >
                {frontImage ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img src={frontImage} alt="Front ID Preview" className="max-h-32 w-auto object-contain rounded-lg shadow-sm" />
                    <button
                      type="button"
                      aria-label="Remove Front ID image"
                      onClick={(e) => { e.stopPropagation(); setFrontImage(null); }}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-stone-900 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                      Front ID
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className={`w-10 h-10 mb-3 ${isDraggingFront ? 'text-emerald-600' : 'text-stone-500'}`} aria-hidden="true" />
                    <p className="text-base font-bold text-stone-800">Front ID</p>
                    <p className="text-sm text-stone-600 mt-1">Drag or click to upload</p>
                  </>
                )}
              </div>

              {/* Back ID Dropzone */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload Back ID image"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!backImage) backFileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => onDragOver(e, 'back')}
                onDragLeave={(e) => onDragLeave(e, 'back')}
                onDrop={(e) => onDrop(e, 'back')}
                onClick={() => !backImage && backFileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors min-h-[160px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  isDraggingBack ? 'border-emerald-600 bg-emerald-50' : 'border-stone-400 hover:bg-stone-50'
                } ${!backImage ? 'cursor-pointer' : ''}`}
              >
                {backImage ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img src={backImage} alt="Back ID Preview" className="max-h-32 w-auto object-contain rounded-lg shadow-sm" />
                    <button
                      type="button"
                      aria-label="Remove Back ID image"
                      onClick={(e) => { e.stopPropagation(); setBackImage(null); }}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-stone-900 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                      Back ID
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className={`w-10 h-10 mb-3 ${isDraggingBack ? 'text-emerald-600' : 'text-stone-500'}`} aria-hidden="true" />
                    <p className="text-base font-bold text-stone-800">Back ID <span className="text-stone-500 font-normal text-sm">(Optional)</span></p>
                    <p className="text-sm text-stone-600 mt-1">Drag or click to upload</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center mt-6">
              <button
                type="submit"
                disabled={loading || !selectedIdType || !frontImage}
                className="w-full md:w-auto min-w-[240px] flex flex-col items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md relative overflow-hidden group"
              >
                {loading ? (
                  <>
                    <div className="absolute inset-0 bg-emerald-800/50 animate-pulse"></div>
                    <div className="relative flex flex-col items-center">
                      <div className="flex items-center mb-1">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        <span>Analyzing ID...</span>
                      </div>
                      <span className="text-xs text-emerald-100 font-medium animate-pulse">{loadingMessage}</span>
                    </div>
                  </>
                ) : (
                  'Check Now'
                )}
              </button>
              
              <div className="flex items-center mt-4 text-sm text-stone-500 bg-stone-50 px-4 py-2 rounded-full border border-stone-200">
                <Lock className="w-4 h-4 mr-2 text-emerald-600" />
                <span><strong className="text-stone-700">100% Free and Safe.</strong> We do not save your IDs; they are only processed securely in your browser.</span>
              </div>
            </div>

            <input
              type="file"
              ref={frontFileInputRef}
              onChange={(e) => handleImageUpload(e, 'front')}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={backFileInputRef}
              onChange={(e) => handleImageUpload(e, 'back')}
              accept="image/*"
              className="hidden"
            />
          </form>
        </div>

        {user && recentSearches.length > 0 && (
          <div className="mb-20 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-800 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-emerald-600" />
                Recent Searches
              </h3>
              <button 
                onClick={() => navigate('/history')}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-stone-100">
              {recentSearches.map((search) => (
                <div key={search.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {search.thumbnail ? (
                      <img src={search.thumbnail} alt="ID Thumbnail" className="w-16 h-12 object-cover rounded-md border border-stone-200" />
                    ) : (
                      <div className="w-16 h-12 bg-stone-100 rounded-md border border-stone-200 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-stone-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-stone-800">{search.query}</p>
                      <p className="text-sm text-stone-500">
                        {new Date(search.createdAt).toLocaleDateString()} at {new Date(search.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center ${
                      search.trustScore >= 8 ? 'bg-emerald-100 text-emerald-700' :
                      search.trustScore >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      Score: {search.trustScore}/10
                    </div>
                    <button
                      onClick={() => navigate(`/shared/${search.id}`)}
                      className="text-stone-400 hover:text-emerald-600 transition-colors"
                      aria-label="View details"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {blacklistEntry && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 md:p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start space-x-4">
              <div className="bg-red-100 p-3 rounded-full">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-900 mb-2">WARNING: Blacklisted Entity</h2>
                <p className="text-red-800 text-lg mb-4">
                  This identifier (<span className="font-mono font-bold">{blacklistEntry.identifier}</span>) is on the national blacklist. Do not proceed with any transactions.
                </p>
                <div className="bg-white rounded-lg p-4 border border-red-100">
                  <h3 className="text-sm font-semibold text-red-900 uppercase tracking-wider mb-1">Reason for Blacklisting</h3>
                  <p className="text-stone-700">{blacklistEntry.reason}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && !blacklistEntry && (
          <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
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

            {savedSearchId && (
              <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-stone-100 pt-6">
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-2">Shareable Link</h3>
                <p className="text-sm text-stone-500 mb-3">Anyone with this link can view the analysis details.</p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/shared/${savedSearchId}`}
                    className="flex-1 w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                    >
                      {shareCopied ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/shared/${savedSearchId}`)}
                      className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-medium transition-colors"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      View Page
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TRUST SECTION */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-[#065f46] mb-10">Why Use Legit ID Checker PH?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4">
                <Scan className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 mb-2">Detect fake or edited IDs in seconds</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4">
                <Ban className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 mb-2">Avoid scams before sending money</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 mb-2">Protect your business and transactions</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-md border border-stone-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 mb-2">Built for Filipino ID formats</h3>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS SECTION */}
        <div className="mb-20 bg-white rounded-3xl shadow-md p-8 md:p-12 border border-stone-100">
          <h2 className="text-3xl font-bold text-center text-[#065f46] mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative">
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-stone-200 z-0"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-[#065f46] text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">1</div>
              <div className="w-12 h-12 bg-stone-100 text-stone-600 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-stone-900 mb-2">Upload ID</h3>
              <p className="text-stone-600">Securely upload the front (and optionally back) of the ID.</p>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-[#065f46] text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">2</div>
              <div className="w-12 h-12 bg-stone-100 text-stone-600 rounded-full flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-stone-900 mb-2">AI Analyzes</h3>
              <p className="text-stone-600">Our AI checks for digital tampering and authentic features.</p>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-[#065f46] text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">3</div>
              <div className="w-12 h-12 bg-stone-100 text-stone-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-stone-900 mb-2">Get Results</h3>
              <p className="text-stone-600">Receive an instant trust score and detailed analysis.</p>
            </div>
          </div>
        </div>

        {/* WARNING / HOOK SECTION */}
        <div className="mb-20 bg-stone-200 rounded-3xl p-8 md:p-12 text-center border border-stone-300 shadow-inner">
          <h2 className="text-2xl md:text-4xl font-extrabold text-red-700 mb-4 tracking-tight">
            Thousands get scammed every day using fake identities.
          </h2>
          <p className="text-lg md:text-xl text-stone-800 max-w-2xl mx-auto font-medium">
            Don’t be one of them. Always verify before sending money or meeting someone.
          </p>
        </div>

        {/* USE CASE SECTION */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-[#065f46] mb-10">Perfect For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              "Facebook Marketplace buyers & sellers",
              "Online sellers (Lazada, Shopee)",
              "Freelancers dealing with new clients",
              "Small business owners"
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex items-center gap-4">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-stone-800 text-lg">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FINAL CTA SECTION */}
        <div className="text-center mb-8 bg-[#065f46] text-white rounded-3xl p-10 md:p-16 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight">Protect yourself in seconds</h2>
            <button 
              onClick={() => {
                const el = document.getElementById('upload-section');
                if (el) {
                  const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }}
              className="bg-[#6bbf9c] hover:bg-[#52a382] text-white text-xl font-bold py-4 px-10 rounded-full shadow-lg transition-transform hover:scale-105 inline-flex items-center gap-2"
            >
              Start Checking Now — Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-10 text-center">
        <div className="max-w-5xl mx-auto px-4">
          <p className="font-bold text-xl text-[#065f46] mb-2 tracking-tight">Legit ID Checker PH</p>
          <p className="text-sm text-stone-500 mb-6 font-medium">We do not store uploaded IDs</p>
          <div className="flex justify-center gap-6 text-sm text-stone-400 font-medium">
            <a href="#" className="hover:text-[#065f46] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#065f46] transition-colors">Terms</a>
          </div>
          <p className="text-xs text-stone-400 mt-8 font-medium">CVcREATION</p>
        </div>
      </footer>

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center relative">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-emerald-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Privacy Note</h3>
              <p className="text-stone-600 mb-6 font-medium">
                We don't keep your data. All uploaded IDs and info are automatically deleted once you log out of your account.
              </p>
              
              <button
                onClick={() => {
                  localStorage.setItem('privacyAcknowledged', 'true');
                  setShowPrivacyModal(false);
                }}
                className="w-full py-3 px-4 bg-[#065f46] hover:bg-[#044e39] text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center relative">
              <button
                onClick={() => setShowPremiumModal(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Crown className="w-8 h-8 text-amber-500" />
              </div>
              
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Premium Feature</h3>
              <p className="text-stone-600 mb-6">
                Analyzing this type of document requires a premium subscription. Upgrade now to unlock advanced document verification, including NBI Clearances, Birth Certificates, and more.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowPremiumModal(false);
                    // In a real app, this would redirect to a pricing/upgrade page
                    alert("Redirecting to upgrade page...");
                  }}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
                >
                  Upgrade to Premium
                </button>
                <button
                  onClick={() => setShowPremiumModal(false)}
                  className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
