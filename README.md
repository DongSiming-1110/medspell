# 医学拼写

[打开医学拼写，开始练习](https://dongsiming-1110.github.io/medspell/)

用手机或电脑浏览器打开网页，根据中文释义和英文词组补全空格。八个单元共 248 题。点输入框右上方的喇叭，可以听完整英文词组的合成发音，再点一次从头播放。

在「练习设置」里可以选择单元、每组题数和出题顺序。点「斩 · 已熟悉」会把对应词组收入已斩词库，之后也可以移回练习。进度保存在当前浏览器或已安装的 App 中。

## 项目与题库

中文释义和词组根据《学术英语（医学）》单元词组练习及配套复习资料整理。英语录音由 Microsoft Zira Desktop 合成。

- `template.html`、`practice.js`、`bank.json` 是页面、练习逻辑和题库。
- `docs/` 是 GitHub Pages 网站。网页按题加载 `audio/` 里的 MP3。
- `harmonyos/` 是 DevEco Studio 工程。应用内置题目和发音，可以离线练习。要在个人设备运行，可在 DevEco Studio 中配置自己的开发签名。

修改题库或练习界面后，在仓库根目录运行 `python build.py` 生成网页和鸿蒙应用页面，运行 `node verify.cjs` 验证练习流程。运行 `python -m http.server 8000 --directory docs` 可在本机预览。需要重新制作发音时，在安装了英文 Zira 语音和 FFmpeg 的 Windows 上先运行 `python generate_audio.py`。

由DSM制作
