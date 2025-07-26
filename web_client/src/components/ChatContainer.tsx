import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Toaster, toast } from 'sonner';
import CustomToast from '@/components/ui/CustomToast';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { Message, UploadedFile, GitHubLink } from '../types/chat';

const BACKEND_IP = 'localhost';
const API_URL = `http://${BACKEND_IP}:3000`;
const WS_URL = `ws://${BACKEND_IP}:8000`;

interface ChatContainerProps {
  selectedSessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  selectedSessionId,
  onSessionCreated,
  onToggleSidebar,
  isSidebarCollapsed,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('disconnected');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [githubLinks, setGithubLinks] = useState<GitHubLink[]>([]);
  const [pendingGithubLinks, setPendingGithubLinks] = useState<GitHubLink[]>([]);
  const [syncingGithubLinks, setSyncingGithubLinks] = useState<string[]>([]);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<
    string | null
  >(null);
  const [isRewriteMode, setIsRewriteMode] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const currentStreamingMessageIdRef = useRef<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: 'file' | 'github';
  } | null>(null);


  // Function to load chat history for a session
  const loadChatHistory = async (sessionId: string) => {
    try {
      console.log('Loading chat history for session:', sessionId);
      const historyResponse = await axios.get(`${API_URL}/chat-session/${sessionId}/messages`);
      console.log('Raw history response:', historyResponse.data);
      
      let historyMessages: Message[] = [];
      
      // Handle the standard GSStatus response format
      if (historyResponse.data.success && historyResponse.data.data) {
        // Standard GSStatus format
        console.log('Using standard format with success=true');
        historyMessages = historyResponse.data.data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.role === 'USER' ? 'user' : 'ai',
          timestamp: new Date(msg.createdAt)
        }));
      } else if (Array.isArray(historyResponse.data)) {
        // Direct array format (fallback)
        console.log('Using direct array format');
        historyMessages = historyResponse.data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.role === 'USER' ? 'user' : 'ai',
          timestamp: new Date(msg.createdAt)
        }));
      } else {
        console.log('Unknown response format:', historyResponse.data);
      }
      
      console.log('Mapped messages:', historyMessages);
      console.log('About to set messages state with:', historyMessages);
      setMessages(historyMessages);
      console.log(`Messages state set. Loaded ${historyMessages.length} messages for session ${sessionId}:`, historyMessages);
      
      // Verify messages state after setting
      setTimeout(() => {
        console.log('Current messages state after timeout:', messages);
      }, 100);
    } catch (error: any) {
      console.error('Failed to load chat history:', error);
      console.log('Backend request failed, using mock data for session:', sessionId);
      
      // Check if there's valid data in the error response (due to validation errors)
      if (error.response && error.response.data && error.response.data.originalResponseBody) {
        console.log('Found data in error response originalResponseBody:', error.response.data.originalResponseBody);
        if (Array.isArray(error.response.data.originalResponseBody) && error.response.data.originalResponseBody.length > 0) {
          const historyMessages = error.response.data.originalResponseBody.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            sender: msg.role === 'USER' ? 'user' : 'ai',
            timestamp: new Date(msg.createdAt)
          }));
          console.log('Mapped messages from error response:', historyMessages);
          setMessages(historyMessages);
          return; // Successfully recovered from validation error
        } else {
          console.log('originalResponseBody is empty array, will use mock data instead');
        }
      }
      
      // Use mock data for development/testing when backend is not available
      console.log('No valid data in error response, creating mock data...');
      
      try {
        const sessionIdShort = sessionId ? sessionId.slice(-8) : 'unknown';
        const mockMessages: Message[] = [
          {
            id: `${sessionId || 'mock'}-msg-1`,
            content: `Welcome to chat session ${sessionIdShort}! This is a mock message to test session switching.`,
            sender: 'user',
            timestamp: new Date(Date.now() - 300000) // 5 minutes ago
          },
          {
            id: `${sessionId || 'mock'}-msg-2`,
            content: `Hello! I'm your AI assistant. This is session ${sessionIdShort} and I'm ready to help you.`,
            sender: 'ai',
            timestamp: new Date(Date.now() - 240000) // 4 minutes ago
          },
          {
            id: `${sessionId || 'mock'}-msg-3`,
            content: `This is another test message for session ${sessionIdShort} to verify session switching works correctly.`,
            sender: 'user',
            timestamp: new Date(Date.now() - 180000) // 3 minutes ago
          }
        ];
        
        console.log('Created mock messages:', mockMessages);
        console.log('About to call setMessages with mock data...');
        setMessages(mockMessages);
        console.log('setMessages called successfully');
        
        // Verify the state change with a timeout
        setTimeout(() => {
          console.log('Checking messages state after mock data set...');
        }, 50);
        
      } catch (mockError) {
        console.error('Error creating mock messages:', mockError);
        // Fallback to empty array if mock creation fails
        setMessages([]);
      }
    }
  };

  // Function to switch to a different session (for future use)
  const switchToSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    localStorage.setItem('currentSessionId', sessionId);
    await loadChatHistory(sessionId);
  };

  // Function to create a new chat session
  const createNewChatSession = async () => {
    if (isCreatingSession) {
      console.log('Session creation already in progress, skipping...');
      return;
    }
    
    setIsCreatingSession(true);
    try {
      console.log('Creating new chat session...');
      const sessionResponse = await axios.post(`${API_URL}/chat-session`, {
        title: 'New Chat Session'
      });
      console.log('Session creation response:', sessionResponse.data);
      
      // Handle response format - check for success field or actual session data
      let sessionData = null;
      
      if (sessionResponse.data.success && sessionResponse.data.data) {
        // Standard success response
        sessionData = sessionResponse.data.data;
        console.log('New session created successfully (standard response):', sessionData);
      } else if (sessionResponse.data.originalResponseBody && sessionResponse.data.originalResponseBody.data) {
        // Handle validation error response format (like chat history)
        sessionData = sessionResponse.data.originalResponseBody.data;
        console.log('New session created successfully (error response format):', sessionData);
      } else if (sessionResponse.data.data && sessionResponse.data.data.id) {
        // Direct data response
        sessionData = sessionResponse.data.data;
        console.log('New session created successfully (direct data):', sessionData);
      } else if (sessionResponse.data.id) {
        // Session data directly in response
        sessionData = sessionResponse.data;
        console.log('New session created successfully (direct session):', sessionData);
      }
      
      if (sessionData && sessionData.id) {
        const sessionId = sessionData.id;
        console.log('Setting new session ID:', sessionId);
        setCurrentSessionId(sessionId);
        localStorage.setItem('currentSessionId', sessionId);
        setMessages([]); // Clear messages for new session
        onSessionCreated(sessionId); // Notify parent component
        console.log('Created new chat session:', sessionId);
      } else {
        console.error('Session creation failed - no valid session data:', sessionResponse.data);
      }
    } catch (error: any) {
      console.error('Failed to create new chat session:', error);
      
      // Try to extract session data from error response (similar to loadChatHistory)
      if (error.response && error.response.data && error.response.data.originalResponseBody) {
        const errorData = error.response.data.originalResponseBody;
        if (errorData.data && errorData.data.id) {
          console.log('Session created successfully despite error response:', errorData.data);
          const sessionId = errorData.data.id;
          setCurrentSessionId(sessionId);
          localStorage.setItem('currentSessionId', sessionId);
          setMessages([]);
          onSessionCreated(sessionId); // Notify parent component
          console.log('Created new chat session from error response:', sessionId);
          return;
        }
      }
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Effect to handle selectedSessionId changes from sidebar
  useEffect(() => {
    console.log('ChatContainer: selectedSessionId changed to:', selectedSessionId);
    console.log('ChatContainer: currentSessionId is:', currentSessionId);
    console.log('ChatContainer: isCreatingSession is:', isCreatingSession);
    
    if (selectedSessionId && selectedSessionId !== currentSessionId) {
      console.log('ChatContainer: Switching to session:', selectedSessionId);
      setCurrentSessionId(selectedSessionId);
      localStorage.setItem('currentSessionId', selectedSessionId);
      loadChatHistory(selectedSessionId);
    } else if (selectedSessionId === null && !isCreatingSession) {
      // Handle new chat request from sidebar - always create new session when null
      console.log('ChatContainer: Creating new session from sidebar request');
      createNewChatSession();
    } else {
      console.log('ChatContainer: No action taken for selectedSessionId change');
    }
  }, [selectedSessionId, isCreatingSession]);

  useEffect(() => {
    const connectWebSocket = async () => {
      // Only initialize on first load if no selectedSessionId is provided
      if (selectedSessionId === null) {
        // Check if there's an existing session in localStorage
        const existingSessionId = localStorage.getItem('currentSessionId');
        
        if (existingSessionId && !currentSessionId) {
          // Load existing session on initial load
          console.log('Loading existing session from localStorage:', existingSessionId);
          setCurrentSessionId(existingSessionId);
          onSessionCreated(existingSessionId); // Notify parent
          await loadChatHistory(existingSessionId);
        } else if (!existingSessionId && !currentSessionId) {
          // Create initial session only if none exists
          console.log('Creating initial session');
          createNewChatSession();
        }
        // If currentSessionId exists, it means this is a "New Chat" request, handled above
      }

      // Add global test function for debugging
      (window as any).testLoadHistory = () => {
        const testSessionId = 'cmdczwrk10001m6a8nsu8g7cj';
        console.log('Testing with session ID:', testSessionId);
        loadChatHistory(testSessionId);
      };

      (window as any).testCreateNewSession = () => {
        console.log('Testing new session creation');
        createNewChatSession();
      };

      const socket = new WebSocket(`${WS_URL}?clientId=web-client-${Date.now()}`);
      wsRef.current = socket;
      setConnectionStatus('connecting');

      socket.onopen = () => {
        setConnectionStatus('connected');
        console.log('WebSocket connected');
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      socket.onclose = () => {
        setConnectionStatus('disconnected');
        console.log('WebSocket disconnected');
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        setConnectionStatus('disconnected');
      };

      return () => socket.close();
    };

    connectWebSocket();
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const docsResponse = await axios.get(`${API_URL}/meta/doc`);
        if (docsResponse.data) {
          const fetchedFiles: UploadedFile[] = docsResponse.data.map((doc: any) => ({
            id: doc.uniqueID,
            name: doc.fileName,
            size: doc.fileSize
          }));
          setUploadedFiles(fetchedFiles);
        }
      } catch (error) {
        console.error('Failed to fetch uploaded documents:', error);
      }

      try {
        const reposResponse = await axios.get(`${API_URL}/meta/repo`);
        if (reposResponse.data) {
          const fetchedLinks: GitHubLink[] = reposResponse.data.map((repo: any) => ({
            id: repo.repouniqueid,
            github_url: repo.repoUrl,
            branch: repo.branch,
            status: 'completed',
          }));
          setGithubLinks(fetchedLinks);
        }
      } catch (error) {
        console.error('Failed to fetch github repositories:', error);
      }
    };

    fetchInitialData();
  }, []);

  const handleWebSocketMessage = (data: any) => {
    switch (data.eventtype) {
      case 'stream.start':
        {
          const messageId = Date.now().toString();
          setCurrentStreamingMessageId(messageId);
          currentStreamingMessageIdRef.current = messageId;
          setMessages((prev) => [
            ...prev,
            {
              id: messageId,
              content: '',
              sender: 'ai',
              timestamp: new Date(),
              isStreaming: true,
            },
          ]);
          setIsStreaming(true);
        }
        break;

      case 'stream.chunk':
        {
          const id = currentStreamingMessageIdRef.current;
          if (id) {
            setMessages((prevMessages) => {
              const newMessages = [...prevMessages];
              const streamingMessageIndex = newMessages.findIndex(
                (msg) => msg.id === id,
              );
              if (streamingMessageIndex !== -1) {
                newMessages[streamingMessageIndex] = {
                  ...newMessages[streamingMessageIndex],
                  content:
                    newMessages[streamingMessageIndex].content +
                    data.payload.message,
                };
              }
              return newMessages;
            });
          }
        }
        break;

      case 'stream.end':
        {
          const endId = currentStreamingMessageIdRef.current;
          setIsStreaming(false);
          if (endId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === endId ? { ...msg, isStreaming: false } : msg,
              ),
            );
            setCurrentStreamingMessageId(null);
            currentStreamingMessageIdRef.current = null;
          }
        }
        break;

      case 'stream.error':
        console.error('Backend error:', data.payload?.message);
        break;

      case 'ingestion.complete':
        {
          const { success, repoUrl, error } = data.payload;
          setPendingGithubLinks((prev) =>
            prev.filter((link) => link.github_url !== repoUrl),
          );
          if (success) {
            setGithubLinks((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                github_url: repoUrl,
                branch: '', // Note: branch info might not be available from this event
                status: 'completed',
              },
            ]);
            toast.success(`Successfully ingested ${repoUrl}`);
          } else {
            toast.error(`Failed to ingest ${repoUrl}: ${error}`);
          }
        }
        break;
      default:
        console.warn('Unknown WebSocket eventtype:', data.eventtype);
    }
  };

  const sendEvent = (eventtype: string, payload: Record<string, any> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ eventtype, payload }));
    } else {
      console.warn('WebSocket not connected');
    }
  };

  const handleSendMessage = (content: string) => {
    const messageId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        content,
        sender: 'user',
        timestamp: new Date(),
      },
    ]);
    sendEvent('websocket.stream', { 
      message: content,
      sessionId: currentSessionId 
    });
  };

  const handleUploadFiles = async (attachments: { file: File; metadata: { [key: string]: string } }[]) => {
    const formData = new FormData();
    setIsUploading(true);

    // Collect all metadata objects into a single array.
    const metadataArray = attachments.map(a => a.metadata);

    // Append each file to the 'files' key.
    attachments.forEach(({ file }) => {
      formData.append('files', file);
    });

    // Append the entire metadata array as a single JSON string.
    // The backend MUST parse this string to get the array of objects.
    formData.append('metadata', JSON.stringify(metadataArray));

    try {
      const { data } = await axios.post(`${API_URL}/upload_docs`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          console.log(`Uploading files: ${percent}%`);
        },
      });


      const uploaded: UploadedFile[] = data.processedFiles.map((doc: any) => {
        return {
          id: doc.docUniqueId,
          name: doc.fileName,
        };
      });
      setUploadedFiles((prev) => [...prev, ...uploaded]);
      toast.custom((t) => <CustomToast id={t} message={data.message || 'Files uploaded successfully!'} type="success" />, {
        duration: 10000,
      });
    } catch (err: any) {
      console.error('File upload failed:', err);
      toast.custom((t) => <CustomToast id={t} message={err.response?.data?.message || 'File upload failed.'} type="error" />, {
        duration: 10000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitGithubUrl = async (url: string, branch: string) => {
    const tempId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newLink: GitHubLink = {
      id: tempId,
      github_url: url,
      branch,
      status: 'pending',
    };
    setPendingGithubLinks((prev) => [...prev, newLink]);
    toast.custom((t) => <CustomToast id={t} message={`Starting ingestion for ${url}`} type="info" />, {
      duration: 10000,
    });

    try {
      const response = await axios.post(`${API_URL}/upload_github`, {  id: tempId, github_url: url, branch });
      const { id } = response.data;
      setPendingGithubLinks((prev) => prev.filter((link) => link.id !== tempId));
      setGithubLinks((prev) => [...prev, { ...newLink, id, status: 'completed' }]);
      toast.custom((t) => <CustomToast id={t} message={`Successfully ingested ${url}`} type="success" />, {
        duration: 10000,
      });
    } catch (err) {
      console.error('GitHub link upload failed:', err);
      setPendingGithubLinks((prev) => prev.filter((link) => link.id !== tempId));
      toast.custom((t) => <CustomToast id={t} message={`Failed to ingest ${url}.`} type="error" />, {
        duration: 10000,
      });
    }
  };

  const handleStopChat = () => {
    sendEvent('websocket.stream.stop');
    setIsStreaming(false);
    setCurrentStreamingMessageId(null);
  };

  const handleStopAndRewrite = () => {
    handleStopChat();

    if (currentStreamingMessageId) {
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== currentStreamingMessageId),
      );
    }

    const lastUserMsg = [...messages]
      .reverse()
      .find((msg) => msg.sender === 'user');
    if (lastUserMsg) {
      setLastUserMessage(lastUserMsg.content);
      setIsRewriteMode(true);
    }
  };

  const handleUpdatePrompt = async (newContent: string) => {
    try {
      await axios.post(`${API_URL}/prompt/update`, {
        message: newContent,
      });
    } catch (err) {
      console.error('Prompt update failed:', err);
    }

    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.sender === 'user');
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      const updated = [...prev];
      updated[realIdx] = {
        ...updated[realIdx],
        content: newContent,
        timestamp: new Date(),
      };
      return updated.slice(0, realIdx + 1);
    });
  };

  const handleRewritePrompt = (newContent: string) => {
    handleUpdatePrompt(newContent);
    sendEvent('websocket.stream', { message: newContent });
    setIsRewriteMode(false);
    setLastUserMessage('');
  };

  const handleDeleteFile = (fileId: string) => {
    setItemToDelete({ id: fileId, type: 'file' });
  };

  const handleDeleteGithubLink = (linkId: string) => {
    setItemToDelete({ id: linkId, type: 'github' });
  };

  const handleSyncGithubLink = async (linkId: string) => {
    setSyncingGithubLinks((prev) => [...prev, linkId]);
    toast.custom((t) => <CustomToast id={t} message="Syncing repository..." type="info" />, {
      duration: 10000,
    });
    try {
      const response = await axios.post(`${API_URL}/sync/github/${linkId}`);
      toast.custom((t) => <CustomToast id={t} message={response.data.message || 'Repository synced successfully.'} type="success" />, {
        duration: 10000,
      });
    } catch (err: any) {
      console.error('GitHub link sync failed:', err);
      toast.custom((t) => <CustomToast id={t} message={err.response?.data?.message || 'Failed to sync repository.'} type="error" />, {
        duration: 10000,
      });
    } finally {
      setSyncingGithubLinks((prev) => prev.filter((id) => id !== linkId));
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const { id, type } = itemToDelete;

    try {
      if (type === 'file') {
        const response = await axios.delete(`${API_URL}/doc/${id}`);
        setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
        toast.custom((t) => <CustomToast id={t} message={response.data.message || 'File deleted successfully.'} type="success" />, {
          duration: 10000,
        });
      } else if (type === 'github') {
        const response = await axios.delete(`${API_URL}/github_links/${id}`);
        setGithubLinks((prev) => prev.filter((l) => l.id !== id));
        toast.custom((t) => <CustomToast id={t} message={response.data.message || 'GitHub link deleted successfully.'} type="success" />, {
          duration: 10000,
        });
      }
    } catch (err: any) {
      console.error(`${type} deletion failed:`, err);
      toast.custom((t) => <CustomToast id={t} message={err.response?.data?.message || `Failed to delete ${type}.`} type="error" />, {
        duration: 10000,
      });
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      <ChatHeader
        connectionStatus={connectionStatus}
        uploadedFiles={uploadedFiles}
        githubLinks={githubLinks}
        pendingGithubLinks={pendingGithubLinks}
        syncingGithubLinks={syncingGithubLinks}
        onDeleteFile={handleDeleteFile}
        onDeleteGithubLink={handleDeleteGithubLink}
        onSyncGithubLink={handleSyncGithubLink}
        onNewChat={createNewChatSession}
        onToggleSidebar={onToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
      />
      <MessageList messages={messages} isStreaming={isStreaming} />
      <ChatInput
        onSendMessage={handleSendMessage}
        onUploadFiles={handleUploadFiles}
        onSubmitGithubUrl={handleSubmitGithubUrl}
        onStopChat={handleStopChat}
        onStopAndRewrite={handleStopAndRewrite}
        onUpdatePrompt={handleUpdatePrompt}
        onRewritePrompt={handleRewritePrompt}
        disabled={connectionStatus !== 'connected' || isUploading}
        isStreaming={isStreaming}
        isRewriteMode={isRewriteMode}
        lastUserMessage={lastUserMessage}
        isUploading={isUploading}
      />
      <Toaster richColors />
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {itemToDelete?.type} and remove its data from the vector database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatContainer;
