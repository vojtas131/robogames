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
 * RobotSearchSelect - A reusable component for searching and selecting robots
 * 
 * Props:
 * - robots: array - Array of robot objects to search through
 * - onSelect: (robot) => void - Callback when a robot is selected
 * - selectedRobot: object | null - Currently selected robot
 * - placeholder: string - Placeholder text for the input
 * - excludeRobotIds: number[] - Array of robot IDs to exclude from results
 * - disabled: boolean - Whether the component is disabled
 * - clearOnSelect: boolean - Whether to clear input after selection
 * - showTeamInfo: boolean - Whether to show team information
 * - showDisciplineInfo: boolean - Whether to show discipline and category info
 * - showOnlyConfirmed: boolean - Whether to show only confirmed robots (default: false)
 */
function RobotSearchSelect({
  robots = [],
  onSelect,
  selectedRobot = null,
  placeholder = null,
  excludeRobotIds = [],
  disabled = false,
  clearOnSelect = false,
  showTeamInfo = true,
  showDisciplineInfo = false,
  showOnlyConfirmed = false,
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
      // Show all robots when focused but no search term
      const filtered = robots.filter(robot => {
        if (excludeRobotIds.includes(robot.id)) return false;
        if (showOnlyConfirmed && !robot.confirmed) return false;
        return true;
      });
      setResults(filtered.slice(0, 20));
      return;
    }
    
    setIsSearching(true);
    const searchLower = term.toLowerCase();
    
    const filtered = robots.filter(robot => {
      if (excludeRobotIds.includes(robot.id)) return false;
      if (showOnlyConfirmed && !robot.confirmed) return false;
      
      const matchesName = robot.name?.toLowerCase().includes(searchLower);
      const matchesId = robot.id?.toString() === term;
      const matchesNumber = robot.number?.toString() === term;
      const matchesTeam = robot.teamName?.toLowerCase().includes(searchLower);
      
      return matchesName || matchesId || matchesNumber || matchesTeam;
    });
    
    setResults(filtered.slice(0, 20));
    setIsSearching(false);
  }, [robots, excludeRobotIds, showOnlyConfirmed]);

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

  const handleSelect = (robot) => {
    onSelect(robot);
    setShowResults(false);
    setIsFocused(false);
    
    if (clearOnSelect) {
      setSearchTerm('');
    } else {
      setSearchTerm(`[${robot.number}] ${robot.name}`);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowResults(true);
    
    // Clear selection when typing
    if (selectedRobot) {
      onSelect(null);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowResults(true);
    // Show all robots when focused
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

  const handleClear = () => {
    setSearchTerm('');
    onSelect(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
          placeholder={placeholder || t("searchRobotPlaceholder") || "Hledat robota (ID, číslo, název, tým)..."}
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
        {selectedRobot && !isSearching && (
          <span
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              color: secondaryTextColor,
              fontSize: '18px',
              fontWeight: 'bold'
            }}
            title={t("clear") || "Vymazat"}
          >
            ×
          </span>
        )}
      </div>
      
      {shouldShowDropdown && results.length > 0 && (
        <ListGroup 
          style={{ 
            position: 'absolute', 
            zIndex: 1050, 
            width: '100%',
            maxHeight: '300px',
            overflowY: 'auto',
            boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`
          }}
        >
          {results.map(robot => (
            <ListGroupItem
              key={robot.id}
              tag="button"
              type="button"
              action
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(robot);
              }}
              style={{ 
                cursor: 'pointer',
                backgroundColor: dropdownBg,
                borderColor: dropdownBorder,
                color: textColor,
                padding: '10px 15px',
                textAlign: 'left'
              }}
              className="robot-search-item"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Badge color="success" style={{ marginRight: '8px', fontSize: '12px' }}>
                    {robot.number}
                  </Badge>
                  <strong>{robot.name}</strong>
                  {showTeamInfo && robot.teamName && (
                    <>
                      <br />
                      <small style={{ color: secondaryTextColor, marginLeft: '45px' }}>
                        <i className="tim-icons icon-single-02" style={{ marginRight: '4px' }} />
                        {robot.teamName}
                      </small>
                    </>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <small style={{ color: secondaryTextColor }}>ID: #{robot.id}</small>
                  {showDisciplineInfo && (
                    <div style={{ marginTop: '2px' }}>
                      {robot.diciplineName && (
                        <Badge color="info" pill style={{ fontSize: '9px', marginRight: '4px' }}>
                          {robot.diciplineName}
                        </Badge>
                      )}
                      {robot.category && (
                        <Badge 
                          color={robot.category === 'LOW_AGE_CATEGORY' ? 'warning' : 'primary'} 
                          pill 
                          style={{ fontSize: '9px' }}
                        >
                          {robot.category === 'LOW_AGE_CATEGORY' ? t('pupils') : t('students')}
                        </Badge>
                      )}
                    </div>
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
            {t("noRobotsFound") || "Žádní roboti nenalezeni"}
          </ListGroupItem>
        </ListGroup>
      )}
      
      {/* Selected robot display */}
      {selectedRobot && !isFocused && (
        <div 
          style={{ 
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(45, 206, 137, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(45, 206, 137, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: textColor
          }}
        >
          <div>
            <Badge color="success" style={{ marginRight: '8px' }}>{selectedRobot.number}</Badge>
            <strong>{selectedRobot.name}</strong>
            {showTeamInfo && selectedRobot.teamName && (
              <>
                <br />
                <small style={{ color: secondaryTextColor, marginLeft: '45px' }}>
                  {selectedRobot.teamName}
                </small>
              </>
            )}
          </div>
          <Badge color="primary" pill>{t("selected") || "Vybráno"}</Badge>
        </div>
      )}
    </div>
  );
}

export default RobotSearchSelect;
