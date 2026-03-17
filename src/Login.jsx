import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { FaEye, FaEyeSlash, FaTimes, FaGoogle, FaArrowLeft, FaInfoCircle, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { auth, db } from './firebase';
import './Login.css';
import logoImage from './assets/logo/log.png';
import logoImage2 from './assets/logo/erplogo.png'
import logoImage3 from './assets/logo/gear-wheel.gif'

// Subscription Modal Component
function SubscriptionModal({ show, onSubscribe, onClose }) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modern-modal">
        <div className="modal-header">
          <h3>Premium Subscription Required</h3>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <p>Your free trial has ended. Subscribe to continue using our services.</p>
          <div className="subscription-plans">
            <div className="plan">
              <h4>Monthly Plan</h4>
              <p className="price">$9.99/month</p>
              <ul>
                <li>Full access to all features</li>
                <li>Priority support</li>
                <li>Cancel anytime</li>
              </ul>
              <div className="subscribe-option" onClick={() => onSubscribe('monthly')}>
                Subscribe Now
              </div>
            </div>
            <div className="plan recommended">
              <div className="recommended-badge">Best Value</div>
              <h4>Annual Plan</h4>
              <p className="price">$99.99/year</p>
              <ul>
                <li>Full access to all features</li>
                <li>Priority support</li>
                <li>2 months free compared to monthly</li>
              </ul>
              <div className="subscribe-option" onClick={() => onSubscribe('annual')}>
                Subscribe Now
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Forgot Password Modal Component
function ForgotPasswordModal({ show, onClose, onSendResetEmail }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setMessage('');
      await onSendResetEmail(email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modern-modal">
        <div className="modal-header">
          <h3>Reset Password</h3>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <p>Enter your email address and we'll send you a link to reset your password.</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                id="resetEmail"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
              />
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}

            <div className="action-card" onClick={handleSubmit}>
              {isLoading ? (
                <div className="loading-spinner">
                  <span className="spinner"></span>
                  Sending...
                </div>
              ) : (
                'Send Reset Link'
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Password Validation Component
function PasswordValidation({ password }) {
  const validations = [
    {
      id: 'length',
      text: 'At least 8 characters',
      isValid: password.length >= 8
    },
    {
      id: 'uppercase',
      text: 'At least 1 uppercase letter',
      isValid: /[A-Z]/.test(password)
    },
    {
      id: 'number',
      text: 'At least 1 number',
      isValid: /[0-9]/.test(password)
    },
    {
      id: 'special',
      text: 'At least 1 special character',
      isValid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  ];

  return (
    <div className="password-validation">
      <p className="validation-title">Password must contain:</p>
      {validations.map(validation => (
        <div key={validation.id} className={`validation-item ${validation.isValid ? 'valid' : 'invalid'}`}>
          {validation.isValid ? <FaCheck className="validation-icon" /> : <FaExclamationTriangle className="validation-icon" />}
          <span>{validation.text}</span>
        </div>
      ))}
    </div>
  );
}

// Reset Password Component
function ResetPassword({ oobCode, onResetSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Verify the password reset code and get the associated email
    const verifyCode = async () => {
      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        setEmail(email);
      } catch (error) {
        setError('Invalid or expired reset link. Please request a new one.');
        console.error('Error verifying reset code:', error);
      }
    };

    verifyCode();
  }, [oobCode]);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    
    // Check for at least 1 uppercase letter
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least 1 uppercase letter';
    }
    
    // Check for at least 1 special character
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      return 'Password must contain at least 1 special character';
    }
    
    // Check for at least 1 number
    if (!/(?=.*[0-9])/.test(password)) {
      return 'Password must contain at least 1 number';
    }
    
    return null;
  };

  const validateForm = () => {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setError('');
      
      // Confirm the password reset
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage('Password reset successfully! You can now login with your new password.');
      
      // Call success callback after a delay
      setTimeout(() => {
        onResetSuccess(email, newPassword);
      }, 2000);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Failed to reset password. The link may have expired. Please request a new one.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container split-layout">
      <div className="auth-form-section">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Reset Your Password</h1>
            <p>Enter your new password below</p>
          </div>

          <div className="auth-body">
            {error && <div className="alert alert-danger">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <div className="input-with-icon">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    required
                  />
                  <span className="input-icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                {newPassword && <PasswordValidation password={newPassword} />}
              </div>

              <div className="form-group">
                <div className="input-with-icon">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmNewPassword"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    required
                  />
                  <span className="input-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>

              <div className="action-card primary" onClick={handleSubmit}>
                {isLoading ? (
                  <div className="loading-spinner">
                    <span className="spinner"></span>
                    Resetting...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="auth-info-section">
        <div className="info-content">
          <div className="logo">
            <img src={logoImage} alt="ERP Logo" />
            <h2>EXPLORATION</h2>
          </div>
          <div className="info-text">
            <p>
              ERP is the backbone of business efficiency — integrating data, people, 
              and processes into a single source of truth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [oobCode, setOobCode] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  // Check if URL contains password reset code
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const code = urlParams.get('oobCode');
    
    if (mode === 'resetPassword' && code) {
      setResetPasswordMode(true);
      setOobCode(code);
    }
  }, []);

  // Check subscription status on app load
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Check if user has active subscription
            if (!userData.subscription || userData.subscription.status !== 'active') {
              // Check if user has exceeded free trial period (15 days)
              const signupDate = localStorage.getItem('signupDate');
              if (signupDate) {
                const signupTime = parseInt(signupDate);
                const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000; // 15 days in milliseconds
                const currentTime = Date.now();
                
                if (currentTime - signupTime > fifteenDaysInMs) {
                  setShowSubscriptionModal(true);
                }
              } else {
                // First time user, set signup date
                localStorage.setItem('signupDate', Date.now().toString());
              }
            }
          }
        } else {
          // For demo purposes, check if we should show the modal based on localStorage
          const signupDate = localStorage.getItem('signupDate');
          if (signupDate) {
            const signupTime = parseInt(signupDate);
            const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;
            const currentTime = Date.now();
            
            if (currentTime - signupTime > fifteenDaysInMs) {
              setShowSubscriptionModal(true);
            }
          } else {
            localStorage.setItem('signupDate', Date.now().toString());
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    if (!resetPasswordMode) {
      checkSubscription();
    }
  }, [resetPasswordMode]);

  // Handle redirect result from Google sign-in
  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setGoogleLoading(true);
          await handleGoogleSignInResult(result);
        }
      } catch (error) {
        setGoogleLoading(false);
        handleGoogleSignInError(error);
      }
    };

    if (!resetPasswordMode) {
      handleAuthRedirect();
    }
  }, [resetPasswordMode]);

  const handleGoogleSignInResult = async (result) => {
    const user = result.user;

    if (!user) {
      navigate('/login');
      return;
    }

    // Store user details in localStorage
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userName', user.displayName || user.email.split('@')[0]);
    localStorage.setItem('userId', user.uid);
    
    // Set signup date for new users
    if (!localStorage.getItem('signupDate')) {
      localStorage.setItem('signupDate', Date.now().toString());
    }

    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      await set(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || '',
        provider: 'google',
        createdAt: new Date().toISOString(),
        role: 'user',
        branch: 'main',
        enabled: true,
        subscription: {
          status: 'trial',
          plan: 'free',
          trialEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }

    navigate('/settings');
    setGoogleLoading(false);
  };

  const handleGoogleSignInError = (error) => {
    console.error('Google sign-in error:', error);
    let errorMessage = 'Google sign-in failed. Please try again.';

    if (error.code === 'auth/account-exists-with-different-credential') {
      errorMessage = 'This email is already registered with another method.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in window was closed. Please try again.';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Google sign-in is not enabled in Firebase. Please contact support.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup was blocked. Please allow popups for this site.';
    } else if (error.code === 'auth/redirect-cancelled-by-user') {
      errorMessage = 'Sign-in was cancelled. Please try again.';
    } else if (error.code === 'auth/unauthorized-domain') {
      errorMessage = 'This domain is not authorized for Google sign-in.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your connection.';
    }

    setErrors({ form: errorMessage });
    setGoogleLoading(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setErrors({});

      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);
      await handleGoogleSignInResult(result);
    } catch (error) {
      handleGoogleSignInError(error);
    }
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    
    // Check for at least 1 uppercase letter
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least 1 uppercase letter';
    }
    
    // Check for at least 1 special character
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      return 'Password must contain at least 1 special character';
    }
    
    // Check for at least 1 number
    if (!/(?=.*[0-9])/.test(password)) {
      return 'Password must contain at least 1 number';
    }
    
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(\+\d{1,3})?\d{10,15}$/;

    if (!email) newErrors.email = 'Email is required';
    else if (!emailRegex.test(email)) newErrors.email = 'Invalid email address';

    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordError = validatePassword(password);
      if (passwordError) {
        newErrors.password = passwordError;
      }
    }

    if (isSignUp) {
      if (!firstName) newErrors.firstName = 'First name is required';
      if (!lastName) newErrors.lastName = 'Last name is required';
      if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      
      if (!phoneNumber) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!phoneRegex.test(phoneNumber)) {
        newErrors.phoneNumber = 'Please enter a valid phone number (10-15 digits)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        throw new Error('auth/user-not-found');
      }

      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userName', user.displayName || user.email.split('@')[0]);
      localStorage.setItem('userId', user.uid);
      
      if (!localStorage.getItem('signupDate')) {
        localStorage.setItem('signupDate', Date.now().toString());
      }

      navigate('/settings');
    } catch (error) {
      setIsLoading(false);
      let errorMessage = 'Login failed. Please try again.';

      switch (error.code || error.message) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Account disabled';
          break;
      }

      setErrors({ form: errorMessage });
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = ref(db, `users/${user.uid}`);
      await set(userRef, {
        uid: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
        displayName: `${firstName} ${lastName}`,
        photoURL: '',
        provider: 'email',
        createdAt: new Date().toISOString(),
        role: 'user',
        branch: 'main',
        enabled: true,
        subscription: {
          status: 'trial',
          plan: 'free',
          trialEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userName', `${firstName} ${lastName}`);
      localStorage.setItem('phoneNumber', phoneNumber);
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('signupDate', Date.now().toString());

      navigate('/settings');
    } catch (error) {
      setIsLoading(false);
      let errorMessage = 'Sign up failed. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
      }

      setErrors({ form: errorMessage });
    }
  };

  const handleSubscribe = async (plan) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        await set(userRef, {
          ...user,
          subscription: {
            status: 'active',
            plan: plan,
            subscribedAt: new Date().toISOString(),
            expiresAt: plan === 'monthly' 
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
        
        setShowSubscriptionModal(false);
        alert('Subscription successful! Thank you for your purchase.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('There was an error processing your subscription. Please try again.');
    }
  };

  const handleSendResetEmail = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setShowForgotPasswordModal(false);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      
      throw new Error(errorMessage);
    }
  };

  const handleResetSuccess = (email, newPassword) => {
    setEmail(email);
    setPassword(newPassword);
    window.history.replaceState({}, document.title, window.location.pathname);
    setResetPasswordMode(false);
    setErrors({ form: 'Password reset successfully! You can now login with your new password.' });
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);
  const toggleSignUpMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setConfirmPassword('');
  };

  // If we're in reset password mode, show the reset component
  if (resetPasswordMode) {
    return <ResetPassword oobCode={oobCode} onResetSuccess={handleResetSuccess} />;
  }

  return (
    <div className="auth-container split-layout">
      <SubscriptionModal 
        show={showSubscriptionModal}
        onSubscribe={handleSubscribe}
        onClose={() => setShowSubscriptionModal(false)}
      />
      
      <ForgotPasswordModal
        show={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onSendResetEmail={handleSendResetEmail}
      />
      
      <div className="auth-form-section">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
            <p>{isSignUp ? 'Get started with your ERP account' : 'Sign in to continue to your ERP dashboard'}</p>
          </div>

          <div className="auth-body">
            {errors.form && (
              <div className="alert alert-danger">
                {errors.form}
              </div>
            )}

            <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
              {isSignUp && (
                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      id="firstName"
                      className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      required
                    />
                    {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
                  </div>

                  <div className="form-group">
                    <input
                      type="text"
                      id="lastName"
                      className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      required
                    />
                    {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
                  </div>
                </div>
              )}

              <div className="form-group">
                <input
                  type="email"
                  id="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>

              {isSignUp && (
                <div className="form-group">
                  <input
                    type="tel"
                    id="phoneNumber"
                    className={`form-control ${errors.phoneNumber ? 'is-invalid' : ''}`}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Phone Number"
                    required
                  />
                  {errors.phoneNumber && <div className="invalid-feedback">{errors.phoneNumber}</div>}
                </div>
              )}

              <div className="form-group">
                <div className="input-with-icon">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                  />
                  <span className="input-icon" onClick={togglePasswordVisibility}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                
                {isSignUp && password && <PasswordValidation password={password} />}
                
                {!isSignUp && (
                  <div className="password-assist">
                    <span className="clickable-text" onClick={() => setShowForgotPasswordModal(true)}>
                      Forgot your password?
                    </span>
                  </div>
                )}
              </div>

              {isSignUp && (
                <div className="form-group">
                  <div className="input-with-icon">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      required
                    />
                    <span className="input-icon" onClick={toggleConfirmPasswordVisibility}>
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                  {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                </div>
              )}

              <div className="action-card primary" onClick={isSignUp ? handleSignUp : handleLogin}>
                {isLoading ? (
                  <div className="loading-spinner">
                    <span className="spinner"></span>
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </div>
            </form>

            <div className="divider">
              <span>or continue with</span>
            </div>

            <div className="social-login">
              <div className="social-option" onClick={handleGoogleSignIn}>
                <FaGoogle className="social-icon" />
                {googleLoading ? 'Signing in...' : (isSignUp ? 'Sign up with Google' : 'Sign in with Google')}
              </div>
            </div>

            <div className="auth-switch">
              <p>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"} 
                <span className="clickable-text" onClick={toggleSignUpMode}>
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-info-section">
        <div className="info-content">
          <div className="logo">
            <img src={logoImage3} alt="ERP Logo" />
            <h2>EXPLORATION</h2>
          </div>
          <div className="info-text">
            <p>
              ERP is the backbone of business efficiency — integrating data, people, 
              and processes into a single source of truth.
            </p>
          </div>
          <div className="trial-info">
            <p><strong>15-day free trial</strong> for new users</p>
            <p>Subscribe to continue after trial period</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;