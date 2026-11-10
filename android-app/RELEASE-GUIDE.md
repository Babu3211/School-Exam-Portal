# SMSS Exam Portal Android: public release checklist

The Android app loads the existing production portal at https://exam-portal-smss-95016.web.app/. The existing web app and Firebase data are not changed by the Android build.

## Already verified
- Debug Android APK build succeeded: https://github.com/Babu3211/School-Exam-Portal/actions/runs/42748323974
- Signed release workflow is defined at .github/workflows/android-release.yml.
- A signed release has NOT been published yet.

## One-time release signing setup (repository administrator)

**Keep the signing key and all passwords private. Do not commit them, share them in chat, or place them in screenshots. Back up the keystore and passwords securely. Losing the key can prevent updating directly distributed APKs.**

On a trusted computer with Java JDK installed, generate the keystore:

```bash
keytool -genkeypair -v -keystore smss-release.keystore -alias smss-release -keyalg RSA -keysize 3072 -validity 10000
```

Convert the keystore into one single-line Base64 string on that trusted computer:
- macOS: `base64 -i smss-release.keystore | tr -d '\\n'`
- Linux: `base64 -w 0 smss-release.keystore`
- Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("smss-release.keystore"))`

Add these four **Actions repository secrets** at Settings > Secrets and variables > Actions:
- `SMSS_ANDROID_KEYSTORE_BASE64`: the single-line Base64 keystore
- `SMSS_ANDROID_STORE_PASSWORD`: keystore password
- `SMSS_ANDROID_KEY_ALIAS`: `smss-release`
- `SMSS_ANDROID_KEY_PASSWORD`: private-key password

Then run Actions > **Publish signed SMSS Android APK** > **Run workflow**. On success, a GitHub Release contains:
- `SMSS-Exam-Portal.apk`: Android direct-install package
- `SMSS-Exam-Portal.aab`: Android App Bundle for later Play Console work

Public downloads will appear at https://github.com/Babu3211/School-Exam-Portal/releases/latest once the workflow has succeeded.

## Required acceptance tests before sharing with all teachers
1. Install signed release APK on a fresh Android phone; open and log in.
2. Confirm expected school, role permissions and menu navigation.
3. Confirm Class 1–5, 6–8 and 9–10 mark entry and save using test records only.
4. Verify ledger and grade sheet generation, download/print, and Nepali/English names.
5. Verify logout, relaunch, network failure behavior and return to online state.
6. Check the same tests on at least two Android devices and record outcomes.

**Do not distribute publicly until the signing workflow succeeds and these tests pass.** The earlier `app-debug.apk` is for testing only. The app needs internet access to reach the live portal.
