/**
 * ProtectedRoute - Component that protects admin routes from unauthorized access
 * 
 * Redirects users without proper roles (only COMPETITOR or no role) to home page
 * Allowed roles: ADMIN, LEADER, REFEREE, ASSISTANT
 */
import React from 'react';
import { Navigate } from 'react-router-dom';

// Admin routes that require higher roles than COMPETITOR
const ADMIN_ONLY_ROUTES = [
    '/admin-dashboard',
    '/user-management',
    '/team-management',
    '/registration-management',
    '/robot-management',
    '/competition-management',
    '/playground-management',
    '/match-management',
    '/match-group',
    '/playground-matches',
    '/tournament-generator',
    '/match-score',
    '/competition-detail'
];

// Roles that are allowed to access admin routes
const ADMIN_ROLES = ['ADMIN', 'LEADER', 'REFEREE', 'ASSISTANT'];

/**
 * Check if user has admin access
 * @returns {boolean} true if user has at least one admin role
 */
export const hasAdminAccess = () => {
    const rolesString = localStorage.getItem('roles');
    if (!rolesString) return false;
    
    const rolesArray = rolesString.split(', ');
    return rolesArray.some(role => ADMIN_ROLES.includes(role));
};

/**
 * Check if a path requires admin access
 * @param {string} path - The route path to check
 * @returns {boolean} true if path requires admin access
 */
export const isAdminRoute = (path) => {
    return ADMIN_ONLY_ROUTES.some(route => path.startsWith(route));
};

/**
 * ProtectedRoute component
 * Wraps route elements and redirects unauthorized users
 */
const ProtectedRoute = ({ children, path }) => {
    // Check if this is an admin route
    if (isAdminRoute(path)) {
        // Check if user has admin access
        if (!hasAdminAccess()) {
            // Redirect to home page
            return <Navigate to="/admin/dashboard" replace />;
        }
    }
    
    return children;
};

export default ProtectedRoute;
