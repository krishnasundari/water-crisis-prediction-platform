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
  Brain, 
  Activity, 
  ShieldAlert, 
  Satellite, 
  Compass, 
  TrendingUp
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
    <div className="h-screen w-screen flex flex-row overflow-hidden font-sans text-white bg-slate-950 select-none">
      
      {/* LEFT SECTION (65%): Cinematic Command Center GIS & Live Intelligence */}
      <div 
        className="relative w-[65%] h-full flex flex-col justify-between p-12 overflow-hidden shrink-0 border-r border-[#00B4D8]/20"
        style={{
          backgroundImage: `url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Soft Digital & GIS Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-[#001F3F]/90 z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F4C81]/25 via-transparent to-slate-950/80 z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,180,216,0.15),transparent_60%)] z-0" />

        {/* Live GIS Grid Line Overlay */}
        <div 
          className="absolute inset-0 z-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #00B4D8 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Water Ripples Dynamic Overlay */}
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

        {/* TOP PANEL: Logo & Title Header */}
        <div className="flex items-center gap-4 relative z-20">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F4C81] to-[#00B4D8] p-0.5 flex items-center justify-center shadow-lg shadow-[#00B4D8]/20">
            <div className="w-full h-full bg-[#001F3F] rounded-[14px] flex items-center justify-center">
              <Satellite className="w-7 h-7 text-[#00B4D8] animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white leading-none">AI Disaster Decision Support System</h1>
            <p className="text-xs text-[#00B4D8] font-bold uppercase tracking-widest mt-1.5">National Disaster Intelligence Platform</p>
          </div>
        </div>

        {/* CENTER CONTENT: Headlines & Floating Dashboard Cards */}
        <div className="relative z-20 my-auto grid grid-cols-12 gap-8 items-center">
          
          {/* Main Titles (col-span-5) */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="px-3.5 py-1 rounded-full bg-[#00B4D8]/10 border border-[#00B4D8]/30 text-xs font-bold text-[#00B4D8] uppercase tracking-wider">
                Command & Control Active
              </span>
              <h2 className="text-5xl font-black tracking-tight text-white leading-tight">
                AI-Powered.<br />
                <span className="bg-gradient-to-r from-[#00B4D8] via-[#0096C7] to-teal-300 bg-clip-text text-transparent">
                  Data-Driven.
                </span>
              </h2>
            </div>
            <p className="text-slate-300 text-base leading-relaxed">
              Real-time intelligence platform designed for Prime Minister, Chief Ministers, and Disaster Management Authorities (NDMA) to monitor live weather, reservoirs, and rivers during national emergencies.
            </p>

            {/* Quick Status Badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-[#001F3F]/40 border border-[#00B4D8]/25 p-3.5 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00B4D8]/10 text-[#00B4D8] flex items-center justify-center shrink-0">
                  <Activity className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Telemetry</p>
                  <p className="text-xs font-extrabold text-white">Live Feed Active</p>
                </div>
              </div>
              <div className="bg-[#001F3F]/40 border border-[#00B4D8]/25 p-3.5 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">AI Risk</p>
                  <p className="text-xs font-extrabold text-emerald-400">Monitoring Level</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive GIS holographic India map with Telemetry overlays (col-span-7) */}
          <div className="col-span-12 lg:col-span-7 relative h-[480px] flex items-center justify-center">
            
            {/* Holographic India Map Graphic */}
            <div className="absolute inset-0 flex items-center justify-center opacity-85 pointer-events-none">
              <svg className="w-[85%] h-[85%] text-[#00B4D8]/30 drop-shadow-[0_0_20px_rgba(0,180,216,0.35)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 400 450">
                <path d="M190,40 L220,50 L230,80 L250,90 L260,110 L250,130 L270,140 L290,120 L310,140 L290,160 L280,180 L290,200 L270,220 L260,250 L270,270 L250,290 L230,300 L200,320 L195,350 L190,380 L185,410 L180,430 L170,410 L155,370 L140,340 L135,310 L125,290 L110,280 L120,260 L115,240 L100,230 L80,220 L70,200 L85,185 L95,190 L110,180 L130,195 L145,190 L160,180 L155,160 L140,145 L150,135 L165,140 L180,130 L170,110 L155,95 L165,70 L180,55 Z" strokeDasharray="5,5" />
                {/* Neural Network Nodes */}
                <line x1="190" y1="150" x2="150" y2="280" stroke="rgba(0,180,216,0.3)" strokeWidth="1.5" />
                <line x1="190" y1="150" x2="250" y2="220" stroke="rgba(0,180,216,0.3)" strokeWidth="1.5" />
                <line x1="150" y1="280" x2="250" y2="220" stroke="rgba(0,180,216,0.3)" strokeWidth="1.5" />
                <circle cx="190" cy="150" r="7" fill="#00B4D8" className="animate-ping" />
                <circle cx="190" cy="150" r="4.5" fill="#00B4D8" />
                <circle cx="150" cy="280" r="7" fill="#00B4D8" className="animate-ping" />
                <circle cx="150" cy="280" r="4.5" fill="#00B4D8" />
                <circle cx="250" cy="220" r="7" fill="#00B4D8" className="animate-ping" />
                <circle cx="250" cy="220" r="4.5" fill="#00B4D8" />
              </svg>
            </div>

            {/* FLOATING TELEMETRY CARDS */}
            {/* 1. Weather Monitoring */}
            <div className="absolute top-2 left-6 bg-slate-950/75 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xl transition-all hover:scale-105 min-w-[200px]">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Weather GIS</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <h4 className="text-2xl font-black text-[#00B4D8]">29°C</h4>
                <div className="text-[10px] text-slate-350 font-semibold space-y-0.5">
                  <p>Humidity: 91%</p>
                  <p>Wind: 14 km/h</p>
                </div>
              </div>
            </div>

            {/* 2. Rainfall Indicator */}
            <div className="absolute top-24 right-4 bg-slate-950/75 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xl transition-all hover:scale-105">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <CloudRain className="w-5.5 h-5.5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Live Rainfall</p>
                <h4 className="text-lg font-black text-white">226 mm</h4>
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-black uppercase tracking-wider">Heavy Rain</span>
              </div>
            </div>

            {/* 3. Reservoir Storage Telemetry */}
            <div className="absolute top-1/2 left-2 bg-slate-950/75 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-4 flex flex-col gap-2 shadow-2xl transition-all hover:scale-105">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                  <Waves className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Reservoir Telemetry</p>
                  <h4 className="text-xs font-black text-white">Srisailam Reservoir</h4>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 mt-1">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Storage</p>
                  <p className="text-sm font-black text-teal-400">94%</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Overflow Risk</p>
                  <span className="text-[9px] font-black text-red-500 uppercase">High Risk</span>
                </div>
              </div>
            </div>

            {/* 4. Godavari River Levels */}
            <div className="absolute bottom-28 right-2 bg-slate-950/75 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-4 flex flex-col gap-2 shadow-2xl transition-all hover:scale-105">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">River Monitoring</p>
                  <h4 className="text-xs font-black text-white">Godavari River</h4>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 mt-1 border-t border-slate-800/40 pt-2">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">River Level</p>
                  <p className="text-sm font-black text-red-400">12.6 m</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Danger Level</p>
                  <p className="text-[10px] font-extrabold text-slate-300">11.8 m</p>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-black uppercase self-end">Critical</span>
              </div>
            </div>

            {/* 5. AI Flood Prediction Card */}
            <div className="absolute bottom-2 left-16 bg-slate-950/75 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-4 flex flex-col gap-2 shadow-2xl transition-all hover:scale-105 min-w-[220px]">
              <div className="flex items-center gap-2 text-[#00B4D8]">
                <Brain className="w-5 h-5 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">AI Flood Prediction</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">AI Risk</p>
                  <p className="text-base font-black text-white">96%</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Confidence</p>
                  <p className="text-base font-black text-[#00B4D8]">98%</p>
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-500/25 p-2 rounded-xl text-center mt-1">
                <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider">Expected Flood: Within 8 Hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM PANEL: National Control Room Specs Footer */}
        <div className="border-t border-[#00B4D8]/20 pt-6 flex flex-row items-center justify-between relative z-20">
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#00B4D8]" />
              <span>GIS Layer Active</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>SDRF/NDRF Feeds Linked</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            GOVT DATA ENCRYPTED KEY: C-3928-DSS
          </div>
        </div>
      </div>

      {/* RIGHT HALF (35%): White Premium Secure Authorization Portal */}
      <div className="w-[35%] h-full bg-[#001F3F] bg-gradient-to-br from-[#001F3F] via-[#0F4C81] to-[#001F3F] flex items-center justify-center p-8 overflow-y-auto shrink-0 relative z-20">
        
        {/* Subtle curve rings on the right half */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute -bottom-1/4 -right-1/4 w-[90%] h-[90%] rounded-full border border-[#00B4D8]/5" />
          <div className="absolute -top-1/4 -right-1/4 w-[70%] h-[70%] rounded-full border border-[#00B4D8]/5" />
        </div>

        {/* White Premium Card (Max width 460px, rounded-2xl / 18px border radius) */}
        <div className="w-full max-w-[460px] bg-white text-slate-800 rounded-[18px] shadow-2xl p-8 border border-slate-200/50 flex flex-col justify-between z-10 my-auto">
          
          <div>
            {/* Logo Badge */}
            <div className="mx-auto w-14 h-14 rounded-full bg-[#0F4C81]/10 flex items-center justify-center border border-[#0F4C81]/25 mb-5 shadow-inner">
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#0f4c81]" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/>
              </svg>
            </div>

            {/* Title Headers */}
            {view === "login" && (
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Disaster Decision Support</h3>
                <p className="text-slate-400 text-xs mt-1">Secure access to the National Disaster Intelligence Platform</p>
              </div>
            )}

            {view === "forgot" && (
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Forgot Password?</h3>
                <p className="text-slate-400 text-xs mt-1">Enter registered email to receive verification OTP</p>
              </div>
            )}

            {view === "reset" && (
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Reset Password</h3>
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
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0F4C81]">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/30 focus:border-[#0F4C81] text-slate-800 transition-all placeholder:text-slate-400 text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0F4C81]">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/30 focus:border-[#0F4C81] text-slate-800 transition-all placeholder:text-slate-400 text-sm"
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
                      className="rounded border-slate-300 text-[#0F4C81] focus:ring-[#0F4C81]"
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
                    className="text-[#0F4C81] hover:text-[#0096C7] font-bold hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 ${
                    loading ? "bg-slate-450 cursor-not-allowed" : "bg-[#0F4C81] hover:bg-[#0096C7] shadow-lg shadow-[#0F4C81]/15"
                  }`}
                >
                  <span>{loading ? "Authorizing..." : "Secure Login"}</span>
                  {!loading && <ArrowRight className="w-4.5 h-4.5" />}
                </button>

                {/* OR Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">OR</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                {/* Google Sign In */}
                <div className="flex justify-center py-1">
                  <GoogleLoginButton />
                </div>

                {/* Signup Link */}
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500 font-medium">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/signup")}
                      className="text-[#0F4C81] hover:text-[#0096C7] font-bold hover:underline"
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
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0F4C81]">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      type="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/30 focus:border-[#0F4C81] text-slate-800 transition-all placeholder:text-slate-400 text-sm"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 ${
                    loading ? "bg-slate-450 cursor-not-allowed" : "bg-[#0F4C81] hover:bg-[#0096C7] shadow-lg shadow-[#0F4C81]/15"
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
                    className="text-[#0F4C81] font-bold text-xs hover:underline"
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
                    className="text-[#0F4C81] hover:underline font-bold"
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
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0F4C81] font-mono text-center text-lg tracking-widest bg-white"
                    required
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0F4C81]">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password (min. 8 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/30 focus:border-[#0F4C81] text-slate-800 transition-all placeholder:text-slate-400 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650"
                    >
                      {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0F4C81]">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/30 focus:border-[#0F4C81] text-slate-800 transition-all placeholder:text-slate-400 text-sm"
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
                    loading ? "bg-slate-450 cursor-not-allowed" : "bg-[#0F4C81] hover:bg-[#0096C7] shadow-lg shadow-[#0F4C81]/15"
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
                    className="text-[#0F4C81] font-bold text-xs hover:underline"
                  >
                    ← Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Secure Platform Footer Credits */}
          <div className="border-t border-slate-100 pt-5 mt-6 text-center">
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Secured using FastAPI + JWT + Google OAuth + Enterprise Security
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}