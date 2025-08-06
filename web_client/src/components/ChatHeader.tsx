import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Menu } from "lucide-react";
import SystemPrompt from "./SystemPrompt";
import UploadedItemsPanel from "./UploadedItemsPanel";
import { UploadedFile, GitHubLink } from "../types/chat";
import { ChaitanyaIcon } from "./ChaitanyaIcon";

interface ChatHeaderProps {
  connectionStatus: "connected" | "disconnected" | "connecting";
  uploadedFiles: UploadedFile[];
  githubLinks: GitHubLink[];
  pendingGithubLinks: GitHubLink[];
  syncingGithubLinks: string[];
  onDeleteFile: (fileId: string) => void;
  onDeleteGithubLink: (linkId: string) => void;
  onSyncGithubLink: (linkId: string) => void;
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  connectionStatus,
  uploadedFiles,
  githubLinks,
  pendingGithubLinks,
  syncingGithubLinks,
  onDeleteFile,
  onDeleteGithubLink,
  onSyncGithubLink,
  onNewChat,
  onToggleSidebar,
  isSidebarCollapsed = false,
}) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "disconnected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="h-14 sm:h-16 border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 sticky top-0 z-10">
      <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
        {isSidebarCollapsed && onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="text-gray-600 hover:text-gray-900 shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <ChaitanyaIcon
            className="w-6 h-6 sm:w-10 sm:h-10 flex-shrink-0"
          />
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
            Chaitanya
          </h1>
        </div>
        <Badge variant="outline" className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-xs hidden sm:inline">{getStatusText()}</span>
          <span className="text-xs sm:hidden">
            {connectionStatus === "connected" ? "●" :
              connectionStatus === "connecting" ? "◐" : "○"}
          </span>
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {/* Test buttons for debugging - remove in production */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('Loading test session for current session');
            (window as any).testLoadHistory && (window as any).testLoadHistory();
          }}
          className="hidden sm:flex items-center space-x-2 bg-yellow-50"
        >
          <span>Load Test History</span>
        </Button>
        {onNewChat && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="hidden sm:flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </Button>
        )}
        {onNewChat && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="sm:hidden"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
        <UploadedItemsPanel
          uploadedFiles={uploadedFiles}
          githubLinks={githubLinks}
          pendingGithubLinks={pendingGithubLinks}
          syncingGithubLinks={syncingGithubLinks}
          onDeleteFile={onDeleteFile}
          onDeleteGithubLink={onDeleteGithubLink}
          onSyncGithubLink={onSyncGithubLink}
        />
        <SystemPrompt />
      </div>
    </div>
  );
};

export default ChatHeader;