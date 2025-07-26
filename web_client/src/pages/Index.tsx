
import React, { useState } from 'react';
import ChatContainer from '../components/ChatContainer';
import ChatSidebar from '../components/ChatSidebar';

const Index = () => {
  // Initialize with localStorage value if available
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    return localStorage.getItem('currentSessionId');
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSessionChange = (sessionId: string) => {
    console.log('Index: Session change requested to:', sessionId);
    console.log('Index: Previous currentSessionId was:', currentSessionId);
    setCurrentSessionId(sessionId);
  };

  const handleNewChat = () => {
    // Set to null to trigger new chat creation
    console.log('Index: New chat requested');
    console.log('Index: Previous currentSessionId was:', currentSessionId);
    setCurrentSessionId(null);
  };

  const handleSessionCreated = (sessionId: string) => {
    console.log('Index: Session created callback received:', sessionId);
    console.log('Index: Current state before update:', currentSessionId);
    setCurrentSessionId(sessionId);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ChatSidebar
        currentSessionId={currentSessionId}
        onSessionChange={handleSessionChange}
        onNewChat={handleNewChat}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <ChatContainer 
        selectedSessionId={currentSessionId}
        onSessionCreated={handleSessionCreated}
        onToggleSidebar={toggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
      />
    </div>
  );
};

export default Index;
