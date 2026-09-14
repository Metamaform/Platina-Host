export interface LogPayload {
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  userId?: string | number;
  path: string;
  interactions: string[];
  additionalData?: any;
}

const MAX_INTERACTIONS = 15;
const interactions: string[] = [];
let currentUserId: string | number | undefined = undefined;

export function setLoggerUserId(id: string | number) {
  currentUserId = id;
}

export function recordInteraction(event: string) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
  interactions.push(`[${timestamp}] ${event}`);
  if (interactions.length > MAX_INTERACTIONS) {
    interactions.shift();
  }
}

let isInitialized = false;

export function initLogger() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  // 1. Track global clicks
  window.addEventListener('click', (e) => {
    try {
      const target = e.target as HTMLElement;
      const tag = target.tagName?.toLowerCase() || 'unknown';
      let id = target.id ? `#${target.id}` : '';
      let cls = '';
      if (typeof target.className === 'string' && target.className.trim()) {
        cls = `.${target.className.trim().split(/\s+/).join('.')}`;
      }
      // Truncate class string if it's too long (e.g. tailwind classes)
      if (cls.length > 40) cls = cls.substring(0, 40) + '...';
      
      let text = target.innerText || target.textContent || '';
      if (text.length > 20) text = text.substring(0, 20) + '...';
      text = text.replace(/\n/g, ' ').trim();

      const details = [id, cls, text ? `"${text}"` : ''].filter(Boolean).join(' ');
      recordInteraction(`Click on <${tag}> ${details}`);
    } catch (err) {
      // Ignore tracking errors
    }
  }, true);

  // 2. Track unhandled errors
  window.addEventListener('error', (e) => {
    logToServer('error', e.message, e.error?.stack);
  });

  // 3. Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const msg = reason?.message || String(reason);
    const stack = reason?.stack;
    if (!msg.includes('WebSocket')) {
       logToServer('error', `Unhandled Promise Rejection: ${msg}`, stack);
    }
  });
  
  // 4. Wrap console.error
  const origError = console.error;
  console.error = (...args) => {
    origError(...args);
    // Avoid infinite loops if logToServer fails
    if (args[0] && typeof args[0] === 'string' && args[0].includes('[Logger]')) return;
    
    const msg = args.map(a => {
      if (a instanceof Error) return `${a.message}\n${a.stack}`;
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');
    
    if (!msg.includes('WebSocket')) {
      logToServer('error', msg);
    }
  };

  // 5. Wrap console.warn
  const origWarn = console.warn;
  console.warn = (...args) => {
    origWarn(...args);
    const msg = args.map(a => {
      if (a instanceof Error) return `${a.message}\n${a.stack}`;
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');
    logToServer('warn', msg);
  };
  
  // Track route/path changes by proxying history.pushState
  const origPushState = history.pushState;
  history.pushState = function(...args) {
    recordInteraction(`Navigated to ${args[2]}`);
    return origPushState.apply(history, args);
  };
}

function categorizeError(message: string, stack?: string): string {
  const fullText = (message + ' ' + (stack || '')).toLowerCase();
  
  if (fullText.includes('invalidcharactererror') || fullText.includes('atob') || fullText.includes('btoa')) {
    return 'ERR_SAFARI_BASE64';
  }
  if (fullText.includes('networkerror') || fullText.includes('failed to fetch') || fullText.includes('load resource')) {
    return 'ERR_NETWORK';
  }
  if (fullText.includes('lottie') || fullText.includes('bodymovin')) {
    return 'ERR_LOTTIE_RENDER';
  }
  if (fullText.includes('webgl') || fullText.includes('canvas')) {
    return 'ERR_WEBGL_CANVAS';
  }
  if (fullText.includes('quotaexceedederror') || fullText.includes('out of memory')) {
    return 'ERR_MEMORY_STORAGE';
  }
  if (fullText.includes('typeerror')) {
    return 'ERR_TYPE';
  }
  if (fullText.includes('syntaxerror')) {
    return 'ERR_SYNTAX';
  }
  if (fullText.includes('referenceerror')) {
    return 'ERR_REFERENCE';
  }
  
  return 'ERR_UNKNOWN';
}

export function logToServer(level: 'error' | 'warn' | 'info', message: string, stack?: string, additionalData?: any) {
  try {
    let finalMessage = message;
    if (level === 'error') {
      const code = categorizeError(message, stack);
      finalMessage = `[${code}] ${message}`;
    }

    const payload: LogPayload = {
      level,
      message: finalMessage,
      stack,
      userId: currentUserId,
      path: window.location.pathname + window.location.search,
      interactions: [...interactions],
      additionalData
    };

    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {
      // Silent catch to prevent infinite loops
    });
  } catch (err) {
    // Failsafe
  }
}
