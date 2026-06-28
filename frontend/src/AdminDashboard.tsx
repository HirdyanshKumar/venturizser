import { useState, useEffect } from 'react';
import { getApiUrl } from './utils/api';

interface Lead {
  id: string;
  flow_type: 'founder' | 'investor';
  name: string;
  email: string;
  score: number;
  bucket: 'hot' | 'good' | 'maybe' | 'low';
  status: 'new' | 'contacted' | 'review' | 'closed';
  ai_summary: string | null;
  ai_tags: string[] | null;
  email_sent: boolean;
  alert_sent: boolean;
  created_at: string;
  meeting_status?: string | null;
  meeting_link?: string | null;
  meeting_scheduled_at?: string | null;
}

interface ResponseDetail {
  question: string;
  answer: any;
  category: string;
  order_index: number;
}

interface LeadDetail {
  lead: Lead & {
    score_breakdown: Record<string, any>;
    ai_flags: string[] | null;
    communication_logs?: Array<{
      timestamp: string;
      template: string;
      message?: string;
    }> | null;
  };
  responses: ResponseDetail[];
}

interface AdminDashboardProps {
  navigate: (path: string) => void;
  initialLeadId?: string;
}

export default function AdminDashboard({ navigate, initialLeadId }: AdminDashboardProps) {
  // ── Auth States ─────────────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(localStorage.getItem('venturizer_token'));
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // ── Leads list States ────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ── Filter States ───────────────────────────────────────────────────────────
  const [flowFilter, setFlowFilter] = useState<string>('all');
  const [bucketFilter, setBucketFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ── Detail States ───────────────────────────────────────────────────────────
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId || null);
  const [leadDetail, setLeadDetail] = useState<LeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<boolean>(false);

  // ── Manual Email States ──────────────────────────────────────────────────────
  const [emailTemplate, setEmailTemplate] = useState<string>('hot');
  const [customMsgText, setCustomMsgText] = useState<string>('');
  const [emailSending, setEmailSending] = useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');

  // ── Login Action ────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(getApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('venturizer_token', data.token);
        setToken(data.token);
        setEmail('');
        setPassword('');
      } else {
        setLoginError(data.error || 'Login failed. Check your credentials.');
      }
    } catch (err) {
      setLoginError('Failed to connect to backend.');
    }
  };

  // ── Logout Action ───────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('venturizer_token');
    setToken(null);
    setLeads([]);
    setSelectedLeadId(null);
    setLeadDetail(null);
  };

  // ── Fetch Leads ─────────────────────────────────────────────────────────────
  const fetchLeads = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const queryParams = new URLSearchParams();
      if (flowFilter !== 'all') queryParams.append('flow_type', flowFilter);
      if (bucketFilter !== 'all') queryParams.append('bucket', bucketFilter);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (searchQuery.trim() !== '') queryParams.append('search', searchQuery);

      const res = await fetch(getApiUrl(`/api/admin/leads?${queryParams.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 401) {
        handleLogout();
        return;
      }
      
      const data = await res.json();
      if (res.ok) {
        setLeads(data);
      } else {
        setErrorMsg(data.error || 'Failed to fetch leads.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch leads on filter/token change
  useEffect(() => {
    fetchLeads();
  }, [token, flowFilter, bucketFilter, statusFilter, searchQuery]);

  // ── Fetch Single Lead Details ───────────────────────────────────────────────
  const fetchLeadDetail = async (id: string) => {
    if (!token) return;
    setDetailLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(getApiUrl(`/api/admin/leads/${id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setLeadDetail(data);
      } else {
        setErrorMsg(data.error || 'Failed to fetch lead details.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to server.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Load initial lead id on token init
  useEffect(() => {
    if (initialLeadId && token) {
      setSelectedLeadId(initialLeadId);
    }
  }, [initialLeadId, token]);

  // Fetch lead detail when selectedLeadId or token changes
  useEffect(() => {
    if (selectedLeadId && token) {
      fetchLeadDetail(selectedLeadId);
    } else {
      setLeadDetail(null);
    }
  }, [selectedLeadId, token]);

  // Sync email template on lead details load
  useEffect(() => {
    if (leadDetail) {
      setEmailTemplate(leadDetail.lead.bucket || 'hot');
      setCustomMsgText('');
      setEmailSuccess(false);
      setEmailError('');
    }
  }, [leadDetail]);

  // ── Update Pipeline Status ──────────────────────────────────────────────────
  const updateStatus = async (newStatus: string) => {
    if (!token || !selectedLeadId || !leadDetail) return;
    setStatusUpdateLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/leads/${selectedLeadId}/status`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Update local state directly so we don't have to refetch list
        setLeadDetail({
          ...leadDetail,
          lead: { ...leadDetail.lead, status: newStatus as any },
        });
        setLeads((prevLeads) =>
          prevLeads.map((l) => (l.id === selectedLeadId ? { ...l, status: newStatus as any } : l))
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status.');
      }
    } catch (err) {
      alert('Error updating status.');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // ── Dispatch Manual Follow-up Email ─────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!token || !selectedLeadId) return;
    setEmailSending(true);
    setEmailSuccess(false);
    setEmailError('');
    try {
      const res = await fetch(getApiUrl(`/api/admin/leads/${selectedLeadId}/send-email`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateType: emailTemplate,
          customMessage: customMsgText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEmailSuccess(true);
        setCustomMsgText('');
        // Reload details to update status and logs
        fetchLeadDetail(selectedLeadId);
        // Refresh the main leads list to reflect updated statuses
        fetchLeads();
      } else {
        setEmailError(data.error || 'Failed to dispatch email.');
      }
    } catch (err) {
      setEmailError('Network error dispatching email.');
    } finally {
      setEmailSending(false);
    }
  };

  // ── Styling Helpers ─────────────────────────────────────────────────────────
  const getBucketBadge = (bucket: string) => {
    switch (bucket) {
      case 'hot':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-brand-coral border border-brand-coral/20 rounded-tag text-xs font-bold uppercase">
            🔥 Hot
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-brand-sage border border-brand-sage/20 rounded-tag text-xs font-bold uppercase">
            ✅ Good
          </span>
        );
      case 'maybe':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-brand-amber border border-brand-amber/20 rounded-tag text-xs font-bold uppercase">
            🟡 Maybe
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-brand-slate border border-brand-slate/20 rounded-tag text-xs font-bold uppercase">
            ⚪ Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      new: 'New Intake',
      contacted: 'Contacted',
      review: 'In Review',
      closed: 'Closed',
    };
    return (
      <span className="inline-block px-2 py-0.5 border border-brand-border bg-brand-paper text-[10px] font-bold rounded-tag uppercase tracking-wider text-brand-caption">
        {labels[status] || status}
      </span>
    );
  };

  // Render Login Screen if not authenticated
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-paper px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-card border border-brand-border" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="text-center mb-8 flex flex-col items-center">
            <img src="/logo.webp" alt="Venturizer Logo" className="h-12 w-auto object-contain mb-4" />
            <h2 className="text-3xl font-bold text-brand-blue font-display" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Venturizer VC
            </h2>
            <p className="text-sm text-brand-caption mt-1">Admin ERP Triage Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase text-brand-caption mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-brand-border rounded-btn focus:outline-none focus:border-brand-blue"
                placeholder="admin@venturizer.co"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-brand-caption mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-brand-border rounded-btn focus:outline-none focus:border-brand-blue"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-brand-coral/20 rounded-[10px] text-xs text-brand-coral font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-brand-blue hover:opacity-95 text-white font-bold rounded-btn cursor-pointer transition-all"
            >
              Sign In to ERP
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-brand-blue hover:underline cursor-pointer"
            >
              &larr; Back to Chatbot
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Dashboard
  return (
    <div className="min-h-screen flex flex-col bg-brand-paper">
      
      {/* ERP Header */}
      <header className="sticky top-0 bg-white border-b border-brand-border z-20" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => { setSelectedLeadId(null); setFlowFilter('all'); setBucketFilter('all'); setStatusFilter('all'); setSearchQuery(''); }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <img src="/logo.webp" alt="Venturizer Logo" className="h-8 w-auto object-contain" />
              <span 
                className="font-bold text-xl text-brand-blue tracking-tight" 
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Venturizer ERP
              </span>
            </div>
            <span className="px-2 py-0.5 bg-brand-paper border border-brand-border text-[10px] font-mono rounded text-brand-caption">
              v1.0.0
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="text-sm font-semibold text-brand-blue hover:underline cursor-pointer"
            >
              Chatbot Page
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-brand-ink border-r pr-3 hidden sm:inline border-brand-border">
                Portal Admin
              </span>
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 border border-brand-border rounded-btn text-xs font-bold text-brand-coral hover:bg-red-50 cursor-pointer transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main ERP Layout */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Filter Bar + Cards List (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Controls Bar */}
          <div className="bg-white p-6 rounded-card border border-brand-border flex flex-col gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads by name, email, description..."
                className="w-full pl-4 pr-10 py-3 border border-brand-border rounded-btn focus:outline-none focus:border-brand-blue text-sm"
              />
            </div>

            {/* Filters grid */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-brand-caption mb-1">Flow Type</label>
                <select
                  value={flowFilter}
                  onChange={(e) => setFlowFilter(e.target.value)}
                  className="w-full p-2 border border-brand-border bg-white rounded-btn text-xs"
                >
                  <option value="all">All Flows</option>
                  <option value="founder">Founders</option>
                  <option value="investor">Investors</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-brand-caption mb-1">Fit Bucket</label>
                <select
                  value={bucketFilter}
                  onChange={(e) => setBucketFilter(e.target.value)}
                  className="w-full p-2 border border-brand-border bg-white rounded-btn text-xs"
                >
                  <option value="all">All Buckets</option>
                  <option value="hot">🔥 Hot</option>
                  <option value="good">✅ Good</option>
                  <option value="maybe">🟡 Maybe</option>
                  <option value="low">⚪ Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-brand-caption mb-1">Workflow Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 border border-brand-border bg-white rounded-btn text-xs"
                >
                  <option value="all">All Status</option>
                  <option value="new">New Intake</option>
                  <option value="contacted">Contacted</option>
                  <option value="review">In Review</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 bg-white rounded-card border border-brand-border" style={{ boxShadow: 'var(--shadow-card)' }}>
                <p className="text-brand-caption text-sm animate-pulse">Loading triage files...</p>
              </div>
            ) : errorMsg ? (
              <div className="p-4 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-card">
                {errorMsg}
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-card border border-brand-border" style={{ boxShadow: 'var(--shadow-card)' }}>
                <p className="text-brand-caption text-sm">No qualified profiles match these filter states.</p>
              </div>
            ) : (
              leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => {
                    setSelectedLeadId(lead.id);
                    navigate(`/admin/leads/${lead.id}`);
                  }}
                  className={`p-6 rounded-card bg-white border cursor-pointer hover:border-brand-blue transition-all ${
                    selectedLeadId === lead.id ? 'border-brand-blue ring-1 ring-brand-blue' : 'border-brand-border'
                  }`}
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-brand-ink leading-snug">{lead.name || 'Incomplete Applicant'}</h3>
                      <p className="text-xs text-brand-caption font-mono mt-0.5">{lead.email || 'no-email-collected'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {lead.meeting_status === 'scheduled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-tag text-xs font-bold uppercase">
                          📅 Scheduled
                        </span>
                      )}
                      {getBucketBadge(lead.bucket)}
                      {getStatusBadge(lead.status)}
                    </div>
                  </div>

                  {lead.ai_summary && (
                    <div className="bg-brand-paper/50 p-3.5 rounded-tag border border-brand-border/40 mb-4">
                      <p className="text-sm text-brand-caption leading-relaxed">
                        {lead.ai_summary}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-brand-border/50 pt-3 text-[10px] font-mono text-brand-caption">
                    <span>Score: <strong className="text-brand-blue text-sm">{lead.score || 0}/100</strong></span>
                    <span>Created: {new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Lead Details Panel (lg:col-span-5) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 h-fit">
          {!selectedLeadId ? (
            <div className="bg-white p-8 rounded-card border border-brand-border border-dashed text-center text-brand-caption" style={{ boxShadow: 'var(--shadow-card)' }}>
              <svg className="w-12 h-12 mx-auto text-brand-border mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <h3 className="font-bold text-brand-ink text-lg mb-1">Triage Details Panel</h3>
              <p className="text-sm">Select an applicant card from the triage list to inspect score breakdown, AI summaries, and full question/answer transcripts.</p>
            </div>
          ) : detailLoading ? (
            <div className="bg-white p-8 rounded-card border border-brand-border text-center text-brand-caption" style={{ boxShadow: 'var(--shadow-card)' }}>
              <p className="text-sm animate-pulse">Retrieving vault details...</p>
            </div>
          ) : !leadDetail ? (
            <div className="bg-white p-8 rounded-card border border-brand-border text-center text-red-500" style={{ boxShadow: 'var(--shadow-card)' }}>
              <p className="text-sm">Lead details could not be found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-card border border-brand-border overflow-hidden max-h-[85vh] flex flex-col" style={{ boxShadow: 'var(--shadow-card)' }}>
              
              {/* Detail Header */}
              <div className="p-6 border-b border-brand-border bg-brand-paper/50">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold text-brand-ink leading-tight font-display" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {leadDetail.lead.name || 'Anonymous Applicant'}
                  </h2>
                  <button 
                    onClick={() => {
                      setSelectedLeadId(null);
                      navigate('/admin');
                    }}
                    className="text-brand-caption hover:text-brand-ink text-sm p-1 border rounded cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <p className="text-xs text-brand-caption font-mono mb-4">{leadDetail.lead.email || 'No email collected'}</p>
                
                {/* Workflow Status Dropdown Control */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white border border-brand-border rounded-btn">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-brand-caption">Pipeline Stage</label>
                    <span className="text-xs font-semibold text-brand-ink">Triage Status</span>
                  </div>
                  <select
                    disabled={statusUpdateLoading}
                    value={leadDetail.lead.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    className="p-1.5 border border-brand-border rounded bg-brand-paper font-semibold text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="new">New Intake</option>
                    <option value="contacted">Contacted</option>
                    <option value="review">In Review</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* Cal.com Meeting Scheduled Banner */}
                {leadDetail.lead.meeting_status === 'scheduled' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-btn text-green-800 text-sm">
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <span>📅</span> Meeting Scheduled
                    </div>
                    <div className="mb-2">
                      Scheduled for: <strong>{new Date(leadDetail.lead.meeting_scheduled_at!).toLocaleString()}</strong>
                    </div>
                    {leadDetail.lead.meeting_link && (
                      <a 
                        href={leadDetail.lead.meeting_link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-xs no-underline transition-all"
                      >
                        Join Meeting &rarr;
                      </a>
                    )}
                  </div>
                )}
                
                {/* Score Summary */}
                <div className="p-4 bg-brand-paper border border-brand-border rounded-btn flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-brand-caption uppercase">Triage Score</span>
                    <strong className="text-3xl font-extrabold text-brand-blue font-mono">{leadDetail.lead.score || 0}</strong>
                    <span className="text-xs text-brand-caption"> / 100</span>
                  </div>
                  <div>
                    {getBucketBadge(leadDetail.lead.bucket)}
                  </div>
                </div>

                {/* Score Category Breakdown styled list */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-brand-caption mb-3 tracking-wider">Score Breakdown</h4>
                  <div className="border border-brand-border rounded-btn overflow-hidden divide-y divide-brand-border">
                    {Object.entries(leadDetail.lead.score_breakdown || {}).map(([category, value]) => {
                      if (category === 'clarification_question') return null;
                      return (
                        <div key={category} className="px-4 py-2.5 flex justify-between items-center text-xs">
                          <span className="capitalize text-brand-ink">{category.replace('_', ' ')}</span>
                          <span className="font-mono font-semibold text-brand-blue">{value} pts</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Summary */}
                {leadDetail.lead.ai_summary && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-brand-caption mb-2 tracking-wider">AI Summary Report</h4>
                    <p className="text-sm leading-relaxed text-brand-ink bg-amber-50/30 p-4 border border-brand-amber/20 rounded-btn">
                      {leadDetail.lead.ai_summary}
                    </p>
                  </div>
                )}

                {/* AI Clarification Question */}
                {leadDetail.lead.score_breakdown?.clarification_question && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-brand-caption mb-2 tracking-wider">AI Clarification Prompt (Maybe Bucket)</h4>
                    <p className="text-sm leading-relaxed text-brand-caption bg-blue-50/30 p-4 border border-brand-blue/20 rounded-btn italic">
                      "{leadDetail.lead.score_breakdown.clarification_question}"
                    </p>
                  </div>
                )}

                {/* AI Tags & Flags */}
                {(leadDetail.lead.ai_tags || leadDetail.lead.ai_flags) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {leadDetail.lead.ai_tags && leadDetail.lead.ai_tags.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-brand-caption mb-2 tracking-wider">Sectors / Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {leadDetail.lead.ai_tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-brand-paper border border-brand-border text-[10px] font-bold rounded-tag text-brand-caption">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {leadDetail.lead.ai_flags && leadDetail.lead.ai_flags.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-brand-caption mb-2 tracking-wider text-brand-coral">Flags Detected</h4>
                        <div className="flex flex-wrap gap-2">
                          {leadDetail.lead.ai_flags.map((flag) => (
                            <span key={flag} className="px-2 py-0.5 bg-red-50 border border-brand-coral/20 text-[10px] font-bold rounded-tag text-brand-coral">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual follow-up email dispatcher */}
                <div className="border border-brand-border p-4 bg-brand-paper rounded-btn space-y-4">
                  <h4 className="text-xs font-bold uppercase text-brand-caption tracking-wider">✉️ Dispatch Manual Email</h4>
                  
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-caption mb-1">Email Template</label>
                    <select
                      value={emailTemplate}
                      onChange={(e) => setEmailTemplate(e.target.value)}
                      className="w-full p-2 border border-brand-border bg-white rounded-btn text-xs"
                    >
                      {leadDetail.lead.bucket === 'hot' && (
                        <option value="hot">Hot Template (Includes Cal.com link)</option>
                      )}
                      {leadDetail.lead.bucket === 'good' && (
                        <option value="good">Good Template (Under review notice)</option>
                      )}
                      {leadDetail.lead.bucket === 'maybe' && (
                        <option value="maybe">Maybe Template (Follow-up clarification question)</option>
                      )}
                      {leadDetail.lead.bucket === 'low' && (
                        <option value="low">Low Template (Rejection notice)</option>
                      )}
                      <option value="custom">Custom Email (Plain Text)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-brand-caption mb-1">
                      {emailTemplate === 'custom' ? 'Email Body Message' : 'Custom Message Notes / Template Override (Optional)'}
                    </label>
                    <textarea
                      value={customMsgText}
                      onChange={(e) => setCustomMsgText(e.target.value)}
                      rows={3}
                      placeholder={emailTemplate === 'custom' ? 'Write your custom email body here...' : 'Add notes or custom comments to append...'}
                      className="w-full p-2.5 border border-brand-border rounded-btn text-xs focus:outline-none focus:border-brand-blue"
                    />
                  </div>

                  {emailSuccess && (
                    <div className="p-2.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-semibold">
                      Email dispatched successfully and status updated!
                    </div>
                  )}

                  {emailError && (
                    <div className="p-2.5 bg-red-50 text-brand-coral border border-brand-coral/20 rounded text-xs font-semibold">
                      {emailError}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={emailSending}
                    onClick={handleSendEmail}
                    className="w-full py-2 bg-brand-blue hover:opacity-95 text-white font-bold rounded-btn text-xs cursor-pointer transition-all disabled:opacity-50"
                  >
                    {emailSending ? 'Sending...' : 'Send Follow-up Email'}
                  </button>
                </div>

                {/* Communication Log History */}
                {leadDetail.lead.communication_logs && leadDetail.lead.communication_logs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-brand-caption mb-3 tracking-wider">Communication Log History</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {leadDetail.lead.communication_logs.map((log, index) => (
                        <div key={index} className="p-3 bg-brand-paper border border-brand-border rounded-btn text-xs">
                          <div className="flex justify-between items-center text-[10px] font-mono text-brand-caption mb-1">
                            <span className="uppercase font-bold text-brand-blue">{log.template} send</span>
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          {log.message && (
                            <p className="text-xs text-brand-ink italic mt-1 bg-white p-2 border border-brand-border/40 rounded">
                              "{log.message}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Q&A Responses Transcript list */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-brand-caption mb-3 tracking-wider">Full Q&A Transcript</h4>
                  <div className="space-y-4">
                    {leadDetail.responses.map((resp, i) => (
                      <div key={i} className="p-4 bg-brand-paper border border-brand-border/60 rounded-btn">
                        <span className="block text-[9px] font-mono text-brand-caption mb-1 uppercase">Q{resp.order_index} &bull; {resp.category}</span>
                        <p className="text-xs font-bold text-brand-ink mb-2">{resp.question}</p>
                        <div className="text-xs text-brand-caption p-2.5 bg-white border border-brand-border/50 rounded-tag font-mono leading-relaxed break-words">
                          {Array.isArray(resp.answer) ? resp.answer.join(', ') : String(resp.answer)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
