# 医学拼写 · Android

Android 8.0（API 26）及以上可用。应用使用系统 WebView，题库、插图和读音随安装包提供。桌面入口为「医学拼写」，练习进度保存在本机。

## 构建

安装 Python 3.9+、JDK 17、Android SDK Platform 36 和 Build Tools 36.0.0。将 JDK 的 `bin` 加入 PATH，设置 `ANDROID_HOME` 指向 SDK 目录。

运行 `python build.py` 生成未签名 APK。需要发布签名时，在本机安全设置环境变量 `MEDSPELL_ANDROID_STOREPASS`，再运行下面的命令。密钥别名可用 `--alias` 指定。

```text
python build.py --keystore /path/to/android-release.p12 --alias medspell
```

输出位于 `release/`。构建脚本使用 SDK 自带的 aapt2、D8、zipalign 和 apksigner，对签名版本执行验签。

## 更新界面与题库

将练习项目构建生成的离线 `index.html` 放入 `app/src/main/assets/`。图标位于 `app/src/main/res/drawable-nodpi/doctor_icon.png`。原生入口在 `app/src/main/java/cn/dosimi/medspell/PracticeActivity.java`。
