import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve('android/app/src/main/java/com/smss/examportal/MainActivity.java');
const original = readFileSync(file, 'utf8');
if (!original.includes('extends BridgeActivity')) throw new Error('Unexpected Capacitor MainActivity; refusing to patch');
if (original.includes('SMSS_RELAUNCH_RECOVERY')) {
  console.log('SMSS Android relaunch recovery already installed');
  process.exit(0);
}
const patched = `package com.smss.examportal;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  // SMSS_RELAUNCH_RECOVERY: only reload a fully loaded, visibly empty WebView
  // after returning from background. Never clear data, cookies or cache.
  private boolean returnedFromBackground = false;
  private final Handler recoveryHandler = new Handler(Looper.getMainLooper());

  @Override
  public void onPause() {
    returnedFromBackground = true;
    super.onPause();
  }

  @Override
  public void onResume() {
    super.onResume();
    if (!returnedFromBackground) return;
    returnedFromBackground = false;
    recoveryHandler.postDelayed(() -> {
      if (isFinishing() || isDestroyed() || getBridge() == null) return;
      WebView webView = getBridge().getWebView();
      if (webView == null || webView.getProgress() < 100) return;
      webView.evaluateJavascript(
        "(function(){var b=document.body;return !!b && !b.innerText.trim() && !b.querySelector('iframe,canvas,video,img,svg');})()",
        result -> {
          if ("true".equals(result) && !isFinishing() && !isDestroyed()) {
            webView.reload();
          }
        }
      );
    }, 2500);
  }
}
`;
writeFileSync(file, patched);
console.log('SMSS Android background relaunch recovery installed');
