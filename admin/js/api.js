import { supabase } from './config.js';
import { showToast } from './ui.js';

export async function fetchCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching categories:', error);
        showToast('حدث خطأ في تحميل الفئات', 'error');
        throw error;
    }
}

export async function fetchCategoryById(id) {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching category:', error);
        showToast('حدث خطأ في تحميل الفئة', 'error');
        throw error;
    }
}

export async function createCategory(category) {
    try {
        const { data, error } = await supabase
            .from('categories')
            .insert([category])
            .select()
            .single();

        if (error) throw error;
        showToast('تم إضافة الفئة بنجاح', 'success');
        return data;
    } catch (error) {
        console.error('Error creating category:', error);
        showToast('حدث خطأ في إضافة الفئة', 'error');
        throw error;
    }
}

export async function updateCategory(id, updates) {
    try {
        const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        showToast('تم تحديث الفئة بنجاح', 'success');
        return data;
    } catch (error) {
        console.error('Error updating category:', error);
        showToast('حدث خطأ في تحديث الفئة', 'error');
        throw error;
    }
}

export async function deleteCategory(id) {
    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        showToast('تم حذف الفئة بنجاح', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('حدث خطأ في حذف الفئة', 'error');
        throw error;
    }
}

export async function fetchProducts(options = {}) {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            category = '',
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = options;

        let query = supabase
            .from('products')
            .select(`
                *,
                categories (
                    id,
                    name
                ),
                product_images (*)
            `, { count: 'exact' });

        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        if (category) {
            query = query.eq('category_id', category);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query
            .order(sortBy, { ascending: sortOrder === 'asc' })
            .range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            data: data || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    } catch (error) {
        console.error('Error fetching products:', error);
        showToast('حدث خطأ في تحميل المنتجات', 'error');
        throw error;
    }
}

export async function fetchProductById(id) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                categories (
                    id,
                    name
                ),
                product_images (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching product:', error);
        showToast('حدث خطأ في تحميل المنتج', 'error');
        throw error;
    }
}

export async function createProduct(product) {
    try {
        const { data, error } = await supabase
            .from('products')
            .insert([product])
            .select()
            .single();

        if (error) throw error;
        showToast('تم إضافة المنتج بنجاح', 'success');
        return data;
    } catch (error) {
        console.error('Error creating product:', error);
        showToast('حدث خطأ في إضافة المنتج', 'error');
        throw error;
    }
}

export async function updateProduct(id, updates) {
    try {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        showToast('تم تحديث المنتج بنجاح', 'success');
        return data;
    } catch (error) {
        console.error('Error updating product:', error);
        showToast('حدث خطأ في تحديث المنتج', 'error');
        throw error;
    }
}

export async function deleteProduct(id) {
    try {
        const { data: images, error: imagesError } = await supabase
            .from('product_images')
            .select('path')
            .eq('product_id', id);

        if (imagesError) throw imagesError;

        if (images && images.length > 0) {
            const paths = images.map(img => img.path);
            const { error: storageError } = await supabase.storage
                .from('PRODUCT-IMAGES')
                .remove(paths);

            if (storageError) console.error('Error deleting images from storage:', storageError);
        }

        const { error: deleteImagesError } = await supabase
            .from('product_images')
            .delete()
            .eq('product_id', id);

        if (deleteImagesError) console.error('Error deleting product images:', deleteImagesError);

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        showToast('تم حذف المنتج بنجاح', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('حدث خطأ في حذف المنتج', 'error');
        throw error;
    }
}

export async function fetchOrders(options = {}) {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = ''
        } = options;

        let query = supabase
            .from('orders')
            .select('*', { count: 'exact' });

        if (search) {
            query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,customer_email.ilike.%${search}%`);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query
            .order('created_at', { ascending: false })
            .range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            data: data || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    } catch (error) {
        console.error('Error fetching orders:', error);
        showToast('حدث خطأ في تحميل الطلبات', 'error');
        throw error;
    }
}

export async function fetchOrderById(id) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching order:', error);
        showToast('حدث خطأ في تحميل الطلب', 'error');
        throw error;
    }
}

export async function updateOrderStatus(id, status) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        showToast('تم تحديث حالة الطلب بنجاح', 'success');
        return data;
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('حدث خطأ في تحديث حالة الطلب', 'error');
        throw error;
    }
}

export async function deleteOrder(id) {
    try {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id);

        if (error) throw error;
        showToast('تم حذف الطلب بنجاح', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting order:', error);
        showToast('حدث خطأ في حذف الطلب', 'error');
        throw error;
    }
}

export async function cleanupTempImages() {
    try {
        const { data, error } = await supabase
            .from('product_images')
            .select('id, url, path')
            .like('path', 'temp-%');

        if (error) throw error;

        for (const img of data) {
            try {
                await supabase.storage
                    .from('PRODUCT-IMAGES')
                    .remove([img.path]);
            } catch (e) {
                console.error('Error removing temp image from storage:', e);
            }
            await supabase
                .from('product_images')
                .delete()
                .eq('id', img.id);
        }

        return data.length;
    } catch (error) {
        console.error('Error cleaning up temp images:', error);
        throw error;
    }
}
export async function getDashboardStats() {
    try {
        const [
            productsResult,
            categoriesResult,
            ordersResult,
            ordersStatusResult
        ] = await Promise.all([
            supabase.from('products').select('id', { count: 'exact', head: true }),
            supabase.from('categories').select('id', { count: 'exact', head: true }),
            supabase.from('orders').select('id', { count: 'exact', head: true }),
            supabase.from('orders').select('status')
        ]);

        if (productsResult.error) throw productsResult.error;
        if (categoriesResult.error) throw categoriesResult.error;
        if (ordersResult.error) throw ordersResult.error;
        if (ordersStatusResult.error) throw ordersStatusResult.error;

        const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
        const pendingOrders = ordersStatusResult.data?.filter(o => o.status === 'pending').length || 0;
        const deliveredOrders = ordersStatusResult.data?.filter(o => o.status === 'delivered').length || 0;

        return {
            totalProducts: productsResult.count || 0,
            totalCategories: categoriesResult.count || 0,
            totalOrders: ordersResult.count || 0,
            totalRevenue,
            pendingOrders,
            deliveredOrders
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        showToast('حدث خطأ في تحميل الإحصائيات', 'error');
        throw error;
    }
}
