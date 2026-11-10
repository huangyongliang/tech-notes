# 多模态 {#multimodal}

> [AI](../) › 多模态

视觉理解、语音（ASR / TTS / 实时语音）、图像与视频生成。旗舰模型已原生支持多模态输入，工程重点在文档与图像理解、实时语音 Agent，以及生成内容的标识合规。

> 相关主题：[LLM API 编程模式](../06-llm-api-programming/) · [检索增强生成](../08-rag/) · [安全与治理](../19-security-governance/)

## 本关定位

| 项 | 内容 |
|----|------|
| 定位 | 第四章深入：在文本之外处理图像、文档、语音与视频 |
| 前置要求 | [LLM API 编程模式](../06-llm-api-programming/)；了解图像与音频的基本编码格式 |
| 粗略用时 | 1–2 周（粗略参考） |
| 章节 | 第四章 深入 |

## 闯关任务

**QUEST 16 · 第四章 深入**

- [ ] 能够通过 API 向模型发送图片或 PDF，完成 OCR、表格与图表的结构化提取。
- [ ] 能够说明实时语音 Agent 的架构，以及「级联式」与「端到端」语音方案的区别。
- [ ] 能够解释扩散模型的基本原理，并用 Diffusers 在本地跑通一次文生图。
- [ ] 能够了解主流视频生成模型的现状，并对其生命周期变化保持敏感。
- [ ] 能够按中国标识办法与 EU AI Act 第 50 条为生成内容添加显式与隐式标识。

**奖励**：+100 XP · 徽章「感知融合者」（徽章名暂定，内容建设中）

## 知识要点

### 视觉与文档理解

- 视觉语言模型（VLM）：图像编码器把图片切块编码为视觉 Token，和文本一起进入语言模型。
- 常见任务：OCR、票据与表格抽取、图表问答、截图理解、视频理解；高分辨率细节需要更多视觉 Token，成本更高。
- 开源 OCR 模型：GLM-OCR、Qianfan-OCR 等，适合私有化处理大批量文档。
- 输入方式：URL、Base64 数据 URL，或先上传文件再引用其 ID；结合结构化输出（见 [LLM API 编程模式](../06-llm-api-programming/)）直接得到 JSON。

```python
import base64, io
from PIL import Image, ImageDraw

# 生成一张「发票」示例图，实际项目中替换为用户上传的图片
img = Image.new("RGB", (480, 160), "white")
ImageDraw.Draw(img).text((20, 60), "INVOICE No.2026-1105  TOTAL: 3000.00", fill="black")
buf = io.BytesIO()
img.save(buf, format="PNG")
data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

# OpenAI Responses API 的图文混合输入结构
input_items = [{
    "role": "user",
    "content": [
        {"type": "input_text", "text": "提取发票号和金额，输出 JSON"},
        {"type": "input_image", "image_url": data_url, "detail": "high"},
    ],
}]
print("图片字节数：", len(buf.getvalue()))
print("内容类型：", [part["type"] for part in input_items[0]["content"]])
# 真实调用：client.responses.create(model=..., input=input_items)
```

运行输出：

```text
图片字节数： 2375
内容类型： ['input_text', 'input_image']
```

### 语音

- ASR：Whisper 系列是开源基线；流式转写用于字幕与会议记录。
- 级联式语音 Agent：ASR → LLM → TTS，组件可替换、便于调试，但延迟叠加。
- 端到端实时语音：模型直接处理音频输入输出，延迟低、能保留语气，如 OpenAI Realtime API（GPT-Realtime-2.1 / GPT-Live 1）、Gemini Live API（Gemini 3.8 Live）。
- 工程要点：WebRTC / WebSocket 传输、打断处理（barge-in）、语音活动检测、工具调用时的等待提示。

### 图像与视频生成

- 扩散模型：从噪声出发逐步去噪，由文本条件引导；Diffusers 提供统一的 Pipeline 接口。
- 图像生成：闭源如 GPT-Image-2.6；开放权重如 Qwen-Image-2.1（2026-09）。
- 视频生成：闭源服务变化很快，如 Kling 4.0、Seedance 2.5；开放权重可关注 Wan2.2、LTX-2.5、HunyuanVideo-1.5。

```python
# 示意：Diffusers 文生图（需要 GPU 与模型权重；加载方式以模型卡说明为准）
import torch
from diffusers import DiffusionPipeline

pipe = DiffusionPipeline.from_pretrained("Qwen/Qwen-Image-2.1", torch_dtype=torch.bfloat16).to("cuda")
image = pipe(prompt="一只在键盘上睡觉的橘猫，水彩风格", num_inference_steps=30).images[0]
image.save("cat.png")
```

### 多模态 RAG

- 版面解析：先把 PDF 切成文本块、表格、图片区域，分别处理。
- 图文混合检索：图片用多模态嵌入或先生成描述再入库；回答时把命中的原图一起交给 VLM。
- 详见 [检索增强生成](../08-rag/)。

### 生成内容标识

- 中国《人工智能生成合成内容标识办法》：要求显式标识（文字、角标、语音提示）与隐式标识（文件元数据），配套国家标准 GB 45438-2025 规定了元数据字段。
- EU AI Act 第 50 条：生成或篡改的音频、图像、视频、文本需以机器可读方式标记为 AI 生成。
- 元数据容易在截图、转码时丢失，所以通常还需要显式标识和数字水印，C2PA 是常用的内容来源凭证标准。

```python
import io, json
from PIL import Image, PngImagePlugin

# 隐式标识示意：字段名参考 GB 45438-2025 的 AIGC 元数据（Label 取 1 表示属于生成合成内容）
# TC260 实践指南给出了图片写入 XMP 的方式，这里为演示简化为 PNG 文本块
meta = {"Label": "1", "ContentProducer": "example-service", "ProduceID": "img-20261105-0001"}
info = PngImagePlugin.PngInfo()
info.add_text("AIGC", json.dumps(meta, ensure_ascii=False))

buf = io.BytesIO()
Image.new("RGB", (64, 64), "gray").save(buf, format="PNG", pnginfo=info)

loaded = Image.open(io.BytesIO(buf.getvalue()))
print("读取到的隐式标识：", json.loads(loaded.text["AIGC"]))

# 元数据很容易被截图或重新编码去掉，所以还需要显式标识和数字水印
buf2 = io.BytesIO()
loaded.convert("RGB").save(buf2, format="JPEG")
print("转存 JPEG 后是否还有标识：", "AIGC" in Image.open(io.BytesIO(buf2.getvalue())).info)
```

运行输出：

```text
读取到的隐式标识： {'Label': '1', 'ContentProducer': 'example-service', 'ProduceID': 'img-20261105-0001'}
转存 JPEG 后是否还有标识： False
```

### 视频规格：产品发布与 API 可用性分开核实

以下为 2026-11-05 官方国际 API 文档的快照，不代表国内产品、第三方代理或所有账户套餐；价格单位为美元。

| API | 时长与分辨率 | 参考素材 / 计费边界 |
|-----|--------------|---------------------|
| Kling 4.0 | 2026-10-28 API 全面开放；最长 30 秒，720p / 1080p；10-bit 4K 仍为即将提供 | 最多 10 关键帧；参考图最多 10、视频最多 5，合计最多 15 素材 |
| Kling 4.0 Flash | 2026-11-04 开放 API；3–20 秒、720p | 无参考视频 $0.094 / 输出秒；有参考视频 $0.063 / 计费秒 |
| Seedance 2.5 | ID `dreamina-seedance-2-5-260628`；4–30 秒（`-1` 为自动）；480p / 720p 8-bit、1080p 10-bit，不支持 4K | 最多 30 图 + 10 视频 + 10 音频，共 50 素材；按视频 Token 计费，不是固定秒价 |

- Kling 4.0 无参考视频输入：720p $0.157 / 秒、1080p $0.235 / 秒，15 秒 1080p 示例为 $3.525；有参考视频：分别 $0.094 / $0.141，计费秒数为 `max(输入视频时长 + 输出时长, 2 × 输出时长)`，Flash 有参考视频同样按该时长规则。
- Seedance 2.5 无视频输入：480p / 720p $10.70、1080p $11.70 / 百万 Token；有视频输入分别 $6.40 / $7.00，并计入参考视频和最低计费规则。官方 16:9、5 秒无视频输入示例为 $0.514 / $1.156 / $2.843，不能除以 5 后当所有尺寸的通用秒价；以返回 `usage.completion_tokens` 结算。
- Seedance 产品发布文章曾写 API 即将推出，当前 ModelArk 已有可用 API 文档；不要用旧新闻覆盖新接口状态。扩展 / 编辑 / 首尾帧还受任务类型、ratio、duration 约束，调用前阅读对应参数表。

### 异步多媒体服务与质量验收

- 上传 → 校验 → 建任务 → 排队推理 → 保存产物 → 回调 / 查询；通过 [消息队列](../../microservices/06-messaging/) 连接 Java 入口和 worker，入口返回任务 ID，重试靠幂等记录去重。支持 webhook 时按供应商规范验签、校验时间 / 防重放，并处理重复与乱序事件。
- 限制上传大小、MIME / 实际内容、解码资源与时长；抓取外部素材 URL 要防 SSRF。临时下载链接有过期和访问控制问题，不能把它直接当永久引用，安全细节见 [安全与治理](../19-security-governance/)。
- 按任务验收：OCR 字符 / 字段准确率，ASR 字错率及说话人 / 时间戳，视频的时间定位、跨帧一致性、音画同步和内容安全；视觉 / 音频引用须定位页码、区域或时间段，评测流程见 [评测与可观测](../17-evals-observability/)。

## 选型对比

| 方向 | 闭源 / 服务 | 开放权重 / 开源 | 选型要点 |
|------|-------------|-----------------|----------|
| 文档与 OCR | 旗舰多模态模型 | GLM-OCR、Qianfan-OCR | 版面复杂度、数据是否能出境 |
| 语音识别 | 各厂商 ASR API | Whisper 系列 | 中文与方言、流式延迟 |
| 实时语音 | GPT-Realtime-2.1 / GPT-Live 1、Gemini 3.8 Live | 级联式自建 | 端到端延迟、打断体验 |
| 图像生成 | GPT-Image-2.6 | Qwen-Image-2.1、Diffusers 0.42.1 | 中文文字渲染、版权与标识 |
| 视频生成 | `gemini-omni-1.1-flash`、Veo 3.1 GA、Kling 4.0、Seedance 2.5 | Wan2.2、LTX-2.5、HunyuanVideo-1.5 | 时长、分辨率、成本与服务稳定性 |

> [!WARNING]
> 视频生成服务变化极快：OpenAI Sora 2 与 Videos API 已于 2026-09-24 关停；Google Veo 3.1 Preview 已于 2026-10-22 关停，替代为 `gemini-omni-1.1-flash` 或 Gemini Enterprise Agent Platform 上的 Veo 3.1 GA。Kling 4.0 已于 2026-10-28 全面开放 API，Seedance 2.5 的 ModelArk API 规格与价格也已核实，见下表；不要再沿用发布新闻中的「API 即将开放」。以上为 2026-11-05 的核对结果。

## 常见误区

- 所有图片都用最高分辨率：视觉 Token 成本成倍增长，小图任务用低细节模式即可。
- 把 VLM 的 OCR 结果当作 100% 准确：金额、日期等关键字段需要规则校验或人工复核。
- 实时语音只关注模型：网络传输、打断处理和回声消除同样决定体验。
- 依赖某个视频生成服务做核心功能而不设备选：服务可能在几个月内下线或改名。
- 只做隐式标识：元数据在截图、转码后会丢失，需要配合显式标识与水印。
- 忽略肖像与版权：生成真人肖像或模仿特定作品风格前，确认授权与平台规则。

## 实践任务

- 运行本页的图片输入代码，换成一张真实票据，调用一个多模态模型并用结构化输出提取发票号与金额。
- 用 Whisper 转写一段 5 分钟的会议录音，统计中文错字率，并尝试流式转写。
- 用 Diffusers 在 GPU 上跑一个开放权重的文生图模型，比较不同 `num_inference_steps` 的速度与质量。
- 为你的生成服务设计一套标识方案：显式标识位置、元数据字段、日志留存，并用本页代码验证转码后元数据是否丢失。

## 资料索引

- [Hugging Face Diffusers 文档](https://huggingface.co/docs/diffusers/index) — 扩散模型库
- [OpenAI Realtime API](https://developers.openai.com/api/docs/guides/realtime) — 实时语音
- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live) — 实时多模态
- [Whisper 论文](https://arxiv.org/abs/2212.04356) — 大规模弱监督语音识别
- [Qwen-Image](https://github.com/QwenLM/Qwen-Image) — 通义开源图像生成
- [人工智能生成合成内容标识办法](https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm) — 国家网信办等四部门发布
- [Kling API 更新](https://kling.ai/document-api/updates/api.md) — 4.0 / Flash 开放日期与规格
- [Kling 视频价格](https://kling.ai/document-api/pricing/base/video.md) — 官方美元价格与参考视频计费时长
- [Seedance 2.5 发布](https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5) — 2026-07-31 产品发布，不代表当时 API 已开放
- [BytePlus Seedance 2.5](https://docs.byteplus.com/docs/en/modelark/seedance-2-5.md) — 模型 ID、分辨率、时长与素材限制
- [BytePlus ModelArk 价格](https://docs.byteplus.com/docs/en/modelark/model-pricing.md) — Token 单价、示例及结算规则
- [OpenAI Webhooks](https://platform.openai.com/docs/guides/webhooks) — 回调验签与重放保护的接口示例

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】同一张图片用更高的细节模式输入，通常会：
    - A. 减少 Token
    - B. 增加视觉 Token 与成本，提升细节识别
    - C. 不影响成本
    - D. 关闭 OCR 能力
2. 【单选】相比 ASR → LLM → TTS 级联方案，端到端实时语音模型的主要优势是：
    - A. 更容易替换组件
    - B. 延迟更低，并能保留语气等副语言信息
    - C. 不需要网络
    - D. 一定更便宜
3. 【单选】把生成内容属性写入文件元数据属于：
    - A. 显式标识
    - B. 隐式标识
    - C. 数据脱敏
    - D. 内容审核
4. 【简答】为什么做多模态 RAG 时常常要先做版面解析？
5. 【简答】如果你的产品依赖某个闭源视频生成 API，应如何降低服务关停或改名带来的风险？

<details markdown><summary>参考答案</summary>

1. B — 更高分辨率意味着更多图像块与视觉 Token，费用与延迟随之上升。
2. B — 端到端模型省去多段串行处理，并能直接理解与生成语气、停顿等信息。
3. B — 元数据中的标识用户不可见，属于隐式标识；显式标识是用户可感知的文字、角标或提示音。
4. 文档中的正文、表格、图片和页眉页脚混在一起，直接整页切块会打乱结构、丢失表格关系。先做版面解析，可以按类型分别处理：文本正常切块，表格转结构化文本，图片生成描述或用多模态嵌入，再分别入库，检索与引用都更准确。
5. 在业务与具体模型之间加一层适配接口；至少接入两个备选（包括可自托管的开放权重模型）；关注官方弃用公告并设置告警；生成结果与参数留存，便于迁移后对比质量；在合同或预算中考虑迁移成本。

</details>

---

← [上一节：推理与服务](../15-inference-serving/) · [返回 AI](../) · [下一节：评测与可观测](../17-evals-observability/) →
