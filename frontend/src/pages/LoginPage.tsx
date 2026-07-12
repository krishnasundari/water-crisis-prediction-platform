import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/auth/PasswordInput";
import GoogleLoginButton from "../components/auth/GoogleLoginButton";

export default function LoginPage() {
  const navigate = useNavigate();

  const [view, setView] = useState<"login" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // OTP Reset States
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Photo Carousel States
  const carouselImages = [
    "/drought_cracked_earth.jpg",
    "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1200&q=80",
  ];
  
  const carouselCaptions = [
    {
      title: "Mitigating Drought Risks",
      desc: "Deploying machine learning models to forecast soil moisture deficits and aquifer depletion in real time."
    },
    {
      title: "Reservoir Inflow Telemetry",
      desc: "Simulating telemetry for water capacity limits, outflow, and river level gauges across crisis regions."
    },
    {
      title: "AI-Powered Action Briefs",
      desc: "Generating localized, prioritized emergency action guidelines for critical village sectors automatically."
    }
  ];
  const [slideIndex, setSlideIndex] = useState(0);

  // Ripple Animation States
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % carouselImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

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
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-6 relative"
      style={{
        backgroundImage: `url("/water_splash_bg.png")`
      }}
    >
      <style>{`
        @keyframes ripple-effect {
          0% {
            transform: translate(-50%, -50%) scale(0.1);
            opacity: 0.8;
            border-color: rgba(56, 189, 248, 0.6);
            box-shadow: 0 0 10px rgba(56, 189, 248, 0.4), inset 0 0 10px rgba(56, 189, 248, 0.2);
          }
          50% {
            border-color: rgba(56, 189, 248, 0.4);
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.3), inset 0 0 20px rgba(56, 189, 248, 0.15);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
            border-color: rgba(56, 189, 248, 0);
            box-shadow: 0 0 30px rgba(56, 189, 248, 0), inset 0 0 30px rgba(56, 189, 248, 0);
          }
        }

        .water-ripple {
          position: absolute;
          border: 2px solid rgba(56, 189, 248, 0.5);
          border-radius: 50%;
          pointer-events: none;
          transform: translate(-50%, -50%);
          animation: ripple-effect 3.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }

        .water-ripple::after {
          content: "";
          position: absolute;
          top: -6px; right: -6px; bottom: -6px; left: -6px;
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 50%;
          opacity: 0.7;
          animation: ripple-effect 3.5s cubic-bezier(0.1, 0.8, 0.3, 1) 0.6s forwards;
        }
      `}</style>

      {/* Background Blur and Dark Overlay */}
      <div className="absolute inset-0 bg-sky-950/10 backdrop-blur-[1px] z-0" />

      {/* Water Ripples Background Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
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
      
      {/* Login Card */}
      <div className="w-full max-w-7xl grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-md z-10 relative">
        
        {/* LEFT SIDE PANEL WITH SCROLLING PHOTO CAROUSEL */}
        <div className="relative hidden md:flex flex-col justify-between p-12 text-white overflow-hidden">
          {/* Background Images */}
          {carouselImages.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
                idx === slideIndex ? "opacity-100 scale-105" : "opacity-0"
              }`}
              style={{
                backgroundImage: `url(${img})`,
                transition: "opacity 1000ms ease-in-out, transform 4500ms linear",
                transform: idx === slideIndex ? "scale(1.05)" : "scale(1.0)"
              }}
            />
          ))}
          {/* Gradient & Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-950/80 z-10" />

          {/* Header Title */}
          <div className="relative z-20">
            <div className="flex items-center gap-2">
              <span className="text-3xl animate-bounce">🌊</span>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                Water Crisis Platform
              </h1>
            </div>
            <p className="text-xs text-sky-300 font-semibold tracking-widest uppercase mt-1">
              Water Crisis Management
            </p>
          </div>

          {/* Sliding Photos & Captions */}
          <div className="relative z-20 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-xl font-bold text-sky-200 transition-all duration-500">
              {carouselCaptions[slideIndex].title}
            </h3>
            <p className="text-sm opacity-90 leading-relaxed min-h-[72px] transition-all duration-500">
              {carouselCaptions[slideIndex].desc}
            </p>
            
            {/* Slide Indicators */}
            <div className="flex gap-1.5 pt-2">
              {carouselImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSlideIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === slideIndex ? "w-8 bg-sky-400" : "w-2 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Footer Text */}
          <div className="relative z-20 text-xs opacity-60">
            Satellite Link Connected • Live Decision Support
          </div>
        </div>

        {/* RIGHT SIDE AUTH ACTION CARD */}
        <div className="p-10 md:p-14 flex flex-col justify-center">
          {view === "login" && (
            <>
              <h2 className="text-4xl font-bold text-gray-800">Welcome Back 👋</h2>
              <p className="text-gray-500 mt-2 mb-8">Sign in to continue to your dashboard</p>
            </>
          )}

          {view === "forgot" && (
            <>
              <h2 className="text-4xl font-bold text-gray-800">Forgot Password? 🔑</h2>
              <p className="text-gray-500 mt-2 mb-8">Enter your registered email to receive an OTP</p>
            </>
          )}

          {view === "reset" && (
            <>
              <h2 className="text-4xl font-bold text-gray-800">Reset Password 🛡️</h2>
              <p className="text-gray-500 mt-2 mb-8">Enter the verification code and your new password</p>
            </>
          )}

          {/* Success Alerts */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 mb-5">
              {successMessage}
            </div>
          )}

          {/* Error Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {/* LOGIN VIEW FORM */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700">Password</label>
                <PasswordInput value={password} onChange={setPassword} />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  Remember Me
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="text-cyan-700 text-sm hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
                  loading ? "bg-gray-400 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-700"
                }`}
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-gray-500 text-sm">OR</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>

              <GoogleLoginButton />

              <div className="text-center">
                <p className="text-gray-600">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/signup")}
                    className="text-cyan-700 font-semibold hover:underline"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD VIEW FORM */}
          {view === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
                  loading ? "bg-gray-400 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-700"
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
                  className="text-cyan-700 font-semibold hover:underline"
                >
                  ← Back to Login
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD VIEW FORM */}
          {view === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center text-sm">
                <span className="text-gray-600">Resetting for: <strong>{email}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="text-cyan-700 hover:underline font-semibold"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700">6-Digit Verification Code (OTP)</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-center text-lg tracking-widest"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700">New Password</label>
                <PasswordInput value={newPassword} onChange={setNewPassword} />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700">Confirm New Password</label>
                <PasswordInput value={confirmPassword} onChange={setConfirmPassword} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
                  loading ? "bg-gray-400 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-700"
                }`}
              >
                {loading ? "Resetting password..." : "Reset Password"}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="text-cyan-700 font-semibold hover:underline"
                >
                  ← Cancel and Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-10 text-center text-sm text-gray-500">
            <p>Secure Authentication powered by FastAPI + JWT</p>
            <p className="mt-2">© 2026 Water Crisis Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
}