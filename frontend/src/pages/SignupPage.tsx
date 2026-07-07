import { useState } from "react";
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
        "https://water-crisis-prediction-platform-1.onrender.com/api/v1/auth/register",
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

    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-sky-700 to-cyan-500 flex items-center justify-center px-6">

      <div className="w-full max-w-6xl grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-white">

        {/* Left Side */}

        <div className="hidden md:flex flex-col justify-center p-12 bg-gradient-to-br from-sky-800 to-cyan-600 text-white">

          <h1 className="text-5xl font-bold mb-6">

            🌊 Water Crisis Platform

          </h1>

          <p className="text-xl leading-9 opacity-95">

            Create your account and start monitoring
            water resources using Artificial Intelligence.

          </p>

          <div className="mt-12 space-y-5 text-lg">

            <div>💧 Smart Monitoring</div>

            <div>📊 AI Predictions</div>

            <div>🛰️ GIS Maps</div>

            <div>🤖 AI Assistant</div>

            <div>📈 Analytics Dashboard</div>

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