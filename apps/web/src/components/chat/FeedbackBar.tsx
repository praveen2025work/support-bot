"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface FeedbackBarProps {
  messageId: string;
  onFeedback: (
    messageId: string,
    type: "positive" | "negative",
    correction?: string,
  ) => void;
}

export function FeedbackBar({ messageId, onFeedback }: FeedbackBarProps) {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(
    null,
  );
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState("");

  const handleFeedback = (type: "positive" | "negative") => {
    if (feedback === type) return; // Already submitted
    setFeedback(type);
    if (type === "negative") {
      setShowCorrection(true);
    } else {
      onFeedback(messageId, type);
    }
  };

  const submitCorrection = () => {
    onFeedback(messageId, "negative", correction || undefined);
    setShowCorrection(false);
  };

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-400 mr-1">Helpful?</span>
        <button
          onClick={() => handleFeedback("positive")}
          className={`p-1 rounded transition-colors ${
            feedback === "positive"
              ? "text-green-600 bg-green-50"
              : "text-gray-400 hover:text-green-600 hover:bg-green-50"
          }`}
          title="Yes, helpful"
          disabled={feedback !== null && feedback !== "positive"}
        >
          <ThumbsUp
            className="w-3.5 h-3.5"
            fill={feedback === "positive" ? "currentColor" : "none"}
          />
        </button>
        <button
          onClick={() => handleFeedback("negative")}
          className={`p-1 rounded transition-colors ${
            feedback === "negative"
              ? "text-red-600 bg-red-50"
              : "text-gray-400 hover:text-red-600 hover:bg-red-50"
          }`}
          title="Not helpful"
          disabled={feedback !== null && feedback !== "negative"}
        >
          <ThumbsDown
            className="w-3.5 h-3.5"
            fill={feedback === "negative" ? "currentColor" : "none"}
          />
        </button>
        {feedback === "positive" && (
          <span className="text-[10px] text-green-600 ml-1">Thanks!</span>
        )}
      </div>
      {showCorrection && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <input
            type="text"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="What should I have said?"
            className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && submitCorrection()}
          />
          <button
            onClick={submitCorrection}
            className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Send
          </button>
          <button
            onClick={() => {
              onFeedback(messageId, "negative");
              setShowCorrection(false);
            }}
            className="text-[10px] text-gray-400 hover:text-gray-600"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
