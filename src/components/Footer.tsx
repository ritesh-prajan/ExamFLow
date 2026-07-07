import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Facebook, Instagram, Linkedin, Youtube, Brain, Zap, Github, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterLink {
  title: string;
  href: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface FooterSection {
  label: string;
  links: FooterLink[];
}

const footerLinks: FooterSection[] = [
  {
    label: 'App',
    links: [
      { title: 'Dashboard', href: '/dashboard' },
      { title: 'Study Plan', href: '/plan' },
      { title: 'Focus Mode', href: '/focus' },
    ],
  },
  {
    label: 'Resources',
    links: [
      { title: 'Knowledge Graph', href: '/graph' },
      { title: 'Neural Heatmap', href: '/heatmap' },
      { title: 'Crisis Mode', href: '/crisis' },
      { title: 'Professor AI', href: '/professor' },
    ],
  },
  {
    label: 'Profile',
    links: [
      { title: 'Profile & Settings', href: '/settings' },
      { title: 'My Subjects', href: '/subjects' },
      { title: 'Analytics', href: '/analytics' },
    ],
  },
  {
    label: 'Connect',
    links: [
      { title: 'GitHub', href: 'https://github.com/ritesh-prajan', icon: Github },
      { title: 'LinkedIn', href: 'https://www.linkedin.com/in/ritesh-prajan-s/', icon: Linkedin },
      { title: 'Instagram', href: 'https://instagram.com/ritesh_srp', icon: Instagram },
    ],
  },
  {
    label: 'Legal',
    links: [
      { title: 'Privacy Protocol', href: '/privacy' },
      { title: 'Terms of Operation', href: '/terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative w-full max-w-7xl mx-auto flex flex-col items-center justify-center rounded-t-[3rem] border-t border-border/40 bg-background/50 backdrop-blur-xl px-6 py-12 lg:py-20 mt-20 overflow-hidden">
      {/* Decorative top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent blur-sm" />
      
      <div className="grid w-full gap-12 xl:grid-cols-4 xl:gap-8">
        <AnimatedContainer className="space-y-6 col-span-1 xl:col-span-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20 text-primary group-hover:scale-110 transition-transform">
              <Brain size={28} />
            </div>
            <span className="text-xl font-black uppercase tracking-tighter">ExamFlow</span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed font-medium max-w-xs">
            ExamFlow turns your syllabus into a living, adaptive study system. Built for high-velocity students pursuing absolute mastery.
          </p>
          <div className="pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              © {new Date().getFullYear()} ExamFlow. All rights reserved.
            </p>
          </div>
        </AnimatedContainer>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5 xl:col-span-3">
          {footerLinks.map((section, index) => (
            <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">{section.label}</h3>
                <ul className="space-y-3">
                  {section.links.map((link) => {
                    const isExternal = link.href.startsWith('http');
                    const LinkComponent = isExternal ? 'a' : Link;
                    const linkProps = isExternal 
                      ? { href: link.href, target: "_blank", rel: "noreferrer" }
                      : { to: link.href };

                    return (
                      <li key={link.title}>
                        <LinkComponent
                          {...(linkProps as any)}
                          className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 transition-all duration-300 text-[11px] font-bold uppercase tracking-wider group"
                        >
                          {link.icon && <link.icon size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />}
                          {link.title}
                        </LinkComponent>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </AnimatedContainer>
          ))}
        </div>
      </div>

      {/* Extreme bottom accent */}
      <div className="w-full mt-16 pt-8 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 opacity-50">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">ExamFlow · Study Smarter · Ritesh Prajan S</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-colors">Terms of Use</Link>
        </div>
      </div>
    </footer>
  );
}

type ViewAnimationProps = {
  delay?: number;
  className?: string;
  children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: 20, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
