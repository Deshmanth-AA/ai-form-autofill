import React, { useState } from 'react';
import { Sparkles, FileSearch, FileCheck, FilePlus2 } from 'lucide-react';
import clsx from 'clsx';
import BuilderStep from './components/BuilderStep';
import UploadStep from './components/UploadStep';
import ReviewStep from './components/ReviewStep';
import { useFormStore, useUploadStore, useExtractionStore } from './store';

const STEPS = [
  { key: 'build', label: 'Build form', icon: FilePlus2 },
  { key: 'upload', label: 'Upload document', icon: FileSearch },
  { key: 'review', label: 'Review & save', icon: FileCheck },
];

function Stepper({ step, onJump }) {
  return (
    <nav className="flex items-center gap-1.5" data-testid="stepper">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = i === step;
        const isDone = i < step;
        return (
          <React.Fragment key={s.key}>
            <button
              onClick={() => isDone && onJump(i)}
              disabled={!isDone && !isActive}
              data-testid={`step-${s.key}`}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium font-manrope transition-colors',
                isActive && 'bg-indigo-600 text-white',
                isDone && 'text-indigo-700 hover:bg-indigo-50 cursor-pointer',
                !isActive && !isDone && 'text-slate-400 cursor-default'
              )}
            >
              <span className={clsx(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                isActive && 'bg-white text-indigo-600',
                isDone && 'bg-indigo-100 text-indigo-700',
                !isActive && !isDone && 'bg-slate-100 text-slate-400'
              )}>
                {isDone ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className={clsx('w-6 h-px', i < step ? 'bg-indigo-300' : 'bg-slate-200')} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const { resetSchema } = useFormStore();
  const clearUpload = useUploadStore((s) => s.clearFile);
  const resetExtraction = useExtractionStore((s) => s.reset);

  const handleDone = () => {
    resetSchema();
    clearUpload();
    resetExtraction();
    setStep(0);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5" data-testid="app-logo">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <p className="font-outfit text-base font-medium text-slate-900 leading-none">Autofill</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.18em] font-bold mt-0.5">AI Form Builder</p>
            </div>
          </div>
          <Stepper step={step} onJump={setStep} />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 animate-fade-in" key={step}>
        {step === 0 && <BuilderStep onNext={() => setStep(1)} />}
        {step === 1 && <UploadStep onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <ReviewStep onBack={() => setStep(1)} onDone={handleDone} />}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-slate-500 font-manrope">
          <span>© {new Date().getFullYear()} Autofill · AI-powered form builder</span>
          <span>Powered by OpenRouter</span>
        </div>
      </footer>
    </div>
  );
}
