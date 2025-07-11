// Authentication module
import { db } from './database.js';

export let currentUser = null;

export function login(username, password) {
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        return true;
    }
    return false;
}

export function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
}

export function checkLogin() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        return true;
    }
    return false;
}

export function getCurrentUser() {
    return currentUser;
}

