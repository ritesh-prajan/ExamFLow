import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const QUESTIONS = [
  {
    id: 1,
    type: 'multiple-choice',
    question: 'In a normal distribution, what percentage of data falls within one standard deviation of the mean?',
    options: ['34%', '68%', '95%', '99.7%'],
    correct: 1
  },
  {
    id: 2,
    type: 'true-false',
    question: 'The probability of an impossible event is 1.',
    options: ['True', 'False'],
    correct: 1
  },
  {
    id: 3,
    type: 'confidence',
    question: 'How comfortable are you with calculating Bayes Theorem probabilities?',
    options: ['Not at all', 'Slightly', 'Moderately', 'Very', 'Expert'],
  }
];

export default function Assessment() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const navigate = useNavigate();

  const loadingTexts = [
    "Analyzing your reasoning patterns...",
    "Calibrating your learning profile...",
    "Building your dependency graph...",
    "Generating your personal study plan..."
  ];

  useEffect(() => {
    if (isFinished) {
      const interval = setInterval(() => {
        setLoadingStep(s => {
          if (s >= loadingTexts.length - 1) {
            clearInterval(interval);
            return s;
          }
          return s + 1;
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isFinished]);

  const handleAnswer = (optionIdx: number) => {
    setAnswers([...answers, optionIdx]);
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-lg text-center">
          <AnimatePresence mode="wait">
            {loadingStep < loadingTexts.length - 1 ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin mb-4 sm:mb-6" />
                <h2 className="text-xl sm:text-2xl font-bold mb-2">{loadingTexts[loadingStep]}</h2>
                <p className="text-sm text-muted-foreground">This will only take a moment.</p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass p-6 sm:p-10"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <CheckCircle2 className="text-success" size={32} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Assessment Complete</h2>
                <p className="text-sm text-muted-foreground mb-6 sm:mb-8">We've identified your learning profile:</p>
                
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
                  {['Pattern Thinker', 'Confidence Bias Detected', 'High Difficulty Tolerance'].map(tag => (
                    <span key={tag} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>

                <button 
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary w-full py-4 text-base sm:text-lg rounded-2xl shadow-lg shadow-primary/20"
                >
                  See My Plan
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const currentQuestion = QUESTIONS[currentIdx];

  return (
    <div className="min-h-screen pt-8 sm:pt-12 px-4 sm:px-6 flex flex-col items-center">
      {/* Progress */}
      <div className="w-full max-w-3xl mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-3 gap-1">
          <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest bg-accent px-2 py-0.5 rounded">Baseline Assessment</span>
          <span className="text-foreground font-bold text-sm">Question {currentIdx + 1} of {QUESTIONS.length}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary shadow-lg shadow-primary/20"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentIdx + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-3xl flex-1 flex flex-col justify-center pb-12 sm:pb-24">
        <motion.h2 
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 leading-tight px-2"
        >
          {currentQuestion.question}
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {currentQuestion.options.map((option, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAnswer(i)}
              className="glass p-4 sm:p-6 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group btn-touch"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground group-hover:text-primary font-bold border border-border group-hover:border-primary/30 shadow-sm shrink-0">
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="text-base sm:text-lg font-medium">{option}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
