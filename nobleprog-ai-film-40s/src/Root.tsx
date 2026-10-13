import React from 'react';
import { Composition } from 'remotion';
import { Film } from './Film';
import { END } from './timeline';

export const Root: React.FC = () => (
  <>
    <Composition
      id="Film"
      component={Film}
      width={1080}
      height={1920}
      fps={60}
      durationInFrames={Math.round(END * 60)}
      defaultProps={{ withAudio: true }}
    />
    <Composition
      id="Film30"
      component={Film}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={Math.round(END * 30)}
      defaultProps={{ withAudio: true }}
    />
  </>
);
