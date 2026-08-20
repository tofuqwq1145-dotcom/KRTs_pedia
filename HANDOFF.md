# KRTPedia 交接文档（给 zcode）

> 本文档写给接手维护的 AI/Agent。仓库：`E:\AYIMU\KRTpedia`，GitHub：`tofuqwq1145-dotcom/KRTs_pedia`（main）。
> 所有密钥都在 `qq-bot/.env`（已被 .gitignore 忽略，勿提交），本文档不含任何密钥。

---

## 1. 这是什么

KRTPedia（KRTpedia）是一个**中世纪国战 Minecraft 服务器 KRT 的玩家延伸社区网站**，用来记录服务器里发生的一切（战争、国家、人物、建筑、外交……）。站娘 **SCI-Petia（佩蒂娅）** 是网站的 AI 主持人 + 档案库「记录者」。

- 服务器：KRT = 中世纪国战（Minecraft 国战）服，服主 **肥科虎牙**（科尔特 / 科尔特凯撒大帝）。
- 名字含义：`SCI-Petia` 中 SCI = 科学部（Science Division）缩写，她是 KRTP 科学部的资料管理员工。
- 站点视觉是「科幻档案库」风格，但记录内容主体是 KRT 中世纪国战世界。

**两个部分：**
1. **网站**：Next.js App Router + Supabase（项目 `ynqecbsychdgjtrlvegd`，存储桶 `media`），线上地址 `https://krts-pedia.vercel.app`。
2. **QQ 机器人**：`qq-bot/` 独立 Node 服务，站娘在 QQ 群/私聊里应答，有两个通道（见下）。

---

## 2. QQ 机器人架构

`qq-bot/`（独立服务，依赖 `ws`、`@supabase/supabase-js`、`dotenv`、`tsx`、`edge-tts-universal`、`pinyin-pro`、`cmu-pronouncing-dictionary`，`type: module`）。

| 通道 | 入口 | 说明 |
|---|---|---|
| 官方通道 | `src/index.ts`（`npm run start`） | QQ 官方机器人 API（AppID 沙箱），经 NSSM 服务 `KRTPediaQQBot` 常驻 |
| **OneBot 通道（主用）** | `src/index-onebot.ts`（`npm run start:onebot`） | 走 **NapCat** 的 OneBot 11 正向 WebSocket，进正式 QQ 群用，功能最全 |

### 核心文件
- `src/onebot.ts`：WS 客户端。`callOneBot(action, params)` 带 echo 关联 + 15s 超时；`get_group_member_list`、`get_image`、`ocr_image`、`oneBotSendGroup/C2C` 及带表情版本 `oneBotSendGroupSticker/C2CSticker`。
- `src/index-onebot.ts`：消息处理（召唤判断、20 条记忆、8s 冷却、messageId 去重）、`onNotice` 进群检测、图片识别装配、`pickSticker(mood)`。
- `src/chat.ts`：共用聊天逻辑。调 DeepSeek `chat/completions`（model `deepseek-v4-flash`），带 tools：
  - `record_entry` 代录词条（写 Supabase `pages`，pending 待审）
  - `submit_theme` 提交版式（写 `themes`，pending）
  - `search_archive` 查档案库（`pages` status=approved）
  - `web_search` 联网搜索（Bing HTML 解析）
- 人设：`E:\AYIMU\KRTpedia\src\lib\petia.ts` 的 `SYSTEM_PROMPT`（**网站与 QQ 共用同一份人设**）。含【出身】【核心人格】【KRTP 背景】【说话风格】【事实边界】等；回复末尾可带 `[mascot:mood]` 标签。

### 行为要点
- 群内被 `@SCI-Petia` / `@佩蒂娅` / `@站娘` 或直接喊「站娘/佩蒂娅/SCI-Petia」才回；**私聊任何人必回**。
- 每条消息内容 20 条记忆 + 8s 冷却 + 按 messageId 去重。
- 图片：解析 image 段 → `get_image` 拿本地缓存路径 → 只对 JPG/PNG（魔数校验）调 `ocr_image` 提文字，装进上下文；**GIF 动画跳过**（Windows OCR 会挂起）。最多识别 2 张。
- 联网：用户问现实世界时事/今天大事等，**必须先 `web_search`**；只有明确问 KRT 世界才 `search_archive`。
- 表情包：模型输出 `[mascot:mood]` 时，从 `qq-bot/stickers/<mood>/` 随机挑一张 GIF 与文字同发。
- 点歌：**无需 @**，消息里出现「点歌 / 来首 / 放首 / 唱首 / 随机歌」即拦截（不用在句首，也不进 AI，**不消耗 DeepSeek token**），**默认直接返回语音**（`record` 段，收件人内联播放、不手动下载）；显式带「文件/file」才发 mp3 文件。可选歌单名（该歌单内随机，如「点歌 战争」；写错歌单名不报错，直接随机全部）。发完语音再发一张 `chat` 心情的随机表情包。音频下载到 `qq-bot/.songcache/`（已 gitignore）后用 `upload_group_file`（文件）或 `record` 段（语音）。
  - 彩蛋：北京时间 **05:20 / 13:14 / 17:20** 点歌强制播放「Letter（信）」（`songs.ts` 的 `EASTER_TITLES`/`EASTER_TIMES`，标题含 `letter`），文案不变、不解释；库里无此歌则回落随机。
  - 点歌 互联网：发「点歌/听歌 互联网 <歌名>」→ 搜索网易云（mu-jie 搜索，返回前 5 首带序号）→ 发回序号列表 → 回复数字即扒下播放（默认语音；**加「文件」发 mp3 文件**，如「听歌 互联网 歌名 文件」）。音源链路：mu-jie 取网易云 rid → injahow MetingAPI（`?type=url&id=<rid>`）取真实 mp3，`probeAudio` 校验可播，发完延迟 `fs.unlink` 删本地省存储。音源是公开第三方、依赖机器人机器能联网；不通可改 `.env` 的 `METING_API_BASE`/`MEJIE_API_BASE`。无版权/连不上时回「没拿到可播放音源」。**不要**把「点歌」本网站曲库功能和「点歌 互联网」外源功能搞混。
  - **朗读/翻译音色交互流程**：用户 @站娘「朗读 <文本>」或「翻译 @成员」→ bot 先回**译文**（翻译时）再回「**选个音色 1/2/3**」→ 用户回 **1(Teto 实验性)/3(edge)** 直接读；回 **2(VOICEVOX)** 进入**二级声库界面**（列出 43 个音色序号+名字）→ 回序号选声库 → 用所选声库朗读。流程状态存 `pendingRead`（kind: read/translate, step: voice/speaker，5 分钟过期），`handlePendingReadReply` 处理回复，`completePendingRead` 按所选音色读/发三段翻译语音。
  - **朗读语言后缀**：文本末尾可带（中文）（日文）（英文）决定读法，**无后缀默认日文**（`parseReadLang`）。
  - **音色/声库**：`@站娘 音色` 查看/`音色 1/2/3` 手动设；`@站娘 声库` 手动列/选。`voiceChoice`/`vvSpeakerChoice` 按聊天记忆。
  - **（已删除）电棍/棍母 视频功能**：已按用户要求移除。
  - **菜单**：@站娘「菜单/帮助/help」→ 回复使用帮助。
  - 翻译：群里 `@站娘 翻译 @某成员` → 取该成员在本群**最近一条消息**（`lastByUser` 记录每个群成员最后发言），回文本（原文/EN/CN/JA 四栏）并附**中、英、日三段朗读语音（直接发，不带语言提示）**。翻译源链：DeepL 免费接口（`www2.deepl.com/jsonrpc`）为主，EN/CN 挂时 UAPI（uapis.cn）兜底、JA 挂时 MyMemory（`api.mymemory.translated.net`）兜底，保证三栏都有。没 @ 成员 → 提示「直接 @ 那位成员」；找不到 TA 最近发言 → 提示未找到。
  - **TTS（朗读嗓音）**：`src/tts.ts` 三引擎，优先顺序：**① Teto（UTAU 真实样本拼接）② VOICEVOX ③ edge-tts**。
    - **Teto（真实样本拼接，最终方案）**：`src/tetoSplice.ts` 直接拼 Teto UTAU 音库的 **真人样本**（无需合成引擎，稳定清晰、保持 Teto 本音 ~296Hz）。优先用**連続音(VCV)**样本（「前母音 音节」别名，音节间交叉淡化 35ms 平滑过渡），缺失回退単独音(CV)。中/英文先经 `src/kanaize.ts` 转片假名（残留拉丁字母/缩写转假名读音，如 KRT→ケーアールティー，避免丢字），转平假名，拆音节 → 取样本按 offset/consonant 切段拼接 → 16bit 单声道 wav，**结尾补 1s 尾音**防突断。依赖 `iconv-lite`（解析 Shift-JIS oto.ini）。
    - **Teto 音库位置**：`C:\VOICEVOX\ou\extract\Singers\重音テト音声ライブラリー\重音テト単独音`（TETO-tougou 标准音库的单音 CV 部分，oto.ini + 每假名一个 wav）。
    - **（已弃用）实时合成**：曾用 OpenUtau.Core + Worldline 无头渲染（`C:\VOICEVOX\tetorender\`），因 pitch 偏移/循环/男声等问题放弃，保留供参考。
    - **VOICEVOX 安装**：`C:\VOICEVOX\VOICEVOX`（0.25.2 CPU 包），纯引擎 `vv-engine\run.exe`。**按需启动**：首次朗读自动 spawn，空闲 **10 分钟自动杀**（`killVvEngine`）。说话人默认挑 波音リツ(id 9，UTAU 系虚拟歌姬)。**Teto 已确认从未内置 VOICEVOX**。
    - **edge-tts**：`edge-tts-universal`，中文 `zh-CN-XiaoxiaoNeural`、英文 `en-US-AriaNeural`、日文 `ja-JP-NanamiNeural`。本机无 Windows SAPI 中文语音包，已弃用 SAPI。
    - **切换**：`TTS_ENGINE=auto|voicevox|edge`（默认 auto：有 Teto 音库先用 Teto 拼接，否则 VOICEVOX，起不来 edge-tts 读原文）。`VOICEVOX_URL`/`VOICEVOX_EXE` 可配 VOICEVOX。
    - **VOICEVOX 接口坑**：`/audio_query` 的 `text` 必须放 **URL 查询参数**，放 body 会报错。合成返回 wav。
- 进群：站娘被拉进新群 → 查主人 QQ（`.env` 的 `QQ_OWNER_UIN=3160688182` KaChi/Kachibode）在不在群 → 不在则群里请拉人 + 私聊主人（每群 60s 冷却）。**注意：NapCat 无「主动拉人进群」API**，只能发消息请人拉。

---

## 3. NapCat / QQ 环境（本机）

- **NapCat**：4.18.18，部署在 `C:\NapCat\NapCat.Shell\napcat\`。以 hook 方式注入 QQ 进程。
- **QQ NT**：9.9.32（build 51246），静默装到 `D:\` 根目录（`D:\QQ.exe`，versions 在 `D:\versions\9.9.32-51246`，卸载程序 `D:\Uninstall.exe`）。
- **OneBot 正向 WS**：`0.0.0.0:3001`（配置 `C:\NapCat\NapCat.Shell\napcat\config\onebot11_1113033508.json`，array 格式、无 token）。
- **WebUI**：`http://127.0.0.1:6099/webui?token=627c92c34e56`（可看事件/API 测试）。
- **登录态**（本机 QQ）：`1113033508` SCI-Petia（站娘，bot 本体）、`3160688182` KaChi（主人/群主）、`1716970881` CR。
- 站娘已在群：KRT·Medieval `1083858554`、风笛星光 `462656574`、英格兰 `979706609`、KRTpedia 总部 `1101750422` 等。

### 启动 / 重启（重要）
- 一键：`C:\NapCat\start-napcat-bot.bat`（拉起 launcher + `npm run start:onebot`）；桌面快捷方式「KRTP站娘QQ机器人」。
- 单独重启 bot：杀 node 进程匹配 `index-onebot|start:onebot`，再在 `qq-bot\` 下跑 `npm run start:onebot`（日志追加到 `qq-bot/onebot.log` / `onebot.err.log`）。
- 官方通道：NSSM 服务 `KRTPediaQQBot`（`npm run start`，沙箱）。
- **不做开机自启**（用户父亲也用这台电脑，开机不打扰），靠手动快捷方式。
- 断连自愈：bot 对 WS 有指数退避重连（≤30s）；NapCat 靠 QQ 进程，若 QQ 被重启需重跑启动脚本。

---

## 4. 环境变量（`qq-bot/.env`，已 gitignore，勿提交）

```
QQ_APP_ID / QQ_APP_SECRET / QQ_ENV=sandbox   # 官方通道
SUPABASE_URL / SUPABASE_ANON_KEY             # 档案只读
PETIA_EMAIL / PETIA_PASSWORD                 # 站娘账号（代录/写版式，signInWithPassword）
DEEPSEEK_API_KEY                             # 大脑
SITE_URL=https://krts-pedia.vercel.app
QQ_ONEBOT_WS_URL=ws://127.0.0.1:3001
QQ_ONEBOT_ACCESS_TOKEN=                      # NapCat 没设 token，留空
QQ_OWNER_UIN=3160688182                      # 主人 QQ（进群检测用）
METING_API_BASE=https://api.injahow.cn/meting/  # 点歌互联网音源
MEJIE_API_BASE=https://musicbox-web-api.mu-jie.cc/wyy/  # mu-jie 搜歌
TTS_ENGINE=auto                                # auto|voicevox|edge（朗读嗓音引擎）
VOICEVOX_URL=http://127.0.0.1:50021            # VOICEVOX 本地地址（Teto 等虚拟歌姬）
```

网站侧另有根目录 `.env.local`（Next.js 用）。

---

## 5. 网页部分

- 技术栈：Next.js 14 App Router + Tailwind + Supabase（项目 `ynqecbsychdgjtrlvegd`，存储桶 `media`）。科幻档案库视觉风格。
- 脚本：`npm run dev` / `build` / `start` / `lint`；`mirror`（静态镜像脚本 `scripts/mirror.mjs`）。
- 数据库表（supabase/schema.sql）：`pages`（词条，status: approved/pending/rejected，type: nation/person/event/war/building/chronicle/article，字段含 theme_id/series_id/song_title/song_url）、`themes`（版式，含配色/字体/头图动效等新字段）、`series`（系列）、`chat_messages`（聊天室）、users 相关（auth）、`mascot_images`（站娘动图：形态×播放状态）。

### 路由总览（src/app）
- 内容展示：`/nations` `/people` `/events` `/wars` `/buildings` `/chronicle`（各类型词条列表+详情）、`/pages/[slug]`（词条页，Markdown 渲染 + 评分 RatingBox + 音乐）、`/series/[slug]`（系列）、`/search`、`/guide`、`/about`、`/thanks`（感谢墙）。
- 互动：`/chat`（站娘聊天室）、`/submit`（投稿：词条 SubmitEditor + 版式 ThemeForm）、`/themes`（版式广场）+`/themes/new`、`/rankings`（排行）、`/account`（我的投稿 MySubmissions/个人资料 ProfileEdit/头像 AvatarUpload）、`/auth`（登录/注册/回调）。
- 管理：`/admin`（审核 ReviewPanel/ThemeReview、用户 UserManager、站娘动图 MascotManager、歌曲 SongsManager、系列 SeriesManager、公告 Announcements）。`/api/admin/*`（审核、批量）、`/api/chat/bot/*`（站娘应答 bot/auto/unlock）、`/api/pages|themes|series|me` 等。
- 封禁/守卫：BanGuard、`/api/me/banned`。

### 关键文件
- `src/lib/petia.ts`：**人设 SYSTEM_PROMPT（网站与 QQ 共用）**、`beijingNow`、`isMentioned`、`sanitizeReply`、`pickMood`、`MAX_REPLY/COOLDOWN`。
- `src/data/*`：`nations` `people` `events` `wars` `buildings` `chronicle`（词条静态数据）、`mascot.ts`（mood 体系 home/explore/war/rank/write/chat + 配色）、`music.ts`（歌单）、`themes.ts`（版式）、`types.ts`、`nav.ts`。
- `src/components/`：ChatRoom（站娘应答开关，召唤词 @SCI-PETIA/@站娘/@佩蒂娅）、SiteMascot/Stickers（mood 动图）、MusicProvider（音乐播放器）、Discussion、PetiaMemory（站娘记忆面板）、ReviewPanel、SubmitEditor（国家版式模板）、ThemeForm/ThemeReview、SongsManager、MascotManager、SeriesManager、UserManager、Announcements、ThanksCarousel、SearchResults、RatingBox、Markdown、HeroBackground、PresencePulse 等。
- `src/lib/`：`pages.ts`、`labels.ts`、`slug.ts`、`themeUi.ts`、`stickers.tsx`、`audioCache.ts`。

### 部署
- 推送部署：本地 `npm.cmd run build` 通过后 `git push origin main`，Vercel 自动部署到 `https://krts-pedia.vercel.app`。

---

## 6. 常见坑 / 注意事项

- **GitHub 推送走代理**（`192.168.1.4`），偶尔连不上 → **重试即可**；远程带 token（`https://tofuqwq1145:<token>@github.com/...`）。
- **终端中文乱码**：PowerShell 输出中文可能乱码（chcp），不影响功能。
- **PacketBackend 不支持 QQ 9.9.32-51246**：NapCat 日志会报错，但 **hook 模式收发正常，可忽略**（官方推荐 build 的偏移数据没下到）。
- **CDN 图片直链（multimedia.nt.qq.com.cn）会 400**：OCR 必须走 `get_image` 拿本地缓存路径，不要直接下 CDN 链。
- **OCR 别喂 GIF**：Windows OCR 遇 GIF 会挂起不返回，务必先做魔数校验（JPG=`FFD8FF` / PNG=`89504E`）。
- **DeepSeek 多 tool_calls**：一次可能返回多个工具调用，必须给每个 `tool_call_id` 都回 tool 消息，否则 400（已在 chat.ts 循环处理）。
- 记忆/冷却/去重都在 `index-onebot.ts` 顶部的 Map 里，进程重启即清空。

---

## 7. 表情包（stickers）

- 目录：`qq-bot/stickers/<mood>/`，mood = `home / explore / war / rank / write / chat`。
- 当前是 dot-chibiko 像素小人，38 张 GIF（英文名，单张 ≤187KB），每个 mood 可复用同名文件。
- 换表情：直接增删文件夹里的 `.gif` 即可，运行时按 `pickSticker` 随机取；想改归类就移动文件。
- 发送上限按 QQ 限制（建议 <5MB）。

---

## 8. 当前运行状态

- NapCat：在跑，OneBot WS `:3001` 正常（`http://127.0.0.1:3001` 返回 426）。
- OneBot bot 进程：`npm run start:onebot` 已启动并连上 `ws://127.0.0.1:3001`。
- 官方通道：NSSM `KRTPediaQQBot` Running。
- 最近提交 `ab6bc8e` 已推 main（含本会话全部增强）。

## 9. 给接手的 AI 的开工建议

1. 先读 `qq-bot/src/index-onebot.ts`、`onebot.ts`、`chat.ts`、`src/lib/petia.ts`。
2. 动代码后在 `qq-bot/` 跑 `npm.cmd run typecheck`；网页改动在根目录 `npm.cmd run build`。
3. 改完按第 3 节重启 bot 生效。
4. 涉及密钥改动只改 `.env`，勿提交。

---

## 10. Teto 朗读 / 唱歌（TTS 与 Teto 引擎）

### 音色（`qq-bot/src/tts.ts`，`setTtsVoice`/`getTtsVoice`）
- 1 = Teto（实验性）：`src/tetoSplice.ts` 用 **Teto UTAU 音库真实样本拼接**（CV/VCV 优先+交叉淡化+尾音），`iconv-lite` 解 Shift-JIS oto.ini。
- 2 = VOICEVOX（本机引擎，43 个声库，`setVvSpeakerId`/`listVoxSpeakers`）。
- 3 = edge-tts。

### 交互流程（`index-onebot.ts`）
- `@站娘 朗读 <文本>` / `翻译`：bot 先问「选音色 1/2/3」→ 1/3 直接读 → 2 弹声库列表回序号选。
- 语言后缀：`（中文）（日文）（英文）`，无后缀默认日文；`parseReadLang`。
- `@站娘 唱 <文本>`：`src/tetoSing.ts` 调 C# 渲染器（见下）套一个旋律（C D E G A G E D）唱出来，发语音。
- 均存 `.ttscache/`，语音用 `oneBotSendGroupVoice` / `oneBotSendC2CVoice`。

### Teto 唱歌渲染器（`C:\VOICEVOX\tetorender\Program.cs`，C#，`dotnet build -c Release`）
- 核心结论：**Worldline 多音符/整工程渲染必然失效**（所有音→一个音高 ~263Hz），唯一可靠路径是**逐音符独立渲染再拼接**。
- `--ustx <file>`：加载真实 .ustx → 提取音符（音高+歌词+真实时长）→ 逐音符渲染拼接（保留原曲弯音曲线+烘入颤音）。
  - 只支持 ustx ≤0.7（0.8/0.9 报 "Project file is newer than software"，需手改 `ustx_version: "0.7"`）。
- 颤音：OpenUtau 的 UVibrato 在单音符渲染不生效，直接把 sin 颤音**烘进音高曲线**（`InterpPitch` 插值保留弯音）。幅度 5 左右较自然。
- 关键反射：`HeadlessSyncContext`（空 Post/Send）、`DocManager.Inst.PostOnUIThread` 主线程泵、`resamplersMap["worldline"]`/`wavtoolsMap` 手动补、worldline.dll/onnxruntime.dll 复制到输出目录。
- 只有 WorldlineResampler + SharpWavtool 可用。
- 声音质量：Teto UTAU 音库在 `C:\VOICEVOX\ou\extract\Singers\重音テト音声ライブラリー\`（単独音 CV / 連続音 VCV，别名平假名）。

### 歌曲翻唱（已验证）
- 从 Bowlroll 下载《アンタに言ってんの！！！》（足立レイ）工程：`C:\VOICEVOX\antai\`（調声済 已降级 0.7）。
- 渲染：805 音符，279.3s（bpm120）；原曲 178 BPM，如需原速按 178 重渲染。
- 成品：`C:\VOICEVOX\antai_song3.wav`（带弯音+颤音），试听片段 `antai_demo_55-95s.wav`、`antai_demo_96-116s.wav`。
- Bowlroll 下载流程：拿页面的 `brid` cookie + `data-csrf_token` → POST `/api/file/<id>/download-check`（`download_key=bowlroll_download_control_mischievous`）→ 返回一次性 URL。直连可下（不用代理）。

---

## 11. 网站近期变更：世界地图（2026-08-20）

- 导航「档案」分组改名为「世界」，新增「世界地图」入口（/world）；国家/人物/战争/建筑/事件/编年史仍在「世界」分组下。
- 新增 src/app/world/page.tsx + src/components/WorldMap.tsx：移植用户提供的「终端世界地图」单文件（科幻档案库风格，CRT 扫描线 + 启动序列 + 十国节点 + 键盘/鼠标选点 + 详情卡片）。地图底图用 natural-earth 的 geojson（jsdelivr CDN，失败自动降级只显示节点）。
- 十国节点与 src/data/nations.ts 一一对应（国家/首都坐标）。已核查并**修正原稿虚构/不符文案**：废除「沙皇国/教宗国/大公国/帝国」等与国家档案不符的节点类别、捏造的档案卷宗数字、SEALED/UNKNOWN 伪状态（历史断层事件/磁暴）、无效 IP「192.168.0.0.1」、以及 1453/条顿骑士团等真实历史被当成档案数据的写法；统一为中性档案库口吻，状态取站内真实值「存在」，档案卷宗数取 listPages() 按国家别名（src/data/nationAliases.ts）实时统计。
- 详情卡「提取核心数据」→ 跳转 /search?q=<国家名> 并自动检索（SearchResults 新增 initialQuery，/search 读 ?q=）。
- 音效优化：用用户提供的 5 个 mp3（在 public/audio/：
av-bip / confirm / cancel / data / type），替换原稿 Base64 占位；导航/确认/取消/提取数据均真实音效，打字保持轻量 WebAudio 合成；WebAudio 合成兜底保留。
- 注意：E:\AYIMU\KRTpedia\tsconfig.json 已把 qq-bot 加入 exclude（否则 qq-bot/edge_test.ts 等顶层 await 会让网站 
pm run build 的类型检查失败）。
