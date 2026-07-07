import React from 'react';
import { Shield, Lock, Eye, FileText, ChevronLeft, Mail, Globe, MapPin, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Privacy() {
  const sections = [
    {
      id: "1",
      title: "1. Information We Collect",
      content: [
        {
          subtitle: "1.1 Information You Provide",
          text: "When you create an account or use ExamFlow, we may collect: Name and email address; Profile preferences such as your exam date, target subjects, and study goals; Syllabus files and documents you upload; Quiz responses, topic completion status, and study session data; Feedback, support messages, or other communications you send us."
        },
        {
          subtitle: "1.2 Information Collected Automatically",
          text: "Usage data such as pages visited, features used, and session duration; Performance data such as load times and error logs; IP address and approximate geographic location; Device and browser information."
        }
      ]
    },
    {
      id: "2",
      title: "2. How We Use Your Information",
      text: "ExamFlow uses your data to: Create and manage your account; Generate and adapt your personalised study plan; Power features such as Crisis Mode, Neural Heatmap, and Professor AI; Track completion, quiz scores, and readiness metrics; Improve our algorithms and product features; Detect and prevent fraud or violations."
    },
    {
      id: "3",
      title: "3. How We Share Your Information",
      text: "We do not sell your personal data. We share information only with: Service Providers (Firebase/Google Cloud) solely to perform services on our behalf; AI Processing (Syllabus content may be processed by language models to generate responses, but not used for third-party training without consent); Legal Requirements if required by law."
    },
    {
      id: "4",
      title: "4. Data Retention",
      text: "We retain your data as long as your account is active. You may delete your account via Profile & Settings. Upon deletion, personal data is removed within 30 days, except where retention is legally required."
    },
    {
      id: "5",
      title: "5. Your Rights & Choices",
      text: "You have rights to: Access your data; Correct inaccuracies; Request deletion; Export your data (Portability); Object to certain processing. Contact riteshprajanalt@gmail.com to exercise these rights."
    }
  ];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 max-w-5xl mx-auto">
      <Link 
        to="/dashboard" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors text-sm font-bold uppercase tracking-widest group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
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
              <Shield size={32} />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">Privacy Policy</h1>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                Effective: April 30, 2026 | Last Updated: April 30, 2026
              </p>
            </div>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            Welcome to ExamFlow. We are committed to protecting your personal information and being transparent about how we collect, use, and share it. This policy explains our practices regarding data collected through our service.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Lock, label: 'Zero-Knowledge', desc: 'Secure encryption' },
            { icon: Eye, label: 'No Selling', desc: 'Data is never sold' },
            { icon: FileText, label: 'Full Control', desc: 'Delete anytime' },
            { icon: Scale, label: 'Compliant', desc: 'GDPR/India ready' },
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
          {sections.map((section) => (
            <div key={section.id} className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight border-l-4 border-primary pl-4">{section.title}</h2>
              {section.text ? (
                <p className="text-muted-foreground text-sm leading-relaxed ml-5">
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

        {/* More detailed info */}
        <div className="space-y-8 pt-12 border-t border-border/50 text-sm text-muted-foreground leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-foreground font-bold">Cookies & Tracking</h3>
              <p>ExamFlow uses essential cookies for authentication and preference management. You can control these through browser settings, though disabling them may degrade system performance.</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-foreground font-bold">International Operations</h3>
              <p>ExamFlow is operated from India. By using the Service, you consent to your data being processed in India or where our service providers (e.g., Google Cloud) operate.</p>
            </div>
          </div>
        </div>

        {/* Contact Footer */}
        <div className="pt-12 mt-12 bg-accent/20 -mx-8 sm:-mx-16 px-8 sm:px-16 py-12 border-t border-border/50">
          <div className="flex flex-col lg:flex-row justify-between gap-12">
            <div className="space-y-4 max-w-sm">
              <h2 className="text-2xl font-black uppercase tracking-tight">Contact Protocol</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                If you have questions regarding this policy or your cognitive data, reach out to our privacy teams.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 flex-1">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                  <Mail size={14} />
                  Official Communication
                </div>
                <div className="space-y-1">
                  <p className="text-foreground font-bold text-sm">riteshprajanalt@gmail.com</p>
                  <p className="text-muted-foreground text-xs uppercase font-black tracking-widest opacity-50">Legal/Privacy</p>
                </div>
                <div className="space-y-1">
                  <p className="text-foreground font-bold text-sm">riteshprajanalt@gmail.com</p>
                  <p className="text-muted-foreground text-xs uppercase font-black tracking-widest opacity-50">Support Hub</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                  <Globe size={14} />
                  Operational Hub
                </div>
                <div className="space-y-1">
                  <p className="text-foreground font-bold text-sm">examflow.app</p>
                  <p className="text-muted-foreground text-xs uppercase font-black tracking-widest opacity-50">System Web</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
