import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Frown, Meh, Smile, Star, Send, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { cn } from '@/lib/utils';

interface ExamFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  subjectId: string;
}

export default function ExamFeedbackModal({ isOpen, onClose, subjectName, subjectId }: ExamFeedbackModalProps) {
  const { state } = useApp();
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!state.user || !rating) return;

    setIsSubmitting(true);
    try {
      const subjectRef = doc(db, 'users', state.user.uid, 'subjects', subjectId);
      await updateDoc(subjectRef, {
        feedbackGiven: true,
        examRating: rating,
        examFeedback: feedback,
        updatedAt: new Date().toISOString()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${subjectId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratings = [
    { value: 1, icon: Frown, label: 'Tough', color: 'text-red-500' },
    { value: 2, icon: Meh, label: 'Okay', color: 'text-amber-500' },
    { value: 3, icon: Smile, label: 'Great', color: 'text-emerald-500' },
    { value: 4, icon: Star, label: 'Aced it!', color: 'text-yellow-500' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
                <Trophy size={40} />
              </div>
              
              <h2 className="text-3xl font-black mb-2 tracking-tight">Mission Complete?</h2>
              <p className="text-muted-foreground mb-8">
                The exam for <span className="text-foreground font-bold">{subjectName}</span> has concluded. How did it go?
              </p>

              <div className="grid grid-cols-4 gap-4 mb-8">
                {ratings.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRating(r.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all group",
                      rating === r.value 
                        ? "bg-primary/10 border-primary ring-2 ring-primary/20" 
                        : "bg-accent border-border hover:border-primary/50"
                    )}
                  >
                    <r.icon 
                      size={32} 
                      className={cn(
                        "transition-transform group-hover:scale-110",
                        rating === r.value ? r.color : "text-muted-foreground"
                      )} 
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest">{r.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4 text-left">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Any thoughts on the preparation?
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What worked? What didn't? Help your future self..."
                  className="w-full h-32 bg-accent border border-border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                />
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl border border-border font-bold text-sm hover:bg-accent transition-all"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!rating || isSubmitting}
                  className="flex-[2] py-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Send size={18} />
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
