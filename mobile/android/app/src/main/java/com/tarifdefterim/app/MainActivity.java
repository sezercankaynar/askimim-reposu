package com.tarifdefterim.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Siteyi WebView içinde açan kabuk.
 * - Paylaş menüsünden gelen metindeki linki /share sayfasına yollar (import başlar).
 * - Siteye ait https linkleri (örn. e-posta giriş bağlantısı) uygulamanın içinde açar.
 */
public class MainActivity extends BridgeActivity {
    private static final String SITE = "https://askimim-reposu.vercel.app";
    private static final Pattern URL_RE = Pattern.compile("https?://\\S+");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String target = null;

        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            String link = firstUrl(text);
            if (link == null) link = firstUrl(subject);
            target = SITE + "/share?url=" + Uri.encode(link != null ? link : (text != null ? text : ""));
        } else if (Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) {
            Uri data = intent.getData();
            if (data.toString().startsWith(SITE)) target = data.toString();
        }

        if (target != null) {
            final String url = target;
            // Bridge hazır olmadan loadUrl çağrılmasın
            getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(url));
        }
    }

    private static String firstUrl(String s) {
        if (s == null) return null;
        Matcher m = URL_RE.matcher(s);
        return m.find() ? m.group() : null;
    }
}
