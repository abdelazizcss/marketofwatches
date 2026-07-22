import { supabase } from './config.js';

const SESSION_KEY = 'admin_session';

export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) return null;

        return {
            id: user.id,
            email: user.email,
            ...profile
        };
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

export async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) throw profileError;

        if (!profile || profile.role !== 'admin') {
            await supabase.auth.signOut();
            throw new Error('ليس لديك صلاحية الوصول إلى لوحة التحكم');
        }

        localStorage.setItem(SESSION_KEY, JSON.stringify({
            user: data.user,
            profile
        }));

        return { success: true, user: data.user, profile };
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export async function logout() {
    try {
        await supabase.auth.signOut();
        localStorage.removeItem(SESSION_KEY);
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

export async function checkAuth() {
    try {
        const session = localStorage.getItem(SESSION_KEY);
        if (!session) return false;

        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            localStorage.removeItem(SESSION_KEY);
            return false;
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            localStorage.removeItem(SESSION_KEY);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}
