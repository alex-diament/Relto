import React from 'react';

import 'leaflet/dist/leaflet.css';
import ReactDOM from 'react-dom/client';

import App from './App.jsx';
import './index.css';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/*

cd C:\Users\adiament\Desktop\Relto\ReltoV2\

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

.\venv\Scripts\Activate.ps1

uvicorn backend.app.main:app --reload

cd frontend

$env:Path += ";C:\Users\adiament\Downloads\node-v22.15.0-win-x64"

npm.cmd run dev


*/