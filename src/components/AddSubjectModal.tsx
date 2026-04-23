import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Calendar, Clock, Target, BookOpen, Upload, FileText, Loader2 as LoaderIcon, AlertCircle, Brain, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { collection, doc, setDoc, writeBatch, updateDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { Subject, Topic } from '../types';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';
import { PlusCrossButton } from './ui/PlusCrossButton';
import { extractTextFromPdf } from '@/lib/pdfUtils';
import { parseSyllabus, estimateTopicDurations } from '@/services/geminiService';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId?: string | null;
}

interface PortionInput {
  id?: string;
  name: string;
  module: string;
  priority: 'High' | 'Medium' | 'Low';
  estimatedTime: number;
}

export default function AddSubjectModal({ isOpen, onClose, subjectId }: AddSubjectModalProps) {
  const { state, selectSubject, updateSubject } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('09:00');
  const [dailyHours, setDailyHours] = useState(4);
  const [targetScore, setTargetScore] = useState(80);
  const [portions, setPortions] = useState<PortionInput[]>([
    { name: '', module: '', priority: 'Medium', estimatedTime: 0.2 }
  ]);
  const [originalTopicIds, setOriginalTopicIds] = useState<string[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Load existing data if subjectId is provided
  React.useEffect(() => {
    if (subjectId && isOpen) {
      setIsLoading(true);
      const loadData = async () => {
        const subject = (state.subjects || []).find(s => s.id === subjectId);
        if (subject && state.user) {
          setName(subject.name);
          setExamDate(new Date(subject.examDate).toISOString().split('T')[0]);
          setExamTime(subject.examTime || '09:00');
          setDailyHours(subject.dailyHours || 4);
          setTargetScore(subject.targetScore || 80);

          // Get topics for this subject directly from Firestore to ensure we have them all
          // even if this isn't the currently selected subject in the app state
          try {
            const topicsRef = collection(db, 'users', state.user.uid, 'subjects', subjectId, 'topics');
            const topicsSnap = await getDocs(query(topicsRef, orderBy('order')));
            const fetchedTopics = topicsSnap.docs.map(d => d.data() as Topic);
            
            if (fetchedTopics.length > 0) {
              setPortions(fetchedTopics.map(t => ({
                id: t.id,
                name: t.name,
                module: t.module,
                priority: t.priority,
                estimatedTime: t.estimatedTime
              })));
              setOriginalTopicIds(fetchedTopics.map(t => t.id));
            } else {
              setPortions([{ name: '', module: '', priority: 'Medium', estimatedTime: 0.2 }]);
              setOriginalTopicIds([]);
            }
          } catch (err) {
            console.error("Error fetching topics for modal:", err);
            // Fallback to state topics if fetch fails
            const subjectTopics = (state.topics || []).filter(t => t.subjectId === subjectId);
            if (subjectTopics.length > 0) {
              setPortions(subjectTopics.map(t => ({
                id: t.id,
                name: t.name,
                module: t.module,
                priority: t.priority,
                estimatedTime: t.estimatedTime
              })));
              setOriginalTopicIds(subjectTopics.map(t => t.id));
            }
          }
        }
        setIsLoading(false);
      };
      loadData();
    } else if (!subjectId && isOpen) {
      // Reset for new creation
      setName('');
      setExamDate('');
      setExamTime('09:00');
      setDailyHours(4);
      setTargetScore(80);
      setPortions([{ name: '', module: '', priority: 'Medium', estimatedTime: 0.2 }]);
      setOriginalTopicIds([]);
    }
    setSelectedIndices([]);
  }, [subjectId, isOpen, state.subjects, state.user]);

  const handleBulkAdd = () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    const newPortions: PortionInput[] = lines.map(line => {
      // Try to split by comma or tab if it looks like structured data
      const parts = line.split(/[,\t]/);
      return {
        name: parts[0]?.trim() || line.trim(),
        module: parts[1]?.trim() || 'General',
        priority: 'Medium',
        estimatedTime: 0.2
      };
    });

    if (newPortions.length > 0) {
      const filteredPortions = portions.filter(p => p.name || p.module);
      const combinedPortions = [...filteredPortions, ...newPortions];
      setPortions(combinedPortions);
      setBulkText('');
      setShowBulkAdd(false);
      
      if (name) {
        setTimeout(() => handleAIEstimate(combinedPortions), 100);
      }
    }
  };
  const handleDailyHoursChange = (val: string) => {
    const parsed = parseInt(val);
    setDailyHours(Number.isNaN(parsed) ? 0 : parsed);
  };

  const handleTargetScoreChange = (val: string) => {
    const parsed = parseInt(val);
    setTargetScore(Number.isNaN(parsed) ? 0 : parsed);
  };
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const addPortion = () => {
    setPortions([...portions, { name: '', module: '', priority: 'Medium', estimatedTime: 0.2 }]);
    setSelectedIndices([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error('The file appears to be empty or unreadable.');
      }

      const result = await parseSyllabus(text);
      
      if (result.subject && !name) {
        setName(result.subject);
      }

      if (result.topics && result.topics.length > 0) {
        const newPortions: PortionInput[] = result.topics.map(t => ({
          name: t.name,
          module: t.module,
          priority: t.priority as 'High' | 'Medium' | 'Low',
          estimatedTime: t.estimatedTime || 0.2
        }));
        
        // Filter out empty initial portion if it exists
        const filteredPortions = portions.filter(p => p.name || p.module);
        setPortions([...filteredPortions, ...newPortions]);
      }
    } catch (error) {
      console.error('Error parsing syllabus:', error);
      setParseError(error instanceof Error ? error.message : 'Failed to parse syllabus. Please try again or add topics manually.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePortion = (index: number) => {
    setPortions(portions.filter((_, i) => i !== index));
    setSelectedIndices([]);
  };

  const updatePortion = (index: number, field: keyof PortionInput, value: any) => {
    const newPortions = [...portions];
    newPortions[index] = { ...newPortions[index], [field]: value };
    setPortions(newPortions);
  };

  const toggleSelectPortion = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleCombinePortions = () => {
    if (selectedIndices.length < 2) return;

    const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
    const firstIndex = sortedIndices[0];

    const selectedPortions = selectedIndices.map(i => portions[i]);
    const totalTime = selectedPortions.reduce((acc, p) => acc + p.estimatedTime, 0);
    
    const priorityScores = { 'Low': 1, 'Medium': 3, 'High': 9 };
    const totalScore = selectedPortions.reduce((acc, p) => acc + priorityScores[p.priority], 0);
    
    let combinedPriority: 'High' | 'Medium' | 'Low' = 'Low';
    if (totalScore >= 9) combinedPriority = 'High';
    else if (totalScore >= 3) combinedPriority = 'Medium';

    const combinedName = selectedPortions.length > 3 
      ? `Combined: ${selectedPortions[0].name} + ${selectedPortions.length - 1} more`
      : `Combined: ${selectedPortions.map(p => p.name).join(', ')}`;

    const newPortion: PortionInput = {
      name: combinedName.substring(0, 100),
      module: selectedPortions[0].module || 'General',
      priority: combinedPriority,
      estimatedTime: Math.round(totalTime * 10) / 10
    };

    // Build new list preserving the position of the first selected item
    const newList: PortionInput[] = [];
    let inserted = false;
    for (let i = 0; i < portions.length; i++) {
      if (selectedIndices.includes(i)) {
        if (!inserted) {
          newList.push(newPortion);
          inserted = true;
        }
      } else {
        newList.push(portions[i]);
      }
    }

    setPortions(newList);
    setSelectedIndices([]);
  };

  const handleAIEstimate = async (targetList?: PortionInput[] | React.MouseEvent) => {
    const listToEstimate = Array.isArray(targetList) ? targetList : portions;
    if (listToEstimate.length === 0 || !name) {
      if (!Array.isArray(targetList)) alert("Please enter subject name and at least one topic.");
      return;
    }
    
    setIsEstimating(true);
    try {
      const topicData = listToEstimate.map(p => ({ name: p.name, module: p.module }));
      const estimates = await estimateTopicDurations(topicData, name);
      
      const newPortions = listToEstimate.map((p, i) => ({
        ...p,
        estimatedTime: estimates[i] || p.estimatedTime
      }));
      
      setPortions(newPortions);
    } catch (error) {
      console.error("Failed to estimate times:", error);
      if (!targetList) alert("AI estimation failed. Please try again.");
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user) return;

    setIsSubmitting(true);
    try {
      const activeSubjectId = subjectId || crypto.randomUUID();
      const subjectRef = doc(db, 'users', state.user.uid, 'subjects', activeSubjectId);
      
      const subjectData = {
        name,
        examDate: new Date(examDate).toISOString(),
        examTime,
        dailyHours,
        targetScore,
        userId: state.user.uid,
        updatedAt: new Date().toISOString()
      };

      if (!subjectId) {
        // Create new subject
        await setDoc(subjectRef, {
          ...subjectData,
          id: activeSubjectId,
          createdAt: new Date().toISOString()
        });
      } else {
        // Update existing
        await updateDoc(subjectRef, subjectData);
      }

      // Add/Update topics
      const batch = writeBatch(db);
      let opsCount = 0;
      
      const filteredPortions = portions.filter(p => (p.name && p.module) || p.id);
      const keptTopicIds = new Set(filteredPortions.filter(p => p.id).map(p => p.id));

      // Handle deletions
      if (subjectId) {
        originalTopicIds.forEach(id => {
          if (!keptTopicIds.has(id)) {
            const topicRef = doc(db, 'users', state.user!.uid, 'subjects', activeSubjectId, 'topics', id);
            batch.delete(topicRef);
            opsCount++;
          }
        });
      }
      
      filteredPortions.forEach((portion, index) => {
        const topicId = portion.id || crypto.randomUUID();
        const topicRef = doc(db, 'users', state.user!.uid, 'subjects', activeSubjectId, 'topics', topicId);
        
        const topicData: any = {
          name: portion.name,
          module: portion.module,
          priority: portion.priority,
          estimatedTime: portion.estimatedTime,
          updatedAt: new Date().toISOString(),
          order: index
        };

        if (!portion.id) {
          // New topic
          batch.set(topicRef, {
            ...topicData,
            id: topicId,
            mastery: 0,
            status: 'Not Started',
            dependencies: [],
            subjectId: activeSubjectId,
            userId: state.user!.uid,
            createdAt: new Date().toISOString()
          });
        } else {
          // Update existing topic
          batch.update(topicRef, topicData);
        }
        opsCount++;
      });

      if (opsCount > 0) {
        await batch.commit();
      }
      
      if (!subjectId) {
        await selectSubject(activeSubjectId);
        navigate('/dashboard');
      }
      
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${state.user.uid}/subjects`);
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
            className="relative w-full max-w-4xl max-h-[95vh] overflow-hidden bg-card border border-border rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col"
          >
            <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between bg-accent sticky top-0 z-20">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <BookOpen className="text-primary" />
                {subjectId ? 'Edit Subject' : 'Add Subject'}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors btn-touch"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden relative">
              {isLoading && (
                <div className="absolute inset-0 z-50 bg-card/50 backdrop-blur-sm flex items-center justify-center">
                  <LoaderIcon className="animate-spin text-primary" size={32} />
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
              {/* Syllabus Upload */}
              <div className="p-5 sm:p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                <div className="flex flex-col md:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                      <FileText size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base">AI Syllabus Import</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-tight">Upload PDF or text to auto-extract topics</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.txt"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsing}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 btn-touch"
                    >
                      {isParsing ? (
                        <>
                          <LoaderIcon className="animate-spin" size={18} />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          Upload Syllabus
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {parseError && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle size={16} />
                    {parseError}
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
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
                      value={Number.isNaN(dailyHours) ? '' : dailyHours}
                      onChange={(e) => handleDailyHoursChange(e.target.value)}
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
                      value={Number.isNaN(targetScore) ? '' : targetScore}
                      onChange={(e) => handleTargetScoreChange(e.target.value)}
                      className="w-full bg-accent border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Portions */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-card z-10 py-2 -mx-2 px-2 rounded-lg shadow-sm border-b md:border-none">
                  <h3 className="text-lg font-semibold">Portions (Topics)</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAIEstimate}
                      disabled={isEstimating || portions.length === 0}
                      className="flex items-center gap-2 text-[10px] sm:text-sm font-bold text-warning hover:text-warning/80 transition-colors disabled:opacity-50 uppercase tracking-widest"
                    >
                      {isEstimating ? <LoaderIcon className="animate-spin" size={14} /> : <Brain size={16} />}
                      AI Estimate
                    </button>
                    <button
                      type="button"
                      onClick={addPortion}
                      className="flex items-center gap-2 text-[10px] sm:text-sm font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                    >
                      <Plus size={16} />
                      Add Topic
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkAdd(!showBulkAdd)}
                      className="text-[10px] sm:text-sm font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
                    >
                      {showBulkAdd ? 'Cancel' : 'Bulk'}
                    </button>
                    {selectedIndices.length >= 2 && (
                      <div className="flex flex-col items-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCombinePortions}
                          className="flex items-center gap-2 px-3 animate-pulse"
                        >
                          Combine ({selectedIndices.length})
                        </Button>
                        <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tight">3 Easy → 1 Med | 3 Med → 1 High</span>
                      </div>
                    )}
                  </div>
                </div>

                {showBulkAdd && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-accent border border-border rounded-xl space-y-4"
                  >
                    <p className="text-sm text-muted-foreground">Paste a list of topics (one per line). You can also use "Topic, Module" format.</p>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="e.g.&#10;Introduction to Calculus, Module 1&#10;Derivatives, Module 1&#10;Integrals, Module 2"
                      className="w-full h-32 bg-background border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      type="button"
                      onClick={handleBulkAdd}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-semibold transition-all"
                    >
                      Add to List
                    </button>
                  </motion.div>
                )}

                <div className="bg-accent/30 rounded-xl border border-border/50 p-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/10 space-y-4">
                  {portions.map((portion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 border rounded-xl relative group transition-all",
                        selectedIndices.includes(index) ? "bg-primary/5 border-primary/40 ring-1 ring-primary/30" : "bg-card border-border"
                      )}
                    >
                      <div className="md:col-span-1 flex items-center justify-start md:justify-center">
                        <PlusCrossButton 
                          active={selectedIndices.includes(index)} 
                          activeColor="primary"
                          onClick={() => toggleSelectPortion(index)} 
                        />
                        <span className="md:hidden ml-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select for Action</span>
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Topic Name</label>
                        <input
                          required
                          type="text"
                          value={portion.name}
                          onChange={(e) => updatePortion(index, 'name', e.target.value)}
                          placeholder="Topic name"
                          className="w-full bg-accent/30 sm:bg-transparent border border-border/50 sm:border-none p-2 sm:p-0 rounded-lg focus:ring-1 focus:ring-primary/30 text-sm h-10 sm:h-auto"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Module/Unit</label>
                        <input
                          required
                          type="text"
                          value={portion.module}
                          onChange={(e) => updatePortion(index, 'module', e.target.value)}
                          placeholder="Module name"
                          className="w-full bg-accent/30 sm:bg-transparent border border-border/50 sm:border-none p-2 sm:p-0 rounded-lg focus:ring-1 focus:ring-primary/30 text-sm h-10 sm:h-auto"
                        />
                      </div>
                      <div className="grid grid-cols-2 lg:contents gap-3 md:col-span-5">
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Priority</label>
                          <select
                            value={portion.priority}
                            onChange={(e) => updatePortion(index, 'priority', e.target.value)}
                            className="w-full bg-accent/30 sm:bg-transparent border border-border/50 sm:border-none p-2 sm:p-0 rounded-lg focus:ring-1 focus:ring-primary/30 text-sm h-10 sm:h-auto appearance-none cursor-pointer"
                          >
                            <option value="High" className="bg-card">High</option>
                            <option value="Medium" className="bg-card">Medium</option>
                            <option value="Low" className="bg-card">Low</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Time (hours)</label>
                          <input
                            required
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={Number.isNaN(portion.estimatedTime) ? '' : portion.estimatedTime}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              updatePortion(index, 'estimatedTime', Number.isNaN(val) ? 0 : val);
                            }}
                            className="w-full bg-accent/30 sm:bg-transparent border border-border/50 sm:border-none p-2 sm:p-0 rounded-lg focus:ring-1 focus:ring-primary/30 text-sm h-10 sm:h-auto"
                          />
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 md:relative md:top-0 md:right-0 md:col-span-1 flex items-center justify-end">
                        {portions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePortion(index)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors btn-touch"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-accent/50 border-t border-border flex justify-end gap-3 sticky bottom-0 z-20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="px-8 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderIcon className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    subjectId ? 'Save Changes' : 'Create Subject'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

