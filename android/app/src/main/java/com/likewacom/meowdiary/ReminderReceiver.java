package com.likewacom.meowdiary;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Fires the reminders scheduled by {@link Reminders} (not exported: only our alarms reach it). */
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        String action = intent.getAction();
        if (Reminders.ACTION_NOTE.equals(action)) {
            String id = intent.getStringExtra(Reminders.EXTRA_NOTE_ID);
            String title = intent.getStringExtra("title");
            String body = intent.getStringExtra("body");
            Reminders.show(c, id == null ? 2 : id.hashCode(),
                    title == null || title.isEmpty() ? c.getString(R.string.noteReminderTitle) : title,
                    body == null || body.isEmpty() ? c.getString(R.string.noteReminderBody) : body, id);
        } else if (Reminders.ACTION_DAILY.equals(action)) {
            Reminders.show(c, 1, c.getString(R.string.dailyTitle), c.getString(R.string.dailyBody), null);
            Reminders.rescheduleAll(c); // books tomorrow's daily reminder
        }
    }
}
