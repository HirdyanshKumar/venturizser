import { useState } from 'react';

function App() {
  const [sessionId, setSessionId] = useState<string>('');
  const [inputType, setInputType] = useState<string>('founder');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [answerInput, setAnswerInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [completed, setCompleted] = useState<boolean>(false);

  const startSession = async () => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      setCompleted(false);
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_type: inputType }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setSessionId(data.session_id);
        setQuestions([data.question]);
        setCurrentQIndex(0);
        setAnswerInput('');
        setSuccessMsg(`Session started! ID: ${data.session_id}`);
      } else {
        setErrorMsg(data.error || 'Failed to start session');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const submitAnswer = async () => {
    if (!sessionId || questions.length === 0) return;
    const currentQ = questions[currentQIndex];

    try {
      setErrorMsg('');
      setSuccessMsg('');

      // Simple pre-parsing for array/number answers in this test playground
      let parsedAnswer: any = answerInput;
      if (currentQ.input_type === 'slider') {
        parsedAnswer = Number(answerInput);
      } else if (currentQ.input_type === 'chips' && currentQ.validation?.multiSelect) {
        parsedAnswer = answerInput.split(',').map(s => s.trim()).filter(Boolean);
      }

      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQ.id,
          answer: parsedAnswer,
        }),
      });

      const data = await res.json();

      if (res.status === 200) {
        setSuccessMsg('Answer accepted!');
        if (data.complete) {
          setCompleted(true);
        } else if (data.next_question) {
          setQuestions([...questions, data.next_question]);
          setCurrentQIndex(currentQIndex + 1);
          setAnswerInput('');
        }
      } else if (res.status === 422) {
        setErrorMsg(`Validation Error [${data.field}]: ${data.message}`);
      } else {
        setErrorMsg(data.error || 'Server error occurred');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const currentQ = questions[currentQIndex];

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: 'var(--color-paper)' }}>
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-[14px] border border-[var(--color-border)]" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h1 className="text-3xl font-bold mb-2 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--color-blue)' }}>
          Venturizer Test Playground
        </h1>
        <p className="text-center mb-8" style={{ color: 'var(--color-caption)' }}>
          Phase 4: Zod Real-Time Server-Side Validation Sandbox
        </p>

        {/* ── Setup Flow ── */}
        <div className="mb-6 p-4 rounded-lg bg-[var(--color-paper)] border border-[var(--color-border)]">
          <h2 className="font-semibold mb-3">1. Initialize Flow</h2>
          <div className="flex gap-4 items-center">
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value)}
              className="p-2 border rounded-[10px] bg-white"
            >
              <option value="founder">Founder Flow</option>
              <option value="investor">Investor Flow</option>
            </select>
            <button
              onClick={startSession}
              className="px-4 py-2 text-white font-medium rounded-[10px] cursor-pointer"
              style={{ backgroundColor: 'var(--color-blue)' }}
            >
              Start Chat
            </button>
          </div>
        </div>

        {/* ── Active Flow ── */}
        {sessionId && !completed && currentQ && (
          <div className="p-4 rounded-lg border border-[var(--color-border)] mb-6">
            <h2 className="font-semibold text-lg mb-2 text-[var(--color-blue)]">
              Question {currentQ.order_index} of {currentQ.total_questions}
            </h2>
            <p className="font-medium text-lg mb-1">{currentQ.text}</p>
            {currentQ.helper_text && (
              <p className="text-sm mb-3" style={{ color: 'var(--color-caption)' }}>{currentQ.helper_text}</p>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-caption)' }}>
                Answer Input (Type: {currentQ.input_type})
              </label>
              {currentQ.input_type === 'textarea' ? (
                <textarea
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  className="w-full p-2 border rounded-[10px] h-24"
                  placeholder="Enter your response here..."
                />
              ) : (
                <input
                  type="text"
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  className="w-full p-2 border rounded-[10px]"
                  placeholder={
                    currentQ.input_type === 'slider'
                      ? `Enter a number between ${currentQ.options?.min} and ${currentQ.options?.max}`
                      : currentQ.validation?.multiSelect
                      ? 'Comma-separated values for multi-select'
                      : 'Enter answer...'
                  }
                />
              )}

              {/* Validation limits context */}
              <div className="mt-2 text-xs flex flex-col gap-1" style={{ color: 'var(--color-caption)' }}>
                {currentQ.validation?.minLength && <div>• Min length: {currentQ.validation.minLength} chars</div>}
                {currentQ.validation?.maxLength && <div>• Max length: {currentQ.validation.maxLength} chars</div>}
                {currentQ.validation?.pattern === 'email' && <div>• Pattern: Must be a valid email</div>}
                {currentQ.options && currentQ.input_type === 'chips' && (
                  <div>
                    • Allowed values: {currentQ.options.map((o: any) => o.value).join(', ')}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={submitAnswer}
              className="w-full py-2 font-medium text-white rounded-[10px] cursor-pointer"
              style={{ backgroundColor: 'var(--color-coral)' }}
            >
              Submit Answer (Triggers Server-Side Zod Validation)
            </button>
          </div>
        )}

        {/* ── Complete State ── */}
        {completed && (
          <div className="p-6 rounded-lg text-center bg-green-50 border border-green-200 text-green-800 mb-6">
            <h3 className="font-bold text-lg mb-1">🎉 Session Completed!</h3>
            <p className="text-sm">All questions answered and passed server-side Zod validation.</p>
          </div>
        )}

        {/* ── Status Messages ── */}
        {errorMsg && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm font-medium mb-4">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-lg bg-green-50 text-green-700 border border-green-200 text-sm font-medium mb-4">
            {successMsg}
          </div>
        )}

        {sessionId && (
          <div className="text-xs text-center border-t pt-4" style={{ color: 'var(--color-caption)' }}>
            Session ID: <span className="font-mono">{sessionId}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
