import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await login(email.trim(), password);
    setLoading(false);
    if (ok) navigate('/');
    else setError('登录失败，请检查账号或密码');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">登录</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">邮箱或用户名</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">密码</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">{loading?'登录中...':'登录'}</button>
        </form>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">还没有账号？<Link to="/register" className="text-blue-600">注册</Link></p>
      </div>
    </div>
  );
}


