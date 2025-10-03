import { IgApiClient } from 'instagram-private-api'

class InstagramService {
  constructor() {
    this.ig = null
    this.isLoggedIn = false
  }

  // تسجيل الدخول
  async login(username, password) {
    try {
      this.ig = new IgApiClient()
      this.ig.state.generateDevice(username)

      // محاولة استعادة الجلسة إذا كانت موجودة
      try {
        const sessionData = this.loadSession(username)
        if (sessionData) {
          await this.ig.state.deserialize(sessionData)
          await this.ig.account.currentUser()
          this.isLoggedIn = true
          return { success: true, message: 'تم استعادة الجلسة' }
        }
      } catch (error) {
        console.log('فشل استعادة الجلسة، سيتم تسجيل دخول جديد')
      }

      // تسجيل دخول جديد
      const user = await this.ig.account.login(username, password)
      
      // حفظ الجلسة
      const sessionData = await this.ig.state.serialize()
      this.saveSession(username, sessionData)
      
      this.isLoggedIn = true
      
      return {
        success: true,
        user: {
          pk: user.pk,
          username: user.username,
          full_name: user.full_name,
          profile_pic_url: user.profile_pic_url
        }
      }

    } catch (error) {
      console.error('خطأ تسجيل الدخول:', error)
      throw new Error(this.getErrorMessage(error))
    }
  }

  // استخراج معلومات المنشور من الرابط
  extractPostInfo(url) {
    const regex = /instagram\.com\/p\/([A-Za-z0-9_-]+)/
    const match = url.match(regex)
    
    if (!match) {
      throw new Error('رابط Instagram غير صحيح')
    }
    
    return {
      shortcode: match[1],
      url: url
    }
  }

  // الحصول على معلومات المنشور
  async getPostInfo(shortcode) {
    if (!this.isLoggedIn || !this.ig) {
      throw new Error('يجب تسجيل الدخول أولاً')
    }

    try {
      const mediaId = await this.ig.media.getIdFromShortcode(shortcode)
      const mediaInfo = await this.ig.media.info(mediaId)
      
      return {
        id: mediaInfo.items[0].id,
        shortcode: mediaInfo.items[0].code,
        caption: mediaInfo.items[0].caption?.text || '',
        user: {
          username: mediaInfo.items[0].user.username,
          full_name: mediaInfo.items[0].user.full_name
        },
        comment_count: mediaInfo.items[0].comment_count,
        like_count: mediaInfo.items[0].like_count
      }
    } catch (error) {
      console.error('خطأ في الحصول على معلومات المنشور:', error)
      throw new Error('فشل في الحصول على معلومات المنشور')
    }
  }

  // إضافة تعليق
  async addComment(mediaId, text) {
    if (!this.isLoggedIn || !this.ig) {
      throw new Error('يجب تسجيل الدخول أولاً')
    }

    try {
      // إضافة تأخير عشوائي لتجنب الاكتشاف
      await this.randomDelay(1000, 3000)
      
      const result = await this.ig.media.comment({
        mediaId: mediaId,
        text: text
      })

      return {
        success: true,
        commentId: result.comment.pk,
        text: result.comment.text,
        created_at: result.comment.created_at
      }

    } catch (error) {
      console.error('خطأ في إضافة التعليق:', error)
      
      // معالجة أخطاء محددة
      if (error.message.includes('spam')) {
        throw new Error('تم رفض التعليق كـ spam')
      } else if (error.message.includes('rate_limit')) {
        throw new Error('تجاوز حد التعليقات المسموح')
      } else if (error.message.includes('invalid_media')) {
        throw new Error('المنشور غير موجود أو محذوف')
      } else {
        throw new Error('فشل في إضافة التعليق')
      }
    }
  }

  // تأخير عشوائي
  randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    return new Promise(resolve => setTimeout(resolve, delay))
  }

  // حفظ الجلسة
  saveSession(username, sessionData) {
    try {
      // في الإنتاج، احفظ في قاعدة البيانات
      // هنا سنحفظ في الذاكرة فقط
      global.instagramSessions = global.instagramSessions || {}
      global.instagramSessions[username] = sessionData
    } catch (error) {
      console.error('خطأ في حفظ الجلسة:', error)
    }
  }

  // تحميل الجلسة
  loadSession(username) {
    try {
      global.instagramSessions = global.instagramSessions || {}
      return global.instagramSessions[username]
    } catch (error) {
      console.error('خطأ في تحميل الجلسة:', error)
      return null
    }
  }

  // الحصول على رسالة خطأ مفهومة
  getErrorMessage(error) {
    const message = error.message || error.toString()
    
    if (message.includes('challenge_required')) {
      return 'يتطلب Instagram تحقق إضافي. حاول مرة أخرى لاحقاً.'
    } else if (message.includes('invalid_user')) {
      return 'اسم المستخدم أو كلمة المرور غير صحيح'
    } else if (message.includes('rate_limit')) {
      return 'تم تجاوز حد المحاولات. انتظر قليلاً وحاول مرة أخرى.'
    } else if (message.includes('login_required')) {
      return 'انتهت صلاحية جلسة تسجيل الدخول'
    } else if (message.includes('checkpoint_required')) {
      return 'يتطلب Instagram تحقق من الهوية'
    } else {
      return 'حدث خطأ غير متوقع'
    }
  }

  // تنظيف الموارد
  cleanup() {
    this.ig = null
    this.isLoggedIn = false
  }

  // فحص حالة الاتصال
  async checkConnection() {
    if (!this.isLoggedIn || !this.ig) {
      return false
    }

    try {
      await this.ig.account.currentUser()
      return true
    } catch (error) {
      this.isLoggedIn = false
      return false
    }
  }

  // الحصول على معلومات المستخدم الحالي
  async getCurrentUser() {
    if (!this.isLoggedIn || !this.ig) {
      throw new Error('غير مصرح بالوصول')
    }

    try {
      const user = await this.ig.account.currentUser()
      return {
        pk: user.pk,
        username: user.username,
        full_name: user.full_name,
        profile_pic_url: user.profile_pic_url,
        follower_count: user.follower_count,
        following_count: user.following_count,
        media_count: user.media_count
      }
    } catch (error) {
      console.error('خطأ في الحصول على معلومات المستخدم:', error)
      throw new Error('فشل في الحصول على معلومات المستخدم')
    }
  }
}

// إنشاء نسخة واحدة من الخدمة
const instagramService = new InstagramService()

export default instagramService