import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GameSelector from './components/GameSelector';
import GameView from './components/GameView';
import Login from './components/Login';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/user`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get(`${API_URL}/auth/logout`, {
        withCredentials: true
      });
      setUser(null);
      setSelectedGame(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (selectedGame) {
    return (
      <GameView
        channelId={selectedGame}
        user={user}
        onBack={() => setSelectedGame(null)}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Naval Command</h1>
        <div className="user-info">
          <span>Welcome, {user.username}</span>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>
      <GameSelector
        user={user}
        onSelectGame={setSelectedGame}
      />
    </div>
  );
}

export default App;
