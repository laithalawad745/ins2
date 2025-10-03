'use client'

import { useState, useEffect } from 'react'

export default function CommentScheduler({ onUpdate }) {
  const [posts, setPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState('')
  const [comments, setComments] = useState([''])
  const [schedule, setSchedule] = useState({
    minInterval: 5,    // دقائق
    maxInterval: 30,   // دقائق
    totalComments: 10,
    randomize: true
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      const response = await fetch('/api/posts')
      const data = await response.json()
      setPosts(data)
    } catch (error) {
      console.error('خطأ في تحميل المنشورات:', error)
    }
  }

  const addCommentField = () => {
    setComments([...comments, ''])
  }

  const removeCommentField = (index) => {
    if (comments.length > 1) {
      setComments(comments.filter((_, i) => i !== index))
    }
  }

  const updateComment = (index, value) => {
    const newComments = [...comments]
    newComments[index] = value
    setComments(newComments)
  }

  const predefinedComments = [
    'رائع! 👍',
    'أحببت هذا المنشور ❤️',
    'محتوى مميز 🔥',
    'شكرًا على المشاركة 🙏',
    'منشور رائع 😍',
    'مبدع كالعادة ✨',
    'استمر 💪',
    'محتوى قيم 📚',
    'أعجبني جداً 👏',
    'بانتظار المزيد 🤗'
  ]

  const addPredefinedComment = (comment) => {
    if (!comments.includes(comment)) {
      setComments([...comments.filter(c => c.trim()), comment])
    }
  }

  const startScheduling = async (e) => {
    e.preventDefault()
    
    if (!selectedPost) {
      alert('يرجى اختيار منشور')
      return
    }

    const validComments = comments.filter(c => c.trim())
    if (validComments.length === 0) {
      alert('يرجى إضافة تعليق واحد على الأقل')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: selectedPost,
          comments: validComments,
          schedule: schedule
        })
      })

      if (response.ok) {
        alert('تم بدء جدولة التعليقات بنجاح!')
        // إعادة تعيين النموذج
        setComments([''])
        setSelectedPost('')
        onUpdate?.()
      } else {
        throw new Error('فشل في بدء الجدولة')
      }
    } catch (error) {
      console.error('خطأ في بدء الجدولة:', error)
      alert('فشل في بدء جدولة التعليقات')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={startScheduling} className="space-y-6">
        {/* اختيار المنشور */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">1. اختر المنشور</h3>
          {posts.length === 0 ? (
            <p className="text-gray-500">لا توجد منشورات متاحة. أضف منشوراً أولاً.</p>
          ) : (
            <select
              value={selectedPost}
              onChange={(e) => setSelectedPost(e.target.value)}
              className="input-field"
              required
            >
              <option value="">اختر منشور...</option>
              {posts.map(post => (
                <option key={post.id} value={post.id}>
                  {post.shortcode} - {new Date(post.createdAt).toLocaleDateString('ar-SA')}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* التعليقات */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">2. التعليقات ({comments.filter(c => c.trim()).length})</h3>
            <button
              type="button"
              onClick={addCommentField}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              + إضافة تعليق
            </button>
          </div>

          {/* التعليقات المحددة مسبقاً */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">تعليقات جاهزة:</p>
            <div className="flex flex-wrap gap-2">
              {predefinedComments.map((comment, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => addPredefinedComment(comment)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                >
                  {comment}
                </button>
              ))}
            </div>
          </div>

          {/* حقول التعليقات */}
          <div className="space-y-3">
            {comments.map((comment, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => updateComment(index, e.target.value)}
                  placeholder={`التعليق ${index + 1}`}
                  className="input-field"
                />
                {comments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCommentField(index)}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* إعدادات التوقيت */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">3. إعدادات التوقيت</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">أقل فترة انتظار (بالدقائق)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={schedule.minInterval}
                onChange={(e) => setSchedule({...schedule, minInterval: parseInt(e.target.value)})}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">أكبر فترة انتظار (بالدقائق)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={schedule.maxInterval}
                onChange={(e) => setSchedule({...schedule, maxInterval: parseInt(e.target.value)})}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">عدد التعليقات الإجمالي</label>
              <input
                type="number"
                min="1"
                max="50"
                value={schedule.totalComments}
                onChange={(e) => setSchedule({...schedule, totalComments: parseInt(e.target.value)})}
                className="input-field"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="randomize"
                checked={schedule.randomize}
                onChange={(e) => setSchedule({...schedule, randomize: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="randomize" className="text-sm">توقيتات عشوائية</label>
            </div>
          </div>
        </div>

        {/* معاينة الجدولة */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">معاينة الجدولة:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• سيتم نشر {schedule.totalComments} تعليق</li>
            <li>• كل {schedule.minInterval}-{schedule.maxInterval} دقيقة</li>
            <li>• من مجموعة {comments.filter(c => c.trim()).length} تعليق مختلف</li>
            <li>• التوقيت: {schedule.randomize ? 'عشوائي' : 'ثابت'}</li>
          </ul>
        </div>

        {/* زر البدء */}
        <button
          type="submit"
          disabled={loading || !selectedPost || comments.filter(c => c.trim()).length === 0}
          className="w-full btn-primary disabled:bg-gray-400"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              جارٍ بدء الجدولة...
            </span>
          ) : (
            '🚀 بدء جدولة التعليقات'
          )}
        </button>
      </form>
    </div>
  )
}