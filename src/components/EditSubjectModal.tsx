import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Target, BookOpen, Loader2 as LoaderIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Subject } from '../types';

interface EditSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
}

export default function EditSubjectModal({ isOpen, onClose, subject }: EditSubjectModalProps) {
  const { updateSubject } = useApp();
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('09:00');
  const [dailyHours, setDailyHours] = useState(4);
  const [targetScore, setTargetScore] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setExamDate(new Date(subject.examDate).toISOString().split('T')[0]);
      setExamTime(subject.examTime || '09:00');
      setDailyHours(subject.dailyHours);
      setTargetScore(subject.targetScore || 80);
    }
  }, [subject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) return;

    setIsSubmitting(true);
    try {
      await updateSubject(subject.id, {
        name,
        examDate: new Date(examDate).toISOString(),
        examTime,
        dailyHours,
        targetScore,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update subject:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-accent">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="text-primary" />
                Edit Subject Details
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Subject Name</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Advanced Mathematics"
                    className="w-full bg-accent border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Exam Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      required
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full bg-accent border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Exam Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      required
                      type="time"
                      value={examTime}
                      onChange={(e) => setExamTime(e.target.value)}
                      className="w-full bg-accent border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Daily Study Hours</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      required
                      type="number"
                      min="1"
                      max="24"
                      value={dailyHours}
                      onChange={(e) => setDailyHours(parseInt(e.target.value))}
                      className="w-full bg-accent border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Target Score (%)</label>
                  <div className="relative">
                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      value={targetScore}
                      onChange={(e) => setTargetScore(parseInt(e.target.value))}
                      className="w-full bg-accent border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl border border-border hover:bg-accent transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderIcon className="animate-spin" size={18} />
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
