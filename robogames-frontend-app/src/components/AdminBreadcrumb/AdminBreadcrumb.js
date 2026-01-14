import React, { useContext, useEffect, useId, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Badge,
  Button,
  UncontrolledDropdown,
} from 'reactstrap';
import { useAdmin } from 'contexts/AdminContext';
import { useUser } from 'contexts/UserContext';
import { useToast } from 'contexts/ToastContext';
import { ThemeContext, themes } from 'contexts/ThemeContext';
import { t } from 'translations/translate';
import { loginWithKeycloak, logoutFromKeycloak } from '../KeyCloak/KeyCloak';

/**
 * AdminBreadcrumb - Main navigation bar with breadcrumb, year selector, user menu and notifications
 * Replaces the old AdminNavbar - positioned at the top of the page
 */
function AdminBreadcrumb({ toggleSidebar, sidebarOpened }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedYear, setSelectedYear, years, competitions, loading } = useAdmin();
  const { token, tokenExpired } = useUser();
  const { theme } = useContext(ThemeContext);
  const toast = useToast();
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]); // Žádosti o vstup do týmu (pro vedoucího)
  const [userInfo, setUserInfo] = useState({ name: '', surname: '', teamId: null, isLeader: false });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [playgroundInfo, setPlaygroundInfo] = useState(null);
  const breadcrumbId = useId();
  
  const isDark = theme === themes.dark;
  const isLoggedIn = !!token;
  
  // Check if user is admin
  const roles = localStorage.getItem('roles') || '';
  const isAdmin = roles.includes('ADMIN') || roles.includes('MAIN_REFEREE');
  
  // Responsive breakpoints
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth < 992;

  // Track window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch user info and invitations
  useEffect(() => {
    if (!token) return;
    
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/info`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tokenExpired(response.status)) return;
        if (response.ok) {
          const result = await response.json();
          const userData = result.data;
          setUserInfo({ 
            name: userData.name, 
            surname: userData.surname,
            teamId: userData.teamID,
            isLeader: userData.teamID > 0 && userData.id === userData.leaderID
          });
          
          // Pokud je uživatel vedoucí týmu, načti žádosti o vstup
          if (userData.teamID > 0) {
            fetchJoinRequests();
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };
    
    fetchUserInfo();
    fetchInvitations();
  }, [token]);

  const fetchInvitations = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/getTeamInvitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;
      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        setInvitations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setInvitations([]);
    }
  };

  const fetchJoinRequests = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/joinRequests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;
      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        setJoinRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
      setJoinRequests([]);
    }
  };

  // Fetch playground info for dynamic breadcrumb label
  useEffect(() => {
    const fetchPlaygroundInfo = async () => {
      // Check if we're on playground-matches page
      const playgroundMatch = location.pathname.match(/\/admin\/playground-matches\/(\d+)/);
      if (playgroundMatch && token) {
        const playgroundId = playgroundMatch[1];
        try {
          const response = await fetch(
            `${process.env.REACT_APP_API_URL}api/playground/getByID?id=${playgroundId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (response.ok) {
            const result = await response.json();
            if (result.type === 'RESPONSE') {
              setPlaygroundInfo(result.data);
            }
          }
        } catch (error) {
          console.error('Error fetching playground info:', error);
        }
      } else {
        setPlaygroundInfo(null);
      }
    };
    fetchPlaygroundInfo();
  }, [location.pathname, token]);

  const acceptInvitation = async (invitationId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/acceptInvitation?id=${invitationId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (tokenExpired(response.status)) return;
      
      const result = await response.json();
      if (response.ok && result.data === "success") {
        toast.success(t("invitationAccepted") || "Pozvánka byla přijata");
        // Reload stránky pokud je uživatel na stránce týmu
        if (location.pathname === '/admin/my-team') {
          window.location.reload();
        }
      } else {
        toast.error(result.data || t("invitationAcceptFail") || "Nepodařilo se přijmout pozvánku");
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error(t("invitationAcceptFail") || "Nepodařilo se přijmout pozvánku");
    }
    fetchInvitations();
  };

  const rejectInvitation = async (invitationId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/rejectInvitation?id=${invitationId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (tokenExpired(response.status)) return;
      
      const result = await response.json();
      if (response.ok && result.data === "success") {
        toast.success(t("invitationRejected") || "Pozvánka byla odmítnuta");
      } else {
        toast.error(result.data || t("invitationRejectFail") || "Nepodařilo se odmítnout pozvánku");
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast.error(t("invitationRejectFail") || "Nepodařilo se odmítnout pozvánku");
    }
    fetchInvitations();
  };

  // Přijetí žádosti o vstup do týmu (pro vedoucího)
  const acceptJoinRequest = async (requestId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/acceptJoinRequest?id=${requestId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (tokenExpired(response.status)) return;
      
      const result = await response.json();
      if (response.ok && result.data === "success") {
        toast.success(t("joinRequestAccepted") || "Žádost o vstup byla přijata");
        // Reload stránky pokud je uživatel na stránce týmu
        if (location.pathname === '/admin/my-team') {
          window.location.reload();
        }
      } else {
        toast.error(result.data || t("joinRequestAcceptFail") || "Nepodařilo se přijmout žádost");
      }
    } catch (error) {
      console.error('Error accepting join request:', error);
      toast.error(t("joinRequestAcceptFail") || "Nepodařilo se přijmout žádost");
    }
    fetchJoinRequests();
  };

  // Odmítnutí žádosti o vstup do týmu (pro vedoucího)
  const rejectJoinRequest = async (requestId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/rejectJoinRequest?id=${requestId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (tokenExpired(response.status)) return;
      
      const result = await response.json();
      if (response.ok && result.data === "success") {
        toast.success(t("joinRequestRejected") || "Žádost o vstup byla odmítnuta");
      } else {
        toast.error(result.data || t("joinRequestRejectFail") || "Nepodařilo se odmítnout žádost");
      }
    } catch (error) {
      console.error('Error rejecting join request:', error);
      toast.error(t("joinRequestRejectFail") || "Nepodařilo se odmítnout žádost");
    }
    fetchJoinRequests();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    localStorage.removeItem('UserID');
    logoutFromKeycloak();
  };

  const handleClickOnNotification = async () => {
    if (notificationOpen) {
      return setNotificationOpen(false);
    }
    await fetchInvitations();
    if (userInfo.teamId > 0) {
      await fetchJoinRequests();
    }
    return setNotificationOpen(true);
  };

  // Formátování data pro notifikace
  const formatNotificationDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("justNow") || "právě teď";
    if (diffMins < 60) return `${diffMins} ${t("minutesAgo") || "min"}`;
    if (diffHours < 24) return `${diffHours} ${t("hoursAgo") || "h"}`;
    if (diffDays < 7) return `${diffDays} ${t("daysAgo") || "d"}`;
    
    return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
  };

  // Celkový počet notifikací
  const totalNotifications = invitations.length + joinRequests.length;

  // Inject dynamic CSS for breadcrumb separator colors
  useEffect(() => {
    const styleId = `breadcrumb-style-${breadcrumbId.replace(/:/g, '-')}`;
    let styleEl = document.getElementById(styleId);
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    
    const separatorColor = isDark ? '#9a9a9a' : '#8898aa';
    styleEl.textContent = `
      .admin-breadcrumb-nav .breadcrumb {
        background-color: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .admin-breadcrumb-nav .breadcrumb-item + .breadcrumb-item::before {
        color: ${separatorColor} !important;
        content: "›" !important;
        font-size: 16px !important;
        font-weight: bold !important;
      }
      .admin-breadcrumb-nav .breadcrumb-item.active {
        color: inherit !important;
      }
    `;
    
    return () => {
      // Clean up on unmount
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, [isDark, breadcrumbId]);

  // Define route hierarchy and labels
  const routeConfig = {
    '/admin/dashboard': { 
      label: t('home'), 
      parent: null,
      icon: 'icon-chart-pie-36'
    },
    '/admin/admin-dashboard': { 
      label: t('adminMenu'), 
      parent: '/admin/dashboard',
      icon: 'icon-settings-gear-63'
    },
    '/admin/user-management': { 
      label: t('manageUser'), 
      parent: '/admin/admin-dashboard',
      icon: 'icon-single-02'
    },
    '/admin/team-management': { 
      label: t('teamManagement'), 
      parent: '/admin/admin-dashboard',
      icon: 'icon-molecule-40'
    },
    '/admin/competition-management': { 
      label: t('manageComp'), 
      parent: '/admin/admin-dashboard',
      icon: 'icon-trophy'
    },
    '/admin/competition-detail': { 
      label: t('particips'), 
      parent: '/admin/competition-management',
      icon: 'icon-bullet-list-67',
      needsYear: true
    },
    '/admin/registration-management': { 
      label: t('registrationManagement'), 
      parent: '/admin/admin-dashboard',
      icon: 'icon-paper',
      needsYear: true
    },
    '/admin/robot-management': { 
      label: t('robotManagement'), 
      parent: '/admin/admin-dashboard',
      icon: 'icon-spaceship',
      needsYear: true
    },
    '/admin/playground-management': { 
      label: t('managePg'), 
      parent: '/admin/admin-dashboard',
      icon: 'icon-app'
    },
    '/admin/match-management': { 
      label: t('matchManagement'), 
      parent: '/admin/admin-dashboard',
      icon: 'icon-controller',
      needsYear: true
    },
    '/admin/playground-detail': { 
      label: t('pgDetail'), 
      parent: '/admin/match-management',
      icon: 'icon-map-big',
      needsYear: true
    },
    '/admin/competition-registration': { 
      label: t('compTeamRegister'), 
      parent: '/admin/my-team',
      icon: 'icon-badge',
      needsYear: true
    },
    '/admin/robot-registration': { 
      label: t('robotRegistration'), 
      parent: '/admin/competition-registration',
      icon: 'icon-vector',
      needsYear: true
    },
    '/admin/robot-profile': { 
      label: t('robotProfile'), 
      parent: '/admin/robot-registration',
      icon: 'icon-settings'
    },
    '/admin/my-team': { 
      label: t('myTeam'), 
      parent: '/admin/dashboard',
      icon: 'icon-molecule-40'
    },
    '/admin/browse-teams': { 
      label: t('browseTeams') || 'Procházet týmy', 
      parent: '/admin/dashboard',
      icon: 'icon-zoom-split'
    },
    '/admin/user-profile': { 
      label: t('myProfile'), 
      parent: '/admin/dashboard',
      icon: 'icon-single-02'
    },
    '/admin/disciplines': { 
      label: t('disc'), 
      parent: '/admin/dashboard',
      icon: 'icon-components'
    },
    '/admin/competition-results': { 
      label: t('result'), 
      parent: '/admin/dashboard',
      icon: 'icon-book-bookmark',
      needsYear: true
    },
    '/admin/rules': { 
      label: t('rule'), 
      parent: '/admin/dashboard',
      icon: 'icon-bulb-63'
    },
    '/admin/contact-us': { 
      label: t('contact'), 
      parent: '/admin/dashboard',
      icon: 'icon-chat-33'
    },
    '/admin/match-score': { 
      label: t('scoreEntry') || 'Zápis skóre', 
      parent: '/admin/match-management',
      icon: 'icon-pencil',
      needsYear: true
    },
    '/admin/match-group': { 
      label: t('matchGroupTitle') || 'Skupina', 
      parent: '/admin/match-management',
      icon: 'icon-components',
      dynamic: true  // Label will be set dynamically from URL
    },
    '/admin/playground-matches': { 
      label: t('playground') || 'Hřiště', 
      parent: '/admin/match-management',
      icon: 'icon-square-pin',
      dynamic: true  // Label will be set dynamically from URL
    },
    '/admin/match-schedule': { 
      label: t('matchSchedule') || 'Rozvrh zápasů', 
      parent: '/admin/dashboard',
      icon: 'icon-time-alarm',
      needsYear: true
    },
    '/admin/generate': { 
      label: t('generate') || 'Generování', 
      parent: '/admin/admin-dashboard',
      icon: 'icon-puzzle-10',
      needsYear: true
    },
  };
  
  // Helper to find route config - supports parameterized paths like /admin/match-score/:id
  const findRouteConfig = (path) => {
    // Direct match first
    if (routeConfig[path]) return { config: routeConfig[path], matchedPath: path };
    
    // Try prefix matching for parameterized routes
    const pathParts = path.split('/');
    for (const configPath of Object.keys(routeConfig)) {
      const configParts = configPath.split('/');
      // Check if the path starts with the config path (e.g., /admin/match-score matches /admin/match-score/12)
      if (pathParts.length > configParts.length && 
          configParts.every((part, i) => part === pathParts[i])) {
        return { config: routeConfig[configPath], matchedPath: configPath };
      }
    }
    
    return { config: null, matchedPath: null };
  };

  // Get current path without query params
  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const fromParam = searchParams.get('from');
  
  // Dynamic parent override based on 'from' parameter
  const getDynamicRoute = (route, path) => {
    if (!route) return route;
    
    // robot-profile has dynamic parent based on where user came from
    if (path === '/admin/robot-profile' && fromParam === 'management') {
      return {
        ...route,
        parent: '/admin/robot-management'
      };
    }
    
    // match-score parent depends on where user came from  
    if (path.startsWith('/admin/match-score') && fromParam === 'playground') {
      return {
        ...route,
        parent: '/admin/playground-detail'
      };
    }
    
    return route;
  };
  
  const { config: currentRouteConfig, matchedPath: currentMatchedPath } = findRouteConfig(currentPath);
  const currentRoute = getDynamicRoute(currentRouteConfig, currentPath);

  // Get dynamic label for breadcrumb based on current route
  const getDynamicLabel = (matchedPath, defaultLabel) => {
    // For playground-matches, show playground name and number (plain text)
    if (matchedPath === '/admin/playground-matches' && playgroundInfo) {
      return `${playgroundInfo.name} (${playgroundInfo.number})`;
    }
    
    // For match-group, extract group name from URL
    if (matchedPath === '/admin/match-group') {
      const groupMatch = currentPath.match(/\/admin\/match-group\/(.+)/);
      if (groupMatch) {
        const groupName = decodeURIComponent(groupMatch[1]);
        return groupName;
      }
    }
    
    return defaultLabel;
  };

  // Build breadcrumb trail
  const buildBreadcrumbs = () => {
    const breadcrumbs = [];
    let path = currentPath;
    
    // Start with current route (may be parameterized)
    const { config: startConfig, matchedPath: startMatchedPath } = findRouteConfig(path);
    if (startConfig) {
      const route = getDynamicRoute(startConfig, path);
      const dynamicLabel = route.dynamic ? getDynamicLabel(startMatchedPath, route.label) : route.label;
      breadcrumbs.unshift({
        path: startMatchedPath,
        ...route,
        label: dynamicLabel
      });
      path = route.parent;
    }
    
    // Follow parent chain
    while (path && routeConfig[path]) {
      const route = getDynamicRoute(routeConfig[path], path);
      breadcrumbs.unshift({
        path,
        ...route
      });
      path = route.parent;
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();
  const needsYear = currentRoute?.needsYear || false;

  // Check if we're in admin section (deeper than dashboard)
  const isAdminSection = breadcrumbs.some(b => b.path === '/admin/admin-dashboard');
  
  // Show year selector only for admins in admin section OR when the page needs year
  const showYearSelector = isAdmin && (needsYear || isAdminSection);

  // Theme-aware colors - FIXED for light theme
  const bgColor = isDark ? 'rgba(30, 30, 47, 0.98)' : 'rgba(248, 249, 250, 0.98)';
  const borderColor = isDark ? '#2b3553' : '#dee2e6';
  const textColor = isDark ? '#ffffff' : '#1d253b';
  const mutedColor = isDark ? '#9a9a9a' : '#8898aa';
  const linkColor = isDark ? '#5e72e4' : '#5e72e4';
  const hoverBg = isDark ? 'rgba(94, 114, 228, 0.15)' : 'rgba(94, 114, 228, 0.1)';
  const dropdownBg = isDark ? '#1e1e2f' : '#ffffff';
  const dropdownBorder = isDark ? '#2b3553' : '#dee2e6';

  return (
    <div 
      style={{ 
        backgroundColor: bgColor,
        padding: isMobile ? '8px 12px' : '12px 20px',
        marginLeft: '0',
        marginRight: '0',
        marginTop: '0',
        marginBottom: '0',
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: isMobile ? '8px' : '10px',
        boxShadow: isDark ? '0 2px 10px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
        position: 'sticky',
        top: '0',
        zIndex: 1030,
        backdropFilter: 'blur(10px)',
        minHeight: isMobile ? '50px' : '60px'
      }}
      className="admin-breadcrumb-nav"
    >
      {/* Left side: Hamburger menu + Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flex: 1, minWidth: 0 }}>
        {/* Hamburger menu - always visible when sidebar is collapsed (on tablet/mobile) */}
        {isTablet && (
          <button
            onClick={toggleSidebar}
            style={{
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              flexShrink: 0
            }}
            aria-label="Toggle sidebar"
          >
            <span style={{ 
              display: 'block', 
              width: '22px', 
              height: '2px', 
              backgroundColor: textColor,
              borderRadius: '1px'
            }} />
            <span style={{ 
              display: 'block', 
              width: '22px', 
              height: '2px', 
              backgroundColor: textColor,
              borderRadius: '1px'
            }} />
            <span style={{ 
              display: 'block', 
              width: '22px', 
              height: '2px', 
              backgroundColor: textColor,
              borderRadius: '1px'
            }} />
          </button>
        )}
        
        <Breadcrumb 
          style={{ 
            margin: 0, 
            padding: 0, 
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            flex: 1
          }}
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            // On mobile, show only last 2 items or just the last one
            const showOnMobile = isMobile ? (index >= breadcrumbs.length - (isMobile ? 1 : 2)) : true;
            
            if (!showOnMobile) return null;
            
            return (
              <BreadcrumbItem 
                key={crumb.path}
                active={isLast}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  minWidth: 0
                }}
              >
                {isLast ? (
                  <span style={{ 
                    color: textColor, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: isMobile ? '13px' : '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    <i className={`tim-icons ${crumb.icon}`} style={{ fontSize: isMobile ? '12px' : '14px', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{crumb.label}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(crumb.path)}
                    style={{ 
                      color: linkColor, 
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: isMobile ? '2px 4px' : '4px 8px',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      font: 'inherit',
                      fontSize: isMobile ? '12px' : '14px',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = hoverBg}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {!isMobile && <i className={`tim-icons ${crumb.icon}`} style={{ fontSize: '12px' }} />}
                    {crumb.label}
                  </button>
                )}
              </BreadcrumbItem>
            );
          })}
        </Breadcrumb>
      </div>

      {/* Middle: Year Selector - shown only for admins when needed */}
      {showYearSelector && !isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <Dropdown 
            isOpen={yearDropdownOpen} 
            toggle={() => setYearDropdownOpen(!yearDropdownOpen)}
          >
            <DropdownToggle 
              caret 
              color={isDark ? 'primary' : 'info'}
              size="sm"
              style={{ 
                minWidth: '90px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13px',
                padding: '6px 10px'
              }}
            >
              <i className="tim-icons icon-calendar-60" style={{ fontSize: '11px' }} />
              {loading ? '...' : (selectedYear || t('selectYear'))}
            </DropdownToggle>
            <DropdownMenu
              style={{
                backgroundColor: isDark ? '#1e1e2f' : '#ffffff',
                border: `1px solid ${borderColor}`,
                boxShadow: isDark ? '0 4px 15px rgba(0, 0, 0, 0.4)' : '0 4px 15px rgba(0, 0, 0, 0.15)',
              }}
            >
              {years.map(year => {
                const comp = competitions.find(c => c.year === year);
                return (
                  <DropdownItem 
                    key={year} 
                    onClick={() => setSelectedYear(year)}
                    active={year === selectedYear}
                    style={{
                      color: isDark ? '#ffffff' : '#1d253b',
                      backgroundColor: year === selectedYear 
                        ? (isDark ? 'rgba(94, 114, 228, 0.2)' : 'rgba(94, 114, 228, 0.12)')
                        : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{year}</span>
                    {comp && (
                      <Badge 
                        color={comp.started ? 'success' : 'warning'} 
                        pill 
                        style={{ fontSize: '10px', marginLeft: '10px' }}
                      >
                        {comp.started ? t('started') : t('notStarted')}
                      </Badge>
                    )}
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          </Dropdown>
        </div>
      )}

      {/* Right side: Notifications and User Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px', flexShrink: 0 }}>
        {isLoggedIn ? (
          <>
            {/* Notifications */}
            <Dropdown isOpen={notificationOpen} toggle={handleClickOnNotification}>
              <DropdownToggle 
                color="link" 
                style={{ 
                  color: textColor, 
                  padding: '6px 10px',
                  position: 'relative'
                }}
              >
                <i className="tim-icons icon-bell-55" style={{ fontSize: '18px' }} />
                {totalNotifications > 0 && (
                  <Badge 
                    color="danger" 
                    pill 
                    style={{ 
                      position: 'absolute', 
                      top: '0', 
                      right: '0', 
                      fontSize: '10px',
                      minWidth: '16px',
                      height: '16px',
                      padding: '2px 4px'
                    }}
                  >
                    {totalNotifications}
                  </Badge>
                )}
              </DropdownToggle>
              <DropdownMenu 
                right
                style={{ 
                  backgroundColor: dropdownBg, 
                  border: `1px solid ${dropdownBorder}`,
                  minWidth: '320px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}
              >
                {totalNotifications === 0 ? (
                  <DropdownItem style={{ color: mutedColor }}>
                    {t("notifHere")}
                  </DropdownItem>
                ) : (
                  <>
                    {/* Pozvánky do týmu */}
                    {invitations.length > 0 && (
                      <>
                        <DropdownItem header style={{ color: mutedColor, fontSize: '11px', textTransform: 'uppercase' }}>
                          <i className="tim-icons icon-send mr-2" />
                          {t("teamInvitations") || "Pozvánky do týmu"}
                        </DropdownItem>
                        {invitations.map(invitation => (
                          <DropdownItem 
                            key={`inv-${invitation.id}`} 
                            toggle={false}
                            style={{ 
                              color: textColor,
                              padding: '10px 15px'
                            }}
                          >
                            <div style={{ width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                  <i className="tim-icons icon-alert-circle-exc" style={{ color: '#fb6340', flexShrink: 0, fontSize: '14px' }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                                    {t("inviteFrom")} <strong style={{ color: '#2dce89' }}>{invitation.teamName}</strong>
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', flexShrink: 0 }}>
                                  <Button 
                                    color="success" 
                                    size="sm" 
                                    style={{ padding: '4px 8px' }}
                                    onClick={() => acceptInvitation(invitation.id)}
                                  >
                                    <i className="tim-icons icon-check-2" />
                                  </Button>
                                  <Button 
                                    color="danger" 
                                    size="sm" 
                                    style={{ padding: '4px 8px' }}
                                    onClick={() => rejectInvitation(invitation.id)}
                                  >
                                    <i className="tim-icons icon-simple-remove" />
                                  </Button>
                                </div>
                              </div>
                              {invitation.createdAt && (
                                <small style={{ color: mutedColor, fontSize: '11px', marginLeft: '22px' }}>
                                  {formatNotificationDate(invitation.createdAt)}
                                </small>
                              )}
                            </div>
                          </DropdownItem>
                        ))}
                      </>
                    )}

                    {/* Žádosti o vstup do týmu (pro vedoucího) */}
                    {joinRequests.length > 0 && (
                      <>
                        {invitations.length > 0 && <DropdownItem divider style={{ borderColor: borderColor }} />}
                        <DropdownItem header style={{ color: mutedColor, fontSize: '11px', textTransform: 'uppercase' }}>
                          <i className="tim-icons icon-single-02 mr-2" />
                          {t("joinRequests") || "Žádosti o vstup"}
                        </DropdownItem>
                        {joinRequests.map(request => (
                          <DropdownItem 
                            key={`req-${request.id}`} 
                            toggle={false}
                            style={{ 
                              color: textColor,
                              padding: '10px 15px'
                            }}
                          >
                            <div style={{ width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                  <i className="tim-icons icon-single-02" style={{ color: '#5e72e4', flexShrink: 0, fontSize: '14px' }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                                    <strong style={{ color: '#f5365c' }}>{request.userName} {request.userSurname}</strong>
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', flexShrink: 0 }}>
                                  <Button 
                                    color="success" 
                                    size="sm" 
                                    style={{ padding: '4px 8px' }}
                                    onClick={() => acceptJoinRequest(request.id)}
                                    title={t("acceptRequest") || "Přijmout"}
                                  >
                                    <i className="tim-icons icon-check-2" />
                                  </Button>
                                  <Button 
                                    color="danger" 
                                    size="sm" 
                                    style={{ padding: '4px 8px' }}
                                    onClick={() => rejectJoinRequest(request.id)}
                                    title={t("rejectRequest") || "Odmítnout"}
                                  >
                                    <i className="tim-icons icon-simple-remove" />
                                  </Button>
                                </div>
                              </div>
                              {request.createdAt && (
                                <small style={{ color: mutedColor, fontSize: '11px', marginLeft: '22px' }}>
                                  {formatNotificationDate(request.createdAt)}
                                </small>
                              )}
                            </div>
                          </DropdownItem>
                        ))}
                      </>
                    )}
                  </>
                )}
              </DropdownMenu>
            </Dropdown>

            {/* User Menu */}
            <UncontrolledDropdown>
              <DropdownToggle 
                color="link" 
                style={{ 
                  color: textColor, 
                  padding: isMobile ? '4px 6px' : '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '4px' : '8px'
                }}
              >
                <div 
                  style={{ 
                    width: isMobile ? '28px' : '32px', 
                    height: isMobile ? '28px' : '32px', 
                    borderRadius: '50%', 
                    overflow: 'hidden',
                    border: `2px solid ${borderColor}`,
                    flexShrink: 0
                  }}
                >
                  <img 
                    alt="user" 
                    src={require("assets/img/profile-picture.png")} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                {!isMobile && (
                  <>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>
                      {userInfo.name} {userInfo.surname}
                    </span>
                    <i className="tim-icons icon-minimal-down" style={{ fontSize: '10px' }} />
                  </>
                )}
              </DropdownToggle>
              <DropdownMenu 
                right
                style={{ 
                  backgroundColor: dropdownBg, 
                  border: `1px solid ${dropdownBorder}` 
                }}
              >
                {/* Show name in dropdown on mobile */}
                {isMobile && userInfo.name && (
                  <>
                    <DropdownItem header style={{ color: mutedColor, fontSize: '12px' }}>
                      {userInfo.name} {userInfo.surname}
                    </DropdownItem>
                    <DropdownItem divider style={{ borderColor: borderColor }} />
                  </>
                )}
                
                {/* Year selector in mobile dropdown - only for admins when needed */}
                {isMobile && showYearSelector && (
                  <>
                    <DropdownItem header style={{ color: mutedColor, fontSize: '12px' }}>
                      <i className="tim-icons icon-calendar-60" style={{ marginRight: '6px' }} />
                      {t('selectYear') || 'Vybrat rok'}
                    </DropdownItem>
                    <div style={{ 
                      maxHeight: '150px', 
                      overflowY: 'auto',
                      overflowX: 'hidden'
                    }}>
                      {years.map(year => {
                        const comp = competitions.find(c => c.year === year);
                        return (
                          <DropdownItem 
                            key={year} 
                            onClick={() => setSelectedYear(year)}
                            style={{ 
                              color: year === selectedYear ? linkColor : textColor,
                              fontWeight: year === selectedYear ? 600 : 400,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span>
                              {year === selectedYear && <i className="tim-icons icon-check-2" style={{ marginRight: '6px', fontSize: '11px' }} />}
                              {year}
                            </span>
                            {comp && (
                              <Badge 
                                color={comp.started ? 'success' : 'warning'} 
                                pill 
                                style={{ fontSize: '9px' }}
                              >
                                {comp.started ? t('started') : t('notStarted')}
                              </Badge>
                            )}
                          </DropdownItem>
                        );
                      })}
                    </div>
                    <DropdownItem divider style={{ borderColor: borderColor }} />
                  </>
                )}
                
                <DropdownItem 
                  onClick={() => navigate('/admin/user-profile')}
                  style={{ color: textColor }}
                >
                  <i className="tim-icons icon-single-02" style={{ marginRight: '8px' }} />
                  {t("myProfile")}
                </DropdownItem>
                <DropdownItem 
                  onClick={() => navigate('/admin/my-team')}
                  style={{ color: textColor }}
                >
                  <i className="tim-icons icon-molecule-40" style={{ marginRight: '8px' }} />
                  {t("myTeam")}
                </DropdownItem>
                <DropdownItem divider style={{ borderColor: borderColor }} />
                <DropdownItem 
                  onClick={handleLogout}
                  style={{ color: '#f5365c' }}
                >
                  <i className="tim-icons icon-button-power" style={{ marginRight: '8px' }} />
                  {t("logOut")}
                </DropdownItem>
              </DropdownMenu>
            </UncontrolledDropdown>
          </>
        ) : (
          <Button 
            color="primary" 
            size="sm"
            onClick={() => navigate(loginWithKeycloak())}
            style={{ fontSize: isMobile ? '12px' : '14px', padding: isMobile ? '6px 10px' : '8px 16px' }}
          >
            {t("loginRegister")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default AdminBreadcrumb;
