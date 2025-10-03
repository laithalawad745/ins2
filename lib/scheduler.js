import cron from 'node-cron'
import instagramService from './instagram.js'

class CommentScheduler {
  constructor() {
    this.jobs = new Map() // تخزين المهام النشطة
    this.jobCounter = 1
  }

  // إنشاء مهمة جدولة جديدة
  createJob(config) {
    const jobId = this.jobCounter++
    const job = {
      id: jobId,
      postId: config.postId,
      postShortcode: config.postShortcode,
      comments: config.comments,
      schedule: config.schedule,
      status: 'active',
      sentComments: 0,
      successfulComments: 0,
      failedComments: 0,
      totalComments: config.schedule.totalComments,
      createdAt: new Date(),
      nextExecutionTime: this.calculateNextExecution(config.schedule),
      commentHistory: [],
      currentCommentIndex: 0,
      cronJob: null
    }

    // بدء الجدولة
    this.startJob(job)
    
    // حفظ المهمة
    this.jobs.set(jobId, job)
    
    return jobId
  }

  // بدء تنفيذ المهمة
  startJob(job) {
    // حساب الفاصل الزمني بالدقائق
    const interval = this.getRandomInterval(
      job.schedule.minInterval,
      job.schedule.maxInterval,
      job.schedule.randomize
    )

    // إنشاء cron expression للتنفيذ كل X دقائق
    const cronExpression = `*/${interval} * * * *`

    // إنشاء المهمة المجدولة
    job.cronJob = cron.schedule(cronExpression, async () => {
      await this.executeComment(job)
    }, {
      scheduled: true,
      timezone: "Asia/Riyadh"
    })

    console.log(`تم بدء المهمة ${job.id} للتنفيذ كل ${interval} دقيقة`)
  }

  // تنفيذ تعليق واحد
  async executeComment(job) {
    try {
      // التحقق من حالة المهمة
      if (job.status !== 'active') {
        this.stopJob(job.id)
        return
      }

      // التحقق من اكتمال المهمة
      if (job.sentComments >= job.totalComments) {
        job.status = 'completed'
        this.stopJob(job.id)
        return
      }

      // اختيار تعليق
      const comment = this.selectComment(job)
      
      // الحصول على معلومات المنشور
      const postInfo = await instagramService.getPostInfo(job.postShortcode)

      // إرسال التعليق
      const result = await instagramService.addComment(postInfo.id, comment)

      // تحديث إحصائيات المهمة
      job.sentComments++
      job.successfulComments++
      job.commentHistory.push({
        comment: comment,
        timestamp: new Date(),
        status: 'success',
        commentId: result.commentId
      })

      // حساب التوقيت التالي
      job.nextExecutionTime = this.calculateNextExecution(job.schedule)

      console.log(`تم إرسال التعليق للمهمة ${job.id}: ${comment}`)

      // التحقق من اكتمال المهمة بعد الإرسال
      if (job.sentComments >= job.totalComments) {
        job.status = 'completed'
        this.stopJob(job.id)
        console.log(`تم إكمال المهمة ${job.id}`)
      }

    } catch (error) {
      console.error(`خطأ في تنفيذ المهمة ${job.id}:`, error)

      // تحديث إحصائيات الأخطاء
      job.failedComments++
      job.commentHistory.push({
        comment: this.selectComment(job),
        timestamp: new Date(),
        status: 'failed',
        error: error.message
      })

      // إيقاف المهمة في حالة الأخطاء المتكررة
      if (job.failedComments >= 5) {
        job.status = 'failed'
        this.stopJob(job.id)
        console.log(`تم إيقاف المهمة ${job.id} بسبب كثرة الأخطاء`)
      }
    }
  }

  // اختيار تعليق للإرسال
  selectComment(job) {
    const { comments } = job
    
    if (job.schedule.randomize) {
      // اختيار عشوائي
      return comments[Math.floor(Math.random() * comments.length)]
    } else {
      // اختيار تسلسلي
      const comment = comments[job.currentCommentIndex]
      job.currentCommentIndex = (job.currentCommentIndex + 1) % comments.length
      return comment
    }
  }

  // حساب فاصل زمني عشوائي
  getRandomInterval(min, max, randomize) {
    if (!randomize) {
      return min
    }
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // حساب وقت التنفيذ التالي
  calculateNextExecution(schedule) {
    const now = new Date()
    const interval = this.getRandomInterval(
      schedule.minInterval,
      schedule.maxInterval,
      schedule.randomize
    )
    
    return new Date(now.getTime() + interval * 60 * 1000)
  }

  // إيقاف مهمة
  stopJob(jobId) {
    const job = this.jobs.get(jobId)
    if (!job) return false

    if (job.cronJob) {
      job.cronJob.stop()
      job.cronJob.destroy()
      job.cronJob = null
    }

    if (job.status === 'active') {
      job.status = 'paused'
    }

    console.log(`تم إيقاف المهمة ${jobId}`)
    return true
  }

  // حذف مهمة
  deleteJob(jobId) {
    this.stopJob(jobId)
    const deleted = this.jobs.delete(jobId)
    console.log(`تم حذف المهمة ${jobId}`)
    return deleted
  }

  // استئناف مهمة متوقفة
  resumeJob(jobId) {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'paused') return false

    job.status = 'active'
    this.startJob(job)
    
    console.log(`تم استئناف المهمة ${jobId}`)
    return true
  }

  // الحصول على جميع المهام
  getAllJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      postId: job.postId,
      postShortcode: job.postShortcode,
      status: job.status,
      sentComments: job.sentComments,
      successfulComments: job.successfulComments,
      failedComments: job.failedComments,
      totalComments: job.totalComments,
      createdAt: job.createdAt,
      nextExecutionTime: job.nextExecutionTime,
      comments: job.comments,
      schedule: job.schedule,
      commentHistory: job.commentHistory?.slice(-10) || [] // آخر 10 تعليقات فقط
    }))
  }

  // الحصول على مهمة محددة
  getJob(jobId) {
    return this.jobs.get(jobId)
  }

  // الحصول على إحصائيات عامة
  getStats() {
    const jobs = Array.from(this.jobs.values())
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(job => job.status === 'active').length,
      completedJobs: jobs.filter(job => job.status === 'completed').length,
      failedJobs: jobs.filter(job => job.status === 'failed').length,
      totalCommentsSent: jobs.reduce((sum, job) => sum + job.sentComments, 0),
      totalCommentsSuccess: jobs.reduce((sum, job) => sum + job.successfulComments, 0),
      totalCommentsFailed: jobs.reduce((sum, job) => sum + job.failedComments, 0)
    }
  }

  // تنظيف المهام المكتملة والمحذوفة
  cleanup() {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.createdAt < oneDayAgo
      ) {
        this.deleteJob(jobId)
      }
    }
  }

  // إيقاف جميع المهام
  stopAllJobs() {
    for (const jobId of this.jobs.keys()) {
      this.stopJob(jobId)
    }
    console.log('تم إيقاف جميع المهام')
  }
}

// إنشاء نسخة واحدة من المجدول
const commentScheduler = new CommentScheduler()

// تنظيف دوري كل ساعة
setInterval(() => {
  commentScheduler.cleanup()
}, 60 * 60 * 1000)

export default commentScheduler