import client from './client';

export const register = async (userData) => {
    try {
        const response = await client.post('/api/auth/register', {
            username: userData.name.toLowerCase().replace(/\s/g, '') + Math.floor(Math.random() * 1000),
            email: userData.email,
            password: userData.password,
            name: userData.name,
            level: userData.level?.toLowerCase() || 'beginner',
            language: userData.language?.toLowerCase() || 'en'
        });

        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user_id', response.data.user.user_id);
            localStorage.setItem('name', response.data.user.name);
            localStorage.setItem('level', response.data.user.level);
            localStorage.setItem('language', response.data.user.language);
        }
        return response.data;
    } catch (error) {
        console.error("Registration failed:", error);
        throw error;
    }
};

export const login = async (identifier, password) => {
    const response = await client.post('/api/auth/login', { identifier, password });
    if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user_id', response.data.user.user_id);
        localStorage.setItem('name', response.data.user.name);
        localStorage.setItem('level', response.data.user.level);
        localStorage.setItem('language', response.data.user.language);
    }
    return response.data;
};

export const logout = async () => {
    await client.post('/api/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('name');
    localStorage.removeItem('level');
    localStorage.removeItem('language');
};

export const getMe = async () => {
    const response = await client.get('/api/auth/me');
    return response.data;
};

export const checkUsername = async (username) => {
    const response = await client.get(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
    return response.data;
};
