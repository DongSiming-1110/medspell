package cn.dosimi.medspell;

import android.app.Activity;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

public final class PracticeActivity extends Activity {
    private static final String PRACTICE = "https://appassets.androidplatform.net/assets/index.html";
    private WebView browser;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(0xfff7faf4);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            frame.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
                @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
                    Insets area = insets.getInsets(WindowInsets.Type.systemBars()
                            | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                    view.setPadding(area.left, area.top, area.right, area.bottom);
                    return WindowInsets.CONSUMED;
                }
            });
        }
        browser = new WebView(this);
        frame.addView(browser);
        setContentView(frame);
        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        browser.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if ("data".equals(request.getUrl().getScheme())) {
                    return null;
                }
                if (PRACTICE.equals(request.getUrl().toString()) && "GET".equals(request.getMethod())) {
                    try {
                        return new WebResourceResponse("text/html", "UTF-8", getAssets().open("index.html"));
                    } catch (IOException ex) {
                        throw new IllegalStateException("Cannot open packaged practice page", ex);
                    }
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                        Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !PRACTICE.equals(request.getUrl().toString());
            }
        });
        browser.loadUrl(PRACTICE);
    }

    @Override protected void onPause() {
        browser.evaluateJavascript("if(typeof stopPronunciation==='function')stopPronunciation()", null);
        browser.onPause();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        browser.onResume();
    }

    @Override protected void onDestroy() {
        ((FrameLayout) browser.getParent()).removeView(browser);
        browser.destroy();
        super.onDestroy();
    }
}
