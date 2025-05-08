import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import PoolFund from './components/PoolFund';
import CreatePool from './components/CreatePool';
import io from 'socket.io-client';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (token) {
      const socket = io('http://localhost:5000', {
        auth: { token },
      });
      socket.on('notification', (message) => {
        setNotifications((prev) => [...prev, message]);
        setTimeout(() => setNotifications((prev) => prev.slice(1)), 5000);
      });
      return () => socket.disconnect();
    }
  }, [token]);

  return (
    <Router>
      <div className="app">
        {notifications.map((note, index) => (
          <div key={index} className="notification">{note}</div>
        ))}
        <Switch>
          <Route exact path="/login">
            {token ? <Redirect to="/" /> : <Login setToken={setToken} />}
          </Route>
          <Route exact path="/register">
            {token ? <Redirect to="/" /> : <Register setToken={setToken} />}
          </Route>
          <Route exact path="/">
            {token ? <Dashboard token={token} setToken={setToken} /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/pools">
            {token ? <PoolFund token={token} setToken={setToken} /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/create-pool">
            {token ? <CreatePool token={token} setToken={setToken} /> : <Redirect to="/login" />}
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;