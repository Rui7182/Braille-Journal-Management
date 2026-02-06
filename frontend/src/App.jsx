import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import './App.css';

const STORAGE_KEY = 'blind_admin_user';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && (data.phone || data.username)) {
          setUser(data);
          setIsLoggedIn(true);
        }
      }
    } catch (_) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch (_) {}
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f9]">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen">
      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/*"
          element={
            isLoggedIn ? (
              <AdminPage user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </div>
  );
}

export default App;
