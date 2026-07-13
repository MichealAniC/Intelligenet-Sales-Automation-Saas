import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { LeadPublic } from "@/api/types";
import {
  getPinnedLeads,
  pinLead,
  unpinLead,
} from "@/api/http";

interface FocusContextType {
  isFocusMode: boolean;
  focusedLead: LeadPublic | null;
  pinnedLeads: LeadPublic[];
  setFocusedLead: (lead: LeadPublic | null) => void;
  clearFocus: () => void;
  fetchPinnedLeads: () => Promise<void>;
  pinLead: (leadOrId: LeadPublic | string) => Promise<void>;
  unpinLead: (leadId: string) => Promise<void>;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export const FocusProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusedLead, setFocusedLead] = useState<LeadPublic | null>(null);
  const [pinnedLeads, setPinnedLeads] = useState<LeadPublic[]>([]);

  const fetchPinnedLeads = async () => {
    try {
      const data = await getPinnedLeads();
      setPinnedLeads(data);
    } catch (error) {
      console.error("Failed to fetch pinned leads:", error);
    }
  };

  const handlePinLead = async (leadOrId: LeadPublic | string) => {
    try {
      const leadId = typeof leadOrId === "string" ? leadOrId : leadOrId.lead_id;
      await pinLead(leadId);
      await fetchPinnedLeads();
    } catch (error) {
      console.error("Failed to pin lead:", error);
    }
  };

  const handleUnpinLead = async (leadId: string) => {
    try {
      await unpinLead(leadId);
      await fetchPinnedLeads();
    } catch (error) {
      console.error("Failed to unpin lead:", error);
    }
  };

  const handleSetFocusedLead = (lead: LeadPublic | null) => {
    setFocusedLead(lead);
    setIsFocusMode(!!lead);
  };

  const handleClearFocus = () => {
    setFocusedLead(null);
    setIsFocusMode(false);
  };

  useEffect(() => {
    fetchPinnedLeads();
  }, []);

  return (
    <FocusContext.Provider
      value={{
        isFocusMode,
        focusedLead,
        pinnedLeads,
        setFocusedLead: handleSetFocusedLead,
        clearFocus: handleClearFocus,
        fetchPinnedLeads,
        pinLead: handlePinLead,
        unpinLead: handleUnpinLead,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = () => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error("useFocus must be used within a FocusProvider");
  }
  return context;
};
