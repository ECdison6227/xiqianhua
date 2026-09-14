import type { NpcId } from './world';
export type Emotion = 'calm' | 'guarded' | 'angry' | 'relieved';
export type ProviderTag = 'deepseek' | 'siliconflow' | 'openainext' | 'preset';
export type Turn = { role: 'user' | 'assistant'; content: string; source?: ProviderTag; guarded?: boolean };
export type Clue = { id: string; title: string; detail: string; source: string; kind: string };
export type SessionView = { id: string; phase: 'explore'|'story'|'complete'; storyIndex: number; clues: Clue[]; history: Record<NpcId,Turn[]>; emotions: Record<NpcId,Emotion>; revision: number };
export type DialogueResult = { reply: string; emotion: Emotion; source: ProviderTag; guarded: boolean; model?: string; elapsedMs: number; newClues: Clue[]; session: SessionView };
