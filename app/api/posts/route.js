import { NextResponse } from 'next/server'
import instagramService from '@/lib/instagram'

// تخزين مؤقت للمنشورات (في الإنتاج استخدم قاعدة بيانات)
let posts = []
let postCounter = 1

export async function GET() {
  try {
    return NextResponse.json(posts)
  } catch (error) {
    console.error('خطأ في الحصول على المنشورات:', error)
    return NextResponse.json(
      { error: 'خطأ في الحصول على المنشورات' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'رابط المنشور مطلوب' },
        { status: 400 }
      )
    }

    // استخراج معلومات المنشور من الرابط
    let postInfo
    try {
      postInfo = instagramService.extractPostInfo(url)
    } catch (error) {
      return NextResponse.json(
        { error: 'رابط Instagram غير صحيح' },
        { status: 400 }
      )
    }

    // التحقق من عدم وجود المنشور مسبقاً
    const existingPost = posts.find(post => post.shortcode === postInfo.shortcode)
    if (existingPost) {
      return NextResponse.json(
        { error: 'هذا المنشور موجود مسبقاً' },
        { status: 409 }
      )
    }

    // محاولة الحصول على معلومات إضافية عن المنشور
    let additionalInfo = {}
    try {
      additionalInfo = await instagramService.getPostInfo(postInfo.shortcode)
    } catch (error) {
      console.log('تعذر الحصول على معلومات إضافية:', error.message)
      // لا نتوقف هنا، سنحفظ المنشور بالمعلومات الأساسية
    }

    // إنشاء المنشور الجديد
    const newPost = {
      id: postCounter++,
      url: url,
      shortcode: postInfo.shortcode,
      createdAt: new Date(),
      ...additionalInfo
    }

    // إضافة المنشور
    posts.push(newPost)

    return NextResponse.json(newPost, { status: 201 })

  } catch (error) {
    console.error('خطأ في إضافة المنشور:', error)
    return NextResponse.json(
      { error: 'خطأ في إضافة المنشور' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = parseInt(searchParams.get('id'))

    if (!postId) {
      return NextResponse.json(
        { error: 'معرف المنشور مطلوب' },
        { status: 400 }
      )
    }

    // العثور على المنشور
    const postIndex = posts.findIndex(post => post.id === postId)
    if (postIndex === -1) {
      return NextResponse.json(
        { error: 'المنشور غير موجود' },
        { status: 404 }
      )
    }

    // حذف المنشور
    const deletedPost = posts.splice(postIndex, 1)[0]

    return NextResponse.json({
      success: true,
      message: 'تم حذف المنشور بنجاح',
      deletedPost
    })

  } catch (error) {
    console.error('خطأ في حذف المنشور:', error)
    return NextResponse.json(
      { error: 'خطأ في حذف المنشور' },
      { status: 500 }
    )
  }
}

// دالة مساعدة للحصول على منشور بواسطة ID
export function getPostById(id) {
  return posts.find(post => post.id === parseInt(id))
}

// دالة مساعدة للحصول على منشور بواسطة shortcode
export function getPostByShortcode(shortcode) {
  return posts.find(post => post.shortcode === shortcode)
}

// تصدير المنشورات للاستخدام في مكونات أخرى
export function getAllPosts() {
  return posts
}