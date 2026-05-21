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
  frame2: [
    { key: 'companyName', x: 20, y: 15 },
    { key: 'phone', x: 200, y: 410, color: 'black' },
    { key: 'email', x: 200, y: 440, color: 'black' },
    { key: 'website', x: 420, y: 440, color: 'black' },
    { key: 'address', x: 420, y: 410, color: 'black' },
    { key: 'category', x: 300, y: 380, color: 'black' },
    { key: 'logo', x: 15, y: 367, circular: true, size: { width: 45, height: 45 } },
  ],
  frame3: [
    { key: 'companyName', x: 420, y: 15 },
    { key: 'phone', x: 61, y: 420, color: 'black' },
    { key: 'email', x: 50, y: 445, color: 'black' },
    { key: 'website', x: 450, y: 445, color: 'black' },
    { key: 'address', x: 250, y: 445, color: 'black' },
    { key: 'category', x: 250, y: 420, color: 'black' },
    { key: 'logo', x: 10, y: 7, circular: true, size: { width: 50, height: 50 } },
  ],
  frame4: [
    { key: 'companyName', x: 20, y: 400 },
    { key: 'phone', x: 84, y: 30, color: 'black' },
    { key: 'email', x: 84, y: 60, color: 'black' },
    { key: 'website', x: 456, y: 30, color: 'black' },
    { key: 'address', x: 456, y: 60, color: 'black' },
    { key: 'category', x: 262, y: 25, color: 'black' },
    { key: 'logo', x: 320, y: 70, circular: false, size: { width: 35, height: 35 } },
  ],
  frame5: [
    { key: 'companyName', x: 20, y: 15 },
    { key: 'phone', x: 33, y: 387 },
    { key: 'email', x: 33, y: 417 },
    { key: 'website', x: 33, y: 447 },
    { key: 'address', x: 449, y: 447 },
    { key: 'category', x: 449, y: 421 },
    { key: 'logo', x: 610, y: 5, circular: true, size: { width: 45, height: 45 } },
  ],
  frame6: [
    { key: 'companyName', x: 400, y: 15 },
    { key: 'phone', x: 50, y: 440 },
    { key: 'email', x: 50, y: 409 },
    { key: 'website', x: 441, y: 409 },
    { key: 'address', x: 441, y: 440 },
    { key: 'category', x: 270, y: 380 },
    { key: 'logo', x: 10, y: 10, circular: true, size: { width: 35, height: 35 } },
  ],
  frame7: [
    { key: 'companyName', x: 400, y: 15 },
    { key: 'phone', x: 40, y: 410 },
    { key: 'email', x: 240, y: 410 },
    { key: 'website', x: 440, y: 410 },
    { key: 'address', x: 40, y: 440 },
    { key: 'category', x: 240, y: 440 },
    { key: 'logo', x: 30, y: 15, circular: true, size: { width: 40, height: 40 } },
  ],
  frame8: [
    { key: 'companyName', x: 400, y: 400 },
    { key: 'phone', x: 120, y: 30 },
    { key: 'email', x: 260, y: 30 },
    { key: 'website', x: 480, y: 30 },
    { key: 'address', x: 40, y: 440 },
    { key: 'category', x: 150, y: 70 },
    { key: 'logo', x: 13, y: 14, circular: true, size: { width: 45, height: 45 } },
  ],
  frame9: [
    { key: 'companyName', x: 400, y: 15 },
    { key: 'phone', x: 110, y: 390 },
    { key: 'email', x: 290, y: 390 },
    { key: 'website', x: 500, y: 390 },
    { key: 'address', x: 110, y: 420 },
    { key: 'category', x: 290, y: 420 },
    { key: 'logo', x: 20, y: 372, circular: false, size: { width: 35, height: 35 } },
  ],
  frame10: [
    { key: 'companyName', x: 400, y: 15 },
    { key: 'phone', x: 50, y: 430 },
    { key: 'email', x: 240, y: 430 },
    { key: 'website', x: 440, y: 430 },
    { key: 'address', x: 50, y: 450 },
    { key: 'category', x: 240, y: 450 },
    { key: 'logo', x: 30, y: 15, circular: false, size: { width: 30, height: 30 } },
  ],
};

export const VIDEO_FRAME_ASSETS: FrameAssets = {
  frame1: require('../assets/video-frames/f1.png'),
  frame2: require('../assets/video-frames/f2.png'),
  frame3: require('../assets/video-frames/f3.png'),
  frame4: require('../assets/video-frames/f4.png'),
  frame5: require('../assets/video-frames/f5.png'),
  frame6: require('../assets/video-frames/f6.png'),
  frame7: require('../assets/video-frames/f7.png'),
  frame8: require('../assets/video-frames/f8.png'),
  frame9: require('../assets/video-frames/f9.png'),
  frame10: require('../assets/video-frames/f10.png'),
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
