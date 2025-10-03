import { IgApiClient } from 'instagram-private-api'
import { NextResponse } from 'next/server'

// تخزين جلسة Instagram مؤقتاً (في الإنتاج يجب استخدام قاعدة بيانات)
let igSession = null
let currentUser = null

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'اسم المستخدم وكلمة المرور مطلوبان' },
        { status: 400 }
      )
    }

    // إنشاء عميل Instagram جديد
    const ig = new IgApiClient()
    
    // إعداد المعرف الفريد للجهاز
    ig.state.generateDevice(username)

    try {
      // تسجيل الدخول
      const user = await ig.account.login(username, password)
      
      // حفظ الجلسة
      igSession = ig
      currentUser = {
        pk: user.pk,
        username: user.username,
        full_name: user.full_name,
        profile_pic_url: user.profile_pic_url
      }

      return NextResponse.json({
        success: true,
        user: currentUser,
        message: 'تم تسجيل الدخول بنجاح'
      })

    } catch (loginError) {
      console.error('خطأ تسجيل الدخول:', loginError)
      
      // معالجة أخطاء تسجيل الدخول المختلفة
      if (loginError.message.includes('challenge_required')) {
        return NextResponse.json(
          { error: 'يتطلب Instagram تحقق إضافي. حاول مرة أخرى لاحقاً.' },
          { status: 429 }
        )
      } else if (loginError.message.includes('invalid_user')) {
        return NextResponse.json(
          { error: 'اسم المستخدم أو كلمة المرور غير صحيح' },
          { status: 401 }
        )
      } else if (loginError.message.includes('rate_limit')) {
        return NextResponse.json(
          { error: 'تم تجاوز حد المحاولات. حاول مرة أخرى لاحقاً.' },
          { status: 429 }
        )
      } else {
        return NextResponse.json(
          { error: 'خطأ في تسجيل الدخول. تأكد من صحة البيانات.' },
          { status: 401 }
        )
      }
    }

  } catch (error) {
    console.error('خطأ في API المصادقة:', error)
    return NextResponse.json(
      { error: 'خطأ داخلي في الخادم' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // فحص حالة تسجيل الدخول
    const isAuthenticated = igSession !== null && currentUser !== null

    if (isAuthenticated) {
      // التحقق من صحة الجلسة
      try {
        await igSession.account.currentUser()
      } catch (error) {
        // الجلسة منتهية الصلاحية
        igSession = null
        currentUser = null
        return NextResponse.json({ isAuthenticated: false })
      }
    }

    return NextResponse.json({
      isAuthenticated,
      user: currentUser
    })

  } catch (error) {
    console.error('خطأ في فحص حالة المصادقة:', error)
    return NextResponse.json({ isAuthenticated: false })
  }
}

export async function DELETE() {
  try {
    // تسجيل خروج
    igSession = null
    currentUser = null

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    })

  } catch (error) {
    console.error('خطأ في تسجيل الخروج:', error)
    return NextResponse.json(
      { error: 'خطأ في تسجيل الخروج' },
      { status: 500 }
    )
  }
}

// تصدير الجلسة للاستخدام في APIs أخرى
export function getIgSession() {
  return igSession
}

export function getCurrentUser() {
  return currentUser
}