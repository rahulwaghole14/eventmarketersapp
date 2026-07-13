package com.marketbrand

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class NotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val CHANNEL_ID = "download_notifications_channel"
    private val CHANNEL_NAME = "Download Notifications"

    override fun getName(): String {
        return "LocalNotificationModule"
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = "Notifications for completed downloads"
            }
            val notificationManager =
                reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    @ReactMethod
    fun showDownloadCompleteNotification(
        title: String,
        body: String,
        filePath: String,
        mimeType: String
    ) {
        createNotificationChannel()

        // Clean the file path (remove file:// prefix if present)
        val cleanPath = if (filePath.startsWith("file://")) {
            filePath.substring(7)
        } else {
            filePath
        }

        val file = File(cleanPath)
        if (!file.exists()) {
            android.util.Log.e("NotificationModule", "File does not exist: $cleanPath")
            return
        }

        // Get safe URI via FileProvider
        val fileUri: Uri = try {
            FileProvider.getUriForFile(
                reactContext,
                reactContext.packageName + ".provider",
                file
            )
        } catch (e: Exception) {
            android.util.Log.e("NotificationModule", "Error getting URI for file", e)
            return
        }

        // Create intent to open the file with FLAG_GRANT_READ_URI_PERMISSION
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(fileUri, mimeType)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        // Wrap in PendingIntent with proper flags based on SDK version
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = PendingIntent.getActivity(
            reactContext,
            System.currentTimeMillis().toInt(),
            intent,
            flags
        )

        // Build notification
        val builder = NotificationCompat.Builder(reactContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download_done) // System default icon
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager =
            reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        // Generate unique notification ID
        val notificationId = System.currentTimeMillis().toInt()
        notificationManager.notify(notificationId, builder.build())
    }
}
