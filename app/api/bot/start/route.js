import { NextResponse } from 'next/server';

const InstagramBot = require('../../../../lib/InstagramBot');

// متغيرات عامة
global.bots = [];
global.currentBotIndex = 0;
global.commentInterval = null;
global.accountSwitchInterval = null;
global.isRunning = false;
global.totalComments = 0;
global.lastUsedComment = null; // لتجنب التكرار

export async function POST(request) {
  try {
    const data = await request.json();
    const { accounts, postUrl, comments, minInterval, maxInterval, accountSwitchDelay } = data;
    
    // التحقق من البيانات
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'يرجى إضافة حساب واحد على الأقل' 
      });
    }

    if (!postUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'يرجى إدخال رابط المنشور' 
      });
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'يرجى إضافة تعليق واحد على الأقل' 
      });
    }

    // إيقاف أي بوت سابق
    await stopAllBots();

    console.log('\n=================================');
    console.log('🚀 Starting Multi-Account Bot');
    console.log('=================================');
    console.log(`📊 عدد الحسابات: ${accounts.length}`);
    console.log(`🔗 المنشور: ${postUrl}`);
    console.log(`💬 عدد التعليقات المختلفة: ${comments.length}`);
    console.log(`⏰ التوقيت: ${minInterval}-${maxInterval} دقيقة بين التعليقات`);
    console.log(`🔄 تبديل الحساب كل: ${accountSwitchDelay} ثانية`);
    console.log('=================================\n');

    global.isRunning = true;
    global.totalComments = 0;
    global.currentBotIndex = 0;
    global.lastUsedComment = null;

    // تسجيل الدخول لجميع الحسابات
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      console.log(`\n📌 تسجيل الدخول للحساب #${i + 1}: ${account.username}`);
      
      try {
        const bot = new InstagramBot({
          username: account.username,
          password: account.password,
          postUrl: postUrl
        });
        
        await bot.login();
        global.bots.push({
          bot: bot,
          username: account.username,
          active: true,
          commentsPosted: 0
        });
        
        console.log(`✅ تم تسجيل الدخول بنجاح: ${account.username}`);
        
        // انتظار قليل بين تسجيل دخول الحسابات
        if (i < accounts.length - 1) {
          console.log('⏳ انتظار 5 ثواني قبل الحساب التالي...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error(`❌ فشل تسجيل الدخول للحساب ${account.username}: ${error.message}`);
      }
    }

    if (global.bots.length === 0) {
      console.error('❌ فشل تسجيل الدخول لجميع الحسابات');
      return NextResponse.json({ 
        success: false, 
        error: 'فشل تسجيل الدخول لجميع الحسابات' 
      });
    }

    console.log(`\n✅ تم تسجيل الدخول لـ ${global.bots.length} حساب بنجاح`);
    console.log(`📝 التعليقات المتاحة: ${comments.join(' | ')}`);

    // دالة لاختيار تعليق عشوائي مع تجنب التكرار
    const selectRandomComment = () => {
      if (comments.length === 1) {
        return comments[0];
      }

      // إنشاء قائمة من التعليقات باستثناء آخر تعليق مستخدم
      let availableComments = comments;
      if (global.lastUsedComment !== null) {
        availableComments = comments.filter(c => c !== global.lastUsedComment);
        
        // إذا كانت القائمة فارغة (كل التعليقات متطابقة)، استخدم القائمة الأصلية
        if (availableComments.length === 0) {
          availableComments = comments;
        }
      }

      // اختيار تعليق عشوائي
      const randomIndex = Math.floor(Math.random() * availableComments.length);
      const selectedComment = availableComments[randomIndex];
      
      // حفظ آخر تعليق مستخدم
      global.lastUsedComment = selectedComment;
      
      return selectedComment;
    };

    // دالة نشر التعليق
    const postComment = async () => {
      if (!global.isRunning || global.bots.length === 0) return;

      try {
        // اختيار البوت الحالي
        const currentBot = global.bots[global.currentBotIndex];
        
        if (!currentBot || !currentBot.active) {
          console.log('⚠️ البوت الحالي غير نشط، التبديل للتالي...');
          global.currentBotIndex = (global.currentBotIndex + 1) % global.bots.length;
          scheduleNextComment();
          return;
        }

        // اختيار تعليق عشوائي (مع تجنب التكرار)
        const selectedComment = selectRandomComment();
        
        global.totalComments++;
        console.log(`\n📝 التعليق #${global.totalComments}`);
        console.log(`👤 الحساب: ${currentBot.username}`);
        console.log(`💭 النص: "${selectedComment}"`);
        
        // نشر التعليق
        await currentBot.bot.postComment(selectedComment);
        
        currentBot.commentsPosted++;
        console.log(`✅ تم نشر التعليق بنجاح!`);
        console.log(`📊 عدد تعليقات هذا الحساب: ${currentBot.commentsPosted}`);
        
        // التبديل للحساب التالي
        global.currentBotIndex = (global.currentBotIndex + 1) % global.bots.length;
        console.log(`🔄 الحساب التالي: ${global.bots[global.currentBotIndex].username}`);
        
        // جدولة التعليق التالي
        scheduleNextComment();
        
      } catch (error) {
        console.error(`❌ خطأ في نشر التعليق: ${error.message}`);
        
        // تعطيل البوت الحالي إذا فشل
        const currentBot = global.bots[global.currentBotIndex];
        if (currentBot) {
          currentBot.active = false;
          console.log(`⚠️ تم تعطيل الحساب: ${currentBot.username}`);
        }
        
        // التبديل للحساب التالي
        global.currentBotIndex = (global.currentBotIndex + 1) % global.bots.length;
        
        // التحقق من وجود حسابات نشطة
        const activeBots = global.bots.filter(b => b.active);
        if (activeBots.length === 0) {
          console.error('❌ لا توجد حسابات نشطة');
          await stopAllBots();
          return;
        }
        
        // جدولة التعليق التالي
        scheduleNextComment();
      }
    };

    // جدولة التعليق التالي
    const scheduleNextComment = () => {
      if (!global.isRunning) return;
      
      // حساب التأخير العشوائي
      const minMs = minInterval * 60 * 1000;
      const maxMs = maxInterval * 60 * 1000;
      const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
      
      // إضافة تأخير تبديل الحساب
      const totalDelay = delay + (accountSwitchDelay * 1000);
      
      console.log(`⏳ التعليق التالي بعد ${Math.round(totalDelay / 60000)} دقيقة`);
      
      global.commentInterval = setTimeout(postComment, totalDelay);
    };

    // بدء أول تعليق بعد 10 ثواني
    console.log('\n⏳ سيبدأ النشر بعد 10 ثواني...');
    global.commentInterval = setTimeout(postComment, 10000);

    return NextResponse.json({ 
      success: true, 
      message: `تم تشغيل البوت مع ${global.bots.length} حساب`,
      accountsCount: global.bots.length
    });
    
  } catch (error) {
    console.error('❌ خطأ في تشغيل البوت:', error);
    await stopAllBots();
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'حدث خطأ غير متوقع' 
    });
  }
}

// دالة إيقاف جميع البوتات
async function stopAllBots() {
  console.log('\n🛑 إيقاف جميع البوتات...');
  
  // إيقاف التوقيتات
  if (global.commentInterval) {
    clearTimeout(global.commentInterval);
    global.commentInterval = null;
  }
  
  if (global.accountSwitchInterval) {
    clearTimeout(global.accountSwitchInterval);
    global.accountSwitchInterval = null;
  }
  
  // إغلاق جميع المتصفحات
  for (const botData of global.bots) {
    try {
      await botData.bot.close();
      console.log(`✅ تم إغلاق: ${botData.username}`);
    } catch (error) {
      console.error(`❌ خطأ في إغلاق ${botData.username}:`, error.message);
    }
  }
  
  // إعادة تعيين المتغيرات
  global.bots = [];
  global.currentBotIndex = 0;
  global.isRunning = false;
  global.totalComments = 0;
  global.lastUsedComment = null;
  
  console.log('✅ تم إيقاف جميع البوتات\n');
}