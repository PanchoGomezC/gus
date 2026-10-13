import React from 'react';
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import timing from './timing.json';
import { buildTimeline } from './timeline';
import type { Timing } from './timeline';
import { Background } from './components/Background';
import { TitleSystem } from './components/Type';
import { PromptToSystem } from './scenes/PromptToSystem';
import { DataToDashboard } from './scenes/DataToDashboard';
import { AgentsToDecision } from './scenes/AgentsToDecision';
import { Convergence } from './scenes/Convergence';
import { Closing } from './scenes/Closing';

export const T = buildTimeline(timing as Timing);

export const Film: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0D14', overflow: 'hidden' }}>
      <Background t={t} T={T} frame={frame} />
      <PromptToSystem t={t} T={T} />
      <DataToDashboard t={t} T={T} />
      <AgentsToDecision t={t} T={T} />
      <Convergence t={t} T={T} />
      <Closing t={t} T={T} />
      <TitleSystem t={t} T={T} />
      {withAudio && (
        <Sequence>
          <Audio src={staticFile('assets/audio/mix_master.wav')} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
