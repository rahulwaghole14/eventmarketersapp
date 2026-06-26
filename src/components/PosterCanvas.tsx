import React from 'react';
import { View, Image, Text, StyleSheet, PixelRatio } from 'react-native';
import ViewShot from 'react-native-view-shot';

interface PosterCanvasProps {
  selectedImage: {
    uri: string;
    title?: string;
    description?: string;
  };
  layers: any[];
  selectedTemplate: string;
  canvasWidth: number;
  canvasHeight: number;
  posterRef: React.RefObject<ViewShot | null>;
  layerAnimations?: { [key: string]: { x: any; y: any } };
  translationValues?: { [key: string]: { x: any; y: any } };
  currentPositions?: { [key: string]: { x: number; y: number } };
  screenCanvasWidth?: number;
}

const PosterCanvas: React.FC<PosterCanvasProps> = ({
  selectedImage,
  layers,
  selectedTemplate,
  canvasWidth,
  canvasHeight,
  posterRef,
  layerAnimations,
  translationValues,
  currentPositions,
  screenCanvasWidth,
}) => {
  const scale = screenCanvasWidth ? (canvasWidth / screenCanvasWidth) : 1;

  const renderLayer = (layer: any) => {
    if (layer.type === 'text') {
      // Special handling for footer background (same as visible canvas)
      if (layer.content === '' && layer.fieldType === 'footerBackground') {
        // Apply template-specific footer styling (same as visible canvas)
        const templateStyles = {
          'business': { backgroundColor: 'rgba(102, 126, 234, 0.9)' },
          'event': { backgroundColor: 'rgba(239, 68, 68, 0.9)' },
          'restaurant': { backgroundColor: 'rgba(34, 197, 94, 0.9)' },
          'fashion': { backgroundColor: 'rgba(236, 72, 153, 0.9)' },
          'real-estate': { backgroundColor: 'rgba(245, 158, 11, 0.9)' },
          'education': { backgroundColor: 'rgba(59, 130, 246, 0.9)' },
          'healthcare': { backgroundColor: 'rgba(6, 182, 212, 0.9)' },
          'fitness': { backgroundColor: 'rgba(168, 85, 247, 0.9)' },
          'wedding': { backgroundColor: 'rgba(212, 175, 55, 0.9)' },
          'birthday': { backgroundColor: 'rgba(251, 146, 60, 0.9)' },
          'corporate': { backgroundColor: 'rgba(30, 41, 59, 0.95)' },
          'creative': { backgroundColor: 'rgba(147, 51, 234, 0.9)' },
          'minimal': { backgroundColor: 'rgba(255, 255, 255, 0.95)' },
          'luxury': { backgroundColor: 'rgba(212, 175, 55, 0.95)' },
          'modern': { backgroundColor: 'rgba(102, 126, 234, 0.8)' },
          'vintage': { backgroundColor: 'rgba(120, 113, 108, 0.9)' },
          'retro': { backgroundColor: 'rgba(251, 146, 60, 0.9)' },
          'elegant': { backgroundColor: 'rgba(139, 69, 19, 0.9)' },
          'bold': { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
          'tech': { backgroundColor: 'rgba(30, 41, 59, 0.95)' },
          'nature': { backgroundColor: 'rgba(34, 197, 94, 0.8)' },
          'ocean': { backgroundColor: 'rgba(6, 182, 212, 0.9)' },
          'sunset': { backgroundColor: 'rgba(239, 68, 68, 0.9)' },
          'cosmic': { backgroundColor: 'rgba(30, 41, 59, 0.95)' },
          'artistic': { backgroundColor: 'rgba(168, 85, 247, 0.9)' },
          'sport': { backgroundColor: 'rgba(239, 68, 68, 0.9)' },
          'warm': { backgroundColor: 'rgba(245, 158, 11, 0.9)' },
          'cool': { backgroundColor: 'rgba(59, 130, 246, 0.9)' },
        };
        
        const templateStyle = templateStyles[selectedTemplate as keyof typeof templateStyles] || templateStyles['business'];
        
        return (
          <View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: layer.style?.backgroundColor || templateStyle.backgroundColor,
              borderRadius: 0,
              borderBottomLeftRadius: 12 * scale,
              borderBottomRightRadius: 12 * scale,
            }}
          />
        );
      }
      
      // Apply template-specific text colors for footer elements only if user hasn't set a custom color
      let textColor = layer.style?.color || '#FFFFFF';
      if (['footerCompanyName', 'phone', 'email', 'website', 'category', 'address', 'services'].includes(layer.fieldType || '') && !layer.style?.color) {
        const textColors = {
          'business': '#ffffff',
          'event': '#ffffff',
          'restaurant': '#ffffff',
          'fashion': '#ffffff',
          'real-estate': '#ffffff',
          'education': '#ffffff',
          'healthcare': '#ffffff',
          'fitness': '#ffffff',
          'wedding': '#000000',
          'birthday': '#ffffff',
          'corporate': '#ffffff',
          'creative': '#ffffff',
          'minimal': '#1f2937',
          'luxury': '#000000',
          'modern': '#ffffff',
          'vintage': '#ffffff',
          'retro': '#ffffff',
          'elegant': '#ffffff',
          'bold': '#ffffff',
          'tech': '#00ff00',
          'nature': '#ffffff',
          'ocean': '#ffffff',
          'sunset': '#ffffff',
          'cosmic': '#ffffff',
          'artistic': '#ffffff',
          'sport': '#ffffff',
          'warm': '#ffffff',
          'cool': '#ffffff',
        };
        textColor = textColors[selectedTemplate as keyof typeof textColors] || textColors['business'];
      }
      
      return (
        <Text
          style={[
            styles.layerText,
            {
              fontSize: (layer.style?.fontSize || 16) * scale,
              color: textColor,
              fontFamily: layer.style?.fontFamily || 'System',
              fontWeight: layer.style?.fontWeight || 'normal',
              textAlign: layer.style?.textAlign || 'left',
              backgroundColor: layer.style?.backgroundColor,
              width: '100%', // Ensure it uses the container width for scaling
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.4}
        >
          {layer.content}
        </Text>
      );
    } else if (layer.type === 'image' || layer.type === 'logo') {
      const effectiveBorderRadius = (layer.isCircular
        ? Math.min(layer.size.width, layer.size.height) / 2
        : (layer.borderRadius || 0)) * scale;

      return (
        <View style={{
          width: '100%',
          height: '100%',
          borderRadius: effectiveBorderRadius,
          overflow: 'hidden',
        }}>
          <Image
            source={{ uri: layer.content }}
            style={[
              styles.layerImage,
              { borderRadius: effectiveBorderRadius }
            ]}
            resizeMode={layer.type === 'logo' ? "cover" : "contain"}
          />
        </View>
      );
    }
    return null;
  };

  // Helper for border frames with scaling
  const borderStyle = (() => {
    const borderWidthMap = {
      business: 8, event: 6, restaurant: 8, fashion: 10, 'real-estate': 6,
      education: 8, healthcare: 6, fitness: 8, wedding: 12, birthday: 10,
      corporate: 6, creative: 8, minimal: 4, luxury: 12, modern: 8,
      vintage: 8, retro: 6, elegant: 8, bold: 10, tech: 8, nature: 6,
      ocean: 8, sunset: 10, cosmic: 8, artistic: 8, sport: 6, warm: 8, cool: 8
    };

    const borderColorMap = {
      business: '#667eea', event: '#f97316', restaurant: '#22c55e', fashion: '#ec4899', 'real-estate': '#8b5cf6',
      education: '#3b82f6', healthcare: '#10b981', fitness: '#ef4444', wedding: '#fbbf24', birthday: '#f472b6',
      corporate: '#374151', creative: '#000000', minimal: '#95a5a6', luxury: '#d4af37', modern: '#607d8b',
      vintage: '#78716c', retro: '#fb923c', elegant: '#795548', bold: '#000000', tech: '#00ff00', nature: '#22c55e',
      ocean: '#06b6d4', sunset: '#f59e0b', cosmic: '#1e293b', artistic: '#a855f7', sport: '#ef4444', warm: '#fb923c', cool: '#3b82f6'
    };

    const baseBorderWidth = borderWidthMap[selectedTemplate as keyof typeof borderWidthMap] || 8;
    const finalBorderWidth = baseBorderWidth * scale;
    const finalBorderColor = borderColorMap[selectedTemplate as keyof typeof borderColorMap] || '#667eea';

    return {
      borderWidth: finalBorderWidth,
      borderColor: finalBorderColor,
      borderStyle: 'solid' as const,
    };
  })();

  // Only render ViewShot if we have layers to capture
  if (layers.length === 0) {
    console.log('PosterCanvas: No layers to render, skipping ViewShot');
    return (
      <View style={[
        styles.canvas,
        borderStyle,
        { width: canvasWidth, height: canvasHeight, borderRadius: 12 * scale }
      ]}>
        {/* Background Image */}
        <View style={styles.backgroundImageContainer}>
          <Image
            source={{
              uri: selectedImage.uri,
              width: PixelRatio.getPixelSizeForLayoutSize(canvasWidth),
              height: PixelRatio.getPixelSizeForLayoutSize(canvasHeight),
            }}
            style={[styles.backgroundImage, { borderRadius: 12 * scale }]}
            resizeMode="cover"
            resizeMethod="scale"
          />
        </View>
      </View>
    );
  }

  return (
    <ViewShot
      ref={posterRef}
      style={[
        styles.canvas,
        borderStyle,
        { width: canvasWidth, height: canvasHeight, borderRadius: 12 * scale }
      ]}
      options={{
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
        pixelRatio: PixelRatio.get(),
      }}
    >
      {/* Background Image */}
      <View style={styles.backgroundImageContainer}>
        <Image
          source={{
            uri: selectedImage.uri,
            width: PixelRatio.getPixelSizeForLayoutSize(canvasWidth),
            height: PixelRatio.getPixelSizeForLayoutSize(canvasHeight),
          }}
          style={[styles.backgroundImage, { borderRadius: 12 * scale }]}
          resizeMode="cover"
          resizeMethod="scale"
        />
      </View>
      
      {/* Layers */}
      {layers.map(layer => {
        // Use captured current positions if available, otherwise fall back to calculated positions
        let currentX = layer.position.x;
        let currentY = layer.position.y;
        
        if (currentPositions?.[layer.id]) {
          // Use the captured current positions
          currentX = currentPositions[layer.id].x;
          currentY = currentPositions[layer.id].y;
        } else if (layerAnimations?.[layer.id]?.x && translationValues?.[layer.id]?.x) {
          // Fallback to calculated positions
          const baseX = layerAnimations[layer.id].x._value || 0;
          const translationX = translationValues[layer.id].x._value || 0;
          currentX = baseX + translationX;
          
          const baseY = layerAnimations[layer.id].y._value || 0;
          const translationY = translationValues[layer.id].y._value || 0;
          currentY = baseY + translationY;
        }

        return (
          <View
            key={layer.id}
            style={[
              styles.layer,
              {
                position: 'absolute',
                width: layer.size.width * scale,
                height: layer.size.height * scale,
                zIndex: layer.zIndex,
                transform: [
                  { translateX: currentX * scale },
                  { translateY: currentY * scale },
                  { rotate: `${layer.rotation || 0}deg` }
                ],
              }
            ]}
          >
            {renderLayer(layer)}
          </View>
        );
      })}
    </ViewShot>
  );
};

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  backgroundImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  layer: {
    position: 'absolute',
  },
  layerText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  layerImage: {
    width: '100%',
    height: '100%',
  },
});

export default PosterCanvas;
