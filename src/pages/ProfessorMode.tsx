import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Upload, Users, BarChart3, Settings, Share2, Plus, ChevronRight, Lock, ArrowLeft } from 'lucide-react';

export default function ProfessorMode() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 relative">
        <div className="absolute top-12 left-12">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            <ArrowLeft size={18} />
            Back to Site
          </Link>
        </div>
        <div className="glass p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-secondary" size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Professor Portal</h1>
          <p className="text-muted-foreground mb-8">Access faculty-only subject configuration tools.</p>
          
          <div className="space-y-4 mb-8">
            <input 
              type="email" 
              placeholder="Faculty Email" 
              className="w-full bg-accent border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-secondary transition-colors text-foreground"
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full bg-accent border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-secondary transition-colors text-foreground"
            />
          </div>

          <button 
            onClick={() => setIsLoggedIn(true)}
            className="w-full py-4 rounded-lg bg-secondary hover:bg-cyan-500 text-white font-bold transition-all active:scale-95"
          >
            Login to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-foreground">Faculty Dashboard</h1>
          <p className="text-muted-foreground">Managing 3 active subjects.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary text-white font-bold hover:bg-secondary/90 transition-all active:scale-95 shadow-lg shadow-secondary/20">
          <Plus size={20} /> Create New Subject
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Subject List */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Active Subjects</h2>
          {[
            { name: 'Probability & Statistics', students: 142, code: 'STAT-202' },
            { name: 'Linear Algebra', students: 89, code: 'MATH-105' },
            { name: 'Discrete Structures', students: 115, code: 'CS-210' },
          ].map((subject, i) => (
            <div key={i} className={`glass p-6 cursor-pointer hover:border-secondary/50 transition-all ${i === 0 ? 'border-secondary/40 bg-secondary/5' : ''}`}>
              <div className="text-secondary text-[10px] font-bold uppercase tracking-widest mb-1">{subject.code}</div>
              <h3 className="font-bold text-lg mb-4 text-foreground">{subject.name}</h3>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Users size={14} /> {subject.students} Students</span>
                <span className="flex items-center gap-1.5 text-secondary">Manage <ChevronRight size={14} /></span>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics & Config */}
        <div className="lg:col-span-8 space-y-8">
          <div className="glass p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-foreground">Aggregate Student Performance</h2>
              <div className="flex gap-2">
                <button className="p-2 rounded bg-accent text-muted-foreground hover:text-foreground"><BarChart3 size={18} /></button>
                <button className="p-2 rounded bg-accent text-muted-foreground hover:text-foreground"><Share2 size={18} /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6 mb-12">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 text-foreground">74%</div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Avg. Coverage</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 text-foreground">62%</div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Avg. Mastery</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 text-foreground">12%</div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">At Risk</div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Common Weak Topics</h3>
              {[
                { name: 'Bayes Theorem', difficulty: 85 },
                { name: 'Hypothesis Testing', difficulty: 72 },
                { name: 'Joint Distributions', difficulty: 68 },
              ].map((topic, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{topic.name}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-40 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-secondary" style={{ width: `${topic.difficulty}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-secondary">{topic.difficulty}% Difficulty</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-8">
            <h2 className="text-xl font-bold mb-6 text-foreground">Subject Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-border bg-accent/30 hover:bg-accent/50 transition-all cursor-pointer group">
                <Upload className="text-secondary mb-4 group-hover:scale-110 transition-transform" size={32} />
                <h3 className="font-bold mb-2 text-foreground">Update Syllabus</h3>
                <p className="text-sm text-muted-foreground">Upload a new portion sheet to re-generate the topic list.</p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-accent/30 hover:bg-accent/50 transition-all cursor-pointer group">
                <Share2 className="text-secondary mb-4 group-hover:scale-110 transition-transform" size={32} />
                <h3 className="font-bold mb-2 text-foreground">Edit Graph</h3>
                <p className="text-sm text-muted-foreground">Manually adjust topic dependencies and prerequisite flows.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
