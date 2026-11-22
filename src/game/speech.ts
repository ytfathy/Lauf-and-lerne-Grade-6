import { buildCheckpointSpeechSegments, selectGermanVoice } from './rules';
import type { CheckpointQuestion } from './types';

let activeSpeechSession = 0;

export function isSpeechSynthesisAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

export function getGermanSpeechVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  return selectGermanVoice(voices);
}

export function subscribeVoicesChanged(listener: () => void): () => void {
  if (!isSpeechSynthesisAvailable()) return () => {};
  const synth = window.speechSynthesis;
  if (typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', listener);
    return () => synth.removeEventListener('voiceschanged', listener);
  }
  const prev = synth.onvoiceschanged;
  synth.onvoiceschanged = listener;
  return () => {
    if (synth.onvoiceschanged === listener) {
      synth.onvoiceschanged = prev ?? null;
    }
  };
}

export function stopCheckpointSpeech(): void {
  activeSpeechSession += 1;
  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.cancel();
  }
}

export interface SpeakQuestionCallbacks {
  onStart: () => void;
  onEnd: () => void;
  onError: (message: string) => void;
}

export function speakCheckpointQuestion(
  question: CheckpointQuestion,
  callbacks: SpeakQuestionCallbacks,
): boolean {
  if (!isSpeechSynthesisAvailable()) {
    callbacks.onError(
      'Sprachausgabe (de-DE) wird von diesem Browser nicht unterstützt. Bitte lies die Frage direkt auf dem Bildschirm.',
    );
    return false;
  }

  const synth = window.speechSynthesis;
  const germanVoice = selectGermanVoice(synth.getVoices());
  if (!germanVoice) {
    callbacks.onError(
      'Keine deutsche Stimme (de-DE) auf diesem Gerät verfügbar. Bitte aktiviere ein deutsches Sprachpaket in den Geräteeinstellungen.',
    );
    return false;
  }

  activeSpeechSession += 1;
  const sessionId = activeSpeechSession;
  synth.cancel();

  const segments = buildCheckpointSpeechSegments(question);
  if (segments.length === 0) {
    callbacks.onEnd();
    return false;
  }

  callbacks.onStart();

  let index = 0;
  const speakNext = () => {
    if (sessionId !== activeSpeechSession) return;
    if (index >= segments.length) {
      callbacks.onEnd();
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(segments[index]);
    utterance.lang = 'de-DE';
    utterance.voice = germanVoice;
    utterance.rate = 0.94;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (sessionId !== activeSpeechSession) return;
      index += 1;
      speakNext();
    };

    utterance.onerror = (ev: SpeechSynthesisErrorEvent) => {
      if (sessionId !== activeSpeechSession) return;
      if (ev.error === 'canceled' || ev.error === 'interrupted') {
        callbacks.onEnd();
        return;
      }
      callbacks.onEnd();
      callbacks.onError(
        'Die deutsche Sprachausgabe konnte nicht abgespielt werden. Bitte versuche es erneut.',
      );
    };

    synth.speak(utterance);
  };

  speakNext();
  return true;
}
