import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('\n🛑 إيقاف البوت متعدد الحسابات...');
    
    // إيقاف التوقيتات
    if (global.commentInterval) {
      clearTimeout(global.commentInterval);
      global.commentInterval = null;
      console.log('⏹️ تم إيقاف مؤقت التعليقات');
    }
    
    if (global.accountSwitchInterval) {
      clearTimeout(global.accountSwitchInterval);
      global.accountSwitchInterval = null;
      console.log('⏹️ تم إيقاف مؤقت تبديل الحسابات');
    }
    
    // إحصائيات قبل الإغلاق
    if (global.bots && global.bots.length > 0) {
      console.log('\n📊 إحصائيات الجلسة:');
      console.log(`   - إجمالي التعليقات: ${global.totalComments || 0}`);
      console.log(`   - عدد الحسابات المستخدمة: ${global.bots.length}`);
      
      for (const botData of global.bots) {
        console.log(`   - ${botData.username}: ${botData.commentsPosted} تعليق`);
      }
    }
    
    // إغلاق جميع المتصفحات
    if (global.bots && global.bots.length > 0) {
      console.log('\n🌐 إغلاق المتصفحات...');
      
      for (const botData of global.bots) {
        try {
          await botData.bot.close();
          console.log(`   ✅ ${botData.username}`);
        } catch (error) {
          console.error(`   ❌ ${botData.username}: ${error.message}`);
        }
      }
    }
    
    // إعادة تعيين المتغيرات العامة
    global.bots = [];
    global.currentBotIndex = 0;
    global.isRunning = false;
    global.totalComments = 0;
    
    console.log('\n✅ تم إيقاف البوت بنجاح\n');
    console.log('=================================\n');
    
    return NextResponse.json({ 
      success: true,
      message: 'تم إيقاف البوت بنجاح',
      stats: {
        totalComments: global.totalComments || 0,
        accountsUsed: global.bots ? global.bots.length : 0
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ أثناء إيقاف البوت:', error);
    
    // محاولة إعادة تعيين المتغيرات حتى في حالة الخطأ
    global.bots = [];
    global.currentBotIndex = 0;
    global.isRunning = false;
    global.totalComments = 0;
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'حدث خطأ أثناء إيقاف البوت' 
    });
  }
} 