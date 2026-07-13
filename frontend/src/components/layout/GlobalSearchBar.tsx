import { useState, useEffect, useRef } from 'react';
import { useFocus } from '../../contexts/FocusContext';
import { getSearchResults } from '../../api/http';
import type { LeadPublic } from '../../api/types';

export default function GlobalSearchBar() {
  const { setFocusedLead } = useFocus();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ leads: LeadPublic[]; sales_team: any[] }>({ leads: [], sales_team: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ leads: [], sales_team: [] });
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const data = await getSearchResults(query);
        setResults(data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleLeadClick = (lead: LeadPublic) => {
    setFocusedLead(lead);
    setShowDropdown(false);
    setQuery('');
  };

  return (
    <div className="relative w-full max-w-xl mx-4" ref={searchContainerRef}>
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Search Input */}
        <input
          type="text"
          className="w-full pl-12 pr-4 py-3 
                     bg-gray-100 border border-gray-200 rounded-xl 
                     text-gray-700 placeholder-gray-400 
                     focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                     transition-all duration-200
                     text-sm font-medium"
          placeholder="Search leads, sales team..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && query.length >= 2 && (
        <div className="absolute top-full left-0 mt-3 w-full 
                        bg-white border border-gray-100 rounded-xl 
                        shadow-2xl max-h-96 overflow-y-auto
                        z-[9999]">
          {isSearching ? (
            <div className="px-6 py-5 text-sm text-gray-500 text-center animate-pulse">Searching...</div>
          ) : results.leads.length === 0 && results.sales_team.length === 0 ? (
            <div className="px-6 py-5 text-sm text-gray-500 text-center">No matching records found</div>
          ) : (
            <div className="py-2">
              {/* Leads Section */}
              {results.leads.length > 0 && (
                <div>
                  <div className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-t border-gray-100 first:border-t-0">Leads</div>
                  <ul>
                    {results.leads.map((lead) => (
                      <li 
                        key={lead.lead_id} 
                        onClick={() => handleLeadClick(lead)} 
                        className="px-6 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors duration-150"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{lead.first_name} {lead.last_name}</p>
                          <p className="text-xs text-gray-500">{lead.email}</p>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold uppercase tracking-wide">
                          {lead.lead_status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Sales Team Section */}
              {results.sales_team.length > 0 && (
                <div>
                  <div className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-t border-gray-100">Sales Team</div>
                  <ul>
                    {results.sales_team.map((member) => (
                      <li 
                        key={member.id} 
                        className="px-6 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors duration-150"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{member.full_name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
