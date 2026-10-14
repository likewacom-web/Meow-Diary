package com.likewacom.meowdiary;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageDecoder;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

import java.io.File;
import java.util.concurrent.Executor;

/**
 * Meow Diary as a native app: the web app runs inside this app's own WebView
 * (no Chrome UI), and Google sign-in uses Android's Credential Manager because
 * Google blocks its sign-in page inside WebViews.
 */
public class MainActivity extends AppCompatActivity {
    static final String ACTION_NEW_NOTE = "com.likewacom.meowdiary.NEW_NOTE";
    static final String ACTION_NEW_CHECKLIST = "com.likewacom.meowdiary.NEW_CHECKLIST";
    static final String ACTION_NEW_PHOTO = "com.likewacom.meowdiary.NEW_PHOTO";
    private WebView web;
    private FrameLayout root;
    private String home;
    private String siteHost;
    private CredentialManager credentialManager;
    private Executor mainExecutor;

    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;
    private PermissionRequest pendingWebPermission;
    private WebView printView; // kept alive until printing has started
    private boolean pageReady;
    private Intent pendingIntent; // share / notification intent waiting for the page

    // App lock: fingerprint / face / screen lock, asked on open and after 60 s in the background.
    private static final int LOCK_AUTHENTICATORS =
            BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    private static final long RELOCK_AFTER_MS = 60_000;
    private View lockView;
    private long backgroundedAt;
    private boolean authenticating;

    private final ActivityResultLauncher<Intent> fileLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> {
                if (fileCallback == null) return;
                Uri[] uris = null;
                if (result.getResultCode() == Activity.RESULT_OK) {
                    if (cameraUri != null) {
                        uris = new Uri[]{cameraUri};
                    } else if (result.getData() != null) {
                        Intent data = result.getData();
                        ClipData clip = data.getClipData();
                        if (clip != null) {
                            uris = new Uri[clip.getItemCount()];
                            for (int i = 0; i < clip.getItemCount(); i++) uris[i] = clip.getItemAt(i).getUri();
                        } else if (data.getData() != null) {
                            uris = new Uri[]{data.getData()};
                        }
                    }
                }
                fileCallback.onReceiveValue(uris);
                fileCallback = null;
                cameraUri = null;
            });

    // "Photo note" shortcut: take a picture, then hand it to the page like a share.
    private Uri shortcutPhotoUri;
    private final ActivityResultLauncher<Uri> photoLauncher = registerForActivityResult(
            new ActivityResultContracts.TakePicture(), saved -> {
                Uri uri = shortcutPhotoUri;
                shortcutPhotoUri = null;
                if (!Boolean.TRUE.equals(saved) || uri == null) return;
                Executors.newSingleThreadExecutor().execute(() -> {
                    String d = imageAsDataUrl(uri);
                    if (d == null) return;
                    JSONObject payload = new JSONObject();
                    try { payload.put("images", new JSONArray().put(d)); } catch (Exception ignored) { }
                    runOnUiThread(() -> callPage("meowSharedContent", payload.toString()));
                });
            });

    private final ActivityResultLauncher<String> micPermissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(), granted -> {
                if (pendingWebPermission == null) return;
                if (granted) pendingWebPermission.grant(pendingWebPermission.getResources());
                else pendingWebPermission.deny();
                pendingWebPermission = null;
            });

    private final ActivityResultLauncher<String> notificationPermissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(), granted -> { });

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        home = getString(R.string.launchUrl);
        siteHost = getString(R.string.hostName);
        credentialManager = CredentialManager.create(this);
        mainExecutor = ContextCompat.getMainExecutor(this);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        root = new FrameLayout(this);
        root.setBackgroundColor(ContextCompat.getColor(this, R.color.themeColor));
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        // Keep content clear of the status bar, navigation bar and keyboard.
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        applyThemeColor(ContextCompat.getColor(this, R.color.themeColor));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " MeowDiaryApp/1");
        web.addJavascriptInterface(new Bridge(), "MeowAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isAppUrl(uri)) return false;
                openExternally(uri);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                if (pendingIntent != null) {
                    Intent i = pendingIntent;
                    pendingIntent = null;
                    deliverIntent(i);
                }
            }
        });
        web.setWebChromeClient(new ChromeClient());

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // Let the page close its editor / sheets first.
                web.evaluateJavascript("(window.meowHandleBack&&window.meowHandleBack())||false", value -> {
                    if ("true".equals(value)) return;
                    if (web.canGoBack()) web.goBack();
                    else finish();
                });
            }
        });

        // After a re-create (e.g. the phone switched to dark mode) the original share /
        // shortcut intent comes back; it was already handled.
        pendingIntent = savedInstanceState == null ? getIntent() : null;
        if (lockEnabled()) showLock();
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(startUrl(getIntent()));
    }

    @Override
    protected void onNewIntent(@NonNull Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null && isAppUrl(data)) { web.loadUrl(data.toString()); return; }
        if (pageReady) deliverIntent(intent);
        else pendingIntent = intent;
    }

    /** Hand a shared item or a tapped reminder to the page (it waits until the app script is ready). */
    private void deliverIntent(Intent intent) {
        if (intent == null) return;
        String noteId = intent.getStringExtra(Reminders.EXTRA_NOTE_ID);
        if (noteId != null) {
            callPage("meowOpenNote", JSONObject.quote(noteId));
            intent.removeExtra(Reminders.EXTRA_NOTE_ID);
            return;
        }
        String action = intent.getAction();
        if (ACTION_NEW_NOTE.equals(action) || ACTION_NEW_CHECKLIST.equals(action) || ACTION_NEW_PHOTO.equals(action)) {
            intent.setAction(Intent.ACTION_MAIN); // handle once
            if (ACTION_NEW_PHOTO.equals(action)) takeShortcutPhoto();
            else callPage("meowQuickAction", ACTION_NEW_CHECKLIST.equals(action) ? "\"checklist\"" : "\"text\"");
            return;
        }
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) return;
        intent.setAction(Intent.ACTION_MAIN); // don't import twice after rotation / restore
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        List<Uri> images = new ArrayList<>();
        if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (list != null) images.addAll(list);
        } else {
            Uri one = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (one != null) images.add(one);
        }
        // Decoding images can be slow: do it off the UI thread.
        Executors.newSingleThreadExecutor().execute(() -> {
            JSONObject payload = new JSONObject();
            JSONArray dataUrls = new JSONArray();
            for (Uri u : images.subList(0, Math.min(images.size(), 10))) {
                String d = imageAsDataUrl(u);
                if (d != null) dataUrls.put(d);
            }
            try {
                payload.put("title", subject == null ? "" : subject);
                payload.put("text", text == null ? "" : text.toString());
                payload.put("images", dataUrls);
            } catch (Exception ignored) { }
            runOnUiThread(() -> callPage("meowSharedContent", payload.toString()));
        });
    }

    private void takeShortcutPhoto() {
        try {
            File dir = new File(getCacheDir(), "images");
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
            File photo = File.createTempFile("photo_", ".jpg", dir);
            shortcutPhotoUri = FileProvider.getUriForFile(this, getPackageName() + ".files", photo);
            photoLauncher.launch(shortcutPhotoUri);
        } catch (Exception e) {
            shortcutPhotoUri = null;
        }
    }

    private void shareText(String title, String text) {
        Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
        if (title != null && !title.isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, title);
        Intent chooser = Intent.createChooser(send, title == null || title.isEmpty() ? getString(R.string.appName) : title);
        // Don't offer Meow Diary itself as a place to share the note to.
        chooser.putExtra(Intent.EXTRA_EXCLUDE_COMPONENTS, new ComponentName[]{new ComponentName(this, MainActivity.class)});
        try { startActivity(chooser); } catch (ActivityNotFoundException ignored) { }
    }

    /** Calls window[fn](arg) once the page has defined it (retries for ~10 s). */
    private void callPage(String fn, String argJson) {
        String js = "(function t(n){if(window." + fn + "){window." + fn + "(" + argJson + ")}else if(n<50){setTimeout(function(){t(n+1)},200)}})(0)";
        web.evaluateJavascript(js, null);
    }

    /** Downscale a shared image to at most 1600 px and return it as a JPEG data URL. */
    private String imageAsDataUrl(Uri uri) {
        try {
            Bitmap bmp;
            if (Build.VERSION.SDK_INT >= 28) {
                bmp = ImageDecoder.decodeBitmap(ImageDecoder.createSource(getContentResolver(), uri), (decoder, info, src) -> {
                    int w = info.getSize().getWidth(), h = info.getSize().getHeight();
                    double scale = Math.min(1.0, 1600.0 / Math.max(w, h));
                    decoder.setTargetSize(Math.max(1, (int) (w * scale)), Math.max(1, (int) (h * scale)));
                    decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
                });
            } else {
                BitmapFactory.Options bounds = new BitmapFactory.Options();
                bounds.inJustDecodeBounds = true;
                try (java.io.InputStream in = getContentResolver().openInputStream(uri)) { BitmapFactory.decodeStream(in, null, bounds); }
                BitmapFactory.Options opts = new BitmapFactory.Options();
                opts.inSampleSize = 1;
                while (Math.max(bounds.outWidth, bounds.outHeight) / opts.inSampleSize > 3200) opts.inSampleSize *= 2;
                try (java.io.InputStream in = getContentResolver().openInputStream(uri)) { bmp = BitmapFactory.decodeStream(in, null, opts); }
            }
            if (bmp == null) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bmp.compress(Bitmap.CompressFormat.JPEG, 85, out);
            return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception | OutOfMemoryError e) {
            return null;
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (backgroundedAt > 0 && lockEnabled() && SystemClock.elapsedRealtime() - backgroundedAt > RELOCK_AFTER_MS) showLock();
        backgroundedAt = 0;
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (!authenticating) backgroundedAt = SystemClock.elapsedRealtime();
    }

    private boolean lockEnabled() {
        return getSharedPreferences("lock", MODE_PRIVATE).getBoolean("enabled", false) && lockAvailable();
    }

    private boolean lockAvailable() {
        return BiometricManager.from(this).canAuthenticate(LOCK_AUTHENTICATORS) == BiometricManager.BIOMETRIC_SUCCESS;
    }

    /** Covers the notes until the phone's biometric / screen lock is passed. */
    private void showLock() {
        if (lockView == null) {
            LinearLayout box = new LinearLayout(this);
            box.setOrientation(LinearLayout.VERTICAL);
            box.setGravity(Gravity.CENTER);
            box.setBackgroundColor(ContextCompat.getColor(this, R.color.themeColor));
            box.setClickable(true);
            ImageView icon = new ImageView(this);
            icon.setImageResource(R.mipmap.ic_launcher);
            int size = (int) (96 * getResources().getDisplayMetrics().density);
            box.addView(icon, new LinearLayout.LayoutParams(size, size));
            TextView label = new TextView(this);
            label.setText(R.string.unlockHint);
            label.setTextSize(16);
            label.setTextColor(0xFF6B5A8E);
            label.setPadding(0, size / 4, 0, 0);
            box.addView(label);
            box.setOnClickListener(v -> authenticate());
            lockView = box;
        }
        if (lockView.getParent() == null) root.addView(lockView, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        root.post(this::authenticate);
    }

    private void hideLock() {
        if (lockView != null && lockView.getParent() != null) root.removeView(lockView);
    }

    private void authenticate() {
        if (authenticating || lockView == null || lockView.getParent() == null) return;
        if (!lockAvailable()) { hideLock(); return; } // phone lock was removed: don't lock people out
        authenticating = true;
        BiometricPrompt prompt = new BiometricPrompt(this, mainExecutor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                authenticating = false;
                hideLock();
            }

            @Override
            public void onAuthenticationError(int code, @NonNull CharSequence message) {
                authenticating = false; // stays locked; tap the lock screen to try again
            }
        });
        prompt.authenticate(new BiometricPrompt.PromptInfo.Builder()
                .setTitle(getString(R.string.unlockTitle))
                .setSubtitle(getString(R.string.unlockHint))
                .setAllowedAuthenticators(LOCK_AUTHENTICATORS)
                .build());
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    private String startUrl(Intent intent) {
        Uri data = intent != null ? intent.getData() : null;
        return data != null && isAppUrl(data) ? data.toString() : home;
    }

    private boolean isAppUrl(Uri uri) {
        String path = uri.getPath() == null ? "" : uri.getPath();
        return "https".equals(uri.getScheme()) && siteHost.equals(uri.getHost()) && path.startsWith("/Meow-Diary");
    }

    private void openExternally(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) { }
    }

    private void applyThemeColor(int color) {
        root.setBackgroundColor(color);
        double luminance = (0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)) / 255;
        boolean light = luminance > 0.5;
        WindowCompat.getInsetsController(getWindow(), root).setAppearanceLightStatusBars(light);
        WindowCompat.getInsetsController(getWindow(), root).setAppearanceLightNavigationBars(light);
    }

    private void sendSignInResult(String token, String error) {
        String js = "window.meowNativeSignInResult&&window.meowNativeSignInResult("
                + (token == null ? "null" : JSONObject.quote(token)) + ","
                + (error == null ? "null" : JSONObject.quote(error)) + ")";
        web.evaluateJavascript(js, null);
    }

    private void signInWithGoogle() {
        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(getString(R.string.googleWebClientId)).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
        credentialManager.getCredentialAsync(this, request, null, mainExecutor,
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        Credential credential = response.getCredential();
                        if (credential instanceof CustomCredential
                                && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                            try {
                                GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(credential.getData());
                                sendSignInResult(google.getIdToken(), null);
                            } catch (Exception e) {
                                sendSignInResult(null, String.valueOf(e.getMessage()));
                            }
                        } else {
                            sendSignInResult(null, "Unexpected credential type");
                        }
                    }

                    @Override
                    public void onError(@NonNull GetCredentialException e) {
                        sendSignInResult(null, e instanceof GetCredentialCancellationException ? "cancelled" : String.valueOf(e.getMessage()));
                    }
                });
    }

    private void printHtml(String html) {
        printView = new WebView(this);
        printView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                pm.print("Meow Diary", view.createPrintDocumentAdapter("MeowDiary"), new PrintAttributes.Builder().build());
            }
        });
        printView.loadDataWithBaseURL(home, html, "text/html", "utf-8", null);
    }

    /** Methods the web page can call as window.MeowAndroid.*(). Called on a background thread. */
    private class Bridge {
        @JavascriptInterface public boolean isApp() { return true; }
        @JavascriptInterface public void signInWithGoogle() { runOnUiThread(MainActivity.this::signInWithGoogle); }
        @JavascriptInterface public void signOut() {
            runOnUiThread(() -> credentialManager.clearCredentialStateAsync(new ClearCredentialStateRequest(), null, mainExecutor,
                    new CredentialManagerCallback<Void, ClearCredentialException>() {
                        @Override public void onResult(Void unused) { }
                        @Override public void onError(@NonNull ClearCredentialException e) { }
                    }));
        }
        @JavascriptInterface public void printHtml(String html) { runOnUiThread(() -> MainActivity.this.printHtml(html)); }
        @JavascriptInterface public void notify(String title, String body) {
            Reminders.show(MainActivity.this, (int) (System.currentTimeMillis() & 0x7fffffff), title, body, null);
        }
        @JavascriptInterface public String notificationPermission() { return Reminders.canNotify(MainActivity.this) ? "granted" : "default"; }
        /** [{id,title,body,at}] for every upcoming note reminder; replaces the previous schedule. */
        @JavascriptInterface public void scheduleReminders(String json) { Reminders.setNoteReminders(MainActivity.this, json); }
        @JavascriptInterface public void setDailyReminder(boolean enabled, int hour, int minute) {
            Reminders.setDaily(MainActivity.this, enabled, hour, minute);
        }
        @JavascriptInterface public void requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= 33 && !Reminders.canNotify(MainActivity.this))
                runOnUiThread(() -> notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS));
        }
        @JavascriptInterface public void shareText(String title, String text) { runOnUiThread(() -> MainActivity.this.shareText(title, text)); }
        @JavascriptInterface public boolean appLockAvailable() { return lockAvailable(); }
        @JavascriptInterface public boolean getAppLock() { return lockEnabled(); }
        @JavascriptInterface public void setAppLock(boolean enabled) {
            getSharedPreferences("lock", MODE_PRIVATE).edit().putBoolean("enabled", enabled && lockAvailable()).apply();
        }
        @JavascriptInterface public void setThemeColor(String hex) {
            try {
                int color = Color.parseColor(hex);
                runOnUiThread(() -> applyThemeColor(color));
            } catch (IllegalArgumentException ignored) { }
        }
    }

    private class ChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            cameraUri = null;
            Intent intent;
            if (params.isCaptureEnabled()) {
                try {
                    File dir = new File(getCacheDir(), "images");
                    //noinspection ResultOfMethodCallIgnored
                    dir.mkdirs();
                    File photo = File.createTempFile("photo_", ".jpg", dir);
                    cameraUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".files", photo);
                    intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                            .putExtra(MediaStore.EXTRA_OUTPUT, cameraUri)
                            .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } catch (Exception e) {
                    cameraUri = null;
                    intent = params.createIntent();
                }
            } else {
                intent = params.createIntent();
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            }
            try {
                fileLauncher.launch(intent);
                return true;
            } catch (ActivityNotFoundException e) {
                fileCallback = null;
                cameraUri = null;
                return false;
            }
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            boolean wantsMic = false;
            for (String r : request.getResources()) if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantsMic = true;
            if (!wantsMic) { request.deny(); return; }
            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                pendingWebPermission = request;
                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO);
            }
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

}
