import { supabase } from './config.js';

const SESSION_KEY = 'admin_session';
const SESSION_TIMESTAMP_KEY = 'admin_session_ts';
const SESSION_TIMEOUT = 4 * 60 * 60 * 1000;

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

        const sessionData = {
            user: data.user,
            profile,
            timestamp: Date.now()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));

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
        localStorage.removeItem(SESSION_TIMESTAMP_KEY);
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

export async function validateSessionIntegrity() {
    try {
        const sessionRaw = localStorage.getItem(SESSION_KEY);
        if (!sessionRaw) return false;

        const session = JSON.parse(sessionRaw);
        const timestamp = parseInt(localStorage.getItem(SESSION_TIMESTAMP_KEY) || '0', 10);

        if (!session || !session.user || !session.profile) {
            await clearSession();
            return false;
        }

        if (timestamp && Date.now() - timestamp > SESSION_TIMEOUT) {
            await clearSession();
            return false;
        }

        return true;
    } catch (error) {
        console.error('Session integrity error:', error);
        await clearSession();
        return false;
    }
}

export async function checkAuth() {
    try {
        const hasIntegrity = await validateSessionIntegrity();
        if (!hasIntegrity) return false;

        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            await clearSession();
            return false;
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            await clearSession();
            return false;
        }

        localStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        await clearSession();
        return false;
    }
}

export async function clearSession() {
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
    } finally {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_TIMESTAMP_KEY);
    }
}

export async function getAdminUser() {
    const isAuth = await checkAuth();
    if (!isAuth) return null;
    return getCurrentUser();
}

export function isAdminRole(role) {
    return role === 'admin' || role === 'super_admin';
}
