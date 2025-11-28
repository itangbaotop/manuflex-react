import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom'; // 导入 BrowserRouter
import { AuthProvider } from './context/AuthContext'; // 导入 AuthProvider (稍后创建)

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* 包裹 App，提供认证上下文 */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
