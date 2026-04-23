import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Clock, 
  Target, 
  Zap, 
  ChevronRight, 
  CheckCircle2, 
  ArrowLeft, 
  Timer,
  Flame,
  Brain,
  FileText,
  ExternalLink,
  Play,
  ShieldAlert,
  TrendingUp,
  Users,
  Trophy,
  Gauge
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { cn, formatNumber } from '@/lib/utils';

export default function CrisisMode() {
  const { state } = useApp();
  const navigate = useNavigate();
  const selectedSubject = (state.subjects || []).find(s => s.id === state.selectedSubjectId);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<'priority' | 'timeline'>('priority');

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!selectedSubject) return 0;
      const examDate = new Date(selectedSubject.examDate);
      if (selectedSubject.examTime) {
        const [hours, minutes] = selectedSubject.examTime.split(':');
        examDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      const diff = examDate.getTime() - new Date().getTime();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedSubject]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const highImpactTopics = (state.topics || [])
    .filter(t => t.priority === 'High' || (t.difficulty && t.difficulty >= 4))
    .sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0))
    .slice(0, 8);

  // Generate dynamic timeline
  const generateTimeline = () => {
    const slots = [];
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0);

    highImpactTopics.forEach((topic, i) => {
      const slotStart = new Date(startTime.getTime() + i * 3 * 3600000); // 3 hour slots
      const slotEnd = new Date(slotStart.getTime() + 2 * 3600000); // 2 hour study sessions
      
      slots.push({
        time: `${slotStart.getHours().toString().padStart(2, '0')}:00 - ${slotEnd.getHours().toString().padStart(2, '0')}:00`,
        task: topic.name,
        status: i === 0 ? 'Active' : 'Upcoming',
        topicId: topic.id
      });
    });
    return slots;
  };

  const timeline = generateTimeline();

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 max-w-7xl mx-auto">
      {/* Header Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Mission Control
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-bold uppercase tracking-widest animate-pulse">
            <ShieldAlert size={12} fill="currentColor" />
            System Critical: Exam Approaching
          </div>
        </div>
      </div>

      {/* Main Crisis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
        {/* Hero Section */}
        <div className="lg:col-span-8 bg-card/50 border border-destructive/30 rounded-3xl p-8 relative overflow-hidden group backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle size={240} className="text-destructive" />
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-destructive flex items-center justify-center text-destructive-foreground shadow-[0_0_30px_rgba(239,68,68,0.3)] shrink-0">
                <Flame size={28} fill="currentColor" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter italic leading-none text-foreground uppercase">CRISIS MODE</h1>
                <div className="text-destructive text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Maximum Impact Protocol Active</div>
              </div>
            </div>

            <p className="text-muted-foreground max-w-2xl mb-10 text-sm sm:text-lg leading-relaxed font-medium">
              Standard study plans are now <span className="text-destructive font-bold uppercase">DEPRECATED</span>. 
              We've identified the <span className="text-foreground font-extrabold underline decoration-destructive">8 high-yield topics</span> that account for <span className="text-foreground font-extrabold underline decoration-destructive">72% of historical exam points</span>. 
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="glass p-4 sm:p-6 rounded-2xl flex-1 sm:min-w-[200px] shadow-2xl">
                <div className="text-destructive text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Timer size={12} />
                  Crisis Deadline
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tighter text-foreground">
                  {formatTime(timeLeft)}
                </div>
              </div>

              <div className="glass p-4 sm:p-6 rounded-2xl flex-1 sm:min-w-[200px] shadow-2xl">
                <div className="text-success text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                  <TrendingUp size={12} />
                  Projected Score
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tighter text-foreground">
                  74<span className="text-xl text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass p-6 flex flex-col justify-between h-full shadow-xl">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-muted-foreground">
                <Gauge size={18} className="text-destructive" />
                Readiness Analysis
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">A-Grade Benchmark</span>
                    <span className="text-foreground font-mono font-bold">72%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-muted-foreground opacity-50" style={{ width: `72%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Your Current Mastery</span>
                    <span className="text-foreground font-mono font-bold">{formatNumber(state.topics?.reduce((acc, t) => acc + (t.mastery || 0), 0) / (state.topics?.length || 1))}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.3)]" style={{ width: `${formatNumber(state.topics?.reduce((acc, t) => acc + (t.mastery || 0), 0) / (state.topics?.length || 1))}%` }} />
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 shadow-inner">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-destructive" />
                  <div>
                    <div className="text-xs font-bold text-destructive uppercase tracking-widest">Performance Gap</div>
                    <div className="text-[10px] text-muted-foreground mt-1">You are lagging behind the high-mastery curve. Focus on high-yield topics.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-sm font-black uppercase tracking-widest mb-4 text-muted-foreground">Crisis Resources</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Cheat Sheet', icon: FileText, color: 'text-blue-500' },
                  { name: 'AI Summary', icon: Zap, color: 'text-amber-500' },
                  { name: 'Past Papers', icon: Target, color: 'text-purple-500' },
                  { name: 'Quick Deck', icon: Play, color: 'text-emerald-500' },
                ].map((res, i) => (
                  <button key={i} className="flex flex-col items-center justify-center p-4 rounded-xl bg-accent border border-border hover:bg-accent/80 hover:border-primary/30 transition-all group gap-2 shadow-sm btn-touch">
                    <res.icon size={18} className={res.color} />
                    <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground uppercase">{res.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-12 border-b border-border mb-8 px-4">
        <button 
          onClick={() => setActiveTab('priority')}
          className={cn(
            "pb-4 text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] transition-all relative btn-touch",
            activeTab === 'priority' ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          Priority Targets
          {activeTab === 'priority' && (
            <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('timeline')}
          className={cn(
            "pb-4 text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] transition-all relative btn-touch",
            activeTab === 'timeline' ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          Crisis Timeline
          {activeTab === 'timeline' && (
            <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'priority' ? (
          <motion.div 
            key="priority"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {highImpactTopics.map((topic, i) => (
              <motion.div 
                key={topic.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-6 flex flex-col justify-between group hover:border-danger/40 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className="text-6xl font-black font-mono">{(i + 1).toString().padStart(2, '0')}</div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded bg-destructive/20 text-[8px] font-black text-destructive uppercase tracking-widest border border-destructive/30">
                      Target 0{i + 1}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      • {topic.estimatedTime}h Prep Required
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors leading-tight">{topic.name}</h3>
                  
                  <div className="flex items-center gap-6 mb-6">
                    <div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Current Mastery</div>
                      <div className="text-xl font-mono font-bold text-foreground">{topic.mastery}%</div>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Difficulty</div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((d) => (
                          <div 
                            key={d} 
                            className={cn(
                              "w-1.5 h-3 rounded-full",
                              d <= (topic.difficulty || 3) ? "bg-destructive" : "bg-muted"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-auto">
                  <button 
                    onClick={() => navigate(`/focus/${topic.id}`)}
                    className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-destructive/20"
                  >
                    <Play size={14} fill="currentColor" />
                    Initiate Focus
                  </button>
                  <button className="p-3 rounded-xl bg-accent border border-border hover:bg-accent/80 transition-all shadow-sm">
                    <Brain size={18} className="text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="timeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-10"
          >
            <div className="max-w-4xl mx-auto space-y-10">
              {timeline.map((slot, i) => (
                <div key={i} className="flex gap-12 items-start group">
                  <div className="w-40 shrink-0 text-lg font-mono font-bold text-muted-foreground pt-1 group-hover:text-destructive transition-colors">
                    {slot.time}
                  </div>
                  <div className="flex-1 pb-10 border-l-2 border-border pl-10 relative">
                    <div className={cn(
                       "absolute -left-[9px] top-2.5 w-4 h-4 rounded-full border-4 border-background transition-all duration-500",
                       slot.status === 'Active' 
                         ? "bg-destructive shadow-[0_0_20px_rgba(239,68,68,1)] scale-150" 
                         : "bg-accent border-border group-hover:bg-muted"
                     )}>
                       {slot.status === 'Active' && (
                         <div className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-50" />
                       )}
                     </div>
                     <div className="flex items-center justify-between gap-6">
                       <div>
                         <div className="text-2xl font-bold group-hover:text-primary transition-colors mb-2">{slot.task}</div>
                         <div className={cn(
                           "inline-flex items-center gap-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                           slot.status === 'Active' ? "bg-destructive/20 text-destructive" : "bg-accent text-muted-foreground"
                         )}>
                           {slot.status === 'Active' && <Zap size={10} fill="currentColor" />}
                           {slot.status}
                         </div>
                       </div>
                       {slot.status === 'Active' && (
                         <button 
                           onClick={() => navigate(`/focus/${slot.topicId}`)}
                           className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-destructive/20"
                         >
                           Engage Now
                         </button>
                       )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="mt-20 text-center"
              >
                <div className="inline-flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-card border border-border text-muted-foreground text-lg italic font-serif shadow-xl">
                    <AlertTriangle size={24} className="text-warning" />
                    "Pressure is a privilege. It's what turns coal into diamonds."
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-[0.5em]">
                    Mission Protocol: No Sleep Until Mastery
                  </div>
                </div>
              </motion.div>
    </div>
  );
}
