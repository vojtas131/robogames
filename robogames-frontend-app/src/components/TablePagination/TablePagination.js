/**
 * TablePagination - Reusable pagination component for tables
 * Provides client-side pagination with configurable items per page
 */
import React, { useContext } from 'react';
import { Pagination, PaginationItem, PaginationLink, Input, Row, Col } from 'reactstrap';
import { ThemeContext, themes } from 'contexts/ThemeContext';
import { t } from 'translations/translate';

function TablePagination({ 
    currentPage, 
    totalItems, 
    itemsPerPage = 15, 
    onPageChange,
    onItemsPerPageChange,
    showItemsPerPage = true,
    itemsPerPageOptions = [10, 15, 25, 50]
}) {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === themes.dark;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Don't render if there's only one page or no items
    if (totalItems <= itemsPerPage && !showItemsPerPage) {
        return null;
    }

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);
            
            // Calculate start and end of middle pages
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);
            
            // Adjust if we're near the start
            if (currentPage <= 3) {
                end = 4;
            }
            
            // Adjust if we're near the end
            if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }
            
            // Add ellipsis if needed before middle pages
            if (start > 2) {
                pages.push('...');
            }
            
            // Add middle pages
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            // Add ellipsis if needed after middle pages
            if (end < totalPages - 1) {
                pages.push('...');
            }
            
            // Always show last page
            if (totalPages > 1) {
                pages.push(totalPages);
            }
        }
        
        return pages;
    };

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <Row className="align-items-center mt-3">
            <Col md="4" className="text-muted small">
                {t('showingItems')} {startItem}-{endItem} {t('of')} {totalItems}
            </Col>
            <Col md="4" className="d-flex justify-content-center">
                {totalPages > 1 && (
                    <Pagination size="sm" className="mb-0">
                        <PaginationItem disabled={currentPage === 1}>
                            <PaginationLink 
                                first 
                                onClick={() => onPageChange(1)}
                                style={{ 
                                    background: isDark ? '#27293d' : '#fff',
                                    borderColor: isDark ? '#344675' : '#dee2e6',
                                    color: isDark ? '#fff' : '#344675'
                                }}
                            />
                        </PaginationItem>
                        <PaginationItem disabled={currentPage === 1}>
                            <PaginationLink 
                                previous 
                                onClick={() => onPageChange(currentPage - 1)}
                                style={{ 
                                    background: isDark ? '#27293d' : '#fff',
                                    borderColor: isDark ? '#344675' : '#dee2e6',
                                    color: isDark ? '#fff' : '#344675'
                                }}
                            />
                        </PaginationItem>
                        
                        {getPageNumbers().map((page, index) => (
                            page === '...' ? (
                                <PaginationItem key={`ellipsis-${index}`} disabled>
                                    <PaginationLink 
                                        style={{ 
                                            background: isDark ? '#27293d' : '#fff',
                                            borderColor: isDark ? '#344675' : '#dee2e6',
                                            color: isDark ? '#fff' : '#344675'
                                        }}
                                    >
                                        ...
                                    </PaginationLink>
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={page} active={currentPage === page}>
                                    <PaginationLink 
                                        onClick={() => onPageChange(page)}
                                        style={currentPage === page ? {
                                            background: '#1d8cf8',
                                            borderColor: '#1d8cf8',
                                            color: '#fff'
                                        } : { 
                                            background: isDark ? '#27293d' : '#fff',
                                            borderColor: isDark ? '#344675' : '#dee2e6',
                                            color: isDark ? '#fff' : '#344675'
                                        }}
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            )
                        ))}
                        
                        <PaginationItem disabled={currentPage === totalPages || totalPages === 0}>
                            <PaginationLink 
                                next 
                                onClick={() => onPageChange(currentPage + 1)}
                                style={{ 
                                    background: isDark ? '#27293d' : '#fff',
                                    borderColor: isDark ? '#344675' : '#dee2e6',
                                    color: isDark ? '#fff' : '#344675'
                                }}
                            />
                        </PaginationItem>
                        <PaginationItem disabled={currentPage === totalPages || totalPages === 0}>
                            <PaginationLink 
                                last 
                                onClick={() => onPageChange(totalPages)}
                                style={{ 
                                    background: isDark ? '#27293d' : '#fff',
                                    borderColor: isDark ? '#344675' : '#dee2e6',
                                    color: isDark ? '#fff' : '#344675'
                                }}
                            />
                        </PaginationItem>
                    </Pagination>
                )}
            </Col>
            <Col md="4" className="d-flex justify-content-end align-items-center">
                {showItemsPerPage && onItemsPerPageChange && (
                    <>
                        <span className="text-muted small mr-2">{t('itemsPerPage')}:</span>
                        <Input
                            type="select"
                            bsSize="sm"
                            value={itemsPerPage}
                            onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
                            style={{ width: '70px' }}
                        >
                            {itemsPerPageOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </Input>
                    </>
                )}
            </Col>
        </Row>
    );
}

export default TablePagination;
