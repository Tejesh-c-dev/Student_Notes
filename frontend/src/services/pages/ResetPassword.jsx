/**
 * ResetPassword Component
 * Allows users to reset their password using a reset token
 */

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authAPI } from "../api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Extract token from URL on component mount
  useEffect(() => {
    const resetToken = searchParams.get("token");
    if (!resetToken) {
      setError("Invalid reset link. Please request a new password reset.");
    } else {
      setToken(resetToken);
    }
  }, [searchParams]);

  // Validates password strength
  const isStrongPassword = (password) => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*]/.test(password)
    );
  };

  // Handles form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!newPassword || !confirmPassword) {
      setError("Both password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setError(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character (!@#$%^&*)"
      );
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🔐 Reset Password</h1>
          <p className="text-gray-600 text-sm">Enter your new password below</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            ✅ Password reset successful! Redirecting to login...
          </div>
        )}

        {/* Error Message */}
        {error && !success && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        {!success && token && (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* New Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
              <p className="text-xs text-gray-500 mt-2">
                Must be 8+ chars with uppercase, lowercase, number, and special char (!@#$%^&*)
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Resetting..." : "Reset Password"}
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

export default ResetPassword;
