// Time formatting and SLA Countdown helpers

export function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch (e) {
    return 'recently';
  }
}

export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    return isoString;
  }
}

export interface SlaStatus {
  totalSeconds: number;
  remainingSeconds: number;
  percentage: number; // 0 (empty/breached) to 100 (full)
  isBreached: boolean;
  formatted: string;
}

export function computeSlaCountdown(slaDueAtIso: string, createdAtIso?: string): SlaStatus {
  try {
    const dueTime = new Date(slaDueAtIso).getTime();
    const now = Date.now();
    const createdTime = createdAtIso ? new Date(createdAtIso).getTime() : dueTime - 15 * 60 * 1000;
    
    const totalDuration = Math.max(1000, dueTime - createdTime);
    const remainingMs = dueTime - now;
    const isBreached = remainingMs <= 0;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    
    const percentage = isBreached 
      ? 0 
      : Math.min(100, Math.max(0, (remainingMs / totalDuration) * 100));

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const formatted = isBreached
      ? `-${Math.floor(Math.abs(remainingMs) / 60000)}m BREACH`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return {
      totalSeconds: Math.floor(totalDuration / 1000),
      remainingSeconds,
      percentage,
      isBreached,
      formatted,
    };
  } catch (e) {
    return {
      totalSeconds: 900,
      remainingSeconds: 0,
      percentage: 0,
      isBreached: true,
      formatted: '00:00',
    };
  }
}
