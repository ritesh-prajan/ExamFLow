import React from 'react';
import { motion } from 'motion/react';
import { Zap, TrendingUp, CheckCircle2, Clock, ChevronRight, ChevronDown, BookOpen, Grid3X3, Share2, Layers, Brain, Loader2, AlertTriangle, Target, Gauge, ArrowUpRight, Plus, Edit3, Timer, Play, Pause, RotateCcw, RefreshCw, FileText, Lock, Unlock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCrossButton } from '@/components/ui/PlusCrossButton';
import { cn, formatDuration, formatNumber } from '@/lib/utils';
import ExamFeedbackModal from '@/components/ExamFeedbackModal';
import { getStudyTip, getApiKey } from '@/services/geminiService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { calculateLinearRegression } from '@/lib/utils';

import AddSubjectModal from '@/components/AddSubjectModal';
import AddTopicModal from '@/components/AddTopicModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const hasApiKey = !!getApiKey();
  const { 
    state, 
    toggleTopicStatus, 
    toggleLearningPreference, 
    rebalancePlan,
    isTimerEnabled,
    isTimerRunning,
    timerElapsedTime,
    lastTrackedTimes,
    toggleTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    logTopicTime,
    resetSubjectTracking
  } = useApp();
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [isTogglingMode, setIsTogglingMode] = React.useState(false);
  const [isRebalancing, setIsRebalancing] = React.useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
  const [isSyllabusManagerOpen, setIsSyllabusManagerOpen] = React.useState(false);
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = React.useState(false);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);
  const [studyTip, setStudyTip] = React.useState<{ tip: string; action: string } | null>(null);
  const [isLoadingTip, setIsLoadingTip] = React.useState(false);

  // Load saved module preference
  React.useEffect(() => {
    if (state.selectedSubjectId && state.user?.uid) {
      const savedModuleId = localStorage.getItem(`${state.user.uid}_activeModuleId_${state.selectedSubjectId}`);
      if (savedModuleId) {
        setSelectedModuleId(savedModuleId);
      }
    }
  }, [state.selectedSubjectId, state.user?.uid]);

  const selectedSubject = (state.subjects || []).find(s => s.id === state.selectedSubjectId);
  const totalTopics = (state.topics || []).length;
  const masteredCount = (state.topics || []).filter(t => t.status === 'Mastered').length;
  const coverage = totalTopics > 0 ? formatNumber((masteredCount / totalTopics) * 100) : 0;
  
  // Topics Done (Module) calculation
  const isModuleIncomplete = (m: any) => {
    const moduleTopics = (state.topics || []).filter(t => t.module === m.name);
    return moduleTopics.some(t => t.status !== 'Mastered');
  };

  // Get active module with fallback
  const dashboardActiveModule = React.useMemo(() => {
    if (selectedModuleId) {
      const found = (state.modules || []).find(m => m.id === selectedModuleId);
      if (found) return found;
    }
    // Fallback to first incomplete module
    return (state.modules || []).find(m => {
      const moduleTopics = (state.topics || []).filter(t => t.module === m.name);
      return moduleTopics.some(t => t.status !== 'Mastered');
    }) || (state.modules || [])[0];
  }, [state.modules, state.topics, selectedModuleId]);

  const activeModuleTopics = dashboardActiveModule 
    ? (state.topics || []).filter(t => t.module === dashboardActiveModule.name)
    : [];
  const moduleMasteredCount = activeModuleTopics.filter(t => t.status === 'Mastered').length;
  const moduleTotalCount = activeModuleTopics.length;

  // Depth score for benchmark chart
  const averageMastery = totalTopics > 0 
    ? (state.topics || []).reduce((acc, t) => acc + (t.mastery || 0), 0) / totalTopics 
    : 0;
  const depthScore = formatNumber(averageMastery);

  const unmasteredTopics = (state.topics || []).filter(t => t.status !== 'Mastered');
  const hoursRemaining = formatNumber(unmasteredTopics.reduce((acc, t) => acc + (t.estimatedTime || 0), 0));
  
  const modulesDoneCount = (state.modules || []).filter(module => {
    const moduleTopics = (state.topics || []).filter(t => t.module === module.name);
    return moduleTopics.length > 0 && moduleTopics.every(t => t.status === 'Mastered');
  }).length;
  const totalModules = (state.modules || []).length;

  React.useEffect(() => {
    const fetchTip = async () => {
      if (!selectedSubject || totalTopics === 0) return;
      setIsLoadingTip(true);
      try {
        const tip = await getStudyTip(state.topics || [], selectedSubject.name, coverage);
        setStudyTip(tip);
      } catch (error) {
        console.error("Error fetching study tip:", error);
      } finally {
        setIsLoadingTip(false);
      }
    };

    fetchTip();
  }, [state.selectedSubjectId, totalTopics]);

  const handleRebalance = async () => {
    setIsRebalancing(true);
    await rebalancePlan();
    setIsRebalancing(false);
  };

  const handleToggleDone = async (topicId: string) => {
    const isNowMarkingMastered = (state.topics || []).find(t => t.id === topicId)?.status !== 'Mastered';
    
    setUpdatingId(topicId);
    await toggleTopicStatus(topicId);
    setUpdatingId(null);

    // Timer Logic: If timer is enabled and we just mastered a topic
    if (isTimerEnabled && isNowMarkingMastered) {
      // If was already running, log the time for the topic we just finished
      if (isTimerRunning) {
        logTopicTime(topicId, timerElapsedTime);
      } else {
        // Just reset/start if it wasn't strictly "running" but was enabled
        logTopicTime(topicId, 0); 
      }
    }

    // If in sequential mode, check if we should shift module immediately after topping
    if (state.learningPreference === 'sequential') {
      const toggledTopic = (state.topics || []).find(t => t.id === topicId);
      if (!toggledTopic) return;

      const moduleName = toggledTopic.module;
      const moduleTopics = (state.topics || []).filter(t => t.module === moduleName);
      
      // Check if ALL topics in this module are now mastered (including the one we just toggled)
      // Note: toggleTopicStatus toggles state, so if it was not mastered it's now mastered.
      const isNowMastered = toggledTopic.status !== 'Mastered'; 
      
      const moduleFinished = moduleTopics.every(t => {
        if (t.id === topicId) return isNowMastered;
        return t.status === 'Mastered';
      });

      if (moduleFinished && isNowMastered) {
        const allModules = state.modules || [];
        const currentModuleIndex = allModules.findIndex(m => m.name === moduleName);
        
        const checkModuleIncomplete = (m: any) => {
          const tps = (state.topics || []).filter(t => t.module === m.name);
          return tps.some(t => {
            if (t.id === topicId) return !isNowMastered; // treat as mastered
            return t.status !== 'Mastered';
          });
        };

        const nextIncomplete = allModules.slice(currentModuleIndex + 1).find(checkModuleIncomplete) || 
                               allModules.find(checkModuleIncomplete);

        if (nextIncomplete && (selectedModuleId === null || nextIncomplete.id !== selectedModuleId)) {
          setSelectedModuleId(nextIncomplete.id);
          if (state.selectedSubjectId && state.user?.uid) {
            localStorage.setItem(`${state.user.uid}_activeModuleId_${state.selectedSubjectId}`, nextIncomplete.id);
            localStorage.setItem(`${state.user.uid}_activeModule_${state.selectedSubjectId}`, nextIncomplete.name);
          }
        }
      }
    }
  };

  const handleToggleMode = async () => {
    setIsTogglingMode(true);
    await toggleLearningPreference();
    setIsTogglingMode(false);
  };

  React.useEffect(() => {
    if (selectedSubject && !selectedSubject.feedbackGiven) {
      const examDate = new Date(selectedSubject.examDate);
      if (selectedSubject.examTime) {
        const [hours, minutes] = selectedSubject.examTime.split(':');
        examDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      if (examDate < new Date()) {
        setShowFeedbackModal(true);
      }
    }
  }, [selectedSubject]);

  const stats = [
    { label: 'Syllabus Coverage', value: coverage, suffix: '%', icon: <Grid3X3 size={20} />, color: 'text-primary' },
    { label: 'Topics Mastered', value: masteredCount, total: totalTopics, icon: <CheckCircle2 size={20} />, color: 'text-success' },
    { label: 'Hours Remaining', value: hoursRemaining, suffix: 'h', icon: <Clock size={20} />, color: 'text-orange-500' },
    { label: 'Modules Done', value: modulesDoneCount, total: totalModules, icon: <Layers size={20} />, color: 'text-indigo-500' },
    { label: 'Study Hours', value: selectedSubject?.dailyHours || 0, suffix: 'h/day', icon: <Clock size={20} />, color: 'text-secondary' },
    { label: 'Topics Done (Module)', value: moduleMasteredCount, total: moduleTotalCount, icon: <Target size={20} />, color: 'text-warning' },
  ];

  // Logic for Today's Plan
  const todayPlan = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const scheduledTopics = (state.topics || []).filter(t => t.scheduledDate === todayStr);

    // If we have topics scheduled specifically for today and NO module override
    if (scheduledTopics.length > 0 && !selectedModuleId) {
      return scheduledTopics.sort((a, b) => {
        if (a.status === 'Mastered' && b.status !== 'Mastered') return 1;
        if (a.status !== 'Mastered' && b.status === 'Mastered') return -1;
        return (a.order || 0) - (b.order || 0);
      });
    }

    // Otherwise, if we have an active module (either selected or fallback)
    if (dashboardActiveModule) {
      return (state.topics || [])
        .filter(t => t.module === dashboardActiveModule.name)
        .sort((a, b) => {
          if (a.status === 'Mastered' && b.status !== 'Mastered') return 1;
          if (a.status !== 'Mastered' && b.status === 'Mastered') return -1;
          
          if (state.learningPreference === 'adaptive') {
            const priorityMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
            if (priorityMap[a.priority as keyof typeof priorityMap] !== priorityMap[b.priority as keyof typeof priorityMap]) {
              return priorityMap[a.priority as keyof typeof priorityMap] - priorityMap[b.priority as keyof typeof priorityMap];
            }
          }
          
          return (a.order || 0) - (b.order || 0);
        });
    }

    // Global fallback
    return (state.topics || [])
      .sort((a, b) => {
        if (a.status === 'Mastered' && b.status !== 'Mastered') return 1;
        if (a.status !== 'Mastered' && b.status === 'Mastered') return -1;
        return (a.order || 0) - (b.order || 0);
      })
      .slice(0, 5);
  }, [state.topics, state.learningPreference, dashboardActiveModule, selectedModuleId]);

  const examDateObj = selectedSubject ? new Date(selectedSubject.examDate) : null;
  if (examDateObj && selectedSubject?.examTime) {
    const [hours, minutes] = selectedSubject.examTime.split(':');
    examDateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  const daysUntilExam = examDateObj 
    ? Math.ceil((examDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const isExamPassed = examDateObj ? examDateObj < new Date() : false;

  // Performance Benchmark dynamic calculations
  const calculateBenchmark = () => {
    // 1. Velocity: Ratio of estimated vs actual study time
    const avgEstimatedTimeMins = totalTopics > 0 
      ? ((state.topics || []).reduce((acc, t) => acc + (t.estimatedTime || 0), 0) / totalTopics) * 60
      : 60;
    
    // Use last logs if available, otherwise assume 1.0 velocity
    const avgActualTimeMins = lastTrackedTimes.length > 0 
      ? lastTrackedTimes.reduce((acc, t) => acc + t, 0) / lastTrackedTimes.length 
      : avgEstimatedTimeMins;
    
    const velocityValue = avgActualTimeMins > 0 ? formatNumber(avgEstimatedTimeMins / avgActualTimeMins) : 1.0;
    
    // 2. Risk Level: Based on coverage needed vs days remaining
    const coverageInt = typeof coverage === 'string' ? parseFloat(coverage) : coverage;
    let risk = 'Low';
    let riskColor = 'text-success';
    
    if (isExamPassed) {
      risk = 'None';
      riskColor = 'text-success';
    } else if (daysUntilExam < 3) {
      risk = coverageInt < 90 ? 'Extreme' : 'High';
      riskColor = coverageInt < 90 ? 'text-danger' : 'text-orange-500';
    } else if (daysUntilExam < 7) {
      risk = coverageInt < 70 ? 'High' : 'Medium';
      riskColor = coverageInt < 70 ? 'text-danger' : 'text-warning';
    } else if (coverageInt < 30 && daysUntilExam < 14) {
      risk = 'Medium';
      riskColor = 'text-warning';
    }

    // 3. Predicted Grade: coverage * 0.7 + depth * 0.3
    const score = (coverageInt * 0.7) + (depthScore * 0.3);
    let grade = 'D';
    let gradeLabel = 'Risk';
    let gradeColor = 'bg-danger text-white';

    if (score >= 90) { grade = 'A+'; gradeLabel = 'Elite'; gradeColor = 'bg-primary text-primary-foreground'; }
    else if (score >= 80) { grade = 'A'; gradeLabel = 'Superior'; gradeColor = 'bg-primary/90 text-primary-foreground'; }
    else if (score >= 70) { grade = 'B+'; gradeLabel = 'Strong'; gradeColor = 'bg-success text-white'; }
    else if (score >= 60) { grade = 'B'; gradeLabel = 'Stable'; gradeColor = 'bg-secondary text-secondary-foreground'; }
    else if (score >= 50) { grade = 'C+'; gradeLabel = 'Fair'; gradeColor = 'bg-warning text-warning-foreground'; }
    else if (score >= 40) { grade = 'C'; gradeLabel = 'Average'; gradeColor = 'bg-warning/50 text-warning-foreground'; }

    return { 
      velocity: velocityValue, 
      risk, 
      riskColor, 
      grade, 
      gradeLabel, 
      gradeColor,
      velocityLabel: velocityValue > 1.2 ? 'Outpacing average' : velocityValue > 0.9 ? 'On track' : 'Below pace'
    };
  };

  const benchmark = calculateBenchmark();

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">System Ready, {state.user?.displayName?.split(' ')[0] || 'User'}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1 shrink-0"><BookOpen size={14} /> {selectedSubject?.name}</span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-border"></span>
            {isExamPassed ? (
              <span className="flex items-center gap-1 text-success shrink-0"><CheckCircle2 size={14} /> Mission Accomplished</span>
            ) : (
              <>
                <span className="flex items-center gap-1 shrink-0"><Clock size={14} /> {daysUntilExam} Days Baseline</span>
                <span className="hidden sm:block w-1 h-1 rounded-full bg-border"></span>
                <span className={cn(
                  "px-2 py-0.5 rounded border tracking-widest",
                  daysUntilExam < 7 ? "bg-danger/10 text-danger border-danger/20" : "bg-warning/10 text-warning border-warning/20"
                )}>
                  Status: {daysUntilExam < 7 ? 'Critical' : daysUntilExam < 14 ? 'Tight' : 'Stable'}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-nowrap items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          <button 
            onClick={() => setIsSyllabusManagerOpen(true)}
            className="flex-1 sm:flex-none h-12 flex items-center justify-center gap-2 px-4 rounded-xl bg-accent/50 text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all border border-border btn-touch"
          >
            <Edit3 size={16} />
            <span className="hidden sm:inline">Manage Syllabus</span>
            <span className="sm:hidden">Syllabus</span>
          </button>
          
          <a
            href={selectedSubject?.notesUrl || "https://drive.google.com/drive/folders/1TUL5IYTnipICLSvu4bzpPGuU97z15FfC?usp=sharing"}
            target="_blank"
            rel="noreferrer"
            title={selectedSubject?.notesUrl ? "Open Google Drive Notes" : "Open Shared Notes Library"}
            className="flex-1 sm:flex-none h-12 flex items-center justify-center gap-2 px-4 rounded-xl bg-accent/50 border border-border text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all btn-touch"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">Open Notes</span>
            <span className="sm:hidden">Notes</span>
          </a>

          <button 
            onClick={handleRebalance}
            disabled={isRebalancing}
            className="flex-1 sm:flex-none h-12 flex items-center justify-center gap-2 px-4 rounded-xl bg-accent/50 border border-border text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all disabled:opacity-50 btn-touch"
          >
            {isRebalancing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            <span className="hidden sm:inline">Rebalance</span>
            <span className="sm:hidden">Sync</span>
          </button>

          <button 
            onClick={handleToggleMode}
            disabled={isTogglingMode}
            className={cn(
              "flex-1 sm:flex-none h-12 flex items-center justify-center gap-2 px-4 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest btn-touch",
              state.learningPreference === 'sequential' 
                ? "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20 border-secondary" 
                : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border-primary"
            )}
          >
            {state.learningPreference === 'sequential' ? (
              <><Layers size={16} /> <span className="hidden sm:inline">Module Flow</span><span className="sm:hidden">Linear</span></>
            ) : (
              <><Brain size={16} /> <span className="hidden sm:inline">Adaptive Flow</span><span className="sm:hidden">Adaptive</span></>
            )}
          </button>

          <Link 
            to={todayPlan.length > 0 ? `/focus/${todayPlan[0].id}` : "/focus"} 
            className="flex-1 sm:flex-none h-12 flex items-center justify-center gap-2 px-4 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20 btn-touch"
          >
            <Zap size={16} fill="currentColor" />
            <span className="hidden sm:inline">Focus Mode</span>
            <span className="sm:hidden">Focus</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-4 sm:p-5 flex flex-col justify-between border-border/40"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-accent/50 ${stat.color}`}>{stat.icon}</div>
              {i === 3 && <span className="text-success text-[10px] font-black uppercase tracking-widest flex items-center gap-0.5"><TrendingUp size={10} /> Optimal</span>}
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black mb-1 truncate">
                {stat.value}{stat.suffix}
                {stat.total && <span className="text-muted-foreground text-xs font-bold opacity-50"> / {stat.total}</span>}
              </div>
              <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Today's Plan */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black uppercase tracking-tight">Daily Protocol</h2>
              <div className="flex items-center gap-2">
                {(state.modules || []).length > 0 && (
                  <div className="relative">
                    <button 
                      onClick={() => setIsModuleDropdownOpen(!isModuleDropdownOpen)}
                      className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-primary/10 text-primary font-black uppercase tracking-wider border border-primary/30 hover:bg-primary/20 transition-all shadow-sm"
                    >
                      <BookOpen size={12} className="opacity-50 shrink-0" />
                      <span className="max-w-[80px] truncate">
                        {selectedModuleId 
                          ? (state.modules.find(m => m.id === selectedModuleId)?.name || 'Module')
                          : 'Auto'} 
                      </span>
                      <ChevronDown size={10} className={cn("transition-transform shrink-0", isModuleDropdownOpen && "rotate-180")} />
                    </button>
                    
                    {isModuleDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsModuleDropdownOpen(false)}
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className="absolute left-0 mt-2 w-48 glass p-2 z-50 shadow-2xl overflow-hidden"
                        >
                          <div className="space-y-1">
                            <div className="px-2 py-1 mb-1 border-b border-border flex items-center justify-between">
                              <span className="text-[10px] font-black text-muted-foreground uppercase opacity-50">Focus Area</span>
                              {selectedModuleId && (
                                <button 
                                  onClick={() => {
                                    setSelectedModuleId(null);
                                    setIsModuleDropdownOpen(false);
                                    if (state.selectedSubjectId && state.user?.uid) {
                                      localStorage.removeItem(`${state.user.uid}_activeModuleId_${state.selectedSubjectId}`);
                                      localStorage.removeItem(`${state.user.uid}_activeModule_${state.selectedSubjectId}`);
                                    }
                                  }}
                                  className="text-[10px] text-primary font-bold hover:underline"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedModuleId(null);
                                setIsModuleDropdownOpen(false);
                                if (state.selectedSubjectId && state.user?.uid) {
                                  localStorage.removeItem(`${state.user.uid}_activeModuleId_${state.selectedSubjectId}`);
                                  localStorage.removeItem(`${state.user.uid}_activeModule_${state.selectedSubjectId}`);
                                }
                              }}
                              className={cn(
                                "w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between group",
                                !selectedModuleId ? "bg-primary/20 text-primary" : "hover:bg-primary/10"
                              )}
                            >
                              <span className="text-xs font-bold">System Recommendation</span>
                              {!selectedModuleId && <CheckCircle2 size={12} className="text-primary" />}
                            </button>
                            <div className="h-px bg-border my-1" />
                            {(state.modules || []).map((m, idx) => (
                              <button
                                key={m.id}
                                onClick={() => {
                                  setSelectedModuleId(m.id);
                                  setIsModuleDropdownOpen(false);
                                  if (state.selectedSubjectId && state.user?.uid) {
                                    localStorage.setItem(`${state.user.uid}_activeModuleId_${state.selectedSubjectId}`, m.id);
                                    localStorage.setItem(`${state.user.uid}_activeModule_${state.selectedSubjectId}`, m.name);
                                  }
                                }}
                                className={cn(
                                  "w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between group",
                                  selectedModuleId === m.id ? "bg-primary/20 text-primary" : "hover:bg-primary/10"
                                )}
                              >
                                <span className="text-xs font-bold whitespace-nowrap">M{idx + 1}: {m.name}</span>
                                {selectedModuleId === m.id && <CheckCircle2 size={12} className="text-primary" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </div>
                )}

                {/* Timer Controls */}
                <div className="flex items-center gap-1 glass p-1 rounded-lg border border-border">
                  <button 
                    onClick={toggleTimer}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter transition-all",
                      isTimerEnabled ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-accent/50"
                    )}
                  >
                    <Timer size={14} className={isTimerEnabled ? "animate-pulse" : ""} />
                    {isTimerEnabled ? "Timer" : "Off"}
                  </button>
                  
                  {isTimerEnabled && (
                    <div className="flex items-center gap-1 px-1 border-l border-border ml-1 h-5">
                      <span className="font-mono text-[10px] w-12 text-center text-primary font-bold">
                        {Math.floor(timerElapsedTime / 60)}:{(timerElapsedTime % 60).toString().padStart(2, '0')}
                      </span>
                      <button 
                        onClick={isTimerRunning ? pauseTimer : startTimer}
                        className="p-1 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary"
                      >
                        {isTimerRunning ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                      </button>
                      <button 
                        onClick={resetTimer}
                        className="p-1 hover:bg-destructive/10 rounded transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <RotateCcw size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/syllabus" className="text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1">
                Syllabus <BookOpen size={14} />
              </Link>
              <Link to="/plan" className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                Full Plan <ChevronRight size={14} />
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {todayPlan.map((topic, i) => (
              <motion.div 
                key={topic.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className={cn(
                  "glass p-4 sm:p-6 flex items-center justify-between group btn-touch border-border/40",
                  i === 0 && topic.status !== 'Mastered' ? 'border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20' : ''
                )}
                onClick={() => navigate(`/focus/${topic.id}`)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={cn(
                    "w-1.5 h-12 rounded-full shrink-0",
                    topic.status === 'Mastered' ? "bg-success" : 
                    topic.priority === 'High' ? "bg-danger" : "bg-warning"
                  )}></div>
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest truncate">{topic.module}</span>
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded font-black uppercase border",
                        topic.status === 'Mastered' ? "bg-success/10 text-success border-success/20" :
                        topic.priority === 'High' ? "bg-danger/10 text-danger border-danger/20" : "bg-warning/10 text-warning border-warning/20"
                      )}>
                        {topic.status === 'Mastered' ? 'Mastered' : topic.priority}
                      </span>
                    </div>
                    <h3 className={cn(
                      "font-bold text-base sm:text-lg transition-all truncate",
                      topic.status === 'Mastered' ? "text-muted-foreground/60 line-through" : "text-foreground"
                    )}>{topic.name}</h3>
                    <div className="flex items-center gap-3 text-muted-foreground text-[10px] font-bold uppercase tracking-wider mt-1 opacity-60">
                      <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(topic.estimatedTime)}</span>
                      <span className="flex items-center gap-1"><Zap size={12} /> recall</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleDone(topic.id);
                  }}
                  disabled={updatingId === topic.id}
                  className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center transition-all disabled:opacity-50 shrink-0",
                    topic.status === 'Mastered' 
                      ? "bg-success text-white border-success shadow-lg shadow-success/20" 
                      : "bg-accent/30 border-border text-transparent hover:border-primary/50 group-hover:text-muted-foreground/30"
                  )}
                >
                  <CheckCircle2 size={20} className={cn(topic.status === 'Mastered' ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Performance Benchmark */}
        <div className="lg:col-span-12 xl:col-span-5">
          <div className="glass p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Preparation Benchmark</h2>
              <span className="text-[10px] px-2 py-1 rounded bg-success/10 text-success font-bold uppercase tracking-widest border border-success/20">Adaptive Plan Active</span>
            </div>

            <div className="flex-1 space-y-10">
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-32 h-32 sm:w-48 sm:h-48 group">
                  <div className="absolute inset-0 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors animate-pulse" />
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%" cy="50%" r="44%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-muted/20"
                    />
                    <circle
                      cx="50%" cy="50%" r="44%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeDasharray="276"
                      strokeDashoffset={276 * (1 - (Number.isNaN(coverage) ? 0 : (typeof coverage === 'string' ? parseFloat(coverage) : coverage)) / 100)}
                      className="text-primary transition-all duration-1000 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl sm:text-4xl font-black">{coverage}%</span>
                    <span className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center px-2">Coverage</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-accent/50 rounded-2xl border border-border group hover:border-primary/30 transition-colors">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Velocity</div>
                  <div className="text-xl font-bold flex items-center gap-1">
                    {benchmark.velocity}x 
                    {benchmark.velocity >= 1 ? (
                      <ArrowUpRight size={16} className="text-success" />
                    ) : (
                      <AlertTriangle size={16} className="text-danger" />
                    )}
                  </div>
                  <div className={cn("text-[10px] font-medium", benchmark.velocity >= 1 ? "text-success" : "text-danger")}>
                    {benchmark.velocityLabel}
                  </div>
                </div>
                <div className="p-4 bg-accent/50 rounded-2xl border border-border group hover:border-primary/30 transition-colors">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Risk Level</div>
                  <div className={cn("text-xl font-bold", benchmark.riskColor)}>{benchmark.risk}</div>
                  <div className="text-[10px] text-muted-foreground">Based on deadline</div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Syllabus Coverage', you: coverage, benchmark: 75 },
                  { label: 'Mastery Depth', you: depthScore, benchmark: 80 },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider mb-2">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-primary">{item.you}% <span className="text-muted-foreground">vs</span> <span className="text-muted-foreground/60">{item.benchmark}%</span></span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
                      <div className="absolute inset-0 bg-muted-foreground/10" style={{ left: `${item.benchmark}%`, width: '2px', zIndex: 10 }}></div>
                      <div className="h-full bg-primary" style={{ width: `${item.you}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border flex items-center justify-between text-xs font-semibold">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-[10px] uppercase tracking-widest">Predicted Grade</span>
                <span className="text-foreground font-black">{benchmark.gradeLabel} Status</span>
              </div>
              <motion.span 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                key={benchmark.grade}
                className={cn("px-4 py-2 rounded-xl font-black text-lg shadow-lg", benchmark.gradeColor)}
              >
                {benchmark.grade}
              </motion.span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Heatmap Preview */}
        <div className="xl:col-span-7">
          <div className="glass p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Topic Confidence Heatmap</h2>
              <Link to="/heatmap" className="text-primary text-sm font-semibold hover:underline">View Full Heatmap</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {(state.topics || []).length > 0 ? (
                <>
                  {(state.topics || []).map((topic) => (
                    <div 
                      key={topic.id}
                      className={`w-10 h-10 rounded-lg border border-border flex items-center justify-center text-[10px] font-bold ${
                        topic.mastery >= 80 ? 'bg-success/40 text-foreground' : 
                        topic.mastery >= 40 ? 'bg-warning/40 text-foreground' : 
                        topic.mastery > 0 ? 'bg-destructive/40 text-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {topic.name.substring(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 15 - (state.topics?.length || 0)) }).map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-lg bg-muted border border-border"></div>
                  ))}
                </>
              ) : (
                <div className="w-full py-10 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-xl">
                  <Zap size={24} className="text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">No topics added yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Smart Suggestion */}
        <div className="xl:col-span-5">
          <div className="glass p-6 border-primary/20 bg-primary/5 min-h-[200px] flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Brain size={20} className="text-primary-foreground" />
              </div>
              <div>
                <div className="text-primary text-xs font-bold uppercase tracking-widest">AI Study Coach</div>
                <div className="font-bold">Personalized Insight</div>
              </div>
            </div>
            
            {!hasApiKey ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden rounded-2xl bg-card/45 border border-border/40 shadow-inner mt-2">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-warning/5 opacity-50" />
                <div className="relative z-10 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center mx-auto shadow-lg shadow-warning/5 animate-pulse">
                    <Lock className="text-warning" size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-foreground">AI Study Coach (Locked)</h4>
                    <p className="text-[10px] text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed font-medium">
                      Curriculum breakdown recommendations, personalized study pacing, and real-time scheduling optimizations are locked.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col items-center gap-2">
                    <button 
                      onClick={() => navigate('/settings')}
                      className="px-4 py-2.5 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                      <Unlock size={12} /> Configure API Key
                    </button>
                    <a 
                      href="https://aistudio.google.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[8px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                    >
                      Get free key from AI Studio
                    </a>
                  </div>
                </div>
              </div>
            ) : isLoadingTip ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-primary" size={24} />
                <span className="text-xs text-muted-foreground animate-pulse">Analyzing patterns...</span>
              </div>
            ) : studyTip ? (
              <>
                <p className="text-foreground/80 leading-relaxed mb-6 font-medium italic">
                  "{studyTip.tip}"
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Recommendation: {studyTip.action}</span>
                  <button className="text-muted-foreground text-[10px] font-bold uppercase hover:text-foreground transition-colors tracking-widest">Dismiss</button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Start studying to unlock personalized AI feedback and scheduling optimizations.
              </p>
            )}
          </div>

          {/* AI Projection Section - Moved here below AI Coach */}
          {lastTrackedTimes.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-6 mt-6 border-l-4 border-l-primary"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-primary">
                    <Target size={16} />
                    Regression Progress Forecast
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {lastTrackedTimes.length < 3 
                      ? `Need ${3 - lastTrackedTimes.length} more logs for linear regression`
                      : `Linear regression analysis active`}
                  </p>
                </div>
                {lastTrackedTimes.length >= 3 && (
                  <div className="text-right">
                    <div className="text-xs font-black text-muted-foreground uppercase opacity-50 mb-0.5">EST. Total finish</div>
                    <div className="text-xl font-black text-primary leading-none">
                      {(() => {
                        const regressionPoints = lastTrackedTimes.map((t, i) => ({ x: i + 1, y: t }));
                        const regression = calculateLinearRegression(regressionPoints);
                        
                        let totalMinsRemaining = 0;
                        const n = masteredCount;
                        const N = totalTopics;
                        
                        if (regression) {
                          for (let i = n + 1; i <= N; i++) {
                            const predicted = regression.slope * i + regression.intercept;
                            totalMinsRemaining += Math.max(predicted, 2); // 2 min floor
                          }
                        } else {
                          const avg = lastTrackedTimes.reduce((a, b) => a + b, 0) / lastTrackedTimes.length;
                          totalMinsRemaining = avg * (totalTopics - masteredCount);
                        }

                        if (totalMinsRemaining >= 60) {
                          return `${Math.floor(totalMinsRemaining / 60)}h ${Math.round(totalMinsRemaining % 60)}m`;
                        }
                        return `${Math.round(totalMinsRemaining)}m`;
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {lastTrackedTimes.length >= 1 ? (
                <div className="space-y-6">
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(() => {
                        const regressionPoints = lastTrackedTimes.map((t, i) => ({ 
                          name: `T${i+1}`, 
                          time: t,
                          type: 'actual'
                        }));
                        
                        if (lastTrackedTimes.length >= 3) {
                          const regression = calculateLinearRegression(lastTrackedTimes.map((t, i) => ({ x: i + 1, y: t })));
                          if (regression) {
                            // Add two projection points
                            const next1 = lastTrackedTimes.length + 1;
                            const next2 = lastTrackedTimes.length + 5;
                            regressionPoints.push({
                              name: `T${next1}`,
                              time: Math.max(regression.slope * next1 + regression.intercept, 2),
                              type: 'trend'
                            } as any);
                            regressionPoints.push({
                              name: `T${next2}`,
                              time: Math.max(regression.slope * next2 + regression.intercept, 2),
                              type: 'trend'
                            } as any);
                          }
                        }
                        return regressionPoints;
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" fontSize={8} axisLine={false} tickLine={false} stroke="rgba(255,255,255,0.3)" />
                        <YAxis fontSize={8} axisLine={false} tickLine={false} stroke="rgba(255,255,255,0.3)" tickFormatter={(val) => `${val}m`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(15, 17, 26, 0.9)', border: 'none', borderRadius: '8px', fontSize: '10px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="time" 
                          stroke="var(--primary)" 
                          strokeWidth={2} 
                          dot={{ fill: 'var(--primary)', r: 3 }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {lastTrackedTimes.length >= 3 && (
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                      <div className="p-3 bg-accent/30 rounded-xl">
                        <div className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter mb-1">Regression Slope</div>
                        <div className="text-sm font-bold flex items-center gap-1">
                          {(() => {
                             const regressionPoints = lastTrackedTimes.map((t, i) => ({ x: i + 1, y: t }));
                             const regression = calculateLinearRegression(regressionPoints);
                             if (!regression) return "N/A";
                             const slope = formatNumber(regression.slope);
                             return (
                               <>
                                 {slope === 0 ? "Flat" : slope < 0 ? "Improving" : "Slowing"}
                                 {slope !== 0 && (
                                   slope < 0 ? <ArrowUpRight size={12} className="text-success rotate-90" /> : <ArrowUpRight size={12} className="text-destructive" />
                                 )}
                               </>
                             );
                          })()}
                        </div>
                      </div>
                      <div className="p-3 bg-accent/30 rounded-xl">
                        <div className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter mb-1">Topics to Master</div>
                        <div className="text-sm font-bold">
                          {totalTopics - masteredCount} <span className="text-[10px] text-muted-foreground font-medium">unmastered</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Reset tracking data for this subject?')) {
                          resetSubjectTracking();
                        }
                      }}
                      className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 opacity-50 hover:opacity-100"
                    >
                      <RefreshCw size={10} />
                      Reset Data
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-accent/10">
                  <Clock size={24} className="text-muted-foreground opacity-20 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Frequency logs required</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Dependency Graph Preview */}
      <div className="mt-6">
        <div className="glass p-6 h-64 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h2 className="text-xl font-bold">Dependency Graph</h2>
            <Link to="/graph" className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
              View Full Graph <Share2 size={14} />
            </Link>
          </div>
          
          {/* Abstract Graph Visualization */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
            <Share2 size={200} className="text-primary" />
          </div>
          
          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end relative z-10">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-success"></div> Mastered
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-warning"></div> In Progress
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-destructive"></div> High Risk
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedSubject && (
        <ExamFeedbackModal 
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          subjectName={selectedSubject.name}
          subjectId={selectedSubject.id}
        />
      )}
      {selectedSubject && (
        <AddSubjectModal 
          isOpen={isSyllabusManagerOpen} 
          onClose={() => setIsSyllabusManagerOpen(false)} 
          subjectId={selectedSubject.id} 
        />
      )}
    </div>
  );
}
