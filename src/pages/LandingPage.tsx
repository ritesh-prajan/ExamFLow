import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Zap, BarChart3, Share2, Target, ShieldAlert } from 'lucide-react';

export default function LandingPage() {
  const stats = [
    { label: 'Students using ExamFlow', value: 12450 },
    { label: 'Avg syllabus completion', value: 94, suffix: '%' },
    { label: 'Avg score improvement', value: 22, suffix: '%' },
  ];

  const features = [
    { icon: <Zap className="text-primary" />, title: 'Syllabus Parser', desc: 'Upload your portion sheet and let AI extract every topic automatically.' },
    { icon: <Share2 className="text-secondary" />, title: 'Dependency Graph', desc: 'Visualize how topics connect and what to study in which order.' },
    { icon: <Target className="text-success" />, title: 'Adaptive Plan', desc: 'A study schedule that recalculates every time you finish a topic.' },
    { icon: <ShieldAlert className="text-warning" />, title: 'Crisis Mode', desc: 'Down to 72 hours? We identify the highest-impact topics for you.' },
    { icon: <BarChart3 className="text-primary" />, title: 'Deep Analytics', desc: 'Track your mastery, consistency, and readiness in real-time.' },
    { icon: <CheckCircle2 className="text-secondary" />, title: 'Focus Mode', desc: 'Distraction-free interface with AI-guided study techniques.' },
  ];

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="px-6 py-24 max-w-7xl mx-auto text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Stop deciding what to study.<br />
          <span className="text-primary">Start studying.</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          ExamFlow analyzes your syllabus, understands how you learn, and builds a personal exam strategy that adapts every single day.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link to="/onboarding" className="btn-primary inline-flex items-center gap-2 text-lg">
            Build My Study Plan
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass p-8 text-center"
            >
              <div className="text-4xl font-bold mb-2 flex items-center justify-center">
                <Counter value={stat.value} />
                {stat.suffix}
              </div>
              <div className="text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center">Everything you need to ace your exams</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass p-8 glass-hover"
            >
              <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="glass p-4 rounded-2xl overflow-hidden border-primary/20 shadow-2xl shadow-primary/10">
          <div className="aspect-video bg-accent rounded-xl relative flex items-center justify-center group cursor-default">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-50"></div>
             <div className="relative z-10 text-center">
                <div className="text-muted-foreground font-mono text-sm mb-4 uppercase tracking-widest">Dashboard Preview</div>
                <div className="flex gap-4">
                   <div className="w-32 h-20 glass rounded-lg"></div>
                   <div className="w-32 h-20 glass rounded-lg"></div>
                   <div className="w-32 h-20 glass rounded-lg"></div>
                </div>
                <div className="mt-6 w-full max-w-md h-40 glass rounded-lg mx-auto"></div>
             </div>
          </div>
        </div>
      </section>

      <footer className="px-6 py-12 border-t border-border text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 bg-primary rounded overflow-hidden flex items-center justify-center font-bold text-xs text-primary-foreground">
            <img 
              src="https://i.ibb.co/JRXn4WR7/image-2026-04-19-124520735.png" 
              alt="ExamFlow Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="font-bold text-foreground">ExamFlow</span>
        </div>
        <p className="mb-6">The intelligent way to prepare for exams.</p>
        <div className="flex justify-center gap-8 text-sm">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}

function Counter({ value }: { value: number }) {
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 2000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{count.toLocaleString()}</span>;
}
