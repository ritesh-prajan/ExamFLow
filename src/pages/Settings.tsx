import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Bell, 
  Shield, 
  Moon, 
  Globe, 
  LogOut, 
  CreditCard, 
  Smartphone, 
  Mail, 
  Camera,
  ChevronRight,
  Check,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Brain,
  Layers,
  Github,
  Linkedin,
  Instagram,
  Eye,
  EyeOff
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { auth, db, handleFirestoreError, OperationType } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { encryptKey, decryptKey } from '@/services/geminiService';

type SettingsTab = 'profile' | 'security' | 'preferences' | 'support';

export default function Settings() {
  const navigate = useNavigate();
  const { state, updateState, setTheme, setAccentColor } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('gemini_api_key');
      return stored ? decryptKey(stored) : '';
    }
    return '';
  });
  const [showKey, setShowKey] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  const handleSaveApiKey = () => {
    if (typeof localStorage !== 'undefined') {
      setSavingKey(true);
      if (geminiApiKey.trim() === '') {
        localStorage.removeItem('gemini_api_key');
      } else {
        const encrypted = encryptKey(geminiApiKey.trim());
        localStorage.setItem('gemini_api_key', encrypted);
      }
      setTimeout(() => {
        setSavingKey(false);
        setIsKeySaved(true);
        setTimeout(() => setIsKeySaved(false), 2000);
      }, 500);
    }
  };
  
  const presetColors = [
    { name: 'Blue', value: '#1e9df1' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Hotpink', value: '#ff69b4' },
  ];
  
  // Profile state
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    bio: '',
    college: '',
    photoURL: '',
    learningPreference: 'adaptive' as 'adaptive' | 'sequential'
  });

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const avatars = [
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Alexander`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=George`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Henry`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Arthur`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Jack`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Harry`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Freddie`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Leo`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Luna`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Maya`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Jade`,
  ];

  useEffect(() => {
    if (state.user) {
      setProfile({
        displayName: state.user.displayName || '',
        email: state.user.email || '',
        bio: state.user.bio || '',
        college: state.user.college || '',
        photoURL: state.user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${state.user.uid}`,
        learningPreference: state.user.learningPreference || 'adaptive'
      });
    }
  }, [state.user]);

  const updateAvatar = async (avatarUrl: string) => {
    if (!state.user) return;
    setProfile(prev => ({ ...prev, photoURL: avatarUrl }));
    setShowAvatarPicker(false);
    
    // Auto-save specifically the avatar
    setSaving(true);
    try {
      const userRef = doc(db, 'users', state.user.uid);
      await updateDoc(userRef, { photoURL: avatarUrl });
      
      updateState({
        user: {
          ...state.user,
          photoURL: avatarUrl
        }
      });
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!state.user) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', state.user.uid);
      await updateDoc(userRef, {
        displayName: profile.displayName,
        bio: profile.bio,
        college: profile.college,
        photoURL: profile.photoURL,
        learningPreference: profile.learningPreference
      });
      
      updateState({
        user: {
          ...state.user,
          displayName: profile.displayName,
          bio: profile.bio,
          college: profile.college,
          photoURL: profile.photoURL,
          learningPreference: profile.learningPreference
        },
        learningPreference: profile.learningPreference
      });
      
      // Save Gemini API key to local storage
      if (typeof localStorage !== 'undefined') {
        if (geminiApiKey.trim() === '') {
          localStorage.removeItem('gemini_api_key');
        } else {
          localStorage.setItem('gemini_api_key', encryptKey(geminiApiKey.trim()));
        }
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'preferences', label: 'Preferences', icon: <Moon size={18} /> },
    { id: 'support', label: 'Support', icon: <Mail size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-16 sm:mt-20 flex flex-col lg:flex-row gap-10">
        
        {/* Sidebar */}
        <aside className="w-full lg:w-72 space-y-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-2">Control</h1>
            <p className="text-muted-foreground text-sm font-medium">Manage your system preferences and profile & settings.</p>
          </div>

          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] whitespace-nowrap min-w-max lg:min-w-0 flex-1 lg:flex-none border",
                  activeTab === tab.id 
                    ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-[1.02]" 
                    : "bg-accent/30 text-muted-foreground border-transparent hover:bg-accent/50"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:block pt-8 border-t border-border/50">
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-danger hover:bg-danger/5 transition-all text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-danger/20"
            >
              <LogOut size={18} />
              Terminate Session
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 lg:max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="glass p-6 sm:p-10 min-h-[500px] flex flex-col border-border/40"
            >
              <div className="flex-1">
                {activeTab === 'profile' && (
                  <div className="space-y-10">
                    <div className="flex flex-col sm:flex-row items-center gap-8 pb-10 border-b border-border/50">
                      <div className="relative group">
                        <div 
                          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                          className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-accent/50 flex items-center justify-center text-muted-foreground border-2 border-border/50 overflow-hidden relative cursor-pointer hover:border-primary transition-all shadow-2xl group-hover:scale-105"
                        >
                          {profile.photoURL ? (
                            <img 
                              src={profile.photoURL} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User size={48} className="opacity-20" />
                          )}
                        </div>
                        
                        <AnimatePresence>
                          {showAvatarPicker && (
                            <>
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowAvatarPicker(false)}
                                className="fixed inset-0 z-[100]"
                              />
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-full mb-6 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-full sm:ml-8 w-72 sm:w-80 bg-card border border-border p-5 rounded-3xl shadow-2xl z-[110]"
                              >
                                <div className="hidden sm:block absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-card border-b border-l border-border rotate-45" />
                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 text-center">Identity Profiles</div>
                                <div className="grid grid-cols-4 gap-3">
                                  {avatars.map((avatar, i) => (
                                    <button
                                      key={i}
                                      onClick={() => updateAvatar(avatar)}
                                      className={cn(
                                        "w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-110 active:scale-95",
                                        profile.photoURL === avatar ? "border-primary bg-primary/10 shadow-glow shadow-primary/20" : "border-border/50 hover:border-muted-foreground/30 shadow-sm"
                                      )}
                                    >
                                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>

                        <button 
                          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                          className="absolute bottom-1 right-1 p-2.5 bg-primary rounded-full border-4 border-card text-primary-foreground hover:scale-110 transition-transform z-10 shadow-xl shadow-primary/30"
                        >
                          <Camera size={18} />
                        </button>
                      </div>
                      <div className="text-center sm:text-left space-y-1">
                        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">{profile.displayName || 'Entity Anonymous'}</h2>
                        <p className="text-muted-foreground text-sm font-medium">{profile.email}</p>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                          <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">Authorized Dev</span>
                          <span className="px-3 py-1 bg-accent/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest rounded-full border border-border">{profile.college || 'Node Unassigned'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Full Signature</label>
                        <input 
                          type="text" 
                          value={profile.displayName} 
                          onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                          className="w-full bg-input/50 border border-border rounded-xl px-5 py-3.5 focus:outline-none focus:border-primary transition-all text-sm font-medium placeholder:text-muted-foreground/30 shadow-sm" 
                          placeholder="e.g., Alexander Hamilton"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Institute Node</label>
                        <input 
                          type="text" 
                          value={profile.college} 
                          onChange={(e) => setProfile({...profile, college: e.target.value})}
                          className="w-full bg-input/50 border border-border rounded-xl px-5 py-3.5 focus:outline-none focus:border-primary transition-all text-sm font-medium placeholder:text-muted-foreground/30 shadow-sm" 
                          placeholder="e.g., MIT, Stanford"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Personal Bio</label>
                        <textarea 
                          value={profile.bio}
                          onChange={(e) => setProfile({...profile, bio: e.target.value})}
                          className="w-full bg-input/50 border border-border rounded-xl px-5 py-4 focus:outline-none focus:border-primary transition-all h-32 resize-none text-sm font-medium placeholder:text-muted-foreground/30 shadow-sm"
                          placeholder="Tell the system about your objectives..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-10">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black mb-2 uppercase tracking-tight">Security Matrix</h2>
                      <p className="text-muted-foreground text-sm font-medium">Protect the integrity of your neural data.</p>
                    </div>

                    <div className="space-y-8">
                      <div className="p-6 sm:p-8 bg-accent/30 rounded-3xl border border-border relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                              <Shield size={24} />
                            </div>
                            <div>
                              <div className="font-black text-xs uppercase tracking-widest mb-1">Dual-Vector Auth</div>
                              <span className="text-[10px] font-black text-danger bg-danger/10 px-2.5 py-1 rounded-lg border border-danger/20 uppercase tracking-widest">offline</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-6 leading-relaxed font-medium">Require secondary signal verification for all critical administrative access attempts.</p>
                        <button className="w-full sm:w-auto btn-secondary text-[10px] font-black uppercase tracking-widest py-3.5 px-8">Initialize MFA</button>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-border/50">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Credential Rotation</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <input type="password" placeholder="Current Secret" className="w-full bg-input/50 border border-border rounded-xl px-5 py-3.5 focus:outline-none focus:border-primary transition-all text-sm font-medium placeholder:text-muted-foreground/30 shadow-sm" />
                          <input type="password" placeholder="New Secret" className="w-full bg-input/50 border border-border rounded-xl px-5 py-3.5 focus:outline-none focus:border-primary transition-all text-sm font-medium placeholder:text-muted-foreground/30 shadow-sm" />
                        </div>
                        <button className="btn-primary text-[10px] font-black uppercase tracking-widest py-3.5 px-10 shadow-lg shadow-primary/20">Inject New Sequence</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="space-y-10">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black mb-2 uppercase tracking-tight">Calibration</h2>
                      <p className="text-muted-foreground text-sm font-medium">Fine-tune the interface and learning algorithms.</p>
                    </div>

                    <div className="space-y-10">
                      <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Learning Logic</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { id: 'adaptive', label: 'Adaptive Flow', desc: 'Prioritize by confidence and exam proximity', icon: <Brain size={24} /> },
                            { id: 'sequential', label: 'Module Linear', desc: 'Follow the raw syllabus architecture', icon: <Layers size={24} /> },
                          ].map((mode) => (
                            <button 
                              key={mode.id}
                              onClick={() => setProfile({...profile, learningPreference: mode.id as 'adaptive' | 'sequential'})}
                              className={cn(
                                "p-6 rounded-3xl border transition-all text-left flex flex-col gap-3 relative overflow-hidden group btn-touch",
                                profile.learningPreference === mode.id 
                                  ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20" 
                                  : "bg-accent/30 border-border text-muted-foreground hover:bg-accent/50"
                              )}
                            >
                              <div className={cn(
                                "p-3 rounded-2xl border transition-colors",
                                profile.learningPreference === mode.id ? "bg-primary-foreground/10 border-primary-foreground/20" : "bg-accent border-border"
                              )}>
                                {mode.icon}
                              </div>
                              <div>
                                <div className="font-black text-xs uppercase tracking-widest mb-1">{mode.label}</div>
                                <div className="text-[10px] opacity-70 leading-normal font-bold">{mode.desc}</div>
                              </div>
                              {profile.learningPreference === mode.id && (
                                <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-primary-foreground text-primary flex items-center justify-center">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Chromatic Signature</h3>
                        <div className="flex flex-wrap items-center gap-3">
                          {presetColors.map((color) => (
                            <button
                              key={color.name}
                              onClick={() => setAccentColor(color.value)}
                              className={cn(
                                "flex items-center gap-3 pl-4 pr-6 py-3 rounded-2xl border transition-all btn-touch",
                                state.accentColor.toLowerCase() === color.value.toLowerCase() 
                                  ? "bg-primary/10 border-primary text-foreground shadow-lg shadow-primary/5" 
                                  : "bg-accent/30 border-border text-muted-foreground hover:bg-accent/50"
                              )}
                            >
                              <div 
                                className="w-5 h-5 rounded-lg shadow-sm" 
                                style={{ backgroundColor: color.value }}
                              />
                              <span className="text-[10px] font-black uppercase tracking-widest">{color.name}</span>
                            </button>
                          ))}

                          {/* Custom Color Wheel Selection */}
                          <div 
                            className={cn(
                              "relative flex items-center gap-3 pl-4 pr-4 py-3 rounded-2xl border transition-all btn-touch cursor-pointer select-none",
                              !presetColors.some(c => c.value.toLowerCase() === state.accentColor.toLowerCase())
                                ? "bg-primary/10 border-primary text-foreground shadow-lg shadow-primary/5" 
                                : "bg-accent/30 border-border text-muted-foreground hover:bg-accent/50"
                            )}
                          >
                            <div 
                              className="w-5 h-5 rounded-lg shadow-sm relative overflow-hidden border border-white/10" 
                              style={{ backgroundColor: state.accentColor }}
                            >
                              <input 
                                type="color" 
                                value={state.accentColor} 
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                                title="Open Color Wheel Pick"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-0.5">Hex Wheel</span>
                              <input 
                                type="text" 
                                value={state.accentColor} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAccentColor(val);
                                }}
                                className="text-[10px] font-mono font-black uppercase bg-transparent p-0 border-none outline-none focus:ring-0 w-16 text-foreground leading-none"
                                placeholder="#1e9df1"
                                maxLength={7}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Visual Spectrum</h3>
                        <div className="grid grid-cols-3 gap-3">
                          {(['dark', 'light', 'system'] as const).map((t) => (
                            <button 
                              key={t}
                              onClick={() => setTheme(t)}
                              className={cn(
                                "p-4 rounded-xl border transition-all text-center btn-touch",
                                state.theme === t 
                                  ? "bg-primary text-primary-foreground border-primary shadow-glow shadow-primary/20" 
                                  : "bg-accent/30 border-border text-muted-foreground hover:bg-accent/50"
                              )}
                            >
                              <div className="text-[10px] font-black uppercase tracking-widest">{t}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">AI Configurations</h3>
                          <a 
                            href="https://aistudio.google.com/api-keys" 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest hover:underline bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 cursor-pointer"
                          >
                            <ExternalLink size={10} />
                            Get free API key
                          </a>
                        </div>
                        <div className="space-y-3">
                          <div className="relative group/key">
                            <input 
                              type={showKey || isHovered ? "text" : "password"} 
                              value={geminiApiKey} 
                              onChange={(e) => setGeminiApiKey(e.target.value)}
                              onMouseEnter={() => setIsHovered(true)}
                              onMouseLeave={() => setIsHovered(false)}
                              className="w-full bg-input/50 border border-border rounded-xl pl-5 pr-12 py-3.5 focus:outline-none focus:border-primary transition-all text-sm font-medium placeholder:text-muted-foreground/30 shadow-sm" 
                              placeholder="Enter your Gemini API key (starts with AIzaSy...)"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showKey || isHovered ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2">
                            <p className="text-[9px] text-muted-foreground/80 font-medium leading-relaxed max-w-sm">
                              * Note: Stored securely in your browser's local storage and encrypted using client-side obfuscation. It never leaves your device.
                            </p>
                            <button
                              type="button"
                              onClick={handleSaveApiKey}
                              disabled={savingKey}
                              className="px-4 py-2 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-primary/20 flex items-center gap-2 justify-center whitespace-nowrap self-end sm:self-center"
                            >
                              {savingKey ? (
                                <Loader2 className="animate-spin" size={10} />
                              ) : isKeySaved ? (
                                <><Check size={10} /> Saved!</>
                              ) : (
                                "Save Key"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'support' && (
                  <div className="space-y-10">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black mb-2 uppercase tracking-tight">Contact Protocol</h2>
                      <p className="text-muted-foreground text-sm font-medium">Reach out for support or connect with the developer.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Support Channels</h3>
                        <div className="space-y-4">
                          <a 
                            href="mailto:riteshprajanalt@gmail.com"
                            className="flex items-center gap-4 p-5 rounded-2xl bg-accent/30 border border-border/50 hover:bg-accent/50 transition-all group"
                          >
                            <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
                              <Mail size={20} />
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">System Support</div>
                              <div className="text-xs font-bold transition-colors group-hover:text-primary">riteshprajanalt@gmail.com</div>
                            </div>
                          </a>
                          <a 
                            href="mailto:riteshprajanalt@gmail.com"
                            className="flex items-center gap-4 p-5 rounded-2xl bg-accent/30 border border-border/50 hover:bg-accent/50 transition-all group"
                          >
                            <div className="p-3 bg-secondary/10 rounded-xl text-secondary border border-secondary/20">
                              <Mail size={20} />
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">Direct Inquiries</div>
                              <div className="text-xs font-bold transition-colors group-hover:text-secondary">riteshprajanalt@gmail.com</div>
                            </div>
                          </a>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Neural Links</h3>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { name: 'GitHub', icon: <Github size={18} />, href: 'https://github.com/ritesh-prajan', color: 'hover:text-foreground' },
                            { name: 'LinkedIn', icon: <Linkedin size={18} />, href: 'https://www.linkedin.com/in/ritesh-prajan-s/', color: 'hover:text-primary' },
                            { name: 'Instagram', icon: <Instagram size={18} />, href: 'https://instagram.com/ritesh_srp', color: 'hover:text-pink-500' },
                          ].map((social) => (
                            <a 
                              key={social.name}
                              href={social.href}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                "flex items-center justify-between p-4 rounded-xl bg-accent/20 border border-border/30 hover:bg-accent/40 transition-all group btn-touch",
                                social.color
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {social.icon}
                                <span className="text-[10px] font-black uppercase tracking-widest">{social.name}</span>
                              </div>
                              <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 flex items-start gap-4">
                      <div className="p-2 bg-primary/20 rounded-lg text-primary">
                        <Brain size={18} />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary">Neural Feedback</div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Your cognitive feedback helps optimize the ExamFlow protocol. Don't hesitate to report system anomalies or suggest architectural upgrades.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Shared Footer Actions */}
              <div className="pt-10 mt-10 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  Sync Active
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 sm:flex-none btn-primary px-10 py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed rounded-3xl shadow-2xl shadow-primary/30 text-[10px] font-black uppercase tracking-widest group"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : isSaved ? (
                      <><Check size={18} /> Committed</>
                    ) : (
                      <>Push Changes <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Mobile Sign Out */}
          <div className="lg:hidden mt-8 px-4 pb-8">
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-danger/5 text-danger border border-danger/20 transition-all font-black uppercase tracking-widest text-xs btn-touch"
            >
              <LogOut size={20} />
              Terminate Session
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
