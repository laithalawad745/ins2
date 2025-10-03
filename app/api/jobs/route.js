import { NextResponse } from 'next/server'
import commentScheduler from '@/lib/scheduler'
import { getPostById } from '../posts/route'

export async function GET() {
  try {
    const jobs = commentScheduler.getAllJobs()
    
    // إضافة معلومات المنشورات
    const jobsWithPostInfo = jobs.map(job => {
      const post = getPostById(job.postId)
      return {
        ...job,
        post: post ? {
          id: post.id,
          shortcode: post.shortcode,
          url: post.url
        } : null
      }
    })

    return NextResponse.json(jobsWithPostInfo)
  } catch (error) {
    console.error('خطأ في الحصول على المهام:', error)
    return NextResponse.json(
      { error: 'خطأ في الحصول على المهام' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { postId, comments, schedule } = await request.json()

    // التحقق من صحة البيانات
    if (!postId || !comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json(
        { error: 'بيانات غير صحيحة' },
        { status: 400 }
      )
    }

    if (!schedule || !schedule.minInterval || !schedule.maxInterval || !schedule.totalComments) {
      return NextResponse.json(
        { error: 'إعدادات الجدولة غير صحيحة' },
        { status: 400 }
      )
    }

    // التحقق من وجود المنشور
    const post = getPostById(parseInt(postId))
    if (!post) {
      return NextResponse.json(
        { error: 'المنشور غير موجود' },
        { status: 404 }
      )
    }

    // تنظيف التعليقات (إزالة الفارغة)
    const cleanedComments = comments.filter(comment => comment && comment.trim())
    if (cleanedComments.length === 0) {
      return NextResponse.json(
        { error: 'لا توجد تعليقات صالحة' },
        { status: 400 }
      )
    }

    // التحقق من صحة الفترات الزمنية
    if (schedule.minInterval < 1 || schedule.maxInterval < schedule.minInterval) {
      return NextResponse.json(
        { error: 'الفترات الزمنية غير صحيحة' },
        { status: 400 }
      )
    }

    if (schedule.totalComments < 1 || schedule.totalComments > 100) {
      return NextResponse.json(
        { error: 'عدد التعليقات يجب أن يكون بين 1 و 100' },
        { status: 400 }
      )
    }

    // إنشاء المهمة
    const jobId = commentScheduler.createJob({
      postId: parseInt(postId),
      postShortcode: post.shortcode,
      comments: cleanedComments,
      schedule: {
        minInterval: parseInt(schedule.minInterval),
        maxInterval: parseInt(schedule.maxInterval),
        totalComments: parseInt(schedule.totalComments),
        randomize: schedule.randomize || true
      }
    })

    return NextResponse.json({
      success: true,
      jobId: jobId,
      message: 'تم بدء جدولة التعليقات بنجاح'
    }, { status: 201 })

  } catch (error) {
    console.error('خطأ في إنشاء المهمة:', error)
    return NextResponse.json(
      { error: 'خطأ في إنشاء المهمة' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = parseInt(searchParams.get('id'))

    if (!jobId) {
      return NextResponse.json(
        { error: 'معرف المهمة مطلوب' },
        { status: 400 }
      )
    }

    const success = commentScheduler.deleteJob(jobId)
    
    if (!success) {
      return NextResponse.json(
        { error: 'المهمة غير موجودة' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف المهمة بنجاح'
    })

  } catch (error) {
    console.error('خطأ في حذف المهمة:', error)
    return NextResponse.json(
      { error: 'خطأ في حذف المهمة' },
      { status: 500 }
    )
  }
}