import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  School, 
  ArrowRight, 
  Github, 
  Chrome,
  AlertCircle,
  Loader2,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, handleFirestoreError, OperationType } from '@/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/types';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    college: ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (mode === 'signup') {
      const password = formData.password;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      
      if (password.length < 8 || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === 'signup') {
        // Create user in Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        const user = userCredential.user;

        // Update Auth profile
        await updateProfile(user, { displayName: formData.displayName });

        // Save to Firestore
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: formData.displayName,
          photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`,
          college: formData.college,
          onboardingCompleted: false,
          agreedToTerms: agreedToTerms,
          learningPreference: 'adaptive',
          createdAt: new Date().toISOString()
        };

        try {
          await setDoc(doc(db, 'users', user.uid), userProfile);
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.WRITE, `users/${user.uid}`);
        }
        navigate('/subjects');
      } else if (mode === 'login') {
        // Login
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        navigate('/subjects');
      } else if (mode === 'forgot-password') {
        // Forgot Password
        await sendPasswordResetEmail(auth, formData.email);
        setSuccessMessage('Password reset email sent! Please check your inbox to reset your password and then return here to sign in.');
        // Don't immediately switch back to login so they can read the message
        // setMode('login'); 
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Authentication method not enabled. Please enable Email/Password and Google in your Firebase Console.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again or create an account if you don\'t have one.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account already exists with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (!user) return;

      // Check if user exists in Firestore
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.GET, `users/${user.uid}`);
      }

      if (!userDoc?.exists()) {
        // If new user via Google, we still need college info
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`,
          college: 'Not specified', // Will be updated in onboarding or settings
          onboardingCompleted: false,
          agreedToTerms: true, // If they use Google, we can assume or ask, but for now we'll set it to keep them moving
          learningPreference: 'adaptive',
          createdAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'users', user.uid), userProfile);
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.WRITE, `users/${user.uid}`);
        }
        navigate('/subjects');
      } else {
        navigate('/subjects');
      }
    } catch (err: any) {
      console.error(err);
      // Errors are now handled by the signInWithGoogle helper's alerts, 
      // but we still show them in the UI for consistency
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-secondary/10 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-background rounded-2xl mb-6 shadow-xl shadow-primary/10 overflow-hidden border border-border/50 group">
            <img 
              src="https://i.ibb.co/JRXn4WR7/image-2026-04-19-124520735.png" 
              alt="ExamFlow Logo" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to ExamFlow</h1>
          <p className="text-muted-foreground">
            {mode === 'login' ? 'Sign in to continue your journey' : 
             mode === 'signup' ? 'Create your account to get started' : 
             'Reset your password'}
          </p>
        </div>

        <div className="glass p-8 md:p-10">
          <form onSubmit={handleAuth} className="space-y-5">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        required
                        type="text" 
                        placeholder="John Doe"
                        value={formData.displayName}
                        onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        className="w-full bg-input border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/50" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">College / University</label>
                    <div className="relative">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        required
                        type="text" 
                        placeholder="Stanford University"
                        value={formData.college}
                        onChange={(e) => setFormData({...formData, college: e.target.value})}
                        className="w-full bg-input border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/50" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  required
                  type="email" 
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-input border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/50" 
                />
              </div>
            </div>

            {mode !== 'forgot-password' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Password</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setMode('forgot-password');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-bold text-primary hover:underline uppercase tracking-widest"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input 
                    required
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-input border border-border rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/50" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl flex items-center gap-3">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-primary/10 border border-primary/20 text-primary text-sm p-4 rounded-xl flex items-center gap-3">
                <Check size={18} />
                {successMessage}
              </div>
            )}

            {mode === 'signup' && (
              <div className="flex items-start gap-3 py-2 group cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                <div className={cn(
                  "w-5 h-5 rounded-md border flex items-center justify-center transition-all mt-0.5",
                  agreedToTerms ? "bg-primary border-primary shadow-lg shadow-primary/20" : "bg-input border-border/50 group-hover:border-primary/50"
                )}>
                  {agreedToTerms && <Check size={14} className="text-primary-foreground" />}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  I agree to the <Link to="/terms" className="text-primary font-bold hover:underline" onClick={(e) => e.stopPropagation()}>Terms of Operation</Link> and <Link to="/privacy" className="text-primary font-bold hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || (mode === 'signup' && !agreedToTerms)}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:grayscale"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {mode === 'forgot-password' ? (
            <div className="mt-8 text-center space-y-4">
              <p className="text-muted-foreground text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <button 
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-primary font-bold hover:underline text-sm block w-full"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-4 text-muted-foreground font-bold tracking-widest">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex items-center justify-center gap-3 w-full py-2.5 px-4 bg-input border border-border rounded-xl hover:bg-muted transition-all text-sm font-bold shadow-sm"
                >
                  <Chrome size={18} />
                  Google
                </button>
              </div>

              <div className="mt-8 text-center">
                <p className="text-muted-foreground text-sm">
                  {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button 
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-primary font-bold hover:underline"
                  >
                    {mode === 'login' ? 'Create one now' : 'Sign in here'}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing, you acknowledge our <Link to="/terms" className="underline hover:text-primary transition-colors">Terms of Use</Link> and <Link to="/privacy" className="underline hover:text-primary transition-colors">Privacy Policy</Link>.
        </p>
      </motion.div>
    </div>
  );
}
