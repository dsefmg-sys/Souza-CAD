import { useState, useEffect } from 'react';
import {
  carregarModo3dAtivado,
  carregarYoutubePlaylist,
  carregarVideosTutorial,
  type VideoTutorial,
} from '@/lib/store/suporte';

export interface SuporteData {
  modo3dAtivado: boolean;
  videosUrl: string;
  videosTutorial: VideoTutorial[];
}

export function useSuporteData(): SuporteData {
  const [modo3dAtivado, setModo3dAtivado] = useState(false);
  const [videosUrl, setVideosUrl] = useState('');
  const [videosTutorial, setVideosTutorial] = useState<VideoTutorial[]>([]);

  useEffect(() => {
    let montado = true;
    carregarModo3dAtivado().then((v) => { if (montado) setModo3dAtivado(v); }).catch(() => {});
    carregarYoutubePlaylist().then((u) => { if (montado) setVideosUrl(u); }).catch(() => {});
    carregarVideosTutorial().then((vt) => { if (montado) setVideosTutorial(vt); }).catch(() => {});
    return () => { montado = false; };
  }, []);

  return { modo3dAtivado, videosUrl, videosTutorial };
}
