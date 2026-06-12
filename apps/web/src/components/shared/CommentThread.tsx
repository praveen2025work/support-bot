"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Reply, ChevronDown, ChevronRight } from "lucide-react";

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  targetType: string;
  targetId: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentThreadProps {
  comments: Comment[];
  targetType: string;
  targetId: string;
  currentUserId: string;
  currentUserName: string;
  onAdd: (text: string, parentId?: string) => void;
  onDelete: (commentId: string) => void;
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  onReply,
  onDelete,
  depth,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId: string;
  onReply: (parentId: string, text: string) => void;
  onDelete: (id: string) => void;
  depth: number;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div
      className={
        depth > 0
          ? "ml-4 border-l-2 border-gray-100 dark:border-gray-700 pl-3"
          : ""
      }
    >
      <div className="py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-medium">
                {comment.userName.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {comment.userName}
              </span>
              <span className="text-[10px] text-gray-400">
                {timeAgo(comment.createdAt)}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
              {comment.text}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            {depth < 2 && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="p-1 text-gray-400 hover:text-blue-500 rounded"
                title="Reply"
              >
                <Reply size={12} />
              </button>
            )}
            {comment.userId === currentUserId && (
              <button
                onClick={() => onDelete(comment.id)}
                className="p-1 text-gray-400 hover:text-red-500 rounded"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {showReplyInput && (
          <div className="flex items-center gap-1.5 ml-6 mt-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && replyText.trim()) {
                  onReply(comment.id, replyText.trim());
                  setReplyText("");
                  setShowReplyInput(false);
                }
              }}
              placeholder="Write a reply..."
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => {
                if (replyText.trim()) {
                  onReply(comment.id, replyText.trim());
                  setReplyText("");
                  setShowReplyInput(false);
                }
              }}
              disabled={!replyText.trim()}
              className="p-1 text-blue-600 hover:text-blue-700 disabled:opacity-30"
            >
              <Send size={12} />
            </button>
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <>
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 ml-6 mb-1"
          >
            {showReplies ? (
              <ChevronDown size={10} />
            ) : (
              <ChevronRight size={10} />
            )}
            {replies.length} repl{replies.length === 1 ? "y" : "ies"}
          </button>
          {showReplies &&
            replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                replies={[]}
                currentUserId={currentUserId}
                onReply={onReply}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ))}
        </>
      )}
    </div>
  );
}

export function CommentThread({
  comments,
  currentUserId,
  currentUserName,
  onAdd,
  onDelete,
}: CommentThreadProps) {
  const [newText, setNewText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesMap = new Map<string, Comment[]>();
  comments
    .filter((c) => c.parentId)
    .forEach((c) => {
      const arr = repliesMap.get(c.parentId!) || [];
      arr.push(c);
      repliesMap.set(c.parentId!, arr);
    });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 divide-y divide-gray-100 dark:divide-gray-700"
      >
        {topLevel.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">
            No comments yet
          </div>
        ) : (
          topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={repliesMap.get(comment.id) || []}
              currentUserId={currentUserId}
              onReply={(parentId, text) => onAdd(text, parentId)}
              onDelete={onDelete}
              depth={0}
            />
          ))
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
        <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0">
          {currentUserName.charAt(0).toUpperCase()}
        </span>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newText.trim()) {
              onAdd(newText.trim());
              setNewText("");
            }
          }}
          placeholder="Add a comment..."
          className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
        />
        <button
          onClick={() => {
            if (newText.trim()) {
              onAdd(newText.trim());
              setNewText("");
            }
          }}
          disabled={!newText.trim()}
          className="p-1.5 text-blue-600 hover:text-blue-700 disabled:opacity-30 rounded"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
