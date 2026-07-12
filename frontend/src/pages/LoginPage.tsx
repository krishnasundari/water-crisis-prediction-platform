import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GoogleLoginButton from "../components/auth/GoogleLoginButton";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CloudRain, 
  Waves, 
  AlertTriangle, 
  Database, 
  Clock, 
  Brain, 
  Bell, 
  LineChart 
} from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();

  const [view, setView] = useState<"login" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Reset States
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Ripple Animation States
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  useEffect(() => {
    const spawnRipple = () => {
      const newRipple = {
        id: Date.now() + Math.random(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 80 + 40,
      };
      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 3500);
    };

    spawnRipple();

    const interval = setInterval(() => {
      spawnRipple();
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  // Dynamic Base URL Resolver
  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : import.meta.env.VITE_API_URL || (window.location.hostname.endsWith(".railway.app") ? "https://water-crisis-prediction-platform-production.up.railway.app/api/v1" : "https://water-crisis-prediction-platform-1.onrender.com/api/v1");
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${getBaseURL()}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setLoading(false);
        setError(data.detail || "Invalid email or password");
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError("Unable to connect to server.");
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: any) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${getBaseURL()}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Failed to trigger reset code.");
      } else {
        setSuccessMessage(data.message || "OTP code sent to your email!");
        setView("reset");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to server.");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: any) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${getBaseURL()}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp_code: otpCode,
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Failed to reset password.");
      } else {
        setSuccessMessage("Password reset successfully! Please log in.");
        setView("login");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setOtpCode("");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to server.");
    }
    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen w-full relative flex items-center justify-center p-6 md:p-12 overflow-hidden font-sans"
      style={{
        backgroundImage: `url("https://images.unsplash.com/photo-1584467541268-b040f83be3fd?auto=format&fit=crop&w=1920&q=80")`,
        backgroundSize: 'cover',
        backgroundPosition: 'left center'
      }}
    >
      
      {/* Background Gradient Overlay: Fades the dam photo on the left into the rich blue gradient on the right */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 via-slate-950/80 to-[#072a4a] z-0" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-[#0c4a6e]/40 to-slate-950/70 z-0" />

      {/* Background Ripple Waves */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -bottom-1/4 -right-1/4 w-[80%] h-[80%] rounded-full border border-sky-500/10" />
        <div className="absolute -bottom-1/3 -right-1/3 w-[90%] h-[90%] rounded-full border border-sky-400/5" />
        <div className="absolute -top-1/4 -left-1/4 w-[70%] h-[70%] rounded-full border border-indigo-500/10" />
      </div>

      {/* Water Ripples Dynamic Background Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="water-ripple"
            style={{
              left: `${ripple.x}%`,
              top: `${ripple.y}%`,
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
            }}
          />
        ))}
      </div>

      {/* Main Split Layout Container */}
      <div className="w-full max-w-7xl grid lg:grid-cols-12 gap-12 items-center relative z-20">
        
        {/* LEFT COLUMN: Features, Map & Mission (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-8 pr-0 lg:pr-4">
          
          {/* Header & Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 p-0.5 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-sky-400" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/>
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white leading-none">Water Crisis</h1>
              <p className="text-[10px] text-sky-300 font-semibold uppercase tracking-widest mt-1.5">Prediction & Management Platform</p>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              AI-Powered. Data-Driven.<br />
              <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
                Water-Secure Future.
              </span>
            </h2>
            <p className="text-slate-300 text-sm md:text-base max-w-xl leading-relaxed">
              Predict water shortages, monitor resources, and receive AI-driven recommendations for a sustainable tomorrow.
            </p>
          </div>

          {/* Combined Features + Map Center Layout */}
          <div className="grid grid-cols-12 gap-6 items-center relative">
            
            {/* Features list (col-span-5) */}
            <div className="col-span-12 md:col-span-5 space-y-4 z-10">
              {/* Feature 1 */}
              <div className="bg-slate-950/40 border border-slate-800/60 backdrop-blur-md rounded-2xl p-4 flex gap-4 items-start transition-all hover:border-slate-700/50 hover:bg-slate-950/60">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">AI Predictions</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Advanced ML models forecast water availability and shortages.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-slate-950/40 border border-slate-800/60 backdrop-blur-md rounded-2xl p-4 flex gap-4 items-start transition-all hover:border-slate-700/50 hover:bg-slate-950/60">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Real-time Monitoring</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Live data from reservoirs, rivers, rainfall & groundwater.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-slate-950/40 border border-slate-800/60 backdrop-blur-md rounded-2xl p-4 flex gap-4 items-start transition-all hover:border-slate-700/50 hover:bg-slate-950/60">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Smart Alerts</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Early warnings for droughts, floods and critical risks.</p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-slate-950/40 border border-slate-800/60 backdrop-blur-md rounded-2xl p-4 flex gap-4 items-start transition-all hover:border-slate-700/50 hover:bg-slate-950/60">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <LineChart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Actionable Insights</h4>
                  <p className="text-xs text-slate-400 mt-0.5">AI-powered recommendations for better decision making.</p>
                </div>
              </div>
            </div>

            {/* Glowing Map center layout (col-span-7) */}
            <div className="col-span-12 md:col-span-7 relative h-[380px] flex items-center justify-center">
              
              {/* Glowing India Map SVG */}
              <div className="absolute inset-0 flex items-center justify-center opacity-90 pointer-events-none">
                <svg className="w-[85%] h-[85%] text-sky-400/40 drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 400 450">
                  <path d="M190,40 L220,50 L230,80 L250,90 L260,110 L250,130 L270,140 L290,120 L310,140 L290,160 L280,180 L290,200 L270,220 L260,250 L270,270 L250,290 L230,300 L200,320 L195,350 L190,380 L185,410 L180,430 L170,410 L155,370 L140,340 L135,310 L125,290 L110,280 L120,260 L115,240 L100,230 L80,220 L70,200 L85,185 L95,190 L110,180 L130,195 L145,190 L160,180 L155,160 L140,145 L150,135 L165,140 L180,130 L170,110 L155,95 L165,70 L180,55 Z" strokeDasharray="4,4" />
                  <circle cx="190" cy="150" r="6" fill="#38bdf8" className="animate-ping" />
                  <circle cx="190" cy="150" r="3.5" fill="#38bdf8" />
                  <circle cx="150" cy="280" r="6" fill="#38bdf8" className="animate-ping" />
                  <circle cx="150" cy="280" r="3.5" fill="#38bdf8" />
                  <circle cx="250" cy="220" r="6" fill="#38bdf8" className="animate-ping" />
                  <circle cx="250" cy="220" r="3.5" fill="#38bdf8" />
                </svg>
              </div>

              {/* Floating Telemetry Glass Cards */}
              {/* 1. Rainfall (Top Right) */}
              <div className="absolute top-2 right-4 bg-slate-950/75 backdrop-blur-lg border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xl transition-all hover:scale-105">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <CloudRain className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Rainfall (Today)</p>
                  <h4 className="text-base font-bold text-white">24.6 mm</h4>
                  <p className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">↑ 12% from yesterday</p>
                </div>
              </div>

              {/* 2. Reservoir Storage (Middle Right) */}
              <div className="absolute top-36 right-8 bg-slate-950/75 backdrop-blur-lg border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xl transition-all hover:scale-105">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Reservoir Storage</p>
                  <h4 className="text-base font-bold text-white">68.7%</h4>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold">Healthy</span>
                </div>
              </div>

              {/* 3. Risk Level (Bottom Right) */}
              <div className="absolute bottom-4 right-12 bg-slate-950/75 backdrop-blur-lg border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xl transition-all hover:scale-105">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Risk Level</p>
                  <h4 className="text-base font-bold text-amber-400">Moderate</h4>
                  <p className="text-[9px] text-slate-350">West Godavari</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Card */}
          <div className="bg-slate-950/40 border border-slate-800/60 backdrop-blur-md p-5 rounded-2xl flex items-center gap-4 transition-all hover:bg-slate-950/50 max-w-2xl">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-sky-400" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-sky-400 text-sm">Our Mission</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">Empowering communities and governments with intelligent insights for a water-secure and resilient future.</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Floating Login Card (5 cols) */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          
          <div className="w-full max-w-md bg-white text-slate-800 rounded-[32px] shadow-2xl p-8 md:p-10 relative border border-slate-200/50 flex flex-col justify-between z-20">
            
            <div>
              {/* Circular Droplet Badge */}
              <div className="mx-auto w-14 h-14 rounded-full bg-blue-50/80 flex items-center justify-center border border-blue-100 shadow-inner mb-5">
                <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-blue-500" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/>
                </svg>
              </div>

              {/* Title Headers */}
              {view === "login" && (
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-extrabold text-slate-900">Welcome Back!</h3>
                  <p className="text-slate-400 text-xs mt-1">Sign in to continue to your dashboard</p>
                </div>
              )}

              {view === "forgot" && (
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-extrabold text-slate-900">Forgot Password?</h3>
                  <p className="text-slate-400 text-xs mt-1">Enter registered email to receive verification OTP</p>
                </div>
              )}

              {view === "reset" && (
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-extrabold text-slate-900">Reset Password</h3>
                  <p className="text-slate-400 text-xs mt-1">Enter the 6-digit OTP code and new password</p>
                </div>
              )}

              {/* Success/Error Alerts */}
              {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-xs mb-5 font-semibold">
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs mb-5 font-semibold">
                  {error}
                </div>
              )}

              {/* LOGIN FORM */}
              {view === "login" && (
                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-5 h-5" />
                      </span>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 transition-all placeholder:text-slate-400 text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-5 h-5" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 transition-all placeholder:text-slate-400 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 transition-all"
                      >
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 text-slate-500 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot");
                        setError("");
                        setSuccessMessage("");
                      }}
                      className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 ${
                      loading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/10"
                    }`}
                  >
                    <span>{loading ? "Logging in..." : "Login"}</span>
                    {!loading && <ArrowRight className="w-4.5 h-4.5" />}
                  </button>

                  {/* OR Divider */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>

                  {/* Google Sign In */}
                  <div className="flex justify-center">
                    <GoogleLoginButton />
                  </div>

                  {/* Signup Link */}
                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-500 font-medium">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/signup")}
                        className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                      >
                        Create Account
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* FORGOT PASSWORD FORM */}
              {view === "forgot" && (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-5 h-5" />
                      </span>
                      <input
                        type="email"
                        placeholder="Enter your registered email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 transition-all placeholder:text-slate-400 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 ${
                      loading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/10"
                    }`}
                  >
                    {loading ? "Sending OTP..." : "Send OTP Code"}
                  </button>

                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setView("login");
                        setError("");
                        setSuccessMessage("");
                      }}
                      className="text-blue-600 font-bold text-xs hover:underline"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              )}

              {/* RESET PASSWORD FORM */}
              {view === "reset" && (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200/50 flex justify-between items-center text-xs">
                    <span className="text-slate-600">Resetting for: <strong>{email}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot");
                        setError("");
                        setSuccessMessage("");
                      }}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Change
                    </button>
                  </div>

                  {/* OTP */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">6-Digit Verification Code (OTP)</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-lg tracking-widest bg-white"
                      required
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-5 h-5" />
                      </span>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password (min. 8 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 transition-all placeholder:text-slate-400 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-5 h-5" />
                      </span>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 transition-all placeholder:text-slate-400 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 ${
                      loading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/10"
                    }`}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>

                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot");
                        setError("");
                        setSuccessMessage("");
                      }}
                      className="text-blue-600 font-bold text-xs hover:underline"
                    >
                      ← Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Bottom Metrics inside Card */}
            <div className="grid grid-cols-3 gap-2.5 border-t border-slate-200/60 pt-5 mt-5">
              <div className="bg-slate-100/50 border border-slate-200/30 p-2 rounded-2xl text-center flex flex-col items-center justify-center">
                <div className="w-7 h-7 rounded-lg bg-blue-100/60 text-blue-500 flex items-center justify-center mb-1 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <span className="text-xs font-extrabold text-slate-800 leading-none">650+</span>
                <span className="text-[8px] text-slate-400 font-semibold mt-1 leading-none">Stations</span>
              </div>
              <div className="bg-slate-100/50 border border-slate-200/30 p-2 rounded-2xl text-center flex flex-col items-center justify-center">
                <div className="w-7 h-7 rounded-lg bg-teal-100/60 text-teal-500 flex items-center justify-center mb-1 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-extrabold text-slate-800 leading-none">24/7</span>
                <span className="text-[8px] text-slate-400 font-semibold mt-1 leading-none">Live Data</span>
              </div>
              <div className="bg-slate-100/50 border border-slate-200/30 p-2 rounded-2xl text-center flex flex-col items-center justify-center">
                <div className="w-7 h-7 rounded-lg bg-indigo-100/60 text-indigo-500 flex items-center justify-center mb-1 shrink-0">
                  <Brain className="w-4 h-4" />
                </div>
                <span className="text-xs font-extrabold text-slate-800 leading-none">AI</span>
                <span className="text-[8px] text-slate-400 font-semibold mt-1 leading-none">Predictions</span>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Footer copyright below floating card */}
      <div className="absolute bottom-4 right-6 lg:right-16 text-slate-400 text-[10px] font-medium z-20">
        © 2025 Water Crisis Platform. All rights reserved.
      </div>
    </div>
  );
}