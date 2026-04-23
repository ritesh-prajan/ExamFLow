import React from 'react';
import { motion } from 'motion/react';
import { Zap, TrendingUp, CheckCircle2, Clock, ChevronRight, ChevronDown, BookOpen, Grid3X3, Share2, Layers, Brain, Loader2, AlertTriangle, Target, Gauge, ArrowUpRight, Plus, Edit3, Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCrossButton } from '@/components/ui/PlusCrossButton';
import { cn, formatDuration, formatNumber } from '@/lib/utils';
import ExamFeedbackModal from '@/components/ExamFeedbackModal';
import { getStudyTip } from '@/services/geminiService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

import AddSubjectModal from '@/components/AddSubjectModal';
import AddTopicModal from '@/components/AddTopicModal';

export default function Dashboard() {
  const navigate = useNavigate();
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
    logTopicTime
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
    if (state.selectedSubjectId) {
      const savedModuleId = localStorage.getItem(`activeModuleId_${state.selectedSubjectId}`);
      if (savedModuleId) {
        setSelectedModuleId(savedModuleId);
      }
    }
  }, [state.selectedSubjectId]);

  const selectedSubject = (state.subjects || []).find(s => s.id === state.selectedSubjectId);
  const totalTopics = (state.topics || []).length;
  const masteredCount = (state.topics || []).filter(t => t.status === 'Mastered').length;
  const coverage = totalTopics > 0 ? formatNumber((masteredCount / totalTopics) * 100) : 0;
  
  // Topics Done (Module) calculation
  const isModuleIncomplete = (m: any) => {
    const moduleTopics = (state.topics || []).filter(t => t.module === m.name);
    return moduleTopics.some(t => t.status !== 'Mastered');
  };

  let dashboardActiveModule = selectedModuleId 
    ? (state.modules || []).find(m => m.id === selectedModuleId)
    : (state.modules || []).find(isModuleIncomplete);

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
        logTopicTime(timerElapsedTime);
      } else {
        // Just reset/start if it wasn't strictly "running" but was enabled
        logTopicTime(0); 
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
          if (state.selectedSubjectId) {
            localStorage.setItem(`activeModuleId_${state.selectedSubjectId}`, nextIncomplete.id);
            localStorage.setItem(`activeModule_${state.selectedSubjectId}`, nextIncomplete.name);
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

  // Logic for Today's Plan based on preference
  let todayPlan = [];
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Get all topics for today, including mastered ones
  const scheduledToday = (state.topics || [])
    .filter(t => t.scheduledDate === todayStr)
    .sort((a, b) => {
      // First sort by status (Mastered at bottom)
      if (a.status === 'Mastered' && b.status !== 'Mastered') return 1;
      if (a.status !== 'Mastered' && b.status === 'Mastered') return -1;
      // Then sort by original order
      return (a.order || 0) - (b.order || 0);
    });

  if (scheduledToday.length > 0 && !selectedModuleId) {
    todayPlan = scheduledToday;
  } else if (state.learningPreference === 'sequential' && (state.modules || []).length > 0) {
    if (dashboardActiveModule) {
      todayPlan = (state.topics || [])
        .filter(t => t.module === dashboardActiveModule.name)
        .sort((a, b) => {
          if (a.status === 'Mastered' && b.status !== 'Mastered') return 1;
          if (a.status !== 'Mastered' && b.status === 'Mastered') return -1;
          return (a.order || 0) - (b.order || 0);
        });
    } else {
      todayPlan = (state.topics || [])
        .sort((a, b) => {
          if (a.status === 'Mastered' && b.status !== 'Mastered') return 1;
          if (a.status !== 'Mastered' && b.status === 'Mastered') return -1;
          return (a.order || 0) - (b.order || 0);
        })
        .slice(0, 5);
    }
  } else {
    // Adaptive: Pick by priority or just the first few unmastered
    todayPlan = (state.topics || [])
      .sort((a, b) => {
        if (a.status === 'Mastered' && b.status !== 'Mastered') return 1;
        if (a.status !== 'Mastered' && b.status === 'Mastered') return -1;
        
        // In adaptive mode, maybe still sort by priority for unmastered?
        if (a.status !== 'Mastered' && b.status !== 'Mastered') {
          const priorityMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
          if (priorityMap[a.priority] !== priorityMap[b.priority]) {
            return priorityMap[a.priority] - priorityMap[b.priority];
          }
        }
        
        return (a.order || 0) - (b.order || 0);
      })
      .slice(0, 5);
  }

  const examDateObj = selectedSubject ? new Date(selectedSubject.examDate) : null;
  if (examDateObj && selectedSubject?.examTime) {
    const [hours, minutes] = selectedSubject.examTime.split(':');
    examDateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  const daysUntilExam = examDateObj 
    ? Math.ceil((examDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const isExamPassed = examDateObj ? examDateObj < new Date() : false;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, {state.user?.displayName?.split(' ')[0] || 'Student'}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-muted-foreground text-xs sm:text-sm">
            <span className="flex items-center gap-1 shrink-0"><BookOpen size={14} /> {selectedSubject?.name}</span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-border"></span>
            {isExamPassed ? (
              <span className="flex items-center gap-1 text-success font-bold shrink-0"><CheckCircle2 size={14} /> Exam Completed</span>
            ) : (
              <>
                <span className="flex items-center gap-1 shrink-0"><Clock size={14} /> {daysUntilExam} days away</span>
                <span className="hidden sm:block w-1 h-1 rounded-full bg-border"></span>
                <span className="px-2 py-0.5 rounded bg-warning/10 text-warning font-bold text-[10px] uppercase tracking-wider border border-warning/20">Pressure: {daysUntilExam < 7 ? 'Critical' : daysUntilExam < 14 ? 'Tight' : 'Moderate'}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsSyllabusManagerOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold hover:opacity-90 transition-all border border-border btn-touch"
          >
            <Edit3 size={16} />
            <span className="whitespace-nowrap">Manage Syllabus</span>
          </button>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Link 
              to={todayPlan.length > 0 ? `/focus/${todayPlan[0].id}` : "/focus"} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 transition-all btn-touch"
            >
              <Zap size={16} fill="currentColor" />
              <span className="whitespace-nowrap">Start Session</span>
            </Link>
            <button 
              onClick={handleRebalance}
              disabled={isRebalancing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 transition-all disabled:opacity-50 btn-touch"
            >
              {isRebalancing ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
              <span className="whitespace-nowrap">Distribute</span>
            </button>
            <button 
              onClick={handleToggleMode}
              disabled={isTogglingMode}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-xs font-bold btn-touch",
                state.learningPreference === 'sequential' 
                  ? "bg-secondary/10 border-secondary/30 text-secondary" 
                  : "bg-primary/10 border-primary/30 text-primary"
              )}
            >
              <div className="whitespace-nowrap">
                {state.learningPreference === 'sequential' ? (
                  <><Layers size={16} className="inline mr-2" /> Module</>
                ) : (
                  <><Brain size={16} className="inline mr-2" /> Adaptive</>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Row 1: Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-5 sm:p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-accent ${stat.color}`}>{stat.icon}</div>
              {i === 3 && <span className="text-success text-xs font-bold flex items-center gap-0.5"><TrendingUp size={12} /> +5%</span>}
            </div>
            <div className="text-2xl font-bold mb-1">
              {stat.value}{stat.suffix}
              {stat.total && <span className="text-muted-foreground text-lg font-medium"> / {stat.total}</span>}
            </div>
            <div className="text-muted-foreground text-sm font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Today's Plan */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">Today's Study Plan</h2>
              {state.learningPreference === 'sequential' && (
                <div className="relative">
                  <button 
                    onClick={() => setIsModuleDropdownOpen(!isModuleDropdownOpen)}
                    className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-primary/10 text-primary font-bold uppercase tracking-widest border border-primary/30 hover:bg-primary/20 transition-all"
                  >
                    {selectedModuleId 
                      ? (state.modules.find(m => m.id === selectedModuleId)?.name || 'Module Mode')
                      : 'Module Mode'} 
                    <ChevronDown size={12} className={cn("transition-transform", isModuleDropdownOpen && "rotate-180")} />
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
                          <div className="px-2 py-1 mb-1 border-b border-border">
                            <span className="text-[10px] font-black text-muted-foreground uppercase opacity-50">Select Module</span>
                          </div>
                          {(state.modules || []).map((m, idx) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSelectedModuleId(m.id);
                                setIsModuleDropdownOpen(false);
                                if (state.selectedSubjectId) {
                                  localStorage.setItem(`activeModuleId_${state.selectedSubjectId}`, m.id);
                                  localStorage.setItem(`activeModule_${state.selectedSubjectId}`, m.name);
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
                  {isTimerEnabled ? "Timer ON" : "Timer OFF"}
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
            <div className="flex items-center gap-4">
              <Link to="/syllabus" className="text-muted-foreground text-sm font-semibold hover:text-primary transition-colors flex items-center gap-1">
                View Syllabus <BookOpen size={14} />
              </Link>
              <Link to="/plan" className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
                View Full Plan <ChevronRight size={14} />
              </Link>
            </div>
          </div>
          
          <div className="space-y-3">
            {todayPlan.map((topic, i) => (
              <motion.div 
                key={topic.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className={cn(
                  "glass p-4 sm:p-5 flex items-center justify-between group btn-touch",
                  i === 0 ? 'border-primary/30 ring-1 ring-primary/20' : ''
                )}
                onClick={() => navigate(`/focus/${topic.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-12 rounded-full",
                    topic.status === 'Mastered' ? "bg-success" : 
                    topic.priority === 'High' ? "bg-destructive" : "bg-warning"
                  )}></div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary uppercase tracking-widest">{topic.module}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                        topic.status === 'Mastered' ? "bg-success/10 text-success" :
                        topic.priority === 'High' ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                      )}>
                        {topic.status === 'Mastered' ? 'Mastered' : `${topic.priority} Priority`}
                      </span>
                    </div>
                    <h3 className={cn(
                      "font-bold text-lg transition-all",
                      topic.status === 'Mastered' ? "text-muted-foreground line-through" : "text-foreground"
                    )}>{topic.name}</h3>
                    <div className="flex items-center gap-3 text-muted-foreground text-xs mt-1">
                      <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(topic.estimatedTime)}</span>
                      <span className="flex items-center gap-1"><Zap size={12} /> Active Recall</span>
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
                    "w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50",
                    topic.status === 'Mastered' 
                      ? "bg-success/20 border-success/30 text-success" 
                      : "bg-accent/50 border-border text-transparent hover:border-primary/50 group-hover:text-muted-foreground"
                  )}
                >
                  <CheckCircle2 size={16} className={cn(topic.status === 'Mastered' ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Performance Benchmark */}
        <div className="lg:col-span-5">
          <div className="glass p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Preparation Benchmark</h2>
              <span className="text-[10px] px-2 py-1 rounded bg-success/10 text-success font-bold uppercase tracking-widest border border-success/20">A-Grade Path</span>
            </div>

            <div className="flex-1 space-y-10">
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96" cy="96" r="88"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-muted/20"
                    />
                    <circle
                      cx="96" cy="96" r="88"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeDasharray={552.92}
                      strokeDashoffset={552.92 * (1 - (Number.isNaN(coverage) ? 0 : coverage) / 100)}
                      className="text-primary transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black">{coverage}%</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Coverage</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-accent/50 rounded-2xl border border-border">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Velocity</div>
                  <div className="text-xl font-bold flex items-center gap-1">
                    1.4x <ArrowUpRight size={16} className="text-success" />
                  </div>
                  <div className="text-[10px] text-success font-medium">Outpacing average</div>
                </div>
                <div className="p-4 bg-accent/50 rounded-2xl border border-border">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Risk Level</div>
                  <div className="text-xl font-bold text-warning">Medium</div>
                  <div className="text-[10px] text-muted-foreground">Based on exam date</div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Coverage', you: coverage, benchmark: 65 },
                  { label: 'Topic Depth', you: depthScore, benchmark: 72 },
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
              <span className="text-muted-foreground">Predicted Grade:</span>
              <span className="px-3 py-1 bg-primary text-primary-foreground rounded-lg">A- (Stable)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heatmap Preview */}
        <div className="lg:col-span-7">
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
        <div className="lg:col-span-5">
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
            
            {isLoadingTip ? (
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
          {dashboardActiveModule && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-6 mt-6 border-l-4 border-l-primary"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-primary">
                    <Target size={16} />
                    Module Mastery Forecast
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {lastTrackedTimes.length < 3 
                      ? `Need ${3 - lastTrackedTimes.length} more logs for full projection`
                      : `Syncing with your current performance trend...`}
                  </p>
                </div>
                {lastTrackedTimes.length >= 3 && (
                  <div className="text-right">
                    <div className="text-xs font-black text-muted-foreground uppercase opacity-50 mb-0.5">EST. Module Finish</div>
                    <div className="text-xl font-black text-primary leading-none">
                      {(() => {
                        const avg = lastTrackedTimes.reduce((a, b) => a + b, 0) / (lastTrackedTimes.length * 60);
                        const remaining = (moduleTotalCount - moduleMasteredCount);
                        const totalMinsRemaining = avg * remaining;
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
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        ...lastTrackedTimes.map((t, idx) => ({ name: `Topic ${idx+1}`, value: t / 60, type: 'actual' })),
                        ...(lastTrackedTimes.length >= 3 ? [
                          { name: 'Your Trend', value: (lastTrackedTimes.reduce((a, b) => a + b, 0) / lastTrackedTimes.length) / 60, type: 'projection' },
                          { name: 'Syllabus Target', value: 20, type: 'target' }
                        ] : [])
                      ]}>
                        <XAxis dataKey="name" fontSize={8} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(15, 17, 26, 0.9)', border: 'none', borderRadius: '8px', fontSize: '10px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                          { [
                            ...lastTrackedTimes.map(() => 'rgba(239, 68, 68, 0.6)'), 
                            ...(lastTrackedTimes.length >= 3 ? ['#ef4444', 'rgba(59, 130, 246, 0.5)'] : [])
                          ].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {lastTrackedTimes.length >= 3 && (
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                      <div className="p-3 bg-accent/30 rounded-xl">
                        <div className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter mb-1">Current Velocity</div>
                        <div className="text-sm font-bold">
                          {formatNumber(lastTrackedTimes.reduce((a, b) => a + b, 0) / (lastTrackedTimes.length * 60))} <span className="text-[10px] text-muted-foreground font-medium">mins / topic</span>
                        </div>
                      </div>
                      <div className="p-3 bg-accent/30 rounded-xl">
                        <div className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter mb-1">Completion Roadmap</div>
                        <div className="text-sm font-bold">
                          {moduleTotalCount - moduleMasteredCount} <span className="text-[10px] text-muted-foreground font-medium">Topics left</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-accent/10">
                  <Clock size={24} className="text-muted-foreground opacity-20 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Timing logs required</p>
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
