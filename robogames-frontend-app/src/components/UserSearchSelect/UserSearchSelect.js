import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  Input,
  ListGroup,
  ListGroupItem,
  Spinner,
  Badge,
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";

/**
 * UserSearchSelect - A reusable component for searching and selecting users
 * 
 * Props:
 * - onSelect: (user) => void - Callback when a user is selected
 * - selectedUser: object | null - Currently selected user
 * - placeholder: string - Placeholder text for the input
 * - excludeUserIds: number[] - Array of user IDs to exclude from results
 * - showTeamInfo: boolean - Whether to show team information in results
 * - disabled: boolean - Whether the component is disabled
 * - clearOnSelect: boolean - Whether to clear input after selection
 */
function UserSearchSelect({
  onSelect,
  selectedUser = null,
  placeholder = null,
  excludeUserIds = [],
  showTeamInfo = true,
  disabled = false,
  clearOnSelect = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  
  const { token, tokenExpired } = useUser();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === themes.dark;
  
  // Theme-aware colors
  const dropdownBg = isDark ? '#1e1e2f' : '#ffffff';
  const dropdownBorder = isDark ? '#2b3553' : '#e3e3e3';
  const textColor = isDark ? '#fff' : '#344675';
  const secondaryTextColor = isDark ? '#9a9a9a' : '#6c757d';

  // Load all users once (for small-medium datasets)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token || usersLoaded) return;
      
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tokenExpired(response.status)) return;
        
        const json = await response.json();
        if (response.ok && json.data) {
          setAllUsers(json.data);
          setUsersLoaded(true);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, [token]);

  // Click outside handler - close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowResults(false);
        setIsFocused(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search
  const performSearch = useCallback((term) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    const searchLower = term.toLowerCase();
    
    const filtered = allUsers.filter(user => {
      if (excludeUserIds.includes(user.id)) return false;
      
      const matchesEmail = user.email?.toLowerCase().includes(searchLower);
      const matchesName = user.name?.toLowerCase().includes(searchLower);
      const matchesSurname = user.surname?.toLowerCase().includes(searchLower);
      const matchesFullName = `${user.name} ${user.surname}`.toLowerCase().includes(searchLower);
      const matchesId = user.id?.toString() === term;
      
      return matchesEmail || matchesName || matchesSurname || matchesFullName || matchesId;
    });
    
    setResults(filtered.slice(0, 20));
    setIsSearching(false);
  }, [allUsers, excludeUserIds]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }
    
    debounceRef.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, performSearch]);

  const handleSelect = (user) => {
    onSelect(user);
    setShowResults(false);
    setIsFocused(false);
    
    if (clearOnSelect) {
      setSearchTerm('');
    } else {
      setSearchTerm(`${user.name} ${user.surname} (${user.email})`);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Show results when typing (minimum 2 chars)
    if (value.length >= 2) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
    
    // Clear selection when typing
    if (selectedUser) {
      onSelect(null);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (searchTerm.length >= 2 && results.length > 0) {
      setShowResults(true);
    }
  };

  const handleBlur = (e) => {
    // Don't close if clicking inside the dropdown
    setTimeout(() => {
      if (wrapperRef.current && !wrapperRef.current.contains(document.activeElement)) {
        setShowResults(false);
        setIsFocused(false);
      }
    }, 150);
  };

  // Determine if we should show the dropdown
  const shouldShowDropdown = showResults && isFocused && searchTerm.length >= 2;

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder || t("searchUserPlaceholder")}
          disabled={disabled}
          style={{ paddingRight: '35px' }}
        />
        {isSearching && (
          <Spinner 
            size="sm" 
            style={{ 
              position: 'absolute', 
              right: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)'
            }} 
          />
        )}
      </div>
      
      {shouldShowDropdown && results.length > 0 && (
        <ListGroup 
          style={{ 
            position: 'absolute', 
            zIndex: 1050, 
            width: '100%',
            maxHeight: '250px',
            overflowY: 'auto',
            boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`
          }}
        >
          {results.map(user => (
            <ListGroupItem
              key={user.id}
              tag="button"
              type="button"
              action
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(user);
              }}
              style={{ 
                cursor: 'pointer',
                backgroundColor: dropdownBg,
                borderColor: dropdownBorder,
                color: textColor,
                padding: '10px 15px',
                textAlign: 'left'
              }}
              className="user-search-item"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{user.name} {user.surname}</strong>
                  <br />
                  <small style={{ color: secondaryTextColor }}>{user.email}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <small style={{ color: secondaryTextColor }}>ID: {user.id}</small>
                  {showTeamInfo && user.teamID && (
                    <>
                      <br />
                      <Badge color="info" pill style={{ fontSize: '10px' }}>
                        {t("team")}: {user.teamID}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </ListGroupItem>
          ))}
        </ListGroup>
      )}
      
      {shouldShowDropdown && results.length === 0 && !isSearching && (
        <ListGroup 
          style={{ 
            position: 'absolute', 
            zIndex: 1050, 
            width: '100%',
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`
          }}
        >
          <ListGroupItem 
            style={{ 
              backgroundColor: dropdownBg,
              borderColor: dropdownBorder,
              color: secondaryTextColor,
              textAlign: 'center'
            }}
          >
            {t("noUsersFound")}
          </ListGroupItem>
        </ListGroup>
      )}
      
      {/* Selected user display */}
      {selectedUser && !isFocused && (
        <div 
          style={{ 
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(30, 136, 229, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(30, 136, 229, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: textColor
          }}
        >
          <div>
            <strong>{selectedUser.name} {selectedUser.surname}</strong>
            <br />
            <small style={{ color: secondaryTextColor }}>{selectedUser.email}</small>
          </div>
          <Badge color="success" pill>{t("selected")}</Badge>
        </div>
      )}
    </div>
  );
}

export default UserSearchSelect;
