import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, BarChart3, Grid3X3, Share2, Zap, Settings, User, LogIn, BookOpen, ChevronDown, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  if (location.pathname === '/focus' || location.pathname === '/auth') return null;

  const selectedSubject = (state.subjects || []).find(s => s.id === state.selectedSubjectId);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Syllabus', path: '/syllabus', icon: BookOpen },
    { name: 'Plan', path: '/plan', icon: Calendar },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Heatmap', path: '/heatmap', icon: Grid3X3 },
    { name: 'Graph', path: '/graph', icon: Share2 },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/5 bg-background/60 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between transition-all">
        <div className="flex items-center gap-4 lg:gap-10">
          <Link 
            to={state.user ? (state.selectedSubjectId ? "/dashboard" : "/subjects") : "/auth"} 
            className="flex items-center gap-2 group shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform shrink-0">
              <img 
                src="https://i.ibb.co/JRXn4WR7/image-2026-04-19-124520735.png" 
                alt="ExamFlow Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-bold text-base sm:text-xl tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent truncate max-w-[100px] sm:max-w-none">
              ExamFlow
            </span>
          </Link>
          
          {state.user && (
            <div className="hidden lg:flex items-center gap-6">
              {state.selectedSubjectId && (
                <div 
                  onClick={() => navigate('/subjects')}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent/50 border border-border/50 hover:bg-accent hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-foreground/80 max-w-[120px] truncate uppercase tracking-wider">
                    {selectedSubject?.name}
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              )}

              <div className="flex items-center gap-1 p-1 bg-accent/30 rounded-xl border border-border/20">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 relative",
                        isActive 
                          ? "bg-background text-primary shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      )}
                    >
                      <link.icon size={16} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
                      {link.name}
                      {isActive && (
                        <motion.div 
                          layoutId="nav-active"
                          className="absolute inset-0 bg-primary/5 rounded-lg -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {state.user ? (
            <>
              <Link 
                to="/crisis" 
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-warning/10 text-warning border border-warning/20 text-xs font-bold uppercase tracking-widest hover:bg-warning/20 hover:border-warning/40 transition-all shadow-sm"
              >
                <Zap size={14} fill="currentColor" className="animate-pulse" />
                Crisis Mode
              </Link>
              
              <div className="flex items-center gap-2 sm:gap-3 border-l border-border/50 pl-2 sm:pl-4">
                <Link to="/settings" className="hidden sm:flex p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all">
                  <Settings size={20} />
                </Link>
                <Link to="/settings" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-accent border border-border/50 flex items-center justify-center text-muted-foreground hover:border-primary/50 transition-all overflow-hidden p-0.5 shrink-0">
                  <div className="w-full h-full rounded-[10px] overflow-hidden bg-muted flex items-center justify-center">
                    {state.user.photoURL ? (
                      <img src={state.user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xs sm:text-sm font-bold text-primary">
                        {state.user.displayName ? state.user.displayName.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                </Link>
                
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </>
          ) : (
            <Link 
              to="/auth" 
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <LogIn size={16} />
              Sign In
            </Link>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur-xl lg:hidden overflow-y-auto"
          >
            <div className="p-6 space-y-8">
              {state.selectedSubjectId && (
                <div 
                  onClick={() => {
                    navigate('/subjects');
                    closeMobileMenu();
                  }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-accent/50 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Current Subject</span>
                      <span className="text-sm font-bold truncate max-w-[200px]">{selectedSubject?.name}</span>
                    </div>
                  </div>
                  <ChevronDown size={16} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={closeMobileMenu}
                      className={cn(
                        "flex flex-col items-center justify-center p-6 rounded-2xl border transition-all gap-4 text-center btn-touch",
                        isActive 
                          ? "bg-primary/10 border-primary/30 text-primary" 
                          : "bg-accent/30 border-border/50 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                      )}
                    >
                      <link.icon size={24} />
                      <span className="text-xs font-bold uppercase tracking-wider">{link.name}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-border/50 space-y-4">
                <Link 
                  to="/crisis" 
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-warning/10 text-warning border border-warning/20 text-sm font-black uppercase tracking-widest"
                >
                  <Zap size={18} fill="currentColor" />
                  Crisis Mode
                </Link>
                <Link 
                  to="/settings" 
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-accent border border-border text-sm font-black uppercase tracking-widest"
                >
                  <Settings size={18} />
                  Settings
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
