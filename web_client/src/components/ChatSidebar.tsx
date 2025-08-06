import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Trash2, MessageSquare, Plus, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const BACKEND_IP = 'localhost';
const API_URL = `http://${BACKEND_IP}:3000`;

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  metadata?: any;
}

interface ChatSidebarProps {
  currentSessionId: string | null;
  onSessionChange: (sessionId: string) => void;
  onNewChat: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentSessionId,
  onSessionChange,
  onNewChat,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get auth headers
  const getAuthHeaders = () => ({
    ...(token && { 'Authorization': `Bearer ${token}` })
  });

  // Load all chat sessions
  const loadChatSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Loading chat sessions...');
      
      // Fetch real sessions from the API
      const response = await axios.get(`${API_URL}/chat-sessions`, {
        headers: getAuthHeaders()
      });
      
      let fetchedSessions: ChatSession[] = [];
      
      if (response.data.success && response.data.data) {
        fetchedSessions = response.data.data;
      } else if (Array.isArray(response.data)) {
        fetchedSessions = response.data;
      }
      
      console.log('Loaded sessions:', fetchedSessions);
      setSessions(fetchedSessions.sort((a: ChatSession, b: ChatSession) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    } catch (error: any) {
      console.error('Error loading chat sessions:', error);
      setError('Failed to load chat sessions');
      // Fallback to empty array on error
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a chat session (mock for now)
  const deleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      console.log('Delete session:', sessionId);
      
      // Remove from local state
      setSessions(prev => {
        const newSessions = prev.filter(session => session.id !== sessionId);
        
        // If deleted session was current, handle session switching
        if (currentSessionId === sessionId) {
          if (newSessions.length > 0) {
            // Switch to the first remaining session immediately
            const nextSessionId = newSessions[0].id;
            onSessionChange(nextSessionId);
          } else {
            // No sessions left, request new chat
            onNewChat();
          }
        }
        
        return newSessions;
      });
      
      // Also update localStorage if the current session was deleted
      if (currentSessionId === sessionId) {
        localStorage.removeItem('currentSessionId');
      }
      
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete session');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Truncate title for display
  const truncateTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  useEffect(() => {
    loadChatSessions();
  }, []);

  // Refresh sessions when a new session is created
  useEffect(() => {
    if (currentSessionId) {
      setSessions(prev => {
        // Check if session already exists
        const existingIndex = prev.findIndex(s => s.id === currentSessionId);
        
        if (existingIndex === -1) {
          // Add new session only if it doesn't exist
          const newSession: ChatSession = {
            id: currentSessionId,
            title: 'New Chat Session',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            metadata: {}
          };
          
          console.log('Adding new session to sidebar:', currentSessionId);
          return [newSession, ...prev].sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        } else {
          // Session already exists, just update timestamp
          console.log('Session already exists in sidebar, updating timestamp:', currentSessionId);
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            updatedAt: new Date().toISOString()
          };
          
          return updated.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }
      });
    }
  }, [currentSessionId]);

  if (isCollapsed) {
    return (
      <div className="w-16 h-full bg-gray-900 text-white flex flex-col items-center py-4">
        <Button
          onClick={onToggleCollapse}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-gray-800 mb-4"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <Button
          onClick={onNewChat}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-gray-800"
          title="New Chat"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Chat Sessions</h2>
          <Button
            onClick={onToggleCollapse}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <Button
          onClick={onNewChat}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1 p-2">
        {isLoading && (
          <div className="p-4 text-center text-gray-400">
            Loading sessions...
          </div>
        )}
        
        {error && (
          <div className="p-4 text-center text-red-400">
            {error}
            <Button
              onClick={loadChatSessions}
              variant="ghost"
              size="sm"
              className="block mx-auto mt-2 text-blue-400 hover:text-blue-300"
            >
              Retry
            </Button>
          </div>
        )}
        
        {!isLoading && !error && sessions.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            No chat sessions yet. Start a new conversation!
          </div>
        )}
        
        <div className="space-y-2">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className={cn(
                "p-3 cursor-pointer transition-colors hover:bg-gray-800 border-0",
                currentSessionId === session.id
                  ? "bg-gray-700 border-l-4 border-l-blue-500"
                  : "bg-gray-800"
              )}
              onClick={() => {
                console.log('ChatSidebar: Session clicked:', session.id);
                console.log('ChatSidebar: Current session ID:', currentSessionId);
                onSessionChange(session.id);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <MessageSquare className="h-4 w-4 mt-1 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {truncateTitle(session.title)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(session.updatedAt)}
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={(e) => deleteSession(session.id, e)}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-red-400 hover:bg-gray-700 flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;
