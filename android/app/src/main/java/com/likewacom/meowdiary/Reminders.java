package com.likewacom.meowdiary;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

/**
 * Schedules note reminders and the daily "write your diary" reminder with
 * AlarmManager, so they fire even when the app is closed. The schedule is kept
 * in SharedPreferences so it can be restored after a reboot or app update.
 */
final class Reminders {
    static final String CHANNEL_ID = "reminders";
    static final String ACTION_NOTE = "com.likewacom.meowdiary.NOTE_REMINDER";
    static final String ACTION_DAILY = "com.likewacom.meowdiary.DAILY_REMINDER";
    static final String EXTRA_NOTE_ID = "noteId";
    private static final String PREFS = "reminders";

    private Reminders() { }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Replace all scheduled note reminders with this list: [{id,title,body,at}]. */
    static void setNoteReminders(Context c, String json) {
        try {
            prefs(c).edit().putString("notes", new JSONArray(json).toString()).apply();
        } catch (Exception ignored) {
            return;
        }
        scheduleNotes(c);
    }

    static void setDaily(Context c, boolean enabled, int hour, int minute) {
        prefs(c).edit().putBoolean("dailyOn", enabled).putInt("dailyHour", hour).putInt("dailyMinute", minute).apply();
        scheduleDaily(c);
    }

    static void rescheduleAll(Context c) {
        scheduleNotes(c);
        scheduleDaily(c);
    }

    private static void scheduleNotes(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        SharedPreferences p = prefs(c);
        for (String id : p.getStringSet("scheduled", new HashSet<>())) am.cancel(notePending(c, id, "", ""));
        Set<String> scheduled = new HashSet<>();
        long now = System.currentTimeMillis();
        try {
            JSONArray list = new JSONArray(p.getString("notes", "[]"));
            for (int i = 0; i < list.length(); i++) {
                JSONObject n = list.getJSONObject(i);
                long at = n.optLong("at");
                String id = n.optString("id");
                if (id.isEmpty() || at <= now) continue;
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, notePending(c, id, n.optString("title"), n.optString("body")));
                scheduled.add(id);
            }
        } catch (Exception ignored) { }
        p.edit().putStringSet("scheduled", scheduled).apply();
    }

    private static void scheduleDaily(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        PendingIntent pi = dailyPending(c);
        am.cancel(pi);
        SharedPreferences p = prefs(c);
        if (!p.getBoolean("dailyOn", false)) return;
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, p.getInt("dailyHour", 20));
        next.set(Calendar.MINUTE, p.getInt("dailyMinute", 0));
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis() + 1000) next.add(Calendar.DAY_OF_YEAR, 1);
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pi);
    }

    private static PendingIntent notePending(Context c, String id, String title, String body) {
        Intent i = new Intent(c, ReminderReceiver.class)
                .setAction(ACTION_NOTE)
                .setData(Uri.parse("meowdiary://note/" + Uri.encode(id)))
                .putExtra(EXTRA_NOTE_ID, id)
                .putExtra("title", title)
                .putExtra("body", body);
        return PendingIntent.getBroadcast(c, id.hashCode(), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static PendingIntent dailyPending(Context c) {
        Intent i = new Intent(c, ReminderReceiver.class).setAction(ACTION_DAILY);
        return PendingIntent.getBroadcast(c, 1, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static boolean canNotify(Context c) {
        return Build.VERSION.SDK_INT < 33
                || ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    /** Show a notification; tapping it opens the app (and the note, if noteId is set). */
    @SuppressLint("MissingPermission")
    static void show(Context c, int notificationId, String title, String body, String noteId) {
        if (!canNotify(c)) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL_ID) == null) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL_ID, c.getString(R.string.reminderChannel), NotificationManager.IMPORTANCE_DEFAULT));
        }
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (noteId != null) open.putExtra(EXTRA_NOTE_ID, noteId);
        PendingIntent pi = PendingIntent.getActivity(c, notificationId, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setColor(0xFF8B73C6)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(pi)
                .setAutoCancel(true);
        NotificationManagerCompat.from(c).notify(notificationId, b.build());
    }
}
