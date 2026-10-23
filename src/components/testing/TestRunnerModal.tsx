import React, { useState } from 'react';
import { runAcceptanceTests, TestResult } from '../../lib/testRunner';
import { translations, Language } from '../../lib/i18n';
import { ShieldCheck, Play, CheckCircle2, XCircle, X, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';

interface TestRunnerModalProps {
  onClose: () => void;
  lang: Language;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ onClose, lang }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const t = translations[lang];

  const handleRunTests = async () => {
    setIsRunning(true);
    setResults([]);
    try {
      // Small delay for smooth UI feedback
      await new Promise((r) => setTimeout(r, 200));
      const testRes = await runAcceptanceTests();
      setResults(testRes);
    } finally {
      setIsRunning(false);
    }
  };

  const passCount = results.filter((r) => r.passed).length;
  const allPassed = results.length > 0 && passCount === results.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                Automated System Verification &amp; Acceptance Suite
              </h3>
              <p className="text-[11px] text-neutral-500">
                Executes live invariant verification for the 12 business criteria defined in Section 17.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          
          {/* Action Trigger Banner */}
          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                12 Acceptance Criteria Check
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Tests inventory deductions, balanced double-entry journals, idempotency retry protection, 4-stage transfer lifecycle, branch isolation, and OMR 3-decimal math.
              </div>
            </div>

            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunning ? 'Running Invariants...' : 'Run All 12 Tests'}</span>
            </button>
          </div>

          {/* Results Summary if run */}
          {results.length > 0 && (
            <div className={`p-3 rounded-lg border flex items-center justify-between font-semibold ${
              allPassed
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {allPassed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>
                  {allPassed ? 'All 12 Acceptance Invariants Passed Successfully' : `${passCount} / ${results.length} Tests Passed`}
                </span>
              </div>
              <span className="font-mono text-[11px]">
                {results.reduce((acc, r) => acc + r.durationMs, 0)} ms Total
              </span>
            </div>
          )}

          {/* Test List Accordion */}
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((res) => {
                const isExpanded = expandedId === res.id;
                return (
                  <div
                    key={res.id}
                    className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-900"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : res.id)}
                      className="w-full text-left p-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {res.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {res.title}
                          </div>
                          <div className="text-[11px] text-neutral-500">{res.message}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[10px] text-neutral-400">
                          {res.durationMs}ms
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800 text-[11px] space-y-1 font-mono">
                        <div className="text-neutral-400 uppercase text-[9px] font-bold">Execution Trace:</div>
                        {res.details.map((d, idx) => (
                          <div key={idx} className="text-neutral-600 dark:text-neutral-300">
                            • {d}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold rounded-lg"
          >
            {t.close}
          </button>
        </div>

      </div>
    </div>
  );
};
