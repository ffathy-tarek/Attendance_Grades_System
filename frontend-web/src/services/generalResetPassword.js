import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "../firebase"; //

/**
 * دالة جينيرال لتغيير كلمة المرور من داخل النظام
 * @param {string} currentPassword - الباسوورد الحالية للتأكد من هوية المستخدم
 * @param {string} newPassword - الباسوورد الجديدة
 */
export const handleInternalChangePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser; //

  if (!user) {
    throw new Error("لم يتم العثور على مستخدم مسجل.");
  }

  // 1. إعادة التحقق (Re-authentication) لأن تغيير الباسوورد عملية حساسة
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  
  try {
    // لازم نتأكد إن الباسوورد القديمة صح قبل التغيير
    await reauthenticateWithCredential(user, credential);
    
    // 2. تحديث الباسوورد للجديدة
    await updatePassword(user, newPassword);
    
    return { success: true };
  } catch (error) {
    // تخصيص رسائل الخطأ
    if (error.code === 'auth/wrong-password') {
      throw new Error("كلمة المرور الحالية غير صحيحة.");
    }
    throw error;
  }
};