import React, { useState } from 'react';
import { Gavel, CheckCircle2, AlertTriangle, Scale, ChevronLeft, Shield, Clock, Brain, Mail, Globe, Check, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function Terms() {
  const navigate = useNavigate();
  const { state, updateState } = useApp();
  const [agreed, setAgreed] = useState(state.user?.agreedToTerms || false);
  const [isUpdating, setIsUpdating] = useState(false);

  const sections = [
    {
      title: "1. Eligibility and Account Registration",
      content: [
        { subtitle: "1.1 Age Requirements", text: "You must be at least 13 years of age to use ExamFlow. Users between 13 and 18 must have parental consent." },
        { subtitle: "1.2 Account Creation", text: "Provide accurate information. Notify riteshprajanalt@gmail.com immediately if you suspect unauthorised access." },
        { subtitle: "1.3 One Account Per User", text: "Creating multiple accounts to circumvent restrictions is prohibited." }
      ]
    },
    {
      title: "2. Description of the Service",
      text: "ExamFlow is an AI-powered exam preparation platform. Core features include Syllabus Sync, Smart Study Planner, Crisis Mode, Neural Heatmap, Knowledge Graph, and Professor AI."
    },
    {
      title: "3. Subscription Plans and Payments",
      text: "We may offer free and paid tiers. Subscriptions automatically renew unless cancelled 24 hours prior. Refunds are final and non-refundable except where required by law."
    },
    {
      title: "4. Acceptable Use Policy",
      text: "You agree not to reverse engineer the system, scrape data, or use AI outputs as a substitute for professional advice. Plagiarism via AI is strictly prohibited."
    },
    {
      title: "5. User Content",
      text: "You retain ownership of uploaded syllabus files. You grant ExamFlow a non-exclusive licence to process this data to deliver core features."
    },
    {
      title: "9. Disclaimers and Limitation of Liability",
      text: "THE SERVICE IS PROVIDED 'AS IS'. We do not warrant that results (exam performance) will be accurate or guaranteed. AI-generated content is a supplementary aid only."
    }
  ];

  const handleAccept = async () => {
    if (!agreed) return;

    if (state.user) {
      setIsUpdating(true);
      try {
        const userRef = doc(db, 'users', state.user.uid);
        await updateDoc(userRef, { agreedToTerms: true });
        updateState({ user: { ...state.user, agreedToTerms: true } });
        navigate('/dashboard');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}`);
      } finally {
        setIsUpdating(false);
      }
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 max-w-5xl mx-auto">
      <Link 
        to={state.user ? "/dashboard" : "/"} 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors text-sm font-bold uppercase tracking-widest group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        {state.user ? 'Back to Dashboard' : 'Back to Home'}
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-8 sm:p-16 space-y-16"
      >
        {/* Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Gavel size={32} />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">Terms of Use</h1>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                Effective: April 30, 2026 | Last Updated: April 30, 2026
              </p>
            </div>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            These terms constitute a legally binding agreement between you and ExamFlow. By accessing the system, you confirm you have read and agreed to optimize your cognitive performance within these guidelines.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Shield, label: 'Secure', desc: 'Protected processing' },
            { icon: Clock, label: 'Reliable', desc: 'High availability' },
            { icon: Brain, label: 'Adaptive', desc: 'AI-driven insights' },
            { icon: Scale, label: 'Legal', desc: 'Arbitration per law' },
          ].map((stat, i) => (
            <div key={i} className="p-6 rounded-3xl bg-accent/30 border border-border/50 space-y-3">
              <stat.icon className="text-primary" size={20} />
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-1">{stat.label}</div>
                <div className="text-xs text-muted-foreground leading-snug">{stat.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight border-l-4 border-primary pl-4">{section.title}</h2>
              {section.text ? (
                <p className="text-muted-foreground text-sm leading-relaxed ml-5 font-medium">
                  {section.text}
                </p>
              ) : (
                <div className="space-y-6 ml-5">
                  {section.content?.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-widest text-foreground">{item.subtitle}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Agreement Section */}
        <div className="pt-8 space-y-6">
          <div 
            className="flex items-start gap-4 p-6 rounded-2xl bg-primary/5 border border-primary/10 cursor-pointer group transition-colors hover:bg-primary/10"
            onClick={() => setAgreed(!agreed)}
          >
            <div className={cn(
              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mt-1",
              agreed ? "bg-primary border-primary shadow-lg shadow-primary/20" : "bg-input border-border/50 group-hover:border-primary/50"
            )}>
              {agreed && <Check size={16} className="text-primary-foreground" strokeWidth={3} />}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">I have read and agree to the Terms of Operation</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By ticking this box, you acknowledge that you understand the cognitive optimization protocols and legal frameworks of ExamFlow.
              </p>
            </div>
          </div>

          <button
            disabled={!agreed || isUpdating}
            onClick={handleAccept}
            className={cn(
              "w-full sm:w-auto px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-sm flex items-center justify-center gap-2",
              agreed && !isUpdating
                ? "bg-primary text-primary-foreground hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 active:translate-y-0" 
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            )}
          >
            {isUpdating ? <Loader2 className="animate-spin" size={20} /> : 'Accept and Continue'}
          </button>
        </div>

        {/* Contact Footer */}
        <div className="pt-12 mt-12 bg-accent/20 -mx-8 sm:-mx-16 px-8 sm:px-16 py-12 border-t border-border/50">
          <div className="flex flex-col lg:flex-row justify-between gap-12">
            <div className="space-y-4 max-w-sm">
              <h2 className="text-2xl font-black uppercase tracking-tight">Legal Protocol</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                For formal notices, disputes, or clarification regarding these terms, use the official legal channels.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 flex-1">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                  <Mail size={14} />
                  Legal Communication
                </div>
                <div className="space-y-1">
                  <p className="text-foreground font-bold text-sm">riteshprajanalt@gmail.com</p>
                  <p className="text-muted-foreground text-xs uppercase font-black tracking-widest opacity-50">Assigned Counsel</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                  <Globe size={14} />
                  Digital Domain
                </div>
                <div className="space-y-1">
                  <p className="text-foreground font-bold text-sm">examflow.app</p>
                  <p className="text-muted-foreground text-xs uppercase font-black tracking-widest opacity-50">System Gateway</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
