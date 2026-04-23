import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Search, Filter, MoreVertical, CheckCircle2, Clock, AlertCircle, Plus, X, Share2, Trash2, Edit3, ArrowUp, ArrowDown, Type, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatDuration, cn } from '@/lib/utils';
import { PlusCrossButton } from '@/components/ui/PlusCrossButton';
import AddTopicModal from '@/components/AddTopicModal';
import AddSubjectModal from '@/components/AddSubjectModal';

export default function Syllabus() {
  const { 
    state, 
    toggleTopicStatus, 
    updateTopicDependencies, 
    deleteTopic, 
    moveTopic, 
    updateTopic,
    isTimerEnabled,
    isTimerRunning,
    timerElapsedTime,
    logTopicTime
  } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterModule, setFilterModule] = useState<string>('All');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingDepsId, setEditingDepsId] = useState<string | null>(null);
  const [depInputValue, setDepInputValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  const handleDeleteTopic = async (topicId: string) => {
    if (!state.selectedSubjectId || !window.confirm('Are you sure you want to delete this topic?')) return;
    setUpdatingId(topicId);
    await deleteTopic(state.selectedSubjectId, topicId);
    setUpdatingId(null);
  };

  const handleSaveDependencies = async (topicId: string) => {
    const deps = depInputValue.split(',').map(d => d.trim()).filter(d => d !== '');
    setUpdatingId(topicId);
    await updateTopicDependencies(topicId, deps);
    setUpdatingId(null);
    setEditingDepsId(null);
  };

  const handleMoveTopic = async (topicId: string, targetId: string) => {
    setUpdatingId(topicId);
    await moveTopic(topicId, targetId);
    setUpdatingId(null);
    setMenuOpenId(null);
  };

  const handleRenameTopic = async (topicId: string) => {
    if (!renameValue.trim()) return;
    setUpdatingId(topicId);
    await updateTopic(topicId, { name: renameValue });
    setUpdatingId(null);
    setRenamingId(null);
  };

  const startRenaming = (topic: any) => {
    setRenamingId(topic.id);
    setRenameValue(topic.name);
    setMenuOpenId(null);
  };

  const startEditingDeps = (topic: any) => {
    setEditingDepsId(topic.id);
    setDepInputValue(topic.dependencies?.join(', ') || '');
  };

  const selectedSubject = (state.subjects || []).find(s => s.id === state.selectedSubjectId);
  
  const filteredTopics = (state.topics || []).filter(topic => {
    const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         topic.module.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || topic.status === filterStatus;
    const matchesModule = filterModule === 'All' || topic.module === filterModule;
    return matchesSearch && matchesStatus && matchesModule;
  });

  const allModules = Array.from(new Set((state.topics || []).map(t => t.module))).sort();

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <div className="w-full">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Syllabus & Portions</h1>
          <p className="text-muted-foreground text-sm">Manage and track your progress for {selectedSubject?.name}</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-secondary text-secondary-foreground font-bold rounded-xl border border-border hover:opacity-90 transition-all text-xs uppercase tracking-widest w-full lg:w-auto"
          >
            <Edit3 size={16} />
            Manage Syllabus
          </button>
          
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-border rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm text-foreground placeholder:text-muted-foreground/50"
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
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-input border border-border rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/50 w-full lg:w-auto cursor-pointer text-foreground"
          >
            <option value="All">All Status</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Mastered">Mastered</option>
            <option value="Needs Revision">Needs Revision</option>
          </select>
 
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="bg-input border border-border rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/50 w-full lg:w-auto cursor-pointer text-foreground"
          >
            <option value="All">All Modules</option>
            {allModules.map(module => (
              <option key={module} value={module}>{module}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-12">
        {allModules.filter(m => filterModule === 'All' || m === filterModule).map((moduleName) => {
          const moduleTopics = filteredTopics
            .filter(t => t.module === moduleName)
            .sort((a, b) => {
              // First sort by status (Mastered at bottom)
              if (a.status === 'Mastered' && b.status !== 'Mastered') return 1;
              if (a.status !== 'Mastered' && b.status === 'Mastered') return -1;
              // Then sort by original order
              return (a.order || 0) - (b.order || 0);
            });
          
          if (moduleTopics.length === 0) return null;

          return (
            <div key={moduleName} className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                  <BookOpen size={20} />
                  {moduleName}
                </h2>
                <span className="text-sm text-muted-foreground font-medium">
                  {moduleTopics.filter(t => t.status === 'Mastered').length} / {moduleTopics.length} Mastered
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {moduleTopics.map((topic, index) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                        topic.status === 'Mastered' ? 'bg-success/10' :
                        topic.status === 'In Progress' ? 'bg-warning/10' :
                        topic.status === 'Needs Revision' ? 'bg-danger/10' :
                        'bg-accent'
                      )}>
                      <button 
                        onClick={() => handleToggleDone(topic.id)}
                        disabled={updatingId === topic.id}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-all disabled:opacity-50",
                          topic.status === 'Mastered' ? 'bg-success/10 text-success hover:bg-success/20' :
                          topic.status === 'In Progress' ? 'bg-warning/10 text-warning hover:bg-warning/20' :
                          topic.status === 'Needs Revision' ? 'bg-danger/10 text-danger hover:bg-danger/20' :
                          'bg-accent text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {topic.status === 'Mastered' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                      </button>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          {renamingId === topic.id ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="font-bold bg-accent border border-primary/50 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary w-full max-w-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameTopic(topic.id);
                                  if (e.key === 'Escape') setRenamingId(null);
                                }}
                              />
                              <button 
                                onClick={() => handleRenameTopic(topic.id)}
                                className="text-xs font-bold text-primary"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <>
                              <h3 className={cn(
                                "font-bold group-hover:text-primary transition-all",
                                topic.status === 'Mastered' ? "text-muted-foreground line-through" : "text-foreground"
                              )}>{topic.name}</h3>
                              <span className="text-[8px] font-mono bg-muted px-1 rounded text-muted-foreground">ID: {topic.id}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {formatDuration(topic.estimatedTime)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                            topic.priority === 'High' ? 'bg-danger/10 text-danger' :
                            topic.priority === 'Medium' ? 'bg-warning/10 text-warning' :
                            'bg-success/10 text-success'
                          }`}>
                            {topic.priority} Priority
                          </span>
                        </div>
                        
                        <div className="mt-3">
                          {editingDepsId === topic.id ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                value={depInputValue}
                                onChange={(e) => setDepInputValue(e.target.value)}
                                placeholder="Topic IDs (comma separated)"
                                className="text-xs bg-accent border border-border rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-primary"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveDependencies(topic.id);
                                  if (e.key === 'Escape') setEditingDepsId(null);
                                }}
                              />
                              <button 
                                onClick={() => handleSaveDependencies(topic.id)}
                                className="text-[10px] font-bold text-primary hover:underline"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => startEditingDeps(topic)}
                              className="text-[10px] text-muted-foreground hover:text-primary cursor-pointer flex items-center gap-1"
                            >
                              <Share2 size={10} />
                              {(topic.dependencies || []).length > 0 
                                ? `Depends on: ${topic.dependencies.join(', ')}`
                                : 'Add dependencies'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden md:block w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            topic.mastery > 80 ? 'bg-success' :
                            topic.mastery > 40 ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{ width: `${topic.mastery}%` }}
                        />
                      </div>
                      <button 
                        onClick={() => handleDeleteTopic(topic.id)}
                        disabled={updatingId === topic.id}
                        className="p-2 text-muted-foreground hover:text-danger transition-colors"
                        title="Delete Topic"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => setMenuOpenId(menuOpenId === topic.id ? null : topic.id)}
                          className={`p-2 transition-colors rounded-lg ${menuOpenId === topic.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                        >
                          <MoreVertical size={18} />
                        </button>

                        <AnimatePresence>
                          {menuOpenId === topic.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-[60]" 
                                onClick={() => setMenuOpenId(null)} 
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-[70] overflow-hidden"
                              >
                                <div className="p-1">
                                  <button
                                    onClick={() => handleMoveTopic(topic.id, moduleTopics[index - 1].id)}
                                    disabled={index === 0}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                  >
                                    <ArrowUp size={16} />
                                    Move Up
                                  </button>
                                  <button
                                    onClick={() => handleMoveTopic(topic.id, moduleTopics[index + 1].id)}
                                    disabled={index === moduleTopics.length - 1}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                  >
                                    <ArrowDown size={16} />
                                    Move Down
                                  </button>
                                  <div className="h-px bg-border my-1" />
                                  <button
                                    onClick={() => startRenaming(topic)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors text-primary"
                                  >
                                    <Type size={16} />
                                    Rename Topic
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTopics.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle size={48} className="text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold mb-2">No topics found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}

      {selectedSubject && (
        <AddSubjectModal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          subjectId={selectedSubject.id}
        />
      )}
    </div>
  );
}
