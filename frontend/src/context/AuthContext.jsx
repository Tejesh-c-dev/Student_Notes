import { createContext, useContext, useState, useEffect } from 'react';

// Create authentication context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Store logged-in user data
  const [user, setUser] = useState(null);

  // Track whether auth check is still loading
  const [loading, setLoading] = useState(true);

  // Run once when component mounts
  // Checks if user data exists in localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      // Restore user state from localStorage
      setUser(JSON.parse(savedUser));
    }

    // Stop loading after check completes
    setLoading(false);
  }, []);

  // Login function: sets user state + saves to localStorage
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Logout function: clears user state + removes from localStorage
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Context value exposed to entire app
  const value = {
    user,                      // current user object
    login,                     // login handler
    logout,                    // logout handler
    loading,                   // loading state
    isAuthenticated: !!user,   // boolean auth check
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Prevent rendering app until auth state is checked */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to access AuthContext safely
export const useAuth = () => {
  const context = useContext(AuthContext);

  // Ensure hook is used inside AuthProvider
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};