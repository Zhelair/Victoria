'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useVictoriaStore } from '@/store';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/lib/db';
import { extractFileContent, formatFileSize, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE, truncate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { getMoodTier } from '@/types';
import type { ChatThread, ChatMessage, ChatSphere } from '@/types';
import { SPHERE_META } from '@/types';

export default function ChatPage() {
  const { t } = useTranslation();
  const settings = useVictoriaStore((s) => s.settings);
  const moodScore = useVictoriaStore((s) => s.moodScore);
  const activeSphere = useVictoriaStore((s) => s.activeSphere);
  const setActiveSphere = useVictoriaStore((s) => s.setActiveSphere);
  const tier = useVictoriaStore((s) => s.tier);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string; size: number } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const skipLoadRef = useRef(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);

  // Detect speech support client-side (window is undefined during SSR)
  useEffect(() => {
    setHasSpeechSupport(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }, []);

  // Load threads for active sphere
  useEffect(() => {
    loadThreads();
  }, [activeSphere]);

  // Load messages when thread changes
  useEffect(() => {
    if (activeThreadId) {
      if (skipLoadRef.current) {
        skipLoadRef.current = false;
        return;
      }
      loadMessages(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadThreads = async () => {
    const list = await db.chatThreads
      .where('sphere')
      .equals(activeSphere)
      .reverse()
      .sortBy('updatedAt');
    setThreads(list);
    if (list.length > 0 && !activeThreadId) {
      setActiveThreadId(list[0].id);
    }
  };

  const loadMessages = async (threadId: string) => {
    const thread = await db.chatThreads.get(threadId);
    if (thread) {
      setMessages(thread.messages);
    }
  };

  const createNewThread = async () => {
    const thread: ChatThread = {
      id: uuidv4(),
      sphere: activeSphere,
      title: t('chat.newChat'),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.chatThreads.add(thread);
    setActiveThreadId(thread.id);
    setMessages([]);
    setShowSidebar(false);
    await loadThreads();
  };

  const deleteThread = async (id: string) => {
    await db.chatThreads.delete(id);
    if (activeThreadId === id) {
      setActiveThreadId(null);
    }
    await loadThreads();
  };

  const sendMessage = async () => {
    if (!input.trim() && !attachedFile) return;
    if (isStreaming) return;

    // Free tier gate
    if (tier === 'free' && settings.messageCount >= 5) {
      alert(t('tiers.freeLimit'));
      return;
    }

    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      const thread: ChatThread = {
        id: uuidv4(),
        sphere: activeSphere,
        title: truncate(input || attachedFile?.name || 'Chat', 40),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.chatThreads.add(thread);
      currentThreadId = thread.id;
      skipLoadRef.current = true;
      setActiveThreadId(thread.id);
    }

    const userContent = attachedFile
      ? `${input}\n\n[File: ${attachedFile.name}]\n${attachedFile.text.slice(0, 3000)}`
      : input;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
      hasFile: !!attachedFile,
      fileName: attachedFile?.name,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setAttachedFile(null);
    setIsStreaming(true);

    // Update message count
    useVictoriaStore.getState().updateSettings({
      messageCount: (useVictoriaStore.getState().settings.messageCount || 0) + 1,
    });

    // Build assistant placeholder
    const assistantId = uuidv4();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages([...updatedMessages, assistantMsg]);

    try {
      abortRef.current = new AbortController();
      const moodTier = getMoodTier(moodScore);

      const apiMessages = updatedMessages
        .slice(-20) // last 20 for context
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          personality: settings.personalityMode,
          moodTier,
          sphere: activeSphere,
          userName: settings.userName,
          apiKey: settings.tier !== 'free' ? undefined : undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'API error');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line === 'data: [DONE]') continue;
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullContent += data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch { /* skip */ }
        }
      }

      // Persist to DB
      const finalMessages = [...updatedMessages, { ...assistantMsg, content: fullContent }];
      const thread = await db.chatThreads.get(currentThreadId!);
      if (thread) {
        // Update thread title if first message
        const newTitle = thread.messages.length === 0
          ? truncate(userMsg.content, 40)
          : thread.title;
        await db.chatThreads.put({
          ...thread,
          title: newTitle,
          messages: finalMessages,
          updatedAt: Date.now(),
        });
      }

      // TTS
      if (settings.voiceEnabled && fullContent) {
        speak(fullContent);
      }

      await loadThreads();
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err.message}` }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    // Strip markdown so the voice doesn't read out "asterisk asterisk" etc.
    const clean = text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^[\s]*[-*+]\s/gm, '')
      .replace(/^[\s]*\d+\.\s/gm, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim();
    const utterance = new SpeechSynthesisUtterance(clean.slice(0, 600));
    utterance.rate = settings.voiceRate;
    utterance.pitch = settings.voicePitch;
    utterance.lang = settings.language;
    if (settings.selectedVoiceName) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) => v.name === settings.selectedVoiceName);
      if (voice) utterance.voice = voice;
    }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = settings.language;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large (max 5MB)');
      return;
    }
    const { text, fileName } = await extractFileContent(file);
    setAttachedFile({ name: fileName, text, size: file.size });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Sphere tabs */}
        <div
          className="flex flex-wrap gap-1 px-3 py-2 border-b border-theme"
          style={{ backgroundColor: 'var(--card-bg)' }}
        >
          {(Object.keys(SPHERE_META) as ChatSphere[]).map((sphere) => {
            const meta = SPHERE_META[sphere];
            const isActive = activeSphere === sphere;
            return (
              <button
                key={sphere}
                onClick={() => {
                  setActiveSphere(sphere);
                  setActiveThreadId(null);
                }}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-full transition-all text-xs',
                  isActive ? 'text-white' : 'text-muted'
                )}
                style={{
                  backgroundColor: isActive ? meta.color : 'var(--shell)',
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: '7px',
                }}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Thread list toggle button */}
        <div
          className="flex items-center justify-between px-3 py-1.5 border-b border-theme"
          style={{ backgroundColor: 'var(--shell)' }}
        >
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="font-pixel text-[7px] flex items-center gap-1"
            style={{ color: 'var(--text-muted)' }}
          >
            ☰ {t('chat.spheres')} ({threads.length})
          </button>
          <button
            onClick={createNewThread}
            className="font-pixel text-[7px] px-2 py-1 rounded-lg"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            + {t('chat.newChat')}
          </button>
        </div>

        {/* Thread sidebar (drawer) */}
        {showSidebar && threads.length > 0 && (
          <div
            className="border-b border-theme max-h-40 overflow-y-auto"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  'flex items-center justify-between px-3 py-2 border-b border-theme cursor-pointer hover:bg-shell transition-colors',
                  activeThreadId === thread.id ? 'bg-shell' : ''
                )}
                onClick={() => {
                  setActiveThreadId(thread.id);
                  setShowSidebar(false);
                }}
              >
                <span className="text-xs truncate flex-1" style={{ color: 'var(--text)' }}>
                  {thread.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t('chat.deleteConfirm'))) {
                      deleteThread(thread.id);
                    }
                  }}
                  className="ml-2 text-xs opacity-50 hover:opacity-100"
                  style={{ color: '#ef4444' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div
                className="text-4xl"
                style={{ filter: 'grayscale(0.3)' }}
              >
                {SPHERE_META[activeSphere].emoji}
              </div>
              <p
                className="font-pixel text-[8px] text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                {SPHERE_META[activeSphere].label}
              </p>
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Start a conversation with Victoria
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex gap-2 items-start">
              <div
                className="chat-bubble-assistant px-3 py-2 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                <span className="font-pixel text-[8px]">{t('chat.thinking')}</span>
                <span className="animate-pixel-blink">▌</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* TTS banner */}
        {isSpeaking && (
          <div
            className="mx-3 mb-1 px-3 py-2 rounded-xl flex items-center justify-between text-xs"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            <span className="font-pixel text-[7px]">{t('chat.speaking')}</span>
            <button onClick={stopSpeaking} className="font-pixel text-[7px]">✕</button>
          </div>
        )}

        {/* File attachment preview */}
        {attachedFile && (
          <div
            className="mx-3 mb-1 px-3 py-2 rounded-xl flex items-center justify-between"
            style={{ backgroundColor: 'var(--shell)', border: '1px solid var(--border)' }}
          >
            <span className="text-xs truncate flex-1" style={{ color: 'var(--text)' }}>
              📎 {attachedFile.name} ({formatFileSize(attachedFile.size)})
            </span>
            <button
              onClick={() => setAttachedFile(null)}
              className="ml-2 text-xs opacity-50 hover:opacity-100"
              style={{ color: '#ef4444' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Input area */}
        <div
          className="px-3 py-2 border-t border-theme"
          style={{ backgroundColor: 'var(--card-bg)' }}
        >
          <div className="flex items-end gap-2">
            {/* File upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-2 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
              title={t('chat.uploadFile')}
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_FILE_TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
            />

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? t('chat.listening') : t('chat.typeMessage')}
              className="flex-1 px-3 py-2 rounded-xl text-sm resize-none outline-none max-h-24"
              style={{
                backgroundColor: 'var(--shell)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                minHeight: '40px',
              }}
              rows={1}
              disabled={isStreaming}
            />

            {/* Voice output toggle */}
            <button
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                  return;
                }
                const nowEnabled = !settings.voiceEnabled;
                useVictoriaStore.getState().updateSettings({ voiceEnabled: nowEnabled });
                if (nowEnabled) {
                  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
                  if (lastAssistant) speak(lastAssistant.content);
                } else {
                  stopSpeaking();
                }
              }}
              className={`flex-shrink-0 p-2 rounded-xl transition-all ${isSpeaking ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: isSpeaking ? 'var(--accent)' : settings.voiceEnabled ? 'var(--accent)' : 'var(--shell)',
                color: settings.voiceEnabled ? 'white' : 'var(--text-muted)',
              }}
              title={isSpeaking ? 'Stop speaking' : settings.voiceEnabled ? 'Mute voice' : 'Enable voice'}
            >
              {isSpeaking ? '🔉' : settings.voiceEnabled ? '🔊' : '🔇'}
            </button>

            {/* Mic button */}
            {hasSpeechSupport && (
              <button
                onClick={toggleListening}
                className={cn(
                  'flex-shrink-0 p-2 rounded-xl transition-all',
                  isListening ? 'animate-pulse' : ''
                )}
                style={{
                  backgroundColor: isListening ? 'var(--accent)' : 'var(--shell)',
                  color: isListening ? 'white' : 'var(--text-muted)',
                }}
              >
                🎤
              </button>
            )}

            {/* Send button */}
            <button
              onClick={isStreaming ? () => abortRef.current?.abort() : sendMessage}
              disabled={!isStreaming && !input.trim() && !attachedFile}
              className="flex-shrink-0 p-2 rounded-xl transition-all active:scale-95 disabled:opacity-40"
              style={{
                backgroundColor: isStreaming ? '#ef4444' : 'var(--accent)',
                color: 'white',
              }}
            >
              {isStreaming ? '⏹' : '↑'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-pixel text-[8px]"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          V
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] px-3 py-2 text-sm leading-relaxed',
          isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'
        )}
      >
        {message.hasFile && (
          <div className="text-[10px] opacity-70 mb-1">📎 {message.fileName}</div>
        )}
        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.content || <span className="opacity-50">▌</span>}
        </p>
      </div>
    </div>
  );
}
