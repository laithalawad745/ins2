'use client'

import { useState, useEffect } from 'react'
import PostManager from './PostManager'
import CommentScheduler from './CommentScheduler'
import JobsList from './JobsList'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('posts')
  const [stats, setStats] = useState({
    totalPosts: 0,
    activeJobs: 0,
    totalComments: 0,
    successRate: 0
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error)
    }
  }

  const tabs = [
    { id: 'posts', name: 'إدارة المنشورات', icon: '📝' },
    { id: 'comments', name: 'جدولة التعليقات', icon: '💬' },
    { id: 'jobs', name: 'المهام الجارية', icon: '⚡' },
  ]

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي المنشورات</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">المهام النشطة</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">💬</span>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي التعليقات</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalComments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📈</span>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">معدل النجاح</p>
              <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 space-x-reverse">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="ml-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'posts' && <PostManager onUpdate={loadStats} />}
          {activeTab === 'comments' && <CommentScheduler onUpdate={loadStats} />}
          {activeTab === 'jobs' && <JobsList onUpdate={loadStats} />}
        </div>
      </div>
    </div>
  )
}