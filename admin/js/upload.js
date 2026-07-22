import { supabase } from './config.js';
import { showToast } from './ui.js';

const BUCKET_NAME = 'PRODUCT-IMAGES';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function uploadProductImage(file, productId) {
    try {
        if (!file) throw new Error('الرجاء اختيار صورة');
        if (file.size > MAX_FILE_SIZE) throw new Error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        if (!ALLOWED_TYPES.includes(file.type)) throw new Error('نوع الصورة غير مدعوم. استخدم JPEG, PNG, أو WebP');

        const fileExt = file.name.split('.').pop().toLowerCase();
        const safeProductId = String(productId || '').trim();
        if (!safeProductId || safeProductId.startsWith('temp-')) {
            throw new Error('معرف المنتج غير صالح. يرجى حفظ المنتج أولاً.');
        }
        const fileName = `${safeProductId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return {
            url: publicUrl,
            path: data.path,
            fileName: data.name
        };
    } catch (error) {
        console.error('Error uploading image:', error);
        showToast(error.message || 'حدث خطأ في رفع الصورة', 'error');
        throw error;
    }
}

export async function deleteProductImage(url) {
    try {
        const urlParts = url.split(`${BUCKET_NAME}/`);
        if (urlParts.length < 2) throw new Error('رابط الصورة غير صالح');

        const filePath = urlParts[1];

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error) throw error;
        showToast('تم حذف الصورة بنجاح', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting image:', error);
        showToast(error.message || 'حدث خطأ في حذف الصورة', 'error');
        throw error;
    }
}

export async function uploadMultipleImages(files, productId) {
    try {
        const uploadPromises = Array.from(files).map(file => uploadProductImage(file, productId));
        const results = await Promise.all(uploadPromises);
        return results;
    } catch (error) {
        console.error('Error uploading multiple images:', error);
        throw error;
    }
}

export { uploadProductImage as default };
