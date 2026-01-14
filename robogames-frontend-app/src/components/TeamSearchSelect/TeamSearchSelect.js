import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  Input,
  ListGroup,
  ListGroupItem,
  Spinner,
  Badge,
} from 'reactstrap';
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";

/**
 * TeamSearchSelect - A reusable component for searching and selecting teams
 * 
 * Props:
 * - teams: array - Array of team objects to search through
 * - onSelect: (team) => void - Callback when a team is selected
 * - selectedTeam: object | null - Currently selected team
 * - placeholder: string - Placeholder text for the input
 * - excludeTeamIds: number[] - Array of team IDs to exclude from results
 * - disabled: boolean - Whether the component is disabled
 * - clearOnSelect: boolean - Whether to clear input after selection
 * - showLeaderInfo: boolean - Whether to show leader information
 */
function TeamSearchSelect({
  teams = [],
  onSelect,
  selectedTeam = null,
  placeholder = null,
  excludeTeamIds = [],
  disabled = false,
  clearOnSelect = false,
  showLeaderInfo = true,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  
  const { theme } = useContext(ThemeContext);
  const isDark = theme === themes.dark;
  
  // Theme-aware colors
  const dropdownBg = isDark ? '#1e1e2f' : '#ffffff';
  const dropdownBorder = isDark ? '#2b3553' : '#e3e3e3';
  const textColor = isDark ? '#fff' : '#344675';
  const secondaryTextColor = isDark ? '#9a9a9a' : '#6c757d';

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
    if (term.length < 1) {
      // Show all teams when focused but no search term
      const filtered = teams.filter(team => !excludeTeamIds.includes(team.id));
      setResults(filtered.slice(0, 20));
      return;
    }
    
    setIsSearching(true);
    const searchLower = term.toLowerCase();
    
    const filtered = teams.filter(team => {
      if (excludeTeamIds.includes(team.id)) return false;
      
      const matchesName = team.name?.toLowerCase().includes(searchLower);
      const matchesId = team.id?.toString() === term;
      const matchesLeader = team.leaderName?.toLowerCase().includes(searchLower);
      
      return matchesName || matchesId || matchesLeader;
    });
    
    setResults(filtered.slice(0, 20));
    setIsSearching(false);
  }, [teams, excludeTeamIds]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 200);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, performSearch]);

  const handleSelect = (team) => {
    onSelect(team);
    setShowResults(false);
    setIsFocused(false);
    
    if (clearOnSelect) {
      setSearchTerm('');
    } else {
      setSearchTerm(team.name);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowResults(true);
    
    // Clear selection when typing
    if (selectedTeam) {
      onSelect(null);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowResults(true);
    // Show all teams when focused
    performSearch(searchTerm);
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
  const shouldShowDropdown = showResults && isFocused;

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
          placeholder={placeholder || t("searchTeamPlaceholder")}
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
          {results.map(team => (
            <ListGroupItem
              key={team.id}
              tag="button"
              type="button"
              action
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(team);
              }}
              style={{ 
                cursor: 'pointer',
                backgroundColor: dropdownBg,
                borderColor: dropdownBorder,
                color: textColor,
                padding: '10px 15px',
                textAlign: 'left'
              }}
              className="team-search-item"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{team.name}</strong>
                  {showLeaderInfo && team.leaderName && (
                    <>
                      <br />
                      <small style={{ color: secondaryTextColor }}>{t("leader")}: {team.leaderName}</small>
                    </>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <small style={{ color: secondaryTextColor }}>ID: {team.id}</small>
                  {team.membersCount !== undefined && (
                    <>
                      <br />
                      <Badge color="info" pill style={{ fontSize: '10px' }}>
                        {team.membersCount} {t("membersShort")}
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
            {t("noTeamsFound")}
          </ListGroupItem>
        </ListGroup>
      )}
      
      {/* Selected team display */}
      {selectedTeam && !isFocused && (
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
            <strong>{selectedTeam.name}</strong>
            {showLeaderInfo && selectedTeam.leaderName && (
              <>
                <br />
                <small style={{ color: secondaryTextColor }}>{t("leader")}: {selectedTeam.leaderName}</small>
              </>
            )}
          </div>
          <Badge color="success" pill>{t("selected")}</Badge>
        </div>
      )}
    </div>
  );
}

export default TeamSearchSelect;
