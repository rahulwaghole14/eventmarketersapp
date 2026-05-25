import { 
  FRAME_LAYOUTS, 
  FRAME_ASSETS, 
  applyFrameLayoutToLayers 
} from './frames';

export const VIDEO_FRAME_LAYOUTS = FRAME_LAYOUTS;
export const VIDEO_FRAME_ASSETS: Record<string, any> = FRAME_ASSETS;
export const applyVideoFrameLayoutToLayers = applyFrameLayoutToLayers;
