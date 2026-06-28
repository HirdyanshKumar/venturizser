import { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';
import { getApiUrl } from './utils/api';

interface Question {
  id: string;
  key: string;
  category: string;
  text: string;
  helper_text: string | null;
  input_type: 'text' | 'textarea' | 'chips' | 'slider';
  options: any;
  validation: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    multiSelect?: boolean;
  };
  order_index: number;
  total_questions: number;
}

interface HistoryItem {
  question: Question;
  answer: any;
}

function App() {
  // ── States ──────────────────────────────────────────────────────────────────
  const [flowType, setFlowType] = useState<'founder' | 'investor' | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<any>('');
  
  // Local history for backtracking
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // UI states
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [completed, setCompleted] = useState<boolean>(false);

  // ── Lightweight popstate Router ──
  const [path, setPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (newPath: string) => {
    window.history.pushState(null, '', newPath);
    setPath(newPath);
  };

  // ── Start Flow ──────────────────────────────────────────────────────────────
  const startFlow = async (type: 'founder' | 'investor') => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(getApiUrl('/api/sessions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_type: type }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setFlowType(type);
        setSessionId(data.session_id);
        setCurrentQuestion(data.question);
        setHistory([]);
        initializeAnswerValue(data.question);
      } else {
        setErrorMsg(data.error || 'Failed to start session. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg('Server connection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // Initialize answer input type defaults based on question configuration
  const initializeAnswerValue = (q: Question, existingVal?: any) => {
    if (existingVal !== undefined) {
      setCurrentAnswer(existingVal);
      return;
    }

    if (q.input_type === 'slider') {
      const minVal = q.options?.min !== undefined ? Number(q.options.min) : 0;
      setCurrentAnswer(minVal);
    } else if (q.input_type === 'chips') {
      if (q.validation?.multiSelect) {
        setCurrentAnswer([]);
      } else {
        setCurrentAnswer('');
      }
    } else {
      setCurrentAnswer('');
    }
  };

  // ── Submit Answer ───────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (!sessionId || !currentQuestion) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(getApiUrl(`/api/sessions/${sessionId}/answer`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          answer: currentAnswer,
        }),
      });
      
      const data = await res.json();

      if (res.status === 200) {
        // Save current question & answer to history before moving forward
        setHistory((prev) => [...prev, { question: currentQuestion, answer: currentAnswer }]);

        if (data.complete) {
          // Trigger the session completion API
          await triggerCompletion();
        } else if (data.next_question) {
          setCurrentQuestion(data.next_question);
          initializeAnswerValue(data.next_question);
        }
      } else if (res.status === 422) {
        // Server validation error
        setErrorMsg(data.message || 'Validation failed. Check your response.');
      } else {
        setErrorMsg(data.error || 'Failed to submit response.');
      }
    } catch (err: any) {
      setErrorMsg('Failed to submit answer. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Complete Session ────────────────────────────────────────────────────────
  const triggerCompletion = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(getApiUrl(`/api/sessions/${sessionId}/complete`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setCompleted(true);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to complete session review.');
      }
    } catch (err) {
      setErrorMsg('Failed to finalize session.');
    }
  };

  // ── Backtrack (Edit previous question) ──────────────────────────────────────
  const handleBack = () => {
    if (history.length === 0) {
      // Go back to start screen
      setFlowType(null);
      setSessionId(null);
      setCurrentQuestion(null);
      return;
    }

    const previousItem = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentQuestion(previousItem.question);
    initializeAnswerValue(previousItem.question, previousItem.answer);
    setErrorMsg('');
  };

  // ── Formatted Slider Display Helpers ────────────────────────────────────────
  const formatValue = (val: number, options: any) => {
    if (options?.formatAs === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: options?.unit || 'USD',
        maximumFractionDigits: 0,
      }).format(val);
    }
    return `${val} ${options?.unit || ''}`;
  };

  // ── Chips Selection Toggles ─────────────────────────────────────────────────
  const toggleChipSelection = (val: string) => {
    if (!currentQuestion) return;
    const isMulti = !!currentQuestion.validation?.multiSelect;

    if (isMulti) {
      const currentArr = Array.isArray(currentAnswer) ? currentAnswer : [];
      if (currentArr.includes(val)) {
        setCurrentAnswer(currentArr.filter((item) => item !== val));
      } else {
        setCurrentAnswer([...currentArr, val]);
      }
    } else {
      setCurrentAnswer(val);
    }
  };

  // ── Calculate Progress Bar Width & Background ──────────────────────────────
  const progressPct = currentQuestion
    ? (currentQuestion.order_index / currentQuestion.total_questions) * 100
    : 0;

  // Intercept and render Admin Dashboard if route matches
  if (path.startsWith('/admin')) {
    const match = path.match(/^\/admin\/leads\/([a-fA-F0-9-]{36})/);
    const initialLeadId = match ? match[1] : undefined;
    return <AdminDashboard navigate={navigate} initialLeadId={initialLeadId} />;
  }

  // Render Start Screen
  if (!flowType || !currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col justify-between py-12 px-4 select-none">
        <header className="max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight text-brand-blue" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Venturizer
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-brand-coral"></div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto w-full my-auto flex flex-col items-center text-center">
          <h1 
            className="text-4xl md:text-5xl font-bold tracking-tight text-brand-ink mb-4 max-w-2xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Tell us what you're building.
          </h1>
          <p className="text-lg text-brand-caption mb-12 max-w-xl">
            Help us understand your business or investment thesis in a quick, focused conversation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Founder Choice Card */}
            <button
              onClick={() => startFlow('founder')}
              disabled={loading}
              className="p-8 text-left rounded-card bg-white border border-brand-border hover:border-brand-blue cursor-pointer transition-all flex flex-col justify-between min-h-[180px] disabled:opacity-55"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div>
                <span className="inline-block px-3 py-1 bg-blue-50 text-brand-blue text-xs font-bold rounded-tag uppercase mb-4">
                  For Founders
                </span>
                <h3 className="text-xl font-bold text-brand-ink mb-2">Pitch Your Startup</h3>
                <p className="text-sm text-brand-caption">
                  Answer questions about your team, traction, MVP, and funding ask to qualify.
                </p>
              </div>
            </button>

            {/* Investor Choice Card */}
            <button
              onClick={() => startFlow('investor')}
              disabled={loading}
              className="p-8 text-left rounded-card bg-white border border-brand-border hover:border-brand-blue cursor-pointer transition-all flex flex-col justify-between min-h-[180px] disabled:opacity-55"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div>
                <span className="inline-block px-3 py-1 bg-amber-50 text-brand-amber text-xs font-bold rounded-tag uppercase mb-4">
                  For Investors
                </span>
                <h3 className="text-xl font-bold text-brand-ink mb-2">Partner With Us</h3>
                <p className="text-sm text-brand-caption">
                  Share your thesis, cheque size, stage focus, and portfolio model.
                </p>
              </div>
            </button>
          </div>
        </main>

        <footer className="text-center text-xs text-brand-caption max-w-4xl mx-auto w-full border-t border-brand-border pt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Venturizer Lead Intake &bull; Automated Triage</span>
          <button onClick={() => navigate('/admin')} className="text-brand-blue font-semibold hover:underline cursor-pointer">
            Admin ERP Portal &rarr;
          </button>
        </footer>
      </div>
    );
  }

  // Render Completion Screen
  if (completed) {
    return (
      <div className="min-h-screen flex flex-col justify-between py-12 px-4">
        <header className="max-w-2xl mx-auto w-full">
          <span className="font-bold text-xl tracking-tight text-brand-blue" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Venturizer
          </span>
        </header>

        <main className="max-w-2xl mx-auto w-full my-auto text-center bg-white p-12 rounded-card border border-brand-border" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-brand-sage mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-brand-ink mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Application Submitted
          </h2>
          <p className="text-brand-caption mb-8 max-w-md mx-auto">
            Thank you for sharing your profile. Our team has received your responses and will review them shortly.
          </p>
          <div className="p-4 bg-brand-paper rounded-[10px] text-xs text-brand-caption font-mono border border-brand-border">
            Session ID: {sessionId}
          </div>
        </main>

        <footer className="text-center text-xs text-brand-caption max-w-2xl mx-auto w-full pt-4">
          You may close this browser tab safely.
        </footer>
      </div>
    );
  }

  // Render Chatbot Flow
  return (
    <div className="min-h-screen flex flex-col justify-between py-12 px-4">
      {/* Header with Back Button */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-blue cursor-pointer hover:underline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className="font-bold text-lg tracking-tight text-brand-blue" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Venturizer
        </span>
      </header>

      {/* Main Conversational Box */}
      <main 
        className="max-w-2xl mx-auto w-full my-auto bg-white rounded-card border border-brand-border overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        {/* Progress Bar with Cool-to-Warm gradient */}
        <div className="w-full h-1.5 bg-brand-border">
          <div 
            className="h-full transition-all duration-300 ease-out"
            style={{ 
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, var(--color-brand-blue) 0%, var(--color-brand-coral) 100%)' 
            }}
          ></div>
        </div>

        <div key={currentQuestion.id} className="p-8 md:p-10 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-mono uppercase px-2 py-0.5 bg-brand-paper border border-brand-border rounded-tag" style={{ color: 'var(--color-brand-caption)' }}>
              Step {currentQuestion.order_index} of {currentQuestion.total_questions}
            </span>
            <span className="text-xs text-brand-caption font-semibold uppercase">
              {currentQuestion.category.replace('_', ' ')}
            </span>
          </div>

          <h2 
            className="text-2xl md:text-3xl font-bold text-brand-ink mb-2 leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {currentQuestion.text}
          </h2>
          {currentQuestion.helper_text && (
            <p className="text-sm text-brand-caption mb-8 leading-relaxed">
              {currentQuestion.helper_text}
            </p>
          )}

          {/* Input Controls */}
          <div className="mb-8 min-h-[120px] flex flex-col justify-center">
            
            {/* Text input */}
            {currentQuestion.input_type === 'text' && (
              <input
                type="text"
                autoFocus
                value={currentAnswer || ''}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="w-full p-4 border border-brand-border rounded-btn focus:outline-none focus:border-brand-blue text-lg"
                placeholder="Type your answer..."
                onKeyDown={(e) => e.key === 'Enter' && currentAnswer !== '' && handleNext()}
              />
            )}

            {/* Textarea input */}
            {currentQuestion.input_type === 'textarea' && (
              <textarea
                autoFocus
                value={currentAnswer || ''}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="w-full p-4 border border-brand-border rounded-btn focus:outline-none focus:border-brand-blue text-lg h-36 resize-none"
                placeholder="Type your detailed response here..."
              />
            )}

            {/* Range Slider */}
            {currentQuestion.input_type === 'slider' && (
              <div className="w-full py-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-brand-blue font-mono">
                    {formatValue(Number(currentAnswer), currentQuestion.options)}
                  </span>
                </div>
                <input
                  type="range"
                  min={currentQuestion.options?.min || 0}
                  max={currentQuestion.options?.max || 100}
                  step={currentQuestion.options?.step || 1}
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(Number(e.target.value))}
                  className="w-full h-2 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-blue"
                />
                <div className="flex justify-between text-xs text-brand-caption mt-2 font-mono">
                  <span>{formatValue(currentQuestion.options?.min || 0, currentQuestion.options)}</span>
                  <span>{formatValue(currentQuestion.options?.max || 100, currentQuestion.options)}</span>
                </div>
              </div>
            )}

            {/* Chips input */}
            {currentQuestion.input_type === 'chips' && (
              <div className="flex flex-wrap gap-3">
                {Array.isArray(currentQuestion.options) &&
                  currentQuestion.options.map((opt: any) => {
                    const isSelected = currentQuestion.validation?.multiSelect
                      ? Array.isArray(currentAnswer) && currentAnswer.includes(opt.value)
                      : currentAnswer === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleChipSelection(opt.value)}
                        className={`px-4 py-3 rounded-btn border text-sm font-semibold cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-brand-blue border-brand-blue text-white shadow-sm'
                            : 'bg-white border-brand-border text-brand-ink hover:border-brand-blue'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Validation Error Message */}
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-brand-coral/20 rounded-[10px] text-sm text-brand-coral flex items-start gap-2.5 id-validation-error animate-fade-in">
              <svg className="w-5 h-5 text-brand-coral shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* CTA Buttons */}
          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full py-4 text-white text-base font-bold rounded-btn cursor-pointer transition-all flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-55"
            style={{ backgroundColor: 'var(--color-brand-blue)' }}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : currentQuestion.order_index === currentQuestion.total_questions ? (
              'Complete Review'
            ) : (
              'Next Question'
            )}
          </button>
        </div>
      </main>

      <footer className="text-center text-xs text-brand-caption max-w-2xl mx-auto w-full pt-4">
        Your answers are saved automatically as you progress.
      </footer>
    </div>
  );
}

export default App;
