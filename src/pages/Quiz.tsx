import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ArrowRight, RotateCcw, Home, Clock, Award, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOCK_QUIZ = [
  {
    question: "If P(A) = 0.4, P(B) = 0.5, and A and B are independent events, what is P(A ∩ B)?",
    options: ["0.1", "0.2", "0.9", "0.45"],
    correct: 1,
    explanation: "For independent events, P(A ∩ B) = P(A) * P(B). So, 0.4 * 0.5 = 0.2."
  },
  {
    question: "Which of the following represents the formula for Conditional Probability P(A|B)?",
    options: ["P(A) + P(B)", "P(A ∩ B) / P(B)", "P(A ∪ B) / P(A)", "P(A) * P(B)"],
    correct: 1,
    explanation: "P(A|B) is defined as the probability of A occurring given that B has occurred, which is P(A ∩ B) / P(B)."
  }
];

export default function Quiz() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    if (idx === MOCK_QUIZ[currentIdx].correct) {
      setScore(s => s + 1);
    }
    
    setTimeout(() => {
      if (currentIdx < MOCK_QUIZ.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setSelectedIdx(null);
      } else {
        setIsFinished(true);
      }
    }, 2000);
  };

  if (isFinished) {
    const percentage = Math.round((score / MOCK_QUIZ.length) * 100);
    return (
      <div className="min-h-screen pt-12 sm:pt-24 px-4 sm:px-6 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-6 sm:p-10 w-full max-w-xl text-center"
        >
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-6 sm:mb-8">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="text-muted border border-border stroke-current" strokeWidth="8" fill="transparent" r="42" cx="50" cy="50" />
              <motion.circle 
                className="text-primary stroke-current" 
                strokeWidth="8" 
                strokeLinecap="round" 
                fill="transparent" 
                r="42" 
                cx="50" 
                cy="50" 
                initial={{ strokeDasharray: "0 264" }}
                animate={{ strokeDasharray: `${(percentage / 100) * 264} 264` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-4xl font-bold text-foreground">{percentage}%</span>
              <span className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Score</span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Quiz Completed!</h2>
          <p className="text-sm text-muted-foreground mb-8">You've made significant progress in this topic.</p>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-10">
            <div className="bg-accent p-3 sm:p-4 rounded-xl border border-border">
              <div className="text-muted-foreground text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mb-1">Mastery Update</div>
              <div className="text-sm sm:text-base text-success font-bold flex items-center justify-center gap-1">
                <Award size={16} /> +15%
              </div>
            </div>
            <div className="bg-accent p-3 sm:p-4 rounded-xl border border-border">
              <div className="text-muted-foreground text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mb-1">Time Taken</div>
              <div className="text-sm sm:text-base font-bold">2m 45s</div>
            </div>
          </div>

          <div className="flex gap-3 sm:gap-4">
            <button onClick={() => window.location.reload()} className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm">
              <RotateCcw size={18} /> Retake
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm">
              <Home size={18} /> Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = MOCK_QUIZ[currentIdx];

  return (
    <div className="min-h-screen pt-20 sm:pt-24 px-4 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-3xl mb-8 sm:mb-12">
        <div className="mb-4 sm:mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm font-medium bg-accent px-3 py-1.5 rounded-lg border border-border">
            <ArrowLeft size={16} />
            Exit Quiz
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 gap-2">
          <div>
            <div className="text-primary text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Topic Mastery Check</div>
            <h1 className="text-lg sm:text-xl font-bold leading-tight">Interactive Assessment</h1>
          </div>
          <span className="text-muted-foreground text-xs font-bold bg-accent/50 px-2 py-0.5 rounded">Question {currentIdx + 1} of {MOCK_QUIZ.length}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary shadow-glow shadow-primary/20"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentIdx + 1) / MOCK_QUIZ.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-3xl mb-12">
        <motion.div 
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass p-5 sm:p-8 mb-8"
        >
          <h2 className="text-xl sm:text-2xl font-bold mb-8 sm:mb-10 leading-tight">{currentQuestion.question}</h2>
          
          <div className="space-y-3 sm:space-y-4">
            {currentQuestion.options.map((option, i) => {
              const isSelected = selectedIdx === i;
              const isCorrect = i === currentQuestion.correct;
              const showFeedback = selectedIdx !== null;
              
              return (
                <button
                  key={i}
                  disabled={showFeedback}
                  onClick={() => handleSelect(i)}
                  className={cn(
                    "w-full p-4 sm:p-6 text-left rounded-xl border transition-all flex items-center justify-between group btn-touch",
                    !showFeedback && "bg-accent/30 border-border hover:border-primary/50 hover:bg-primary/5",
                    showFeedback && isCorrect && "bg-success/10 border-success text-success",
                    showFeedback && isSelected && !isCorrect && "bg-destructive/10 border-destructive text-destructive",
                    showFeedback && !isSelected && !isCorrect && "bg-accent/10 border-border opacity-50"
                  )}
                >
                  <span className="text-sm sm:text-lg font-medium pr-4">{option}</span>
                  {showFeedback && isCorrect && <Check size={20} className="shrink-0" />}
                  {showFeedback && isSelected && !isCorrect && <X size={20} className="shrink-0" />}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {selectedIdx !== null && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-8 pt-8 border-t border-border"
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-2 opacity-50">Explanation</div>
                <p className="text-muted-foreground leading-relaxed">{currentQuestion.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
