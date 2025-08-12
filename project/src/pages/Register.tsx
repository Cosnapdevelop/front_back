import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await register(email.trim(), username.trim(), password);
    setLoading(false);
    if (ok) navigate('/');
    else setError('注册失败，请稍后再试或更换邮箱/用户名');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">注册</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">邮箱</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">用户名</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">密码</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:border-gray-600" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">{loading?'注册中...':'注册'}</button>
        </form>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">已有账号？<Link to="/login" className="text-blue-600">登录</Link></p>
      </div>
    </div>
  );
}


