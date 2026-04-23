import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Clock, Zap, Share2, X, ChevronRight, ArrowLeft, BarChart2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Topic } from '@/types';

export default function HeatmapFullscreen() {
  const { state, updateTopicDifficulty } = useApp();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();

  console.log('Heatmap rendering with topics:', state.topics?.length || 0, 'modules:', state.modules?.length || 0);

  const filteredTopics = (state.topics || []).filter(t => {
    if (filter === 'All') return true;
    return t.status === filter;
  });

  const handleDifficultyChange = (topicId: string, value: number) => {
    updateTopicDifficulty(topicId, value);
    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic({ ...selectedTopic, difficulty: value });
    }
  };

  const startStudySession = (topic: Topic) => {
    const difficulty = topic.difficulty || 3;
    // Map difficulty to duration in seconds
    // 1: 15m, 2: 25m, 3: 45m, 4: 60m, 5: 90m
    const durations: Record<number, number> = {
      1: 900,
      2: 1500,
      3: 2700,
      4: 3600,
      5: 5400
    };
    const duration = durations[difficulty] || 2700;
    navigate(`/focus/${topic.id}?duration=${duration}`);
  };

  const getDurationText = (difficulty: number = 3) => {
    const texts: Record<number, string> = {
      1: '15m',
      2: '25m',
      3: '45m',
      4: '60m',
      5: '90m'
    };
    return texts[difficulty] || '45m';
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 max-w-7xl mx-auto relative">
      <div className="mb-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
        <div>
          <h1 className="text-3xl font-bold mb-1">Topic Confidence Heatmap</h1>
          <p className="text-muted-foreground">Visualizing your mastery across the entire syllabus.</p>
        </div>

        <div className="flex items-center gap-2 bg-accent p-1 rounded-lg border border-border">
          {['All', 'Not Started', 'In Progress', 'Mastered'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all",
                filter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {(state.modules || []).map((module) => {
          const moduleTopics = filteredTopics.filter(t => t.module === module.name);
          if (moduleTopics.length === 0) return null;
          
          return (
            <div key={module.id}>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6 px-1">{module.name}</h3>
              <div className="grid grid-cols-5 gap-3">
                {moduleTopics.map((topic) => (
                  <motion.button
                    key={topic.id}
                    whileHover={{ scale: 1.1, zIndex: 10 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedTopic(topic)}
                    className={cn(
                      "aspect-square rounded-lg border border-border flex items-center justify-center text-[10px] font-bold transition-all shadow-sm",
                      topic.mastery >= 80 ? 'bg-success text-success-foreground' : 
                      topic.mastery >= 40 ? 'bg-warning text-warning-foreground' : 
                      topic.mastery > 0 ? 'bg-danger text-destructive-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {topic.name.substring(0, 2).toUpperCase()}
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTopics.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Zap size={48} className="text-slate-700 mb-4" />
          <h3 className="text-xl font-bold mb-2">No topics found</h3>
          <p className="text-slate-500">Try adding some topics to your syllabus first.</p>
        </div>
      )}

      {/* Legend */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass px-6 py-3 flex items-center gap-6 text-xs font-bold uppercase tracking-widest bg-background/80">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-muted border border-border"></div> Not Started</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-danger"></div> Weak</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-warning"></div> Average</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-success"></div> Mastered</div>
      </div>

      {/* Topic Detail Panel */}
      <AnimatePresence>
        {selectedTopic && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTopic(null)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-card border-l border-border z-50 p-8 shadow-2xl overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedTopic(null)}
                className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-primary text-xs font-bold uppercase tracking-widest mb-2">{selectedTopic.module}</div>
              <h2 className="text-3xl font-bold mb-8 leading-tight">{selectedTopic.name}</h2>

              <div className="space-y-6 mb-12">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Mastery Score</span>
                  <span className="text-2xl font-bold">{selectedTopic.mastery}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000",
                      selectedTopic.mastery > 80 ? 'bg-success' : selectedTopic.mastery > 40 ? 'bg-warning' : 'bg-danger'
                    )}
                    style={{ width: `${selectedTopic.mastery}%` }}
                  />
                </div>
              </div>

              {/* Hardness Slider */}
              <div className="mb-12">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Topic Hardness</span>
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded uppercase tracking-widest",
                    (selectedTopic.difficulty || 3) >= 4 ? "bg-destructive/10 text-destructive" : 
                    (selectedTopic.difficulty || 3) >= 2 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                  )}>
                    {(selectedTopic.difficulty || 3) === 1 ? 'Very Easy' : 
                     (selectedTopic.difficulty || 3) === 2 ? 'Easy' : 
                     (selectedTopic.difficulty || 3) === 3 ? 'Moderate' : 
                     (selectedTopic.difficulty || 3) === 4 ? 'Hard' : 'Very Hard'}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  step="1"
                  value={selectedTopic.difficulty || 3}
                  onChange={(e) => handleDifficultyChange(selectedTopic.id, parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Easy</span>
                  <span>Hard</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-12">
                <div className="bg-accent p-4 rounded-xl border border-border">
                  <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-1">Est. Revision</div>
                  <div className="font-bold flex items-center gap-2"><Clock size={14} /> {getDurationText(selectedTopic.difficulty)}</div>
                </div>
                <div className="bg-accent p-4 rounded-xl border border-border">
                  <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-1">Dependencies</div>
                  <div className="font-bold flex items-center gap-2"><Share2 size={14} /> {(selectedTopic.dependencies || []).length} Topics</div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => startStudySession(selectedTopic)}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                >
                  <Zap size={18} fill="currentColor" /> Study Now ({getDurationText(selectedTopic.difficulty)} Timer)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
