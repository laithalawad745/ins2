'use client'

import { useState, useEffect } from 'react'

export default function JobsList({ onUpdate }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobs()
    // تحديث كل 30 ثانية
    const interval = setInterval(loadJobs, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      const data = await response.json()
      setJobs(data)
    } catch (error) {
      console.error('خطأ في تحميل المهام:', error)
    } finally {
      setLoading(false)
    }
  }

  const stopJob = async (jobId) => {
    if (!confirm('هل أنت متأكد من إيقاف هذه المهمة؟')) return

    try {
      const response = await fetch(`/api/jobs/${jobId}/stop`, {
        method: 'POST'
      })

      if (response.ok) {
        await loadJobs()
        onUpdate?.()
      } else {
        throw new Error('فشل في إيقاف المهمة')
      }
    } catch (error) {
      console.error('خطأ في إيقاف المهمة:', error)
      alert('فشل في إيقاف المهمة')
    }
  }

  const deleteJob = async (jobId) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadJobs()
        onUpdate?.()
      } else {
        throw new Error('فشل في حذف المهمة')
      }
    } catch (error) {
      console.error('خطأ في حذف المهمة:', error)
      alert('فشل في حذف المهمة')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { color: 'bg-green-100 text-green-800', text: 'نشط' },
      'paused': { color: 'bg-yellow-100 text-yellow-800', text: 'متوقف مؤقتاً' },
      'completed': { color: 'bg-blue-100 text-blue-800', text: 'مكتمل' },
      'failed': { color: 'bg-red-100 text-red-800', text: 'فشل' },
    }

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const getProgress = (job) => {
    if (job.totalComments === 0) return 0
    return Math.round((job.sentComments / job.totalComments) * 100)
  }

  const getNextCommentTime = (job) => {
    if (job.status !== 'active' || !job.nextExecutionTime) {
      return 'غير محدد'
    }
    
    const nextTime = new Date(job.nextExecutionTime)
    const now = new Date()
    const diffMs = nextTime - now
    
    if (diffMs <= 0) return 'الآن'
    
    const diffMinutes = Math.ceil(diffMs / (1000 * 60))
    if (diffMinutes < 60) {
      return `خلال ${diffMinutes} دقيقة`
    }
    
    const diffHours = Math.ceil(diffMinutes / 60)
    return `خلال ${diffHours} ساعة`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">جارٍ تحميل المهام...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">المهام الجارية ({jobs.length})</h3>
        <button
          onClick={loadJobs}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          🔄 تحديث
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <span className="text-4xl block mb-4">⚡</span>
          <p className="text-lg">لا توجد مهام جارية</p>
          <p className="text-sm">ابدأ بجدولة تعليقات لتظهر المهام هنا</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900">
                      مهمة رقم {job.id}
                    </h4>
                    {getStatusBadge(job.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p><strong>المنشور:</strong> {job.post?.shortcode || 'غير معروف'}</p>
                      <p><strong>التقدم:</strong> {job.sentComments}/{job.totalComments} ({getProgress(job)}%)</p>
                    </div>
                    <div>
                      <p><strong>التعليق التالي:</strong> {getNextCommentTime(job)}</p>
                      <p><strong>تم الإنشاء:</strong> {new Date(job.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>

                  {/* شريط التقدم */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>التقدم</span>
                      <span>{getProgress(job)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getProgress(job)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* التعليقات */}
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">التعليقات المتاحة:</p>
                    <div className="flex flex-wrap gap-1">
                      {job.comments?.slice(0, 3).map((comment, index) => (
                        <span key={index} className="bg-gray-100 text-xs px-2 py-1 rounded">
                          {comment.substring(0, 20)}{comment.length > 20 ? '...' : ''}
                        </span>
                      ))}
                      {job.comments?.length > 3 && (
                        <span className="text-xs text-gray-500">+{job.comments.length - 3} المزيد</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* أزرار التحكم */}
                <div className="flex flex-col gap-2 mr-4">
                  {job.status === 'active' && (
                    <button
                      onClick={() => stopJob(job.id)}
                      className="text-yellow-600 hover:text-yellow-700 text-sm px-3 py-1 border border-yellow-300 rounded"
                    >
                      إيقاف
                    </button>
                  )}
                  {job.status !== 'active' && (
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="text-red-600 hover:text-red-700 text-sm px-3 py-1 border border-red-300 rounded"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>

              {/* إحصائيات إضافية للمهام النشطة */}
              {job.status === 'active' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">نجح</p>
                      <p className="font-medium text-green-600">{job.successfulComments || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">فشل</p>
                      <p className="font-medium text-red-600">{job.failedComments || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">متبقي</p>
                      <p className="font-medium text-blue-600">{job.totalComments - job.sentComments}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}