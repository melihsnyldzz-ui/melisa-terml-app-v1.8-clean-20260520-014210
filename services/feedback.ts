import { Vibration } from 'react-native';
import { loadSettings } from '../storage/localStorage';

type FeedbackKind = 'success' | 'warning' | 'error' | 'message' | 'urgent';

const patterns: Record<FeedbackKind, number | number[]> = {
  success: 35,
  warning: 90,
  error: [0, 130, 70, 130],
  message: 45,
  urgent: [0, 120, 80, 120],
};

async function canVibrate(kind: FeedbackKind) {
  try {
    const settings = await loadSettings();
    if (!settings.vibrationEnabled) return false;
    if (kind === 'urgent' && !settings.urgentVibrationEnabled) return false;
    return true;
  } catch {
    return false;
  }
}

async function vibrate(kind: FeedbackKind) {
  if (!(await canVibrate(kind))) return;
  try {
    Vibration.vibrate(patterns[kind]);
  } catch {
    // Sesli uyarı ileriki fazda burada merkezi şekilde bağlanabilir.
  }
}

export function notifySuccess() {
  void vibrate('success');
}

export function notifyWarning() {
  void vibrate('warning');
}

export function notifyError() {
  void vibrate('error');
}

export function notifyMessage() {
  void vibrate('message');
}

export function notifyUrgent() {
  void vibrate('urgent');
}
