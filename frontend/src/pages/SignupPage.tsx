import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/auth/PasswordInput";

export default function SignupPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % carouselImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : import.meta.env.VITE_API_URL || (window.location.hostname.endsWith(".railway.app") ? "https://water-crisis-prediction-platform-production.up.railway.app/api/v1" : "https://water-crisis-prediction-platform-1.onrender.com/api/v1");
  };

  const handleSignup = async (e: any) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${getBaseURL()}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email,
            username,
            full_name: fullName,
            password,
            role: "government_officer",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setLoading(false);
        setError(data.detail || "Registration failed");
        return;
      }

      setSuccess("Registration Successful!");

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {

      console.error(err);
      setError("Server Error");

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
      {/* Background Blur and Dark Overlay */}
      <div className="absolute inset-0 bg-sky-950/10 backdrop-blur-[1px] z-0" />
      
      {/* Signup Card */}
      <div className="w-full max-w-7xl grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-md z-10 relative">

        {/* Left Side */}

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

        {/* Right Side */}

        <div className="p-10 md:p-14">

          <h2 className="text-4xl font-bold text-gray-800">

            Create Account 🚀

          </h2>

          <p className="text-gray-500 mt-2 mb-8">

            Join the Water Crisis Platform

          </p>

          <form
            onSubmit={handleSignup}
            className="space-y-5"
          >          {/* Full Name */}

            <div>

              <label className="block mb-2 font-medium text-gray-700">
                Full Name
              </label>

              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />

            </div>

            {/* Username */}

            <div>

              <label className="block mb-2 font-medium text-gray-700">
                Username
              </label>

              <input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />

            </div>

            {/* Email */}

            <div>

              <label className="block mb-2 font-medium text-gray-700">
                Email Address
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />

            </div>

            {/* Password */}

            <div>

              <label className="block mb-2 font-medium text-gray-700">
                Password
              </label>

              <PasswordInput
                value={password}
                onChange={setPassword}
              />

            </div>

            {/* Confirm Password */}

            <div>

              <label className="block mb-2 font-medium text-gray-700">
                Confirm Password
              </label>

              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
              />

            </div>

            {/* Error */}

            {error && (

              <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl px-4 py-3">

                {error}

              </div>

            )}

            {/* Success */}

            {success && (

              <div className="bg-green-100 border border-green-300 text-green-700 rounded-xl px-4 py-3">

                {success}

              </div>

            )}
                        {/* Register Button */}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-cyan-600 hover:bg-cyan-700"
              }`}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            {/* Divider */}

            <div className="flex items-center gap-3">

              <div className="flex-1 h-px bg-gray-300"></div>

              <span className="text-gray-500 text-sm">
                OR
              </span>

              <div className="flex-1 h-px bg-gray-300"></div>

            </div>

            {/* Already have account */}

            <div className="text-center">

              <p className="text-gray-600">

                Already have an account?{" "}

                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-cyan-700 font-semibold hover:underline"
                >
                  Login
                </button>

              </p>

            </div>

        </form>

          {/* Footer */}

          <div className="mt-10 text-center text-sm text-gray-500">

            <p>
              Secure Registration powered by FastAPI + JWT
            </p>

            <p className="mt-2">
              © 2026 Water Crisis Platform
            </p>

          </div>

        </div>

      </div>

    </div>

  );

}