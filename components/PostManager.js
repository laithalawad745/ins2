'use client'

import { useState, useEffect } from 'react'

export default function PostManager({ onUpdate }) {
  const [posts, setPosts] = useState([])
  const [newPostUrl, setNewPostUrl] = useState('')
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

  const addPost = async (e) => {
    e.preventDefault()
    if (!newPostUrl.trim()) return

    // التحقق من صحة رابط Instagram
    const instagramUrlPattern = /^https:\/\/(www\.)?instagram\.com\/p\/[a-zA-Z0-9_-]+\/?/
    if (!instagramUrlPattern.test(newPostUrl)) {
      alert('يرجى إدخال رابط صحيح لمنشور Instagram')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: newPostUrl })
      })

      if (response.ok) {
        setNewPostUrl('')
        await loadPosts()
        onUpdate?.()
      } else {
        throw new Error('فشل في إضافة المنشور')
      }
    } catch (error) {
      console.error('خطأ في إضافة المنشور:', error)
      alert('فشل في إضافة المنشور')
    } finally {
      setLoading(false)
    }
  }

  const deletePost = async (postId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return

    try {
      const response = await fetch(`/api/posts?id=${postId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadPosts()
        onUpdate?.()
      } else {
        throw new Error('فشل في حذف المنشور')
      }
    } catch (error) {
      console.error('خطأ في حذف المنشور:', error)
      alert('فشل في حذف المنشور')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">إضافة منشور جديد</h3>
        <form onSubmit={addPost} className="space-y-4">
          <div>
            <label htmlFor="postUrl" className="block text-sm font-medium text-gray-700 mb-1">
              رابط المنشور
            </label>
            <input
              type="url"
              id="postUrl"
              value={newPostUrl}
              onChange={(e) => setNewPostUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              مثال: https://www.instagram.com/p/ABC123/
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || !newPostUrl.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
          >
            {loading ? 'جارٍ الإضافة...' : 'إضافة منشور'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">المنشورات المحفوظة ({posts.length})</h3>
        {posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl block mb-2">📝</span>
            <p>لا توجد منشورات محفوظة</p>
            <p className="text-sm">أضف رابط منشور Instagram للبدء</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      منشور Instagram
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {post.url}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-400">
                      <span>تم الإضافة: {new Date(post.createdAt).toLocaleDateString('ar-SA')}</span>
                      <span className="mx-2">•</span>
                      <span>المعرف: {post.shortcode}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      فتح
                    </a>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}