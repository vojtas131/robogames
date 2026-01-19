/**
 * ProtectedRoute - Component that protects admin routes from unauthorized access
 * 
 * Redirects users without proper roles to home page
 * Role definitions come from AdminDashboard.js
 */
import React from 'react';
import { Navigate } from 'react-router-dom';

// Route and role mapping - must match AdminDashboard.js
const ROUTE_ROLE_MAP = {
    '/admin-dashboard': ['ADMIN', 'LEADER', 'ASSISTANT'],
    '/user-management': ['ADMIN', 'LEADER'],
    '/team-management': ['LEADER', 'ASSISTANT', 'ADMIN'],
    '/registration-management': ['LEADER', 'ASSISTANT', 'ADMIN'],
    '/robot-management': ['LEADER', 'ASSISTANT', 'ADMIN'],
    '/competition-management': ['LEADER', 'ADMIN'],
    '/playground-management': ['LEADER', 'ASSISTANT', 'ADMIN'],
    '/match-management': ['REFEREE','LEADER', 'ASSISTANT', 'ADMIN'],
    '/match-group': ['LEADER', 'ASSISTANT', 'ADMIN'],
    '/playground-matches': ['LEADER', 'ASSISTANT', 'ADMIN'],
    '/tournament-generator': ['LEADER', 'ADMIN'],
    '/match-score': ['LEADER', 'ASSISTANT', 'ADMIN'],
    '/competition-detail': ['LEADER', 'ASSISTANT', 'ADMIN']
};

// Admin routes that require higher roles than COMPETITOR
const ADMIN_ONLY_ROUTES = Object.keys(ROUTE_ROLE_MAP);

/**
 * Check if user has access to a specific route
 * @param {string} path - The route path to check
 * @returns {boolean} true if user has required role for the route
 */
export const hasRouteAccess = (path) => {
    const rolesString = localStorage.getItem('roles');
    if (!rolesString) return false;
    
    const rolesArray = rolesString.split(', ');
    const requiredRoles = ROUTE_ROLE_MAP[path];
    
    // If route is not in map, allow access
    if (!requiredRoles) return true;
    
    // Check if user has at least one required role
    return rolesArray.some(role => requiredRoles.includes(role));
};

/**
 * Check if a path requires admin access
 * @param {string} path - The route path to check
 * @returns {boolean} true if path requires admin access
 */
export const isAdminRoute = (path) => {
    return ROUTE_ROLE_MAP.hasOwnProperty(path);
};

/**
 * ProtectedRoute component
 * Wraps route elements and redirects unauthorized users to home page
 */
const ProtectedRoute = ({ children, path }) => {
    // Check if this is an admin route
    if (isAdminRoute(path)) {
        // Check if user has access to this specific route
        if (!hasRouteAccess(path)) {
            // Redirect to home page
            return <Navigate to="/" replace />;
        }
    }
    
    return children;
};

export default ProtectedRoute;
