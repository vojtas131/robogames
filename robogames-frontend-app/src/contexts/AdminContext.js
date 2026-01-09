import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminContext = createContext();

/**
 * AdminProvider - Provides shared admin state across admin sections
 * - selectedYear: Currently selected competition year (persisted in localStorage)
 * - years: List of available competition years
 * - competitions: Full competition data
 * - breadcrumbs: Navigation breadcrumb trail
 */
export function AdminProvider({ children }) {
  const [selectedYear, setSelectedYearState] = useState(() => {
    const saved = localStorage.getItem('selectedCompetitionYear');
    return saved ? parseInt(saved, 10) : '';
  });
  const [years, setYears] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Persist selectedYear to localStorage
  const setSelectedYear = (year) => {
    setSelectedYearState(year);
    if (year) {
      localStorage.setItem('selectedCompetitionYear', year.toString());
    } else {
      localStorage.removeItem('selectedCompetitionYear');
    }
  };

  // Fetch competition years on mount
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/all`);
        const data = await response.json();
        if (response.ok && data.type === 'RESPONSE') {
          setCompetitions(data.data);
          const yearsList = data.data.map(item => item.year);
          setYears(yearsList);
          
          // Auto-select first year if saved year is invalid or not set
          if (yearsList.length > 0) {
            if (!selectedYear || !yearsList.includes(selectedYear)) {
              setSelectedYear(yearsList[0]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch competitions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, []);

  // Get current competition object
  const currentCompetition = competitions.find(c => c.year === selectedYear);

  const refreshCompetitions = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/all`);
      const data = await response.json();
      if (response.ok && data.type === 'RESPONSE') {
        setCompetitions(data.data);
        setYears(data.data.map(item => item.year));
      }
    } catch (error) {
      console.error('Failed to refresh competitions:', error);
    }
  };

  const value = {
    selectedYear,
    setSelectedYear,
    years,
    competitions,
    currentCompetition,
    loading,
    refreshCompetitions
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

export default AdminContext;
