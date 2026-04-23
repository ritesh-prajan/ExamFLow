import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, Zap, AlertTriangle, ChevronRight, Calendar as CalendarIcon, List as ListIcon, Check, Plus, Search, X, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PlusCrossButton } from '@/components/ui/PlusCrossButton';
import { cn, formatDuration, formatNumber } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function StudyPlan() {
  const { 
    state, 
    toggleTopicStatus, 
    scheduleTopic, 
    rebalancePlan,
    isTimerEnabled,
    isTimerRunning,
    timerElapsedTime,
    logTopicTime
  } = useApp();
  const [view, setView] = React.useState<'calendar' | 'list' | 'timeline'>('timeline');
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isRebalancing, setIsRebalancing] = React.useState(false);

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

    // Timer logic
    if (isTimerEnabled && isNowMarkingMastered) {
      if (isTimerRunning) {
        logTopicTime(timerElapsedTime);
      } else {
        logTopicTime(0);
      }
    }
  };

  const handleAddSession = async (targetDate: Date) => {
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    // Find topics that are scheduled for a date after targetDate or not scheduled at all
    // and are not mastered
    const futureTopics = (state.topics || [])
      .filter(t => t.status !== 'Mastered')
      .filter(t => {
        if (!t.scheduledDate) return true;
        const tDate = new Date(t.scheduledDate);
        // Normalize dates to compare only YYYY-MM-DD
        const tDateStr = tDate.toISOString().split('T')[0];
        return tDateStr > targetDateStr;
      })
      .sort((a, b) => {
        // Sort by scheduled date if available, then by priority
        if (a.scheduledDate && b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
        if (a.scheduledDate) return -1;
        if (b.scheduledDate) return 1;
        
        const priorityMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityMap[a.priority] - priorityMap[b.priority];
      });

    if (futureTopics.length > 0) {
      const topicToMove = futureTopics[0];
      setUpdatingId(topicToMove.id);
      await scheduleTopic(topicToMove.id, targetDateStr);
      setUpdatingId(null);
    }
  };

  const getTopicsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return (state.topics || [])
      .filter(t => t.scheduledDate === dateStr)
      .sort((a, b) => {
        // First sort by status (Mastered at bottom)
        if (a.status === 'Mastered' && b.status !== 'Mastered') return 1;
        if (a.status !== 'Mastered' && b.status === 'Mastered') return -1;
        // Then sort by original order
        return (a.order || 0) - (b.order || 0);
      });
  };

  const selectedSubject = (state.subjects || []).find(s => s.id === state.selectedSubjectId);
  const totalTopics = (state.topics || []).length;
  const masteredCount = (state.topics || []).filter(t => t.status === 'Mastered').length;
  const topicsRemaining = totalTopics - masteredCount;
  const hoursRemaining = formatNumber((state.topics || []).filter(t => t.status !== 'Mastered').reduce((acc, t) => acc + (t.estimatedTime || 0), 0));
  
  const daysUntilExam = selectedSubject 
    ? (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exam = new Date(selectedSubject.examDate);
        exam.setHours(0, 0, 0, 0);
        return Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      })()
    : 0;

  const dailyTarget = daysUntilExam > 0 ? formatNumber(hoursRemaining / daysUntilExam) : 0;

  const days = Array.from({ length: Math.max(7, daysUntilExam + 1) }).map((_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 max-w-7xl mx-auto flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Adaptive Study Plan</h1>
          <p className="text-muted-foreground text-sm">Your path to 100% coverage by {selectedSubject ? new Date(selectedSubject.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleRebalance}
            disabled={isRebalancing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 transition-all disabled:opacity-50 btn-touch"
          >
            {isRebalancing ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
            Distribute
          </button>
          <div className="flex items-center gap-1 bg-accent p-1 rounded-lg border border-border w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setView('timeline')}
              className={cn(
                "flex-1 sm:flex-none px-3 sm:px-4 py-3 rounded-md text-[10px] sm:text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap btn-touch",
                view === 'timeline' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock size={14} /> Timeline
            </button>
            <button 
              onClick={() => setView('calendar')}
              className={cn(
                "flex-1 sm:flex-none px-3 sm:px-4 py-3 rounded-md text-[10px] sm:text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap btn-touch",
                view === 'calendar' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarIcon size={14} /> Calendar
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn(
                "flex-1 sm:flex-none px-3 sm:px-4 py-3 rounded-md text-[10px] sm:text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap btn-touch",
                view === 'list' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListIcon size={14} /> Modules
            </button>
          </div>
        </div>
      </div>

      {/* Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Topics Remaining', value: topicsRemaining },
              { label: 'Hours Remaining', value: hoursRemaining },
              { label: 'Days Until Exam', value: daysUntilExam },
              { label: 'Daily Target', value: `${dailyTarget}h` },
            ].map((stat, i) => (
              <div key={i} className="glass p-3 sm:p-4 text-center bg-card/40 backdrop-blur-md border border-border/60">
                <div className="text-muted-foreground text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</div>
                <div className="text-lg sm:text-xl font-bold">{stat.value}</div>
              </div>
            ))}
          </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar: Modules */}
        <div className="hidden lg:block w-72 shrink-0 space-y-4 overflow-y-auto pr-2">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">Modules</h2>
          {(state.modules || []).map((module) => {
            const moduleTopics = (state.topics || []).filter(t => t.module === module.name);
            const masteredCount = moduleTopics.filter(t => t.status === 'Mastered').length;
            const progress = moduleTopics.length > 0 ? (masteredCount / moduleTopics.length) * 100 : 0;
            
            return (
              <div key={module.id} className="glass p-4 glass-hover cursor-pointer">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-sm truncate pr-2">{module.name}</h3>
                  <span className="text-[10px] font-bold text-muted-foreground">{masteredCount}/{moduleTopics.length}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {view === 'timeline' ? (
            <div className="space-y-6 pb-8 max-w-3xl">
              {days.map((date, i) => {
                const dayTopics = getTopicsForDate(date);
                // Show all days until the exam, or at least 7 days
                if (i >= daysUntilExam && i > 7 && dayTopics.length === 0) return null; 
                
                return (
                  <div key={i} className="flex gap-6 group">
                    <div className="w-24 shrink-0 pt-1">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-bold">
                        {date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </div>
                      {i === 0 && <div className="text-[10px] font-bold text-primary uppercase tracking-widest">Today</div>}
                      {i === daysUntilExam && <div className="text-[10px] font-bold text-danger uppercase tracking-widest">Exam Day</div>}
                    </div>
                    
                    <div className="relative flex-1 pb-8 border-l border-border pl-8">
                      <div className={cn(
                        "absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full border border-background transition-colors",
                        i === daysUntilExam ? "bg-danger" : "bg-muted group-hover:bg-primary"
                      )}></div>
                      
                      <div className="space-y-3">
                        {dayTopics.length > 0 ? (
                          dayTopics.map((topic) => (
                            <motion.div 
                              key={topic.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="glass p-4 flex items-center justify-between group/item"
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{topic.module}</span>
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                    topic.priority === 'High' ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                                  )}>
                                    {topic.priority}
                                  </span>
                                </div>
                                <h4 className={cn(
                                  "font-bold text-sm leading-tight transition-all",
                                  topic.status === 'Mastered' ? "text-muted-foreground line-through" : "text-foreground"
                                )}>{topic.name}</h4>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1">
                                  <Clock size={10} /> {formatDuration(topic.estimatedTime)}
                                </div>
                                <button 
                                  onClick={() => handleToggleDone(topic.id)}
                                  disabled={updatingId === topic.id}
                                  className={cn(
                                    "w-6 h-6 rounded-full border flex items-center justify-center transition-all disabled:opacity-50",
                                    topic.status === 'Mastered' 
                                      ? "bg-success border-success text-white" 
                                      : "border-border text-transparent hover:border-primary/50 group-hover/item:text-muted-foreground"
                                  )}
                                >
                                  <Check size={12} />
                                </button>
                              </div>
                            </motion.div>
                          ))
                        ) : i === daysUntilExam ? (
                          <div className="py-6 px-6 bg-danger/5 border border-dashed border-danger/20 rounded-xl text-danger text-sm font-bold flex items-center gap-3">
                            <Zap size={18} /> Final Review & Exam Day
                          </div>
                        ) : (
                          <div className="py-4 px-6 border border-dashed border-border rounded-xl text-muted-foreground text-sm italic">
                            No topics scheduled for this day
                          </div>
                        )}
                        
                        <button 
                          onClick={() => handleAddSession(date)}
                          className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-primary uppercase tracking-widest transition-colors pl-2"
                        >
                          <Plus size={12} /> Add Session
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : view === 'calendar' ? (
            <div className="flex gap-4 min-w-max pb-4 h-full">
              {days.map((date, i) => (
                <div key={i} className={cn(
                  "w-72 flex flex-col gap-4",
                  i === 0 ? "opacity-100" : "opacity-60 hover:opacity-100 transition-opacity"
                )}>
                  <div className={cn(
                    "glass p-4 text-center sticky top-0 z-10",
                    i === 0 ? "border-primary/50 bg-primary/5" : ""
                  )}>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-xl font-bold">
                      {date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </div>
                    {i === 0 && <div className="mt-1 text-[10px] font-bold text-primary uppercase tracking-widest">Today</div>}
                  </div>

                  <div className="flex-1 space-y-3">
                    {getTopicsForDate(date).map((topic) => (
                      <motion.div 
                        key={topic.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass p-4 glass-hover"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                            topic.priority === 'High' ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                          )}>
                            {topic.priority}
                          </span>
                          <button 
                            onClick={() => handleToggleDone(topic.id)}
                            disabled={updatingId === topic.id}
                            className={cn(
                              "w-6 h-6 rounded-full border flex items-center justify-center transition-all disabled:opacity-50",
                              topic.status === 'Mastered' 
                                ? "bg-success border-success text-white" 
                                : "border-border text-transparent hover:border-primary/50 group-hover:text-muted-foreground"
                            )}
                          >
                            <Check size={12} />
                          </button>
                        </div>
                        <h4 className={cn(
                          "font-bold text-sm mb-3 leading-tight transition-all",
                          topic.status === 'Mastered' ? "text-muted-foreground line-through" : "text-foreground"
                        )}>{topic.name}</h4>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase">
                          <span className="flex items-center gap-1"><Clock size={10} /> {formatDuration(topic.estimatedTime)}</span>
                          <span className="flex items-center gap-1 text-primary">Details <ChevronRight size={10} /></span>
                        </div>
                      </motion.div>
                    ))}
                    
                    <button 
                      onClick={() => handleAddSession(date)}
                      className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-muted transition-all text-sm font-medium"
                    >
                      + Add Session
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8 pb-8">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="Search topics or modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-accent border border-border rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {(state.modules || []).map((module) => {
                const moduleTopics = (state.topics || [])
                  .filter(t => 
                    t.module === module.name && 
                    (t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     t.module.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .sort((a, b) => {
                    // First sort by status (Mastered at bottom)
                    if (a.status === 'Mastered' && b.status !== 'Mastered') return 1;
                    if (a.status !== 'Mastered' && b.status === 'Mastered') return -1;
                    // Then sort by original order
                    return (a.order || 0) - (b.order || 0);
                  });
                
                if (moduleTopics.length === 0) return null;

                return (
                  <div key={module.id} className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary rounded-full"></div>
                      {module.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {moduleTopics.map((topic) => (
                        <motion.div 
                          key={topic.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass p-5 glass-hover flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider",
                                topic.priority === 'High' ? "bg-danger/10 text-danger border border-danger/20" : 
                                topic.priority === 'Medium' ? "bg-warning/10 text-warning border border-warning/20" : 
                                "bg-primary/10 text-primary border border-primary/20"
                              )}>
                                {topic.priority} Priority
                              </span>
                              <div className="flex items-center gap-2">
                                {topic.scheduledDate && (
                                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                    Scheduled: {new Date(topic.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                <button 
                                  onClick={() => handleToggleDone(topic.id)}
                                  disabled={updatingId === topic.id}
                                  className={cn(
                                    "w-6 h-6 rounded-full border flex items-center justify-center transition-all disabled:opacity-50",
                                    topic.status === 'Mastered' 
                                      ? "bg-success border-success text-white" 
                                      : "border-border text-transparent hover:border-primary/50 group-hover:text-muted-foreground"
                                  )}
                                >
                                  <Check size={12} />
                                </button>
                              </div>
                            </div>
                            <h4 className={cn(
                              "font-bold text-base mb-4 leading-tight",
                              topic.status === 'Mastered' ? "text-muted-foreground line-through" : "text-foreground"
                            )}>{topic.name}</h4>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-border">
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase">
                              <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(topic.estimatedTime)}</span>
                              <span className="flex items-center gap-1"><Zap size={12} /> {topic.mastery}% Mastery</span>
                            </div>
                            <Link to={`/focus/${topic.id}`} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest flex items-center gap-1">
                              Study Now <ChevronRight size={12} />
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
