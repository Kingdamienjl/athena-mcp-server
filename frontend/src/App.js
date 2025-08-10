import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
axios.defaults.baseURL = API_BASE_URL;

function App() {
  const [prompt, setPrompt] = useState('');
  const [askResponse, setAskResponse] = useState('');
  const [cpuStats, setCpuStats] = useState(null);
  const [askLoading, setAskLoading] = useState(false);
  const [cpuLoading, setCpuLoading] = useState(false);
  const [askError, setAskError] = useState('');
  const [cpuError, setCpuError] = useState('');

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setAskError('Please enter a question');
      return;
    }

    setAskLoading(true);
    setAskError('');
    setAskResponse('');

    try {
      const response = await axios.post('/ask', {
        prompt: prompt.trim()
      });

      setAskResponse(response.data.response);
    } catch (error) {
      console.error('Error asking question:', error);
      setAskError(
        error.response?.data?.message || 
        error.message || 
        'Failed to get response from Athena'
      );
    } finally {
      setAskLoading(false);
    }
  };

  const handleGetCpuStats = async () => {
    setCpuLoading(true);
    setCpuError('');
    setCpuStats(null);

    try {
      const response = await axios.get('/cpu');
      setCpuStats(response.data.data);
    } catch (error) {
      console.error('Error getting CPU stats:', error);
      setCpuError(
        error.response?.data?.message || 
        error.message || 
        'Failed to get CPU statistics'
      );
    } finally {
      setCpuLoading(false);
    }
  };

  const formatCpuStats = (stats) => {
    if (!stats) return null;

    return (
      <div className="cpu-stats">
        <div className="stat-item">
          <div className="label">CPU Model</div>
          <div className="value">{stats.cpuModel}</div>
        </div>
        <div className="stat-item">
          <div className="label">CPU Count</div>
          <div className="value">{stats.cpuCount} cores</div>
        </div>
        <div className="stat-item">
          <div className="label">CPU Usage</div>
          <div className="value">{stats.cpuUsage}%</div>
        </div>
        <div className="stat-item">
          <div className="label">CPU Speed</div>
          <div className="value">{stats.cpuSpeed} MHz</div>
        </div>
        <div className="stat-item">
          <div className="label">Total Memory</div>
          <div className="value">{stats.totalMemory} GB</div>
        </div>
        <div className="stat-item">
          <div className="label">Free Memory</div>
          <div className="value">{stats.freeMemory} GB</div>
        </div>
        <div className="stat-item">
          <div className="label">System Uptime</div>
          <div className="value">{stats.uptime} hours</div>
        </div>
        <div className="stat-item">
          <div className="label">Platform</div>
          <div className="value">{stats.platform}</div>
        </div>
        <div className="stat-item">
          <div className="label">Architecture</div>
          <div className="value">{stats.architecture}</div>
        </div>
        <div className="stat-item">
          <div className="label">Hostname</div>
          <div className="value">{stats.hostname}</div>
        </div>
        <div className="stat-item">
          <div className="label">Load Average (1min)</div>
          <div className="value">{stats.loadAverage['1min'].toFixed(2)}</div>
        </div>
        <div className="stat-item">
          <div className="label">Load Average (5min)</div>
          <div className="value">{stats.loadAverage['5min'].toFixed(2)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🤖 Athena AI Assistant</h1>
          <p>Your intelligent companion for questions and system monitoring</p>
        </header>

        <div className="main-content">
          {/* Ask Question Section */}
          <div className="card">
            <h2>💬 Ask Athena</h2>
            <form onSubmit={handleAskQuestion}>
              <div className="form-group">
                <label htmlFor="prompt">Your Question:</label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask me anything..."
                  rows="4"
                  disabled={askLoading}
                />
              </div>
              <button 
                type="submit" 
                className="btn"
                disabled={askLoading || !prompt.trim()}
              >
                {askLoading ? (
                  <>
                    <span className="spinner"></span>
                    Thinking...
                  </>
                ) : (
                  'Ask Athena'
                )}
              </button>
            </form>

            {askError && (
              <div className="error">
                ❌ {askError}
              </div>
            )}

            {askResponse && (
              <div className="response-area">
                <strong>Athena's Response:</strong><br />
                {askResponse}
              </div>
            )}
          </div>

          {/* CPU Stats Section */}
          <div className="card">
            <h2>📊 System Monitor</h2>
            <button 
              onClick={handleGetCpuStats}
              className="btn"
              disabled={cpuLoading}
            >
              {cpuLoading ? (
                <>
                  <span className="spinner"></span>
                  Loading...
                </>
              ) : (
                'Get CPU Stats'
              )}
            </button>

            {cpuError && (
              <div className="error">
                ❌ {cpuError}
              </div>
            )}

            {cpuStats && (
              <div className="response-area">
                <strong>System Information:</strong>
                {formatCpuStats(cpuStats)}
              </div>
            )}
          </div>
        </div>

        <footer className="footer">
          <p>
            🚀 Powered by Node.js & React | 
            Backend: <code>{API_BASE_URL}</code> | 
            Frontend: <code>http://localhost:3000</code>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;