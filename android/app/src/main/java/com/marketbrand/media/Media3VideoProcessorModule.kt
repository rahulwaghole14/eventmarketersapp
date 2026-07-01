package com.marketbrand.media

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.util.Clock
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.TextureOverlay
import androidx.media3.effect.Presentation
import androidx.media3.effect.StaticOverlaySettings
import androidx.media3.common.OverlaySettings
import androidx.media3.transformer.Composition
import androidx.media3.transformer.DefaultAssetLoaderFactory
import androidx.media3.transformer.DefaultDecoderFactory
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.google.common.collect.ImmutableList
import android.media.MediaMetadataRetriever
import java.io.File
import java.io.IOException
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

// Local Log shadowing utility to redirect Log.d to Log.e so debug outputs are captured on strict devices.
object Log {
  fun d(tag: String, msg: String) {
    android.util.Log.e(tag, msg)
  }
  fun w(tag: String, msg: String) {
    android.util.Log.w(tag, msg)
  }
  fun e(tag: String, msg: String) {
    android.util.Log.e(tag, msg)
  }
  fun e(tag: String, msg: String, tr: Throwable) {
    android.util.Log.e(tag, msg, tr)
  }
  fun w(tag: String, msg: String, tr: Throwable) {
    android.util.Log.w(tag, msg, tr)
  }
}

/**
 * Native module that uses AndroidX Media3 Transformer to apply bitmap/text overlays to an input video.
 *
 * NOTE: This is an initial implementation. More overlay types (animations, templates, etc.)
 * can be layered on top of the current data model.
 */
class Media3VideoProcessorModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val mainHandler = Handler(Looper.getMainLooper())
  private val executor: ExecutorService = Executors.newSingleThreadExecutor()

  override fun getName(): String = NAME

  @ReactMethod
  fun applyOverlays(
    inputUriString: String,
    overlaysArray: ReadableArray,
    options: ReadableMap?,
    promise: Promise
  ) {
    executor.execute {
      var compositeBitmap: Bitmap? = null
      try {
        val inputUri = Uri.parse(inputUriString)
        val appContext = reactApplicationContext ?: throw IllegalStateException("Context unavailable")
        val cacheDir = appContext.cacheDir ?: throw IOException("Cache directory unavailable")
        val outputFile = createOutputFile(cacheDir, options)

        Log.d(TAG, "=== applyOverlays called ===")
        Log.d(TAG, "  inputUri: $inputUriString")
        Log.d(TAG, "  overlaysArray count: ${overlaysArray.size()}")
        for (i in 0 until overlaysArray.size()) {
          Log.d(TAG, "  overlay[$i]: ${overlaysArray.getMap(i)}")
        }

        val layers = parseOverlayLayers(overlaysArray)
        Log.d(TAG, "  parsed layers count: ${layers.size}")

        val (originalWidth, originalHeight) = getVideoDimensions(appContext, inputUri)
        Log.d(TAG, "  video dimensions: ${originalWidth}x${originalHeight}")

        // Step 1: Scale the video dimensions so the longest side is exactly 1080px.
        // This ensures the output square canvas is 1080x1080, providing crisp resolution
        // for text and logo overlays after H.264 video compression.
        val targetDimension = 1080
        val scale = targetDimension.toFloat() / Math.max(originalWidth, originalHeight)
        var videoWidth = ((originalWidth * scale).toInt() / 2) * 2
        var videoHeight = ((originalHeight * scale).toInt() / 2) * 2
        Log.d(TAG, "Rescaling video from ${originalWidth}x${originalHeight} to ${videoWidth}x${videoHeight}")

        // Step 2: Compute the square output side.
        var squareSide = Math.max(videoWidth, videoHeight).coerceAtLeast(2)
        squareSide = (squareSide / 2) * 2
        Log.d(TAG, "Square output side: $squareSide")

        // Step 3: Build overlay bitmap at 2× the square side (supersampling).
        val oversampleFactor = 2
        val overlayBitmapSide = squareSide * oversampleFactor
        val canvasWidth = if (options != null && options.hasKey("canvasWidth")) options.getDouble("canvasWidth") else 360.0
        val canvasHeight = if (options != null && options.hasKey("canvasHeight")) options.getDouble("canvasHeight") else 360.0
        Log.d(TAG, "Building composite bitmap at ${overlayBitmapSide}x${overlayBitmapSide} for canvas ${canvasWidth}x${canvasHeight}")
        compositeBitmap = buildCompositeOverlayBitmap(
          appContext,
          layers,
          overlayBitmapSide,
          overlayBitmapSide,
          canvasWidth,
          canvasHeight
        )
        Log.d(TAG, "compositeBitmap built: ${compositeBitmap != null}, size: ${compositeBitmap?.width}x${compositeBitmap?.height}")

        val textureOverlays: ImmutableList<TextureOverlay> = if (compositeBitmap != null) {
          val customOverlay = object : BitmapOverlay() {
            private var logCount = 0
            override fun getBitmap(presentationTimeUs: Long): Bitmap {
              if (logCount < 10) {
                Log.d(TAG, "getBitmap called for frame at ${presentationTimeUs}us")
                logCount++
              }
              return compositeBitmap
            }

            override fun getOverlaySettings(presentationTimeUs: Long): OverlaySettings {
              val scale = 1.0f / oversampleFactor
              return StaticOverlaySettings.Builder()
                .setScale(scale, scale)
                .setBackgroundFrameAnchor(0f, 0f)
                .setOverlayFrameAnchor(0f, 0f)
                .setAlphaScale(1.0f)
                .build()
            }
          }
          ImmutableList.of<TextureOverlay>(customOverlay)
        } else {
          ImmutableList.of()
        }

        mainHandler.post {
          try {
            startTransformation(appContext, inputUri, textureOverlays, outputFile, promise, squareSide, compositeBitmap)
          } catch (error: Throwable) {
            Log.e(TAG, "Media3 transformation failed on main thread", error)
            compositeBitmap?.recycle()
            promise.reject("MEDIA3_PROCESS_ERROR", error)
          }
        }
      } catch (error: Throwable) {
        Log.e(TAG, "Media3 transformation failed", error)
        compositeBitmap?.recycle()
        promise.reject("MEDIA3_PROCESS_ERROR", error)
      }
    }
  }

  private fun startTransformation(
    context: Context,
    inputUri: Uri,
    textureOverlays: ImmutableList<TextureOverlay>,
    outputFile: File,
    promise: Promise,
    squareSide: Int,       // Output is always a square canvas (letterboxed video + overlays)
    compositeBitmap: Bitmap?
  ) {
    val editedMediaItemBuilder = EditedMediaItem.Builder(MediaItem.fromUri(inputUri))

    val videoEffects = mutableListOf<androidx.media3.common.Effect>()

    // Always apply a square Presentation: letterboxes the video into squareSide×squareSide
    // with black bars on the shorter sides, exactly matching the editor's resizeMode="contain".
    val presentationEffect = Presentation.createForWidthAndHeight(
      squareSide,
      squareSide,
      Presentation.LAYOUT_SCALE_TO_FIT
    )
    videoEffects.add(presentationEffect)

    if (textureOverlays.isNotEmpty()) {
      val overlayEffect = OverlayEffect(textureOverlays)
      videoEffects.add(overlayEffect)
    }

    val effects = Effects(emptyList(), videoEffects)
    editedMediaItemBuilder.setEffects(effects)

    val editedMediaItem = editedMediaItemBuilder.build()

    val encoderFactoryBuilder = DefaultEncoderFactory.Builder(context)
      .setEnableFallback(true)

    try {
      // Optimize bitrate to 3.5 Mbps for 1080p (or 2 Mbps otherwise). This keeps the file
      // size small and compression-friendly, preventing messaging apps (like WhatsApp)
      // from applying aggressive, lossy compression during sharing.
      val targetBitrate = if (squareSide >= 1080) 3_500_000 else 2_000_000
      val encoderSettings = VideoEncoderSettings.Builder()
        .setBitrate(targetBitrate)
        .build()
      encoderFactoryBuilder.setRequestedVideoEncoderSettings(encoderSettings)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to apply custom VideoEncoderSettings, using default factory settings", e)
    }

    val encoderFactory = encoderFactoryBuilder.build()

    val decoderFactory = DefaultDecoderFactory.Builder(context)
      .setEnableDecoderFallback(true)
      .build()

    val assetLoaderFactory = DefaultAssetLoaderFactory(context, decoderFactory, Clock.DEFAULT, null)

    val transformer = Transformer.Builder(context)
      .setEncoderFactory(encoderFactory)
      .setAssetLoaderFactory(assetLoaderFactory)
      .addListener(object : Transformer.Listener {
        override fun onCompleted(composition: Composition, exportResult: ExportResult) {
          compositeBitmap?.recycle()
          promise.resolve(outputFile.absolutePath)
        }

        override fun onError(
          composition: Composition,
          exportResult: ExportResult,
          exportException: ExportException,
        ) {
          compositeBitmap?.recycle()
          promise.reject("MEDIA3_EXPORT_ERROR", exportException)
        }
      })
      .build()

    transformer.start(editedMediaItem, outputFile.absolutePath)
  }

  private fun parseOverlayLayers(array: ReadableArray): List<OverlayLayer> {
    val layers = mutableListOf<OverlayLayer>()
    for (i in 0 until array.size()) {
      val map = array.getMap(i) ?: continue
      val type = map.getString("type") ?: continue
      val position = map.getMap("position")
      val x = position?.getDouble("x") ?: 0.0
      val y = position?.getDouble("y") ?: 0.0
      val width = map.getDoubleOrNull("width")
      val height = map.getDoubleOrNull("height")
      val opacity = map.getDoubleOrNull("opacity") ?: 1.0

      when (type) {
        "image" -> {
          val uri = map.getString("uri") ?: continue
          layers.add(
            OverlayLayer.ImageLayer(
              uri = uri,
              normalizedX = x,
              normalizedY = y,
              normalizedWidth = width,
              normalizedHeight = height,
              opacity = opacity,
            )
          )
        }

        "text" -> {
          val text = map.getString("text") ?: continue
          val fontSize = map.getDoubleOrNull("fontSize") ?: 18.0
          val color = map.getString("color") ?: "#FFFFFFFF"
          val backgroundColor = map.getString("backgroundColor")
          val fontFamily = map.getString("fontFamily")
          layers.add(
            OverlayLayer.TextLayer(
              text = text,
              normalizedX = x,
              normalizedY = y,
              fontSize = fontSize.toFloat(),
              color = color,
              backgroundColor = backgroundColor,
              fontFamily = fontFamily,
              normalizedWidth = width,
              normalizedHeight = height,
              opacity = opacity.toFloat(),
            )
          )
        }

        "rect" -> {
          // Solid colour rectangle — used for footer background bars.
          val color = map.getString("color") ?: "rgba(0,0,0,0.6)"
          layers.add(
            OverlayLayer.RectLayer(
              color = color,
              normalizedX = x,
              normalizedY = y,
              normalizedWidth = width,
              normalizedHeight = height,
              opacity = opacity,
            )
          )
        }

        else -> Log.w(TAG, "Unsupported overlay type: $type")
      }
    }
    return layers
  }

  private fun getVideoDimensions(context: Context, uri: Uri): Pair<Int, Int> {
    var retriever: MediaMetadataRetriever? = null
    return try {
      retriever = MediaMetadataRetriever().apply {
        if (uri.scheme == "file" && uri.path != null) {
          setDataSource(uri.path)
        } else {
          setDataSource(context, uri)
        }
      }
      val rawWidth = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: DEFAULT_VIDEO_WIDTH
      val rawHeight = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: DEFAULT_VIDEO_HEIGHT
      val rotation = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0

      Log.d(TAG, "Video metadata - rawWidth: $rawWidth, rawHeight: $rawHeight, rotation: $rotation")

      if (rotation == 90 || rotation == 270) {
        Pair(rawHeight, rawWidth)
      } else {
        Pair(rawWidth, rawHeight)
      }
    } catch (error: Exception) {
      Log.w(TAG, "Failed to read video metadata, using defaults", error)
      Pair(DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT)
    } finally {
      try {
        retriever?.release()
      } catch (e: Exception) {
        Log.w(TAG, "Failed to release MediaMetadataRetriever", e)
      }
    }
  }

  private fun buildCompositeOverlayBitmap(
    context: Context,
    layers: List<OverlayLayer>,
    videoWidth: Int,
    videoHeight: Int,
    canvasW: Double,
    canvasH: Double,
  ): Bitmap? {
    if (layers.isEmpty()) {
      return null
    }

    val width = videoWidth.coerceAtLeast(1)
    val height = videoHeight.coerceAtLeast(1)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.TRANSPARENT)

    // High-quality paint for all blitting — enables bilinear filtering and dithering.
    val basePaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG or Paint.DITHER_FLAG)

    // Scale factors from canvas space to video space
    val scaleFactorX = width.toFloat() / canvasW.toFloat()
    val scaleFactorY = height.toFloat() / canvasH.toFloat()

    layers.forEach { layer ->
      when (layer) {
        is OverlayLayer.ImageLayer -> {
          Log.d(TAG, "  [IMAGE] uri=${layer.uri}, normX=${layer.normalizedX}, normY=${layer.normalizedY}, normW=${layer.normalizedWidth}, normH=${layer.normalizedHeight}")
          val source = loadBitmap(context, layer.uri)
          if (source == null) {
            Log.w(TAG, "  [IMAGE] ⚠️ Failed to load bitmap from: ${layer.uri}")
            return@forEach
          }
          val targetWidth = layer.normalizedWidth?.let { (it * width).toInt().coerceAtLeast(1) } ?: source.width
          val targetHeight = layer.normalizedHeight?.let { (it * height).toInt().coerceAtLeast(1) } ?: source.height
          // createScaledBitmap with filter=true uses bilinear interpolation.
          val scaled = if (targetWidth != source.width || targetHeight != source.height) {
            Bitmap.createScaledBitmap(source, targetWidth, targetHeight, true)
          } else {
            source
          }

          val (left, top) = computeLayerPosition(layer, targetWidth, targetHeight, width, height)
          Log.d(TAG, "  [IMAGE] drawing at left=$left, top=$top, size=${targetWidth}x${targetHeight}")
          val paint = Paint(basePaint).apply {
            alpha = (layer.opacity.coerceIn(0.0, 1.0) * 255).toInt()
          }
          canvas.drawBitmap(scaled, left, top, paint)
          if (scaled != source) scaled.recycle()
          source.recycle()
        }

        is OverlayLayer.TextLayer -> {
          Log.d(TAG, "  [TEXT] text='${layer.text}', normX=${layer.normalizedX}, normY=${layer.normalizedY}, fontSize=${layer.fontSize}, color=${layer.color}")
          // Render the text at its exact target font size relative to the canvas height scale
          val textBitmap = createTextBitmap(layer, scaleFactorY)
          
          val targetWidth = textBitmap.width
          val targetHeight = textBitmap.height

          val (left, top) = computeLayerPosition(layer, targetWidth, targetHeight, width, height)
          Log.d(TAG, "  [TEXT] drawing at left=$left, top=$top, size=${targetWidth}x${targetHeight}")
          val paint = Paint(basePaint).apply {
            alpha = (layer.opacity.coerceIn(0.0, 1.0) * 255).toInt()
          }
          canvas.drawBitmap(textBitmap, left, top, paint)
          textBitmap.recycle()
        }
        is OverlayLayer.RectLayer -> {
          Log.d(TAG, "  [RECT] color=${layer.color}, normX=${layer.normalizedX}, normY=${layer.normalizedY}, normW=${layer.normalizedWidth}, normH=${layer.normalizedHeight}")
          val rectW = layer.normalizedWidth?.let { (it * width).toInt().coerceAtLeast(1) } ?: width
          val rectH = layer.normalizedHeight?.let { (it * height).toInt().coerceAtLeast(1) } ?: height
          val centerX = (layer.normalizedX.coerceIn(0.0, 1.0) * width).toFloat()
          val centerY = (layer.normalizedY.coerceIn(0.0, 1.0) * height).toFloat()
          val left = centerX - rectW / 2f
          val top = centerY - rectH / 2f
          val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = parseColor(layer.color)
            alpha = (layer.opacity.coerceIn(0.0, 1.0) * 255).toInt()
          }
          canvas.drawRect(left, top, left + rectW, top + rectH, paint)
          Log.d(TAG, "  [RECT] drawn at left=$left, top=$top, size=${rectW}x${rectH}")
        }
      }
    }

    // Diagnostic: Log pixel colors at logo and text positions to verify canvas blitting
    if (bitmap != null) {
      try {
        val logoPixel = bitmap.getPixel(1205, 132)
        val textPixel = bitmap.getPixel(338, 1362)
        Log.d(TAG, "DIAGNOSTIC - compositeBitmap pixel at logo (1205, 132): ${Integer.toHexString(logoPixel)}")
        Log.d(TAG, "DIAGNOSTIC - compositeBitmap pixel at text (338, 1362): ${Integer.toHexString(textPixel)}")
      } catch (e: Exception) {
        Log.w(TAG, "DIAGNOSTIC - Failed to read pixels", e)
      }
    }

    return bitmap
  }

  private fun computeLayerPosition(
    layer: OverlayLayer,
    layerWidth: Int,
    layerHeight: Int,
    videoWidth: Int,
    videoHeight: Int,
  ): Pair<Float, Float> {
    val centerX = (layer.normalizedX.coerceIn(0.0, 1.0) * videoWidth).toFloat()
    val centerY = (layer.normalizedY.coerceIn(0.0, 1.0) * videoHeight).toFloat()
    val left = centerX - layerWidth / 2f
    val top = centerY - layerHeight / 2f
    // Allow negative positions (layer partially off-canvas) — clamping would shift
    // layers that extend to the edge inward and distort placement.
    return Pair(left, top)
  }

  private fun createTextBitmap(layer: OverlayLayer.TextLayer, scaleFactor: Float): Bitmap {
    // Render text at 2× scale then downscale — produces beautifully anti-aliased edges
    // equivalent to retina / high-DPI rendering, eliminating jagged text in the output video.
    val superscale = 2f
    val fontSizePx = layer.fontSize.coerceAtLeast(12f) * scaleFactor * superscale

    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG or Paint.LINEAR_TEXT_FLAG).apply {
      color = parseColor(layer.color)
      textSize = fontSizePx
      isAntiAlias = true
      isDither = true
      typeface = when {
        layer.fontFamily.isNullOrEmpty() -> Typeface.DEFAULT_BOLD
        else -> Typeface.create(layer.fontFamily, Typeface.BOLD)
      }
      alpha = (layer.opacity.toDouble().coerceIn(0.0, 1.0) * 255).toInt()
    }

    val text = layer.text
    val textWidth = paint.measureText(text)
    val fontMetrics = paint.fontMetrics
    val textHeight = fontMetrics.bottom - fontMetrics.top

    val padding = fontSizePx / 3
    val hiW = (textWidth + padding * 2).toInt().coerceAtLeast(2)
    val hiH = (textHeight + padding * 2).toInt().coerceAtLeast(2)

    // Draw at 2× size
    val hiBitmap = Bitmap.createBitmap(hiW, hiH, Bitmap.Config.ARGB_8888)
    val hiCanvas = Canvas(hiBitmap)

    layer.backgroundColor?.let { bgColor ->
      val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = parseColor(bgColor)
        isDither = true
      }
      hiCanvas.drawRoundRect(
        0f, 0f, hiW.toFloat(), hiH.toFloat(),
        padding / 2, padding / 2, bgPaint
      )
    }

    hiCanvas.drawText(text, padding, padding - fontMetrics.top, paint)

    // Downscale to 1× with bilinear filtering — anti-aliased result
    val outW = (hiW / superscale).toInt().coerceAtLeast(1)
    val outH = (hiH / superscale).toInt().coerceAtLeast(1)
    val outBitmap = Bitmap.createScaledBitmap(hiBitmap, outW, outH, true)
    hiBitmap.recycle()
    return outBitmap
  }

  private fun loadBitmap(context: Context, uriString: String): Bitmap? {
    // Always decode at full quality (inSampleSize=1) and force ARGB_8888 — the highest
    // possible colour fidelity. This ensures logos and images are pixel-perfect before
    // being composited onto the overlay canvas.
    val opts = BitmapFactory.Options().apply {
      inSampleSize = 1
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    return try {
      when {
        uriString.startsWith("file://") -> BitmapFactory.decodeFile(uriString.removePrefix("file://"), opts)
        uriString.startsWith("/") -> BitmapFactory.decodeFile(uriString, opts)
        uriString.startsWith("content://") -> {
          context.contentResolver.openInputStream(Uri.parse(uriString)).use { stream ->
            BitmapFactory.decodeStream(stream, null, opts)
          }
        }

        uriString.startsWith("http") || uriString.startsWith("https") -> {
          val connection = java.net.URL(uriString).openConnection()
          connection.connect()
          connection.getInputStream().use { stream ->
            BitmapFactory.decodeStream(stream, null, opts)
          }
        }

        else -> BitmapFactory.decodeFile(uriString, opts)
      }
    } catch (error: Exception) {
      Log.e(TAG, "Failed to load bitmap from $uriString", error)
      null
    }
  }

  private fun parseColor(colorString: String?): Int {
    if (colorString.isNullOrBlank()) {
      return Color.WHITE
    }

    val trimmed = colorString.trim()

    return try {
      when {
        trimmed.startsWith("rgba", ignoreCase = true) -> {
          val parts = trimmed
            .removePrefix("rgba")
            .removePrefix("(")
            .removeSuffix(")")
            .split(",")
            .map { it.trim() }
          val r = parts.getOrNull(0)?.toFloatOrNull()?.coerceIn(0f, 255f) ?: 0f
          val g = parts.getOrNull(1)?.toFloatOrNull()?.coerceIn(0f, 255f) ?: 0f
          val b = parts.getOrNull(2)?.toFloatOrNull()?.coerceIn(0f, 255f) ?: 0f
          val a = parts.getOrNull(3)?.toFloatOrNull()?.coerceIn(0f, 1f) ?: 1f
          Color.argb((a * 255).toInt(), r.toInt(), g.toInt(), b.toInt())
        }

        trimmed.startsWith("rgb", ignoreCase = true) -> {
          val parts = trimmed
            .removePrefix("rgb")
            .removePrefix("(")
            .removeSuffix(")")
            .split(",")
            .map { it.trim() }
          val r = parts.getOrNull(0)?.toFloatOrNull()?.coerceIn(0f, 255f) ?: 0f
          val g = parts.getOrNull(1)?.toFloatOrNull()?.coerceIn(0f, 255f) ?: 0f
          val b = parts.getOrNull(2)?.toFloatOrNull()?.coerceIn(0f, 255f) ?: 0f
          Color.rgb(r.toInt(), g.toInt(), b.toInt())
        }

        trimmed.equals("transparent", ignoreCase = true) -> Color.TRANSPARENT
        else -> Color.parseColor(trimmed)
      }
    } catch (error: IllegalArgumentException) {
      Log.w(TAG, "Invalid color string $colorString, defaulting to white", error)
      Color.WHITE
    }
  }

  private fun ReadableMap.getDoubleOrNull(key: String): Double? =
    if (hasKey(key) && !isNull(key)) getDouble(key) else null

  private fun createOutputFile(cacheDir: File, options: ReadableMap?): File {
    val fileName = options?.getStringOrNull("fileName") ?: "overlay_${System.currentTimeMillis()}.mp4"
    return File(cacheDir, fileName)
  }

  private fun ReadableMap.getStringOrNull(key: String): String? =
    if (hasKey(key) && !isNull(key)) getString(key) else null

  companion object {
    private const val NAME = "Media3VideoProcessor"
    private const val TAG = "Media3VideoProcessor"
    private const val DEFAULT_VIDEO_WIDTH = 720
    private const val DEFAULT_VIDEO_HEIGHT = 1280
  }

  private sealed class OverlayLayer(
    val normalizedX: Double,
    val normalizedY: Double,
    val normalizedWidth: Double?,
    val normalizedHeight: Double?,
    val opacity: Double,
  ) {
    class ImageLayer(
      val uri: String,
      normalizedX: Double,
      normalizedY: Double,
      normalizedWidth: Double?,
      normalizedHeight: Double?,
      opacity: Double,
    ) : OverlayLayer(normalizedX, normalizedY, normalizedWidth, normalizedHeight, opacity)

    class TextLayer(
      val text: String,
      normalizedX: Double,
      normalizedY: Double,
      val fontSize: Float,
      val color: String,
      val backgroundColor: String?,
      val fontFamily: String?,
      normalizedWidth: Double?,
      normalizedHeight: Double?,
      opacity: Float,
    ) : OverlayLayer(normalizedX, normalizedY, normalizedWidth, normalizedHeight, opacity.toDouble())

    class RectLayer(
      val color: String,
      normalizedX: Double,
      normalizedY: Double,
      normalizedWidth: Double?,
      normalizedHeight: Double?,
      opacity: Double,
    ) : OverlayLayer(normalizedX, normalizedY, normalizedWidth, normalizedHeight, opacity)
  }
}

