import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, BookOpen, Calendar, Clock, ChevronRight, LayoutGrid, List, Trash2, Archive, Activity, Pencil } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import AddSubjectModal from '../components/AddSubjectModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { Subject } from '../types';

export default function Subjects() {
  const { state, selectSubject, deleteSubject } = useApp();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  const [manageSubjectId, setManageSubjectId] = useState<string | null | 'new'>(null);

  const handleDeleteSubject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSubjectToDelete(id);
  };

  const handleEditSubject = (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    setManageSubjectId(subjectId);
  };

  const confirmDelete = async () => {
    if (subjectToDelete) {
      await deleteSubject(subjectToDelete);
      setSubjectToDelete(null);
    }
  };

  const handleSelectSubject = (id: string) => {
    console.log('Selecting subject from list:', id);
    selectSubject(id);
    navigate('/dashboard');
  };

  const subjects = (state.subjects || [])
    .map(s => {
      const examDate = new Date(s.examDate);
      if (s.examTime) {
        const [hours, minutes] = s.examTime.split(':');
        examDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      return { ...s, fullExamDate: examDate };
    })
    .sort((a, b) => a.fullExamDate.getTime() - b.fullExamDate.getTime());

  const now = new Date();
  const activeSubjects = subjects.filter(s => s.fullExamDate >= now);
  const archivedSubjects = subjects.filter(s => s.fullExamDate < now);

  const renderSubjectCard = (subject: any, index: number) => (
    <motion.div
      key={subject.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => handleSelectSubject(subject.id)}
      className={`group cursor-pointer bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all ${
        viewMode === 'list' ? 'flex flex-col sm:flex-row sm:items-center p-6' : 'flex flex-col'
      }`}
    >
      <div className={`bg-primary/10 p-4 flex items-center justify-center ${viewMode === 'list' ? 'mb-4 sm:mb-0 sm:mr-6 rounded-xl h-16 w-16 sm:h-auto sm:w-auto shrink-0' : 'aspect-video'}`}>
        <BookOpen size={viewMode === 'list' ? 24 : 48} className="text-primary" />
      </div>
      
      <div className={`p-6 flex-1 ${viewMode === 'list' ? 'p-0' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
              {subject.name}
            </h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(subject.examDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {subject.dailyHours}h/day
              </span>
            </div>
          </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleEditSubject(e, subject.id)}
                className="p-2 bg-accent rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                title="Edit Subject"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={(e) => handleDeleteSubject(e, subject.id)}
                className="p-2 bg-accent rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                title="Delete Subject"
              >
                <Trash2 size={18} />
              </button>
              <div className="p-2 bg-accent rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <ChevronRight size={20} />
              </div>
            </div>
        </div>
        
        {viewMode === 'grid' && (
          <div className="pt-4 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Preparation Status</span>
            <span className="text-primary font-medium">
              {subject.fullExamDate < now ? 'Completed' : 'Ready to start'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">My Subjects</h1>
          <p className="text-muted-foreground text-sm">Select a subject to continue your preparation</p>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <div className="flex bg-accent p-1 rounded-lg border border-border shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List size={20} />
            </button>
          </div>
          
          <button
            onClick={() => setManageSubjectId('new')}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0 text-sm sm:text-base"
          >
            <Plus size={20} />
            <span className="whitespace-nowrap">Add Subject</span>
          </button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center mb-6 border border-border">
            <BookOpen size={40} className="text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No subjects added yet</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Start by adding your first subject and its portions to begin your personalized study journey.
          </p>
          <button
            onClick={() => setManageSubjectId('new')}
            className="flex items-center gap-2 px-8 py-4 bg-accent border border-border rounded-2xl hover:bg-muted transition-all font-semibold"
          >
            <Plus size={20} className="text-primary" />
            Add Your First Subject
          </button>
        </motion.div>
      ) : (
        <div className="space-y-12">
          {/* Active Subjects */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
              <Activity size={16} />
              Active Exams
            </div>
            {activeSubjects.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {activeSubjects.map((subject, index) => renderSubjectCard(subject, index))}
              </div>
            ) : (
              <div className="p-8 text-center glass rounded-2xl border-dashed border-2 border-border text-muted-foreground italic text-sm">
                No active exams. Time to add something new?
              </div>
            )}
          </div>

          {/* Archived Subjects */}
          {archivedSubjects.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground font-bold uppercase tracking-widest text-xs pt-6 border-t border-border">
                <Archive size={16} />
                Archived / Completed
              </div>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all' : 'space-y-4 opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all'}>
                {archivedSubjects.map((subject, index) => renderSubjectCard(subject, index))}
              </div>
            </div>
          )}
        </div>
      )}

      <AddSubjectModal 
        isOpen={!!manageSubjectId} 
        onClose={() => setManageSubjectId(null)} 
        subjectId={manageSubjectId === 'new' ? null : manageSubjectId}
      />

      <DeleteConfirmationModal
        isOpen={!!subjectToDelete}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Subject"
        message="Are you sure you want to delete this subject? All associated topics and progress will be permanently removed."
      />
    </div>
  );
}
