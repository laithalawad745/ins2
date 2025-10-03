'use client'

import { useState } from 'react';

export default function Home() {
  const [config, setConfig] = useState({
    accounts: [{ id: 1, username: '', password: '', enabled: true }],
    postUrl: '',
    comments: [],
    minInterval: 5,
    maxInterval: 15,
    accountSwitchDelay: 30,
    isActive: false
  });

  const [newComment, setNewComment] = useState('');
  const [logs, setLogs] = useState([]);

  // إضافة حساب جديد
  const addAccount = () => {
    const newAccount = {
      id: Date.now(),
      username: '',
      password: '',
      enabled: true
    };
    setConfig({...config, accounts: [...config.accounts, newAccount]});
  };

  // حذف حساب
  const removeAccount = (id) => {
    if (config.accounts.length > 1) {
      setConfig({
        ...config,
        accounts: config.accounts.filter(acc => acc.id !== id)
      });
    }
  };

  // تحديث بيانات حساب
  const updateAccount = (id, field, value) => {
    setConfig({
      ...config,
      accounts: config.accounts.map(acc =>
        acc.id === id ? { ...acc, [field]: value } : acc
      )
    });
  };

  // تفعيل/تعطيل حساب
  const toggleAccount = (id) => {
    setConfig({
      ...config,
      accounts: config.accounts.map(acc =>
        acc.id === id ? { ...acc, enabled: !acc.enabled } : acc
      )
    });
  };

  // إضافة تعليق
  const addComment = () => {
    if (newComment.trim()) {
      setConfig({
        ...config,
        comments: [...config.comments, newComment.trim()]
      });
      setNewComment('');
    }
  };

  // حذف تعليق
  const removeComment = (index) => {
    setConfig({
      ...config,
      comments: config.comments.filter((_, i) => i !== index)
    });
  };

  // إضافة لوج
  const addLog = (message) => {
    const time = new Date().toLocaleTimeString('ar-SA');
    setLogs(prev => [{ time, message }, ...prev].slice(0, 50));
  };

  // التحقق من البيانات
  const validateData = () => {
    const enabledAccounts = config.accounts.filter(acc => acc.enabled && acc.username && acc.password);
    
    if (enabledAccounts.length === 0) {
      alert('❌ يرجى إضافة حساب واحد مفعّل على الأقل');
      return false;
    }

    if (!config.postUrl.includes('instagram.com/p/')) {
      alert('❌ رابط المنشور غير صحيح');
      return false;
    }

    if (config.comments.length === 0) {
      alert('❌ يرجى إضافة تعليق واحد على الأقل');
      return false;
    }

    return true;
  };

  // تشغيل البوت
  const handleStart = async () => {
    if (!validateData()) return;

    const enabledAccounts = config.accounts
      .filter(acc => acc.enabled && acc.username && acc.password)
      .map(acc => ({ username: acc.username, password: acc.password }));

    setConfig({...config, isActive: true});
    addLog('🚀 جاري تشغيل البوت...');

    try {
      const response = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: enabledAccounts,
          postUrl: config.postUrl,
          comments: config.comments,
          minInterval: config.minInterval,
          maxInterval: config.maxInterval,
          accountSwitchDelay: config.accountSwitchDelay
        })
      });

      const data = await response.json();
      
      if (data.success) {
        addLog(`✅ تم تشغيل البوت بنجاح (${data.accountsCount} حساب)`);
      } else {
        addLog(`❌ خطأ: ${data.error}`);
        setConfig({...config, isActive: false});
      }
    } catch (error) {
      addLog(`❌ خطأ في الاتصال: ${error.message}`);
      setConfig({...config, isActive: false});
    }
  };

  // إيقاف البوت
  const handleStop = async () => {
    addLog('⏸️ جاري إيقاف البوت...');

    try {
      const response = await fetch('/api/bot/stop', {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        addLog(`✅ تم إيقاف البوت`);
        setConfig({...config, isActive: false});
      } else {
        addLog(`❌ خطأ في الإيقاف: ${data.error}`);
      }
    } catch (error) {
      addLog(`❌ خطأ: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🤖 Instagram Multi-Account Bot
          </h1>
          <p className="text-gray-400">بوت تعليقات متعدد الحسابات</p>
        </div>

        {/* الحالة */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${config.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-white font-medium">
                {config.isActive ? '🟢 البوت يعمل' : '⚪ البوت متوقف'}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              الحسابات المفعلة: {config.accounts.filter(a => a.enabled).length} | 
              التعليقات: {config.comments.length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* قسم الحسابات */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">📱 الحسابات</h2>
              <button
                onClick={addAccount}
                className={`px-4 py-2 rounded-lg font-medium ${
                  config.isActive
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                disabled={config.isActive}
              >
                + إضافة حساب
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {config.accounts.map((account, index) => (
                <div key={account.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={account.enabled}
                        onChange={() => toggleAccount(account.id)}
                        disabled={config.isActive}
                        className="w-4 h-4"
                      />
                      <span className="text-white font-medium">حساب #{index + 1}</span>
                    </div>
                    {config.accounts.length > 1 && (
                      <button
                        onClick={() => removeAccount(account.id)}
                        className={`px-3 py-1 text-xs rounded ${
                          config.isActive
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                        disabled={config.isActive}
                      >
                        حذف
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="اسم المستخدم"
                      value={account.username}
                      onChange={(e) => updateAccount(account.id, 'username', e.target.value)}
                      className="p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      disabled={config.isActive || !account.enabled}
                      dir="ltr"
                    />
                    <input
                      type="password"
                      placeholder="كلمة المرور"
                      value={account.password}
                      onChange={(e) => updateAccount(account.id, 'password', e.target.value)}
                      className="p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      disabled={config.isActive || !account.enabled}
                      dir="ltr"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* قسم الإعدادات */}
          <div className="space-y-6">
            {/* رابط المنشور */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4 text-white">🔗 رابط المنشور</h2>
              <input
                type="text"
                placeholder="https://instagram.com/p/..."
                value={config.postUrl}
                onChange={(e) => setConfig({...config, postUrl: e.target.value})}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                disabled={config.isActive}
                dir="ltr"
              />
            </div>

            {/* التعليقات */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4 text-white">💬 التعليقات العشوائية</h2>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="أضف تعليق جديد"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addComment()}
                  className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded text-white"
                  disabled={config.isActive}
                />
                <button
                  onClick={addComment}
                  className={`px-4 py-2 rounded font-medium ${
                    config.isActive
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  disabled={config.isActive}
                >
                  إضافة
                </button>
              </div>

              <div className="space-y-2 max-h-32 overflow-y-auto">
                {config.comments.map((comment, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <span className="text-white text-sm flex-1">{comment}</span>
                    <button
                      onClick={() => removeComment(index)}
                      className={`px-2 py-1 text-xs rounded ml-2 ${
                        config.isActive
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                      disabled={config.isActive}
                    >
                      حذف
                    </button>
                  </div>
                ))}
                {config.comments.length === 0 && (
                  <p className="text-gray-400 text-center py-4">لا توجد تعليقات</p>
                )}
              </div>
            </div>

            {/* إعدادات التوقيت */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4 text-white">⏰ إعدادات التوقيت</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">الحد الأدنى (دقائق)</label>
                  <input
                    type="number"
                    value={config.minInterval}
                    onChange={(e) => setConfig({...config, minInterval: parseInt(e.target.value) || 1})}
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    disabled={config.isActive}
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">الحد الأقصى (دقائق)</label>
                  <input
                    type="number"
                    value={config.maxInterval}
                    onChange={(e) => setConfig({...config, maxInterval: parseInt(e.target.value) || 5})}
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    disabled={config.isActive}
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">تبديل الحساب (ثانية)</label>
                  <input
                    type="number"
                    value={config.accountSwitchDelay}
                    onChange={(e) => setConfig({...config, accountSwitchDelay: parseInt(e.target.value) || 30})}
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    disabled={config.isActive}
                    min="10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* زر التشغيل/الإيقاف */}
        <div className="mt-6">
          {!config.isActive ? (
            <button
              onClick={handleStart}
              className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 transition-colors"
            >
              ▶️ تشغيل البوت
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="w-full py-4 bg-red-600 text-white text-lg font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              ⏸️ إيقاف البوت
            </button>
          )}
        </div>

        {/* السجل */}
        <div className="mt-6 bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4 text-white">📋 سجل النشاط</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-800 rounded-lg p-4">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="flex items-start gap-3 pb-2 border-b border-gray-700 last:border-0">
                  <span className="text-gray-400 text-xs whitespace-nowrap">{log.time}</span>
                  <span className="text-white flex-1">{log.message}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">لا توجد سجلات بعد</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}