interface FrameLayoutElement {
  key: string;
  x: number;
  y: number;
  circular?: boolean;
  borderRadius?: number;
  size?: { width: number; height: number };
  color?: string;
}

interface FrameLayouts {
  [key: string]: FrameLayoutElement[];
}

interface FrameAssets {
  [key: string]: string;
}

export const VIDEO_FRAME_LAYOUTS: FrameLayouts = {
  frame1: [
    { key: 'companyName', x: 20, y: 8 },
    { key: 'phone', x: 150, y: 400 },
    { key: 'email', x: 150, y: 420 },
    { key: 'website', x: 360, y: 420 },
    { key: 'address', x: 300, y: 400 },
    { key: 'category', x: 500, y: 400 },
    { key: 'logo', x: 42, y: 365, circular: true, size: { width: 50, height: 50 } },
  ],
};

export const VIDEO_FRAME_ASSETS: FrameAssets = {
  frame1: require('../assets/video-frames/f1.png'),
};

export const applyVideoFrameLayoutToLayers = (
  layers: any[],
  frameId: string,
  canvasWidth: number,
  canvasHeight: number,
  originalLayers?: any[]
) => {
  const layout = VIDEO_FRAME_LAYOUTS[frameId];
  if (!layout) {
    return layers;
  }

  const updatedLayers = layers.map(layer => {
    const layoutConfig = layout.find((l: FrameLayoutElement) => l.key === layer.fieldType);
    if (!layoutConfig) {
      return layer;
    }

    const canvasX = layoutConfig.x * (canvasWidth / 720);
    const canvasY = layoutConfig.y * (canvasHeight / 487.2);

    const updatedLayer = {
      ...layer,
      position: {
        ...layer.position,
        x: canvasX,
        y: canvasY,
      },
      ...(layoutConfig.circular !== undefined ? { isCircular: layoutConfig.circular } : { isCircular: originalLayers?.find((l: any) => l.id === layer.id)?.isCircular || false }),
      ...(layoutConfig.borderRadius !== undefined ? { borderRadius: layoutConfig.borderRadius } : { borderRadius: originalLayers?.find((l: any) => l.id === layer.id)?.borderRadius || 0 }),
      ...(layoutConfig.size !== undefined ? { size: layoutConfig.size } : { size: originalLayers?.find((l: any) => l.id === layer.id)?.size || layer.size }),
      ...(layoutConfig.color && {
        style: {
          ...layer.style,
          color: layoutConfig.color
        }
      }),
      ...(!layoutConfig.color && originalLayers && layer.style?.color && layer.style.color !== originalLayers.find((l: any) => l.id === layer.id)?.style?.color && {
        style: {
          ...layer.style,
          color: originalLayers.find((l: any) => l.id === layer.id)?.style?.color || undefined
        }
      }),
    };
    return updatedLayer;
  });

  return updatedLayers;
};
