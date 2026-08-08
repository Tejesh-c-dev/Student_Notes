/**
 * ForgotPassword Component
 * Allows users to request a password reset link
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Handles form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Email is required");
      return;
    }

    try {
      setLoading(true);
      await authAPI.forgotPassword(email);
      setSuccess(true);
      setEmail("");
      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🔑 Forgot Password?</h1>
          <p className="text-gray-600 text-sm">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            ✅ If an account exists with this email, you'll receive a reset link shortly.
            Check your browser console for the reset link (development mode).
            Redirecting to login...
          </div>
        )}

        {/* Error Message */}
        {error && !success && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        {!success && (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="text-center border-t border-gray-200 pt-6 mt-6">
          <Link
            to="/login"
            className="text-indigo-600 hover:text-indigo-700 font-medium transition hover:underline"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
