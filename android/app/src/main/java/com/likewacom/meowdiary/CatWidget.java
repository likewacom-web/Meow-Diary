package com.likewacom.meowdiary;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Home-screen widget: the cat's level, fullness and happiness, plus a "write" button. */
public class CatWidget extends AppWidgetProvider {
    private static final String PREFS = "catWidget";

    /** Called from the page (window.MeowDiaryAndroid.updateCatWidget) whenever the cat changes. */
    static void save(Context c, String name, int level, int coins, int hunger, int happiness) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("name", name).putInt("level", level).putInt("coins", coins)
                .putInt("hunger", hunger).putInt("happiness", happiness).apply();
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, CatWidget.class));
        if (ids.length > 0) new CatWidget().onUpdate(c, m, ids);
    }

    @Override
    public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String name = p.getString("name", c.getString(R.string.widgetCatName));
        int hunger = clamp(p.getInt("hunger", 70)), happy = clamp(p.getInt("happiness", 70));
        String mood = happy >= 70 ? "😺" : happy >= 40 ? "🐱" : "😿";
        for (int id : ids) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_cat);
            v.setTextViewText(R.id.widgetTitle, mood + " " + name + " · Lv. " + p.getInt("level", 1));
            v.setTextViewText(R.id.widgetHunger, c.getString(R.string.widgetHunger, hunger));
            v.setTextViewText(R.id.widgetHappy, c.getString(R.string.widgetHappy, happy));
            v.setProgressBar(R.id.widgetHungerBar, 100, hunger, false);
            v.setProgressBar(R.id.widgetHappyBar, 100, happy, false);
            v.setOnClickPendingIntent(R.id.widgetRoot, open(c, Intent.ACTION_MAIN, 10));
            v.setOnClickPendingIntent(R.id.widgetWrite, open(c, MainActivity.ACTION_NEW_NOTE, 11));
            manager.updateAppWidget(id, v);
        }
    }

    private static int clamp(int v) { return Math.max(0, Math.min(100, v)); }

    private static PendingIntent open(Context c, String action, int requestCode) {
        Intent i = new Intent(c, MainActivity.class).setAction(action)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, requestCode, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }
}
