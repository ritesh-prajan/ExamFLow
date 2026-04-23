import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Clock, Zap, ChevronRight, Loader2, Pause, Play, PlayCircle, Coffee, Brain, Settings2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { cn } from '@/lib/utils';
import { SilkBackground } from '@/components/SilkBackground';

type PomodoroMode = 'work' | 'break';

export default function FocusMode() {
  const { topicId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialDuration = queryParams.get('duration') ? parseInt(queryParams.get('duration')!) : 0;
  
  const { 
    state, 
    toggleTopicStatus, 
    isTimerEnabled, 
    isTimerRunning, 
    timerElapsedTime, 
    logTopicTime 
  } = useApp();
  
  // Pomodoro State
  const [isPomodoro, setIsPomodoro] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<PomodoroMode>('work');
  const [workDuration, setWorkDuration] = useState(25 * 60); // 25 mins
  const [breakDuration, setBreakDuration] = useState(5 * 60); // 5 mins
  const [showSettings, setShowSettings] = useState(false);

  const [seconds, setSeconds] = useState(initialDuration || (isPomodoro ? workDuration : 0));
  const [isActive, setIsActive] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInProgressUpdating, setIsInProgressUpdating] = useState(false);
  const navigate = useNavigate();

  const isCountdown = initialDuration > 0 || isPomodoro;

  // Find the topic to focus on
  let currentTopic = (state.topics || []).find(t => t.id === topicId);
  
  // Module-sticky logic for sequential learning
  useEffect(() => {
    if (currentTopic && state.selectedSubjectId) {
      localStorage.setItem(`activeModule_${state.selectedSubjectId}`, currentTopic.module);
      // Sync moduleId for Dashboard dropdown as well
      const moduleId = currentTopic.module.toLowerCase().replace(/\s+/g, '-');
      localStorage.setItem(`activeModuleId_${state.selectedSubjectId}`, moduleId);
    }
  }, [currentTopic, state.selectedSubjectId]);

  // If no topicId provided or not found, pick the "next" topic based on preference
  if (!currentTopic && (state.topics || []).length > 0 && state.selectedSubjectId) {
    if (state.learningPreference === 'sequential') {
      const activeModuleName = localStorage.getItem(`activeModule_${state.selectedSubjectId}`);
      
      // 1. Try to find next topic in the active module
      if (activeModuleName) {
        currentTopic = (state.topics || []).find(t => t.module === activeModuleName && t.status !== 'Mastered');
      }

      // 2. If no active module or it's done, find the NEXT incomplete module in order (with looping)
      if (!currentTopic) {
        const activeModuleId = localStorage.getItem(`activeModuleId_${state.selectedSubjectId}`);
        const allModules = state.modules || [];
        const currentIndex = allModules.findIndex(m => m.id === activeModuleId);
        
        const isModuleIncomplete = (m: any) => {
          const moduleTopics = (state.topics || []).filter(t => t.module === m.name);
          return moduleTopics.some(t => t.status !== 'Mastered');
        };

        // Search from next to end
        let targetModule = allModules.slice(currentIndex + 1).find(isModuleIncomplete);
        
        // Loop back if not found in subsequent modules
        if (!targetModule) {
          targetModule = allModules.find(isModuleIncomplete);
        }

        if (targetModule) {
          currentTopic = (state.topics || []).find(t => t.module === targetModule.name && t.status !== 'Mastered');
          if (currentTopic) {
            localStorage.setItem(`activeModule_${state.selectedSubjectId}`, currentTopic.module);
            const mid = targetModule.id;
            localStorage.setItem(`activeModuleId_${state.selectedSubjectId}`, mid);
          }
        }
      }
    } else {
      currentTopic = (state.topics || []).find(t => t.status !== 'Mastered');
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => {
          if (isCountdown) {
            if (s <= 0) {
              if (isPomodoro) {
                // Switch Pomodoro mode
                const nextMode = pomodoroMode === 'work' ? 'break' : 'work';
                setPomodoroMode(nextMode);
                return nextMode === 'work' ? workDuration : breakDuration;
              }
              clearInterval(interval);
              return 0;
            }
            return s - 1;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isCountdown, isPomodoro, pomodoroMode, workDuration, breakDuration]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = async () => {
    if (!currentTopic) return;
    
    setIsUpdating(true);
    await toggleTopicStatus(currentTopic.id);
    
    // Global Timer Sync: Log time if enabled
    if (isTimerEnabled && isTimerRunning) {
      logTopicTime(timerElapsedTime);
    }
    
    setIsCompleted(true);

    // If in sequential mode, check if we should shift module immediately
    if (state.learningPreference === 'sequential') {
      const moduleName = currentTopic.module;
      const moduleTopics = (state.topics || []).filter(t => t.module === moduleName);
      
      // Since toggleTopicStatus was called, this topic is now mastered (assuming it wasn't before)
      // Check if ALL topics in this module are now mastered
      const moduleFinished = moduleTopics.every(t => {
        if (t.id === currentTopic!.id) return true;
        return t.status === 'Mastered';
      });

      if (moduleFinished) {
        const allModules = state.modules || [];
        const currentModuleIndex = allModules.findIndex(m => m.name === moduleName);
        
        const checkModuleIncomplete = (m: any) => {
          const tps = (state.topics || []).filter(t => t.module === m.name);
          return tps.some(t => {
            if (t.id === currentTopic!.id) return false; // treat as mastered
            return t.status !== 'Mastered';
          });
        };

        const nextIncomplete = allModules.slice(currentModuleIndex + 1).find(checkModuleIncomplete) || 
                               allModules.find(checkModuleIncomplete);

        if (nextIncomplete && state.selectedSubjectId) {
          localStorage.setItem(`activeModuleId_${state.selectedSubjectId}`, nextIncomplete.id);
          localStorage.setItem(`activeModule_${state.selectedSubjectId}`, nextIncomplete.name);
        }
      }
    }
    
    setTimeout(() => {
      navigate('/dashboard');
    }, 3000);
  };

  const handleSetInProgress = async () => {
    if (!currentTopic || !state.user || !state.selectedSubjectId) return;
    
    setIsInProgressUpdating(true);
    try {
      const topicRef = doc(db, 'users', state.user.uid, 'subjects', state.selectedSubjectId, 'topics', currentTopic.id);
      await updateDoc(topicRef, { 
        status: 'In Progress',
        mastery: Math.max(currentTopic.mastery, 25) // Give a small boost if they started
      });
      navigate('/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}/subjects/${state.selectedSubjectId}/topics/${currentTopic.id}`);
    } finally {
      setIsInProgressUpdating(false);
    }
  };

  const togglePomodoro = () => {
    const newIsPomodoro = !isPomodoro;
    setIsPomodoro(newIsPomodoro);
    if (newIsPomodoro) {
      setSeconds(workDuration);
      setPomodoroMode('work');
    } else {
      setSeconds(initialDuration || 0);
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!currentTopic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6">
        <Zap size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Topic Selected</h2>
        <p className="text-muted-foreground mb-8 max-w-md">Please select a topic from your dashboard or study plan to start a focus session.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-20 md:pt-28 pb-12 px-4 sm:px-6 relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SilkBackground />
      </div>
      
      {/* Immersive overlay for session focus */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-[1px] z-[1]" />

      <AnimatePresence>
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-success z-[60] flex flex-col items-center justify-center text-white"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
            >
              <Check size={120} strokeWidth={3} />
            </motion.div>
            <h2 className="text-4xl font-bold mt-8">Session Complete!</h2>
            <p className="text-xl opacity-80 mt-2">Mastery updated +12%</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pomodoro Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[50] bg-card/90 backdrop-blur-2xl border border-border p-8 rounded-3xl shadow-2xl w-full max-w-sm"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-sm uppercase tracking-widest text-foreground">Interval Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Work Duration (mins)</label>
                <input 
                  type="number" 
                  value={workDuration / 60} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value) * 60;
                    setWorkDuration(val);
                    if (isPomodoro && pomodoroMode === 'work') setSeconds(val);
                  }}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Break Duration (mins)</label>
                <input 
                  type="number" 
                  value={breakDuration / 60} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value) * 60;
                    setBreakDuration(val);
                    if (isPomodoro && pomodoroMode === 'break') setSeconds(val);
                  }}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Column: Focus Main */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 bg-card hover:bg-card/90 backdrop-blur-3xl border border-border rounded-[2.5rem] p-6 sm:p-10 md:p-16 shadow-2xl relative overflow-hidden flex flex-col justify-center transition-colors lg:min-h-[600px]"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-primary/20 rounded-full mt-6" />
            
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.4em] mb-6 sm:mb-8">
                <Brain size={14} className="animate-pulse" />
                {currentTopic.module}
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-7xl font-black mb-6 sm:mb-10 leading-[1.1] tracking-tight text-foreground max-w-4xl">
                {currentTopic.name}
              </h1>
              
              <div className="w-full max-w-md mx-auto space-y-4 sm:space-y-6 text-left">
                <h3 className="text-muted-foreground/30 text-[10px] font-bold uppercase tracking-[0.25em] mb-2 sm:mb-4 flex items-center gap-3">
                  <span className="w-8 h-[1px] bg-border/50"></span>
                  Active Protocol
                  <span className="flex-1 h-[1px] bg-border/50"></span>
                </h3>
                {[
                  `Master the foundations of ${currentTopic.name}`,
                  'Internalize patterns via spaced repetition',
                  'Verify through interactive assessment'
                ].map((point, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex gap-4 sm:gap-5 items-start bg-accent/30 p-3 sm:p-4 rounded-2xl border border-border/10 shadow-sm"
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow" />
                    </div>
                    <p className="text-sm sm:text-base md:text-xl text-muted-foreground font-medium leading-relaxed">{point}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Workspace State */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Main Dashboard Widget */}
          <div className="bg-card backdrop-blur-3xl border border-border rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 flex flex-col items-center shadow-2xl relative">
            <div className="flex flex-col items-center mb-8 sm:mb-10 w-full">
              <div className="flex items-center justify-center gap-4 mb-4 sm:mb-6">
                {isPomodoro && (
                  <motion.div
                    initial={{ rotate: -20, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    className={cn(
                      "p-3 rounded-2xl",
                      pomodoroMode === 'work' ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.2)]" : "bg-success/20 text-success border border-success/30 shadow-[0_0_20px_rgba(var(--success),0.2)]"
                    )}
                  >
                    {pomodoroMode === 'work' ? <Brain size={24} /> : <Coffee size={24} />}
                  </motion.div>
                )}
                <div className="text-5xl sm:text-6xl font-mono font-black tracking-tighter text-foreground tabular-nums drop-shadow-sm">
                  {formatTime(seconds)}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border",
                  isPomodoro 
                    ? (pomodoroMode === 'work' ? "bg-primary/20 border-primary/30 text-primary" : "bg-success/20 border-success/30 text-success")
                    : "bg-muted border-border text-muted-foreground"
                )}>
                  {isPomodoro ? (pomodoroMode === 'work' ? 'Deep Work' : 'Interval Break') : 'Focus Flow'}
                </span>
                {isPomodoro && (
                  <button onClick={() => setShowSettings(!showSettings)} className="text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:rotate-90 btn-touch p-2">
                    <Settings2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full mb-6 sm:mb-8">
              <button 
                onClick={() => setIsActive(!isActive)}
                className="group p-4 sm:p-5 rounded-3xl bg-muted/30 border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex flex-col items-center gap-3 btn-touch shadow-sm"
              >
                <div className="p-2 sm:p-3 rounded-2xl bg-accent group-hover:bg-primary/20 group-hover:text-primary transition-all">
                  {isActive ? <Pause size={20} className="sm:w-6 sm:h-6" /> : <Play size={20} className="sm:w-6 sm:h-6" />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{isActive ? 'Pause' : 'Resume'}</span>
              </button>
              <button 
                onClick={togglePomodoro}
                className={cn(
                  "group p-4 sm:p-5 rounded-3xl border transition-all flex flex-col items-center gap-3 btn-touch shadow-sm",
                  isPomodoro ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "p-2 sm:p-3 rounded-2xl transition-all",
                  isPomodoro ? "bg-primary/20" : "bg-accent group-hover:bg-primary/20 group-hover:text-primary"
                )}>
                  <Clock size={20} className="sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Pomodoro</span>
              </button>
            </div>

            <button 
              onClick={handleComplete}
              disabled={isUpdating || isInProgressUpdating}
              className="w-full py-5 sm:py-6 rounded-3xl bg-primary text-primary-foreground shadow-[0_20px_50px_rgba(var(--primary),0.3)] hover:scale-[1.02] hover:shadow-[0_25px_60px_rgba(var(--primary),0.4)] transition-all flex items-center justify-center gap-4 font-black uppercase tracking-[0.2em] text-xs disabled:opacity-50 btn-touch"
            >
              {isUpdating ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <Check size={20} strokeWidth={4} className="sm:w-6 sm:h-6" />
                  Complete Mastery
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button 
              onClick={handleSetInProgress}
              disabled={isUpdating || isInProgressUpdating}
              className="bg-card backdrop-blur-2xl border border-border p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] text-muted-foreground hover:text-foreground hover:bg-accent transition-all flex flex-col items-center gap-2 sm:gap-3 btn-touch group shadow-lg"
            >
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-accent group-hover:bg-warning/20 group-hover:text-warning transition-all">
                <PlayCircle size={20} className="sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-center">Pause Session</span>
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-card backdrop-blur-2xl border border-border p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-all flex flex-col items-center gap-2 sm:gap-3 btn-touch group shadow-lg"
            >
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-accent group-hover:bg-destructive/20 transition-all">
                <X size={20} className="sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-center">Terminate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
