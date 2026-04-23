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
  Layers
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { auth, db, handleFirestoreError, OperationType } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

type SettingsTab = 'profile' | 'security' | 'preferences';

export default function Settings() {
  const navigate = useNavigate();
  const { state, updateState, setTheme, setAccentColor } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  
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
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 space-y-2">
          <h1 className="text-2xl font-bold mb-6 px-4">Settings</h1>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                activeTab === tab.id 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-border">
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-danger hover:bg-danger/5 transition-all text-sm font-medium"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="glass p-8 md:p-10"
            >
              {activeTab === 'profile' && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row items-center gap-8 pb-8 border-b border-border">
                    <div className="relative group">
                      <div 
                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                        className="w-32 h-32 rounded-full bg-accent flex items-center justify-center text-muted-foreground border-2 border-border overflow-hidden relative cursor-pointer hover:border-primary/50 transition-all shadow-inner"
                      >
                        {profile.photoURL && (
                          <img 
                            src={profile.photoURL} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
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
                              className="fixed inset-0 z-40"
                            />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-80 bg-card border border-border p-5 rounded-3xl shadow-2xl z-50"
                            >
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-t border-l border-border rotate-45" />
                              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 text-center">Choose your avatar</div>
                              <div className="grid grid-cols-4 gap-3">
                                {avatars.map((avatar, i) => (
                                  <button
                                    key={i}
                                    onClick={() => updateAvatar(avatar)}
                                    className={cn(
                                      "w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-110 active:scale-95",
                                      profile.photoURL === avatar ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/30 shadow-sm"
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
                        className="absolute bottom-0 right-0 p-2 bg-primary rounded-full border-4 border-card text-primary-foreground hover:scale-110 transition-transform z-10 shadow-lg"
                      >
                        <Camera size={16} />
                      </button>
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-2xl font-bold mb-1">{profile.displayName}</h2>
                      <p className="text-muted-foreground mb-4">{profile.email}</p>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20">Pro Member</span>
                        <span className="px-3 py-1 bg-accent text-muted-foreground text-xs font-bold rounded-full border border-border">{profile.college}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Full Name</label>
                      <input 
                        type="text" 
                        value={profile.displayName} 
                        onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                        className="w-full bg-input border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground/50 shadow-sm" 
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">College / University</label>
                      <input 
                        type="text" 
                        value={profile.college} 
                        onChange={(e) => setProfile({...profile, college: e.target.value})}
                        className="w-full bg-input border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground/50 shadow-sm" 
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input 
                          disabled
                          type="email" 
                          value={profile.email} 
                          className="w-full bg-input/50 border border-border rounded-lg pl-12 pr-4 py-3 focus:outline-none cursor-not-allowed opacity-70 text-foreground shadow-sm" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bio</label>
                      <textarea 
                        value={profile.bio}
                        onChange={(e) => setProfile({...profile, bio: e.target.value})}
                        className="w-full bg-input border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors h-24 resize-none text-foreground placeholder:text-muted-foreground/50 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold mb-2">Security & Privacy</h2>
                    <p className="text-muted-foreground text-sm">Protect your account and manage your data.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-accent rounded-xl border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Smartphone className="text-primary" size={20} />
                          <div className="font-bold">Two-Factor Authentication</div>
                        </div>
                        <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-1 rounded">Disabled</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">Add an extra layer of security to your account by requiring a code from your phone.</p>
                      <button className="btn-secondary text-sm py-2">Enable 2FA</button>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Change Password</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <input type="password" placeholder="Current Password" className="w-full bg-input border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground/50 shadow-sm" />
                        <input type="password" placeholder="New Password" className="w-full bg-input border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground/50 shadow-sm" />
                        <input type="password" placeholder="Confirm New Password" className="w-full bg-input border border-border rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground/50 shadow-sm" />
                      </div>
                      <button className="btn-primary text-sm py-2 px-6">Update Password</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold mb-2">App Preferences</h2>
                    <p className="text-muted-foreground text-sm">Customize your ExamFlow experience.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Learning Mode</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'adaptive', label: 'Adaptive Mode', desc: 'AI-driven priority based on mastery', icon: <Brain size={18} /> },
                          { id: 'sequential', label: 'Module Mode', desc: 'Step-by-step module progression', icon: <Layers size={18} /> },
                        ].map((mode) => (
                          <button 
                            key={mode.id}
                            onClick={() => setProfile({...profile, learningPreference: mode.id as 'adaptive' | 'sequential'})}
                            className={cn(
                              "p-4 rounded-xl border transition-all text-left flex flex-col gap-2",
                              profile.learningPreference === mode.id 
                                ? "bg-primary/10 border-primary/30 text-primary" 
                                : "bg-accent border-border text-muted-foreground hover:bg-accent/80"
                            )}
                          >
                            <div className="flex items-center gap-2 font-bold text-sm">
                              {mode.id === 'adaptive' ? <Brain size={16} /> : <Layers size={16} />}
                              {mode.label}
                            </div>
                            <div className="text-[10px] opacity-70 leading-tight">{mode.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Appearance</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {(['dark', 'light', 'system'] as const).map((t) => (
                          <button 
                            key={t}
                            onClick={() => setTheme(t)}
                            className={cn(
                              "p-4 rounded-xl border transition-all text-center capitalize",
                              state.theme === t 
                                ? "bg-primary/20 border-primary/40 text-primary shadow-sm" 
                                : "bg-accent border-border text-muted-foreground hover:bg-accent/80"
                            )}
                          >
                            <div className="text-sm font-bold">{t}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Theme Color</h3>
                      <div className="flex flex-wrap items-center gap-4">
                        {presetColors.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => setAccentColor(color.value)}
                            className={cn(
                              "group relative flex items-center gap-2 px-4 py-2 rounded-xl border transition-all",
                              state.accentColor === color.value 
                                ? "bg-primary/20 border-primary/40 text-primary shadow-sm" 
                                : "bg-accent border-border text-muted-foreground hover:bg-accent/80"
                            )}
                          >
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: color.value }}
                            />
                            <span className="text-sm font-bold">{color.name}</span>
                            {state.accentColor === color.value && <Check size={14} className="ml-1" />}
                          </button>
                        ))}
                        
                        <div className="flex items-center gap-3 pl-4 border-l border-border">
                          <label htmlFor="color-picker" className="text-xs font-bold text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-colors">
                            Color Wheel
                          </label>
                          <div className="relative group">
                            <input 
                              id="color-picker"
                              type="color" 
                              value={state.accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="w-10 h-10 rounded-full bg-transparent border-0 cursor-pointer overflow-hidden opacity-0 absolute inset-0 z-10"
                            />
                            <div 
                              className="w-10 h-10 rounded-full border-2 border-border shadow-xl group-hover:scale-110 transition-transform flex items-center justify-center overflow-hidden"
                              style={{ backgroundColor: state.accentColor }}
                            >
                              <div className="w-full h-full bg-gradient-to-tr from-black/20 to-white/20" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">This will update the primary accent color across the entire application.</p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Study Behavior</h3>
                      {[
                        { title: 'Auto-Focus Mode', desc: 'Automatically enter focus mode when starting a session', active: true },
                        { title: 'Sound Effects', desc: 'Play sounds for achievements and timers', active: true },
                        { title: 'Haptic Feedback', desc: 'Vibrate on mobile devices for key actions', active: false },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-accent rounded-xl border border-border">
                          <div>
                            <div className="font-bold">{item.title}</div>
                            <div className="text-xs text-muted-foreground">{item.desc}</div>
                          </div>
                          <button className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            item.active ? "bg-primary" : "bg-muted"
                          )}>
                            <div className={cn(
                              "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                              item.active ? "left-7" : "left-1"
                            )}></div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="mt-10 pt-8 border-t border-border flex items-center justify-between">
                <div className="text-sm text-muted-foreground italic">
                  Last updated: March 30, 2026
                </div>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary px-8 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : isSaved ? (
                    <><Check size={18} /> Saved</>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
