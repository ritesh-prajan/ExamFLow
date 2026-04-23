import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Calendar, Clock, Check, ChevronRight, ChevronLeft, X, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { parseSyllabus } from '@/services/geminiService';
import { extractTextFromPdf } from '@/lib/pdfUtils';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { Subject } from '../types';

export default function Onboarding() {
  const navigate = useNavigate();
  const { state, updateState } = useApp();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    displayName: state.user?.displayName || '',
    college: state.user?.college || '',
    photoURL: state.user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${state.user?.uid || 'default'}`
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [manualText, setManualText] = useState('');
  const [examDate, setExamDate] = useState('2026-04-13');
  const [dailyHours, setDailyHours] = useState(2);
  const [subjectName, setSubjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleFinishOnboarding = async () => {
    if (!state.user) return;
    setIsFinishing(true);
    try {
      const userRef = doc(db, 'users', state.user.uid);
      
      // Create the subject in Firestore
      const subjectId = crypto.randomUUID();
      const subjectRef = doc(db, 'users', state.user.uid, 'subjects', subjectId);
      
      const newSubject: Subject = {
        id: subjectId,
        name: subjectName || 'Custom Subject',
        examDate: examDate,
        dailyHours: dailyHours,
        createdAt: new Date().toISOString(),
        userId: state.user.uid
      };

      await setDoc(subjectRef, newSubject);

      // Create topics in Firestore
      const topicPromises = state.topics.map(topic => {
        const topicRef = doc(db, 'users', state.user!.uid, 'subjects', subjectId, 'topics', topic.id);
        return setDoc(topicRef, {
          ...topic,
          subjectId,
          userId: state.user!.uid
        });
      });
      await Promise.all(topicPromises);

      await updateDoc(userRef, {
        onboardingCompleted: true,
        displayName: profile.displayName,
        college: profile.college,
        photoURL: profile.photoURL,
        selectedSubjectId: subjectId
      });
      
      updateState({
        user: { 
          ...state.user, 
          onboardingCompleted: true,
          displayName: profile.displayName,
          college: profile.college,
          photoURL: profile.photoURL,
          selectedSubjectId: subjectId
        },
        selectedSubjectId: subjectId
      });
      
      navigate('/assessment');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}`);
    } finally {
      setIsFinishing(false);
    }
  };

  const avatars = [
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Felix`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Max`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Luna`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Maya`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Leo`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe`,
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileInfo({
      name: file.name,
      size: formatFileSize(file.size)
    });
    setIsAnalyzing(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 5;
      });
    }, 100);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else {
        // For other files, use a placeholder or basic text read
        text = await file.text();
      }

      setUploadProgress(100);
      clearInterval(progressInterval);
      
      const result = await parseSyllabus(text);
      updateState({
        topics: result.topics,
        modules: result.modules
      });
      setSubjectName(result.subject);
      nextStep();
    } catch (error) {
      console.error("Failed to parse syllabus:", error);
      nextStep();
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(0);
      setFileInfo(null);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await parseSyllabus(manualText);
      updateState({
        topics: result.topics,
        modules: result.modules
      });
      setSubjectName(result.subject);
      setShowManualInput(false);
      nextStep();
    } catch (error) {
      console.error("Failed to parse manual text:", error);
      nextStep();
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center">
      {/* Progress Bar */}
      <div className="w-full max-w-2xl mb-12">
        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                step >= i ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
              )}
            >
              {step > i ? <Check size={16} /> : i}
            </div>
          ))}
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${(step - 1) * 25}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full max-w-2xl"
        >
          {step === 1 && (
            <div className="glass p-10">
              <h2 className="text-3xl font-bold mb-4 text-center">Setup Your Profile</h2>
              <p className="text-muted-foreground mb-8 text-center">Choose an avatar and confirm your details.</p>
              
              <div className="space-y-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative group">
                    <div 
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="w-32 h-32 rounded-full bg-accent border-4 border-primary/20 overflow-hidden relative cursor-pointer hover:border-primary/50 transition-all shadow-xl"
                    >
                      {profile.photoURL && (
                        <img 
                          src={profile.photoURL} 
                          alt="Avatar" 
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
                            className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-72 bg-popover/90 backdrop-blur-xl border border-border p-4 rounded-2xl shadow-2xl z-50 grid grid-cols-4 gap-3"
                          >
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-popover border-t border-l border-border rotate-45" />
                            {avatars.map((avatar, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setProfile({ ...profile, photoURL: avatar });
                                  setShowAvatarPicker(false);
                                }}
                                className={cn(
                                  "w-full aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-110 active:scale-95",
                                  profile.photoURL === avatar ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                                )}
                              >
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
 
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white border-2 border-card pointer-events-none shadow-lg">
                      <Plus size={16} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Click photo to change avatar</p>
                </div>
 
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Full Name</label>
                    <input 
                      type="text" 
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      placeholder="Enter your name"
                      className="w-full bg-accent border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">College / University</label>
                    <input 
                      type="text" 
                      value={profile.college}
                      onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                      placeholder="Enter your college"
                      className="w-full bg-accent border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all text-foreground"
                    />
                  </div>
                </div>

                <button 
                  onClick={nextStep}
                  disabled={!profile.displayName || !profile.college}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Continue <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="glass p-10 text-center relative">
              {showManualInput ? (
                <div className="text-left">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Paste Your Syllabus</h2>
                    <button onClick={() => setShowManualInput(false)} className="text-muted-foreground hover:text-foreground">
                      <X size={20} />
                    </button>
                  </div>
                  <textarea 
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Paste your topics, modules, or full syllabus text here..."
                    className="w-full h-64 bg-accent border border-border rounded-xl p-4 focus:outline-none focus:border-primary transition-all mb-6 resize-none text-foreground"
                  />
                  <button 
                    onClick={handleManualSubmit}
                    disabled={isAnalyzing || !manualText.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Parsing...</> : 'Analyze Topics'}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold mb-4">Upload Portion Sheet</h2>
                  <p className="text-muted-foreground mb-8">Upload your syllabus to let ExamFlow build your topic list.</p>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt,image/*"
                  />
                  
                  <div 
                    onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-border rounded-2xl p-12 transition-all cursor-pointer group ${
                      isAnalyzing ? 'cursor-default' : 'hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 relative">
                          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                          <motion.div 
                            className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          ></motion.div>
                          <FileText className="text-primary" size={24} />
                        </div>
                        
                        <div className="w-full max-w-sm">
                          <div className="flex justify-between items-end mb-2">
                            <div className="text-left">
                              <p className="font-bold text-foreground truncate max-w-[200px]">{fileInfo?.name}</p>
                              <p className="text-xs text-muted-foreground">{fileInfo?.size}</p>
                            </div>
                            <p className="text-primary font-bold">{uploadProgress}%</p>
                          </div>
                          
                          <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                            <motion.div 
                              className="h-full bg-primary"
                              initial={{ width: '0%' }}
                              animate={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          
                          <p className="text-muted-foreground text-sm animate-pulse">
                            {uploadProgress < 100 ? 'Uploading and extracting text...' : 'AI is analyzing your syllabus structure...'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto mb-4 text-muted-foreground group-hover:text-primary transition-colors" size={48} />
                        <p className="text-lg font-medium mb-2">Drag and drop your syllabus here</p>
                        <p className="text-sm text-muted-foreground">Supports PDF, DOCX, TXT, and Images</p>
                      </>
                    )}
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-border">
                    <button 
                      onClick={() => setShowManualInput(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Or paste your topic list manually
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="glass p-10 text-center">
              <h2 className="text-3xl font-bold mb-4">Upload Past Papers</h2>
              <p className="text-muted-foreground mb-8">Upload previous question papers for smarter prioritization.</p>
              
              <div className="border-2 border-dashed border-border rounded-2xl p-12 hover:border-secondary/50 hover:bg-secondary/5 transition-all cursor-pointer group mb-8">
                <FileText className="mx-auto mb-4 text-muted-foreground group-hover:text-secondary transition-colors" size={48} />
                <p className="text-lg font-medium mb-2">Drag and drop past papers (optional)</p>
                <p className="text-sm text-muted-foreground">This helps AI identify high-yield topics</p>
              </div>

              <div className="flex gap-4">
                <button onClick={prevStep} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <ChevronLeft size={20} /> Back
                </button>
                <button onClick={nextStep} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Continue <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="glass p-10">
              <h2 className="text-3xl font-bold mb-4 text-center">Exam Details</h2>
              <p className="text-muted-foreground mb-8 text-center">Tell us about your schedule and current progress.</p>
              
              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Exam Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input 
                      type="date" 
                      className="w-full bg-accent border border-border rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:border-primary transition-colors text-foreground"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground">Daily Available Hours</label>
                    <span className="text-primary font-bold">{dailyHours} hours</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    step="1"
                    value={dailyHours}
                    onChange={(e) => {
                      setDailyHours(parseInt(e.target.value) || 1);
                    }}
                    className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-3">Topics already covered</label>
                  <div className="flex flex-wrap gap-2">
                    {state.topics.slice(0, 5).map(topic => (
                      <button 
                        key={topic.id}
                        className="px-4 py-2 rounded-full bg-accent border border-border text-xs font-medium hover:bg-primary/20 hover:border-primary/50 transition-all"
                      >
                        {topic.name}
                      </button>
                    ))}
                    <button className="px-4 py-2 rounded-full bg-accent/50 border border-border text-xs italic text-muted-foreground">
                      + 19 more detected
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button onClick={prevStep} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <ChevronLeft size={20} /> Back
                </button>
                <button onClick={nextStep} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Continue <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="glass p-10">
              <h2 className="text-3xl font-bold mb-4 text-center">Ready to Start?</h2>
              <p className="text-muted-foreground mb-8 text-center">Here's a summary of your study plan.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-accent/50 p-4 rounded-xl border border-border">
                  <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">Subject</div>
                  <div className="font-bold">{subjectName || profile.college}</div>
                </div>
                <div className="bg-accent/50 p-4 rounded-xl border border-border">
                  <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">Modules</div>
                  <div className="font-bold">{state.modules.length} Modules</div>
                </div>
                <div className="bg-accent/50 p-4 rounded-xl border border-border">
                  <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">Days Left</div>
                  <div className="font-bold">14 Days</div>
                </div>
                <div className="bg-accent/50 p-4 rounded-xl border border-border">
                  <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">Daily Target</div>
                  <div className="font-bold">{dailyHours} Hours</div>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 p-6 rounded-xl text-center mb-8">
                <div className="text-primary text-sm font-bold uppercase tracking-widest mb-2">Estimated Effort</div>
                <div className="text-4xl font-bold">56 Hours</div>
                <div className="text-muted-foreground text-sm mt-2">Total study time needed for 100% coverage</div>
              </div>

              <div className="flex gap-4">
                <button onClick={prevStep} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <ChevronLeft size={20} /> Back
                </button>
                <button 
                  onClick={handleFinishOnboarding} 
                  disabled={isFinishing}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isFinishing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>Start Assessment <ChevronRight size={20} /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
