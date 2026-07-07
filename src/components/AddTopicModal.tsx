import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Clock, BookOpen, Loader2 as LoaderIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PlusCrossButton } from './ui/PlusCrossButton';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Topic } from '../types';

interface AddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId?: string | null;
}

export default function AddTopicModal({ isOpen, onClose, subjectId: initialSubjectId }: AddTopicModalProps) {
  const { state, addTopic } = useApp();
  const [name, setName] = useState('');
  const [module, setModule] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [estimatedTime, setEstimatedTime] = useState(0.2);
  const [dependencies, setDependencies] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
    } else if (state.selectedSubjectId) {
      setSelectedSubjectId(state.selectedSubjectId);
    } else if (state.subjects.length > 0) {
      setSelectedSubjectId(state.subjects[0].id);
    }
  }, [initialSubjectId, state.selectedSubjectId, state.subjects, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user || !selectedSubjectId) return;

    setIsSubmitting(true);
    try {
      await addTopic(selectedSubjectId, {
        name,
        module,
        priority,
        estimatedTime,
        mastery: 0,
        status: 'Not Started',
        dependencies: dependencies.split(',').map(d => d.trim()).filter(d => d !== ''),
        order: (state.topics || []).length
      });
      
      onClose();
      // Reset form
      setName('');
      setModule('');
      setPriority('Medium');
      setEstimatedTime(0.2);
      setDependencies('');
    } catch (error) {
      console.error('Failed to add topic:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-accent sticky top-0 z-20">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="text-primary" />
                Add New Topic
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto">
              {!initialSubjectId && state.subjects.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Subject</label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full bg-accent border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer text-sm font-medium"
                    >
                      {state.subjects.map(s => (
                        <option key={s.id} value={s.id} className="bg-card text-foreground">{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Topic Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Differentiation Rules"
                  className="w-full bg-accent border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Module / Unit</label>
                  <input
                    required
                    type="text"
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    placeholder="e.g. Calculus"
                    className="w-full bg-accent border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Priority</label>
                  <div className="relative">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-accent border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer text-sm font-medium"
                    >
                      <option value="High" className="bg-card">High</option>
                      <option value="Medium" className="bg-card">Medium</option>
                      <option value="Low" className="bg-card">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Estimated Time (hours)</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(parseFloat(e.target.value))}
                    className="w-full bg-accent border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Dependencies (Topic IDs)</label>
                <input
                  type="text"
                  value={dependencies}
                  onChange={(e) => setDependencies(e.target.value)}
                  placeholder="e.g. topic-id-1, topic-id-2"
                  className="w-full bg-accent border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                />
              </div>

              </div>

              <div className="p-6 border-t border-border flex justify-end gap-4 bg-accent/20 sticky bottom-0 z-20">
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
                  className="btn-primary px-8 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderIcon className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    'Add Topic'
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
