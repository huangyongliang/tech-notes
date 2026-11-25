# 多模态 {#multimodal}

> [AI](../) › 多模态

图片和语音先要决定细节、延迟和标识各自付什么代价。更高的视觉细节通常更贵。端到端语音有可能少掉级联的几段等待，但是否更低取决于实现、网络和任务，不是无条件保证。文件里的隐式标识在转成 JPEG 或截图之后会丢。

> 相关主题：[LLM API 编程模式](../06-llm-api-programming/) · [检索增强生成](../08-rag/) · [安全与治理](../19-security-governance/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

## 这一页补哪一块 {#_1}

视觉 Token、语音链路、生成标识和视频 API 是四件不同的事。小图不必用最高细节。金额和日期的 OCR 还要规则复核。发布稿里的「即将开放」不能覆盖已经记下的接口规格，示例价格也不能换成通用秒价。2026-11-25 没有重开这些页，也没有跑图像或视频。

## 视觉与文档 {#_4}

<span id="_2"></span>

视觉语言模型把图片切块编成视觉 Token，再和文本一起进模型。OCR、表格、图表、截图和视频都走这条路。分辨率越高，块越多，费用和延迟越高。小图或只要大致字段时，用低细节。

开源 OCR（章内举例 GLM-OCR、Qianfan-OCR）适合不能出境的大批量文档。这是章内举例，不是 2026-11-25 重核的型号表。

输入可以是 URL、Base64，或先上传再引用文件 ID。要 JSON 时用结构化输出，见 [LLM API 编程模式](../06-llm-api-programming/)。模型抽出的金额和日期不能当 100%，还要用规则或人工复核。

下面用 Pillow 画一张示意发票，并拼出图文输入。注释里的真实调用没有执行。2026-11-25 没有安装 Pillow，也没有跑这段，因此不能把 2375 字节说成今天的结果。

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

编写时的输出：

```text
图片字节数： 2375
内容类型： ['input_text', 'input_image']
```

同一结构的 Java 对照。围栏写明 PNG 编码器与 Pillow 不同，字节数不必等于 2375：

```java
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import javax.imageio.ImageIO;

class InvoiceInput {
    public static void main(String[] args) throws Exception {
        // PNG 编码器与原文 Pillow 不同，字节数不必等于 2375。条目类型必须相同。
        BufferedImage img = new BufferedImage(480, 160, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 480, 160);
        g.setColor(Color.BLACK);
        g.drawString("INVOICE No.2026-1105  TOTAL: 3000.00", 20, 80);
        g.dispose();
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        ImageIO.write(img, "png", buf);
        String dataUrl = "data:image/png;base64," + Base64.getEncoder().encodeToString(buf.toByteArray());
        if (!dataUrl.startsWith("data:image/png;base64,")) throw new AssertionError();
        System.out.println("图片字节数： " + buf.size());
        System.out.println("内容类型： ['input_text', 'input_image']");
    }
}
```

2026-11-25 没有跑这段 AWT。即使以后编译通过，打印的字节数也不能称作 Pillow 的 2375。要核对的是内容类型仍是 `input_text` 和 `input_image`。

## 语音 {#_5}

ASR 把语音转成文字。章内把 Whisper 系列记为开源基线。流式转写用于字幕和会议。

级联是 ASR，然后 LLM，然后 TTS。组件可以换，也方便分段调试，延迟是三段相加。

端到端模型直接吃音频、出音频，有可能少掉这几段串行等待，也更能留下语气和停顿。延迟是否更低，还要看实现、网络和具体任务，不能写成无条件保证。章内举例是 OpenAI Realtime API（GPT-Realtime-2.1 / GPT-Live 1）和 Gemini Live API（Gemini 3.8 Live）。这些名字是原记录，2026-11-25 没有重开，不称为当天的当前型号。

工程上还要看 WebRTC 或 WebSocket、打断、语音活动检测，以及工具调用时给用户的等待提示。只换模型，网络和回声仍会决定体感。

## 图像与视频 {#_6}

扩散模型从噪声逐步去噪，文本作为条件。Diffusers 提供 Pipeline。图像侧章内记下 GPT-Image-2.6，以及 2026-09 的 Qwen-Image-2.1。视频侧记下 Kling 4.0、Seedance 2.5，开放权重举例 Wan2.2、LTX-2.5、HunyuanVideo-1.5。都是章内快照。

```python
# 示意：Diffusers 文生图（需要 GPU 与模型权重；加载方式以模型卡说明为准）
import torch
from diffusers import DiffusionPipeline

pipe = DiffusionPipeline.from_pretrained("Qwen/Qwen-Image-2.1", torch_dtype=torch.bfloat16).to("cuda")
image = pipe(prompt="一只在键盘上睡觉的橘猫，水彩风格", num_inference_steps=30).images[0]
image.save("cat.png")
```

这段要 GPU 和权重。2026-11-25 没有安装 Diffusers，没有下载模型，没有生成图片。

## 多模态检索 {#rag}

PDF 先拆成正文、表格和图片，再分别处理。整页切块会打乱表格。图片可以用多模态嵌入，或先写成描述再入库。回答时把命中的原图交给视觉模型。检索和权限过滤见 [检索增强生成](../08-rag/)：多租户时，过滤要发生在结果进入模型之前，不能先取全局再丢掉别人的页。

## 生成内容标识 {#_7}

中国《人工智能生成合成内容标识办法》要求显式标识（文字、角标、语音提示）和隐式标识（文件元数据）。配套标准在章内记为 GB 45438-2025。EU AI Act 第 50 条要求把生成或篡改的音频、图像、视频、文本以机器可读方式标成 AI 生成。日期和适用范围的快照在 [安全与治理](../19-security-governance/)，本章不另写一版时间表。

元数据会在截图和转码时丢失，所以还要显式标识和水印。C2PA 是章内记下的内容来源凭证。下面把标识写进 PNG 文本块，再转成 JPEG：

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

编写时的输出：

```text
读取到的隐式标识： {'Label': '1', 'ContentProducer': 'example-service', 'ProduceID': 'img-20261105-0001'}
转存 JPEG 后是否还有标识： False
```

Java 自己组 PNG 块，不依赖 Pillow：

```java
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.stream.ImageInputStream;

class PngMark {
    static byte[] chunk(String type, byte[] data) {
        byte[] out = new byte[12 + data.length];
        int len = data.length;
        out[0] = (byte) (len >>> 24); out[1] = (byte) (len >>> 16); out[2] = (byte) (len >>> 8); out[3] = (byte) len;
        System.arraycopy(type.getBytes(StandardCharsets.US_ASCII), 0, out, 4, 4);
        System.arraycopy(data, 0, out, 8, data.length);
        int crc = crc(out, 4, 4 + data.length);
        out[8 + data.length] = (byte) (crc >>> 24);
        out[9 + data.length] = (byte) (crc >>> 16);
        out[10 + data.length] = (byte) (crc >>> 8);
        out[11 + data.length] = (byte) crc;
        return out;
    }

    static int crc(byte[] data, int off, int len) {
        int c = 0xFFFFFFFF;
        for (int i = 0; i < len; i++) {
            c ^= data[off + i] & 0xFF;
            for (int k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        }
        return ~c;
    }

    public static void main(String[] args) throws Exception {
        String json = "{\"Label\": \"1\", \"ContentProducer\": \"example-service\", \"ProduceID\": \"img-20261105-0001\"}";
        byte[] text = ("AIGC\0" + json).getBytes(StandardCharsets.ISO_8859_1);
        byte[] sig = new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10};
        byte[] ihdr = {0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0};
        byte[] raw = {0, 0, 0, 0};
        java.util.zip.Deflater def = new java.util.zip.Deflater();
        def.setInput(raw); def.finish();
        byte[] comp = new byte[64];
        int n = def.deflate(comp);
        byte[] idat = java.util.Arrays.copyOf(comp, n);
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        png.write(sig);
        png.write(chunk("IHDR", ihdr));
        png.write(chunk("tEXt", text));
        png.write(chunk("IDAT", idat));
        png.write(chunk("IEND", new byte[0]));
        String found = new String(png.toByteArray(), StandardCharsets.ISO_8859_1);
        if (!found.contains(json)) throw new AssertionError("missing mark");
        System.out.println("读取到的隐式标识： {'Label': '1', 'ContentProducer': 'example-service', 'ProduceID': 'img-20261105-0001'}");
        BufferedImage img = new BufferedImage(64, 64, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream jpg = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", jpg);
        boolean kept = new String(jpg.toByteArray(), StandardCharsets.ISO_8859_1).contains("AIGC");
        System.out.println("转存 JPEG 后是否还有标识： " + (kept ? "True" : "False"));
        if (kept) throw new AssertionError();
    }
}
```

2026-11-25 没有跑 Python，也没有跑这段 Java。输出块保持 Pillow 那次的原文。不能用一次新的 AWT 或手写 PNG 去改这三行。

## 发布和可调用的 API {#api}

以下为 2026-11-05 官方国际 API 文档的快照，不代表国内产品、第三方代理或所有账户套餐；价格单位为美元。2026-11-25 没有重开这些页，不把价格和型号称为当天的当前值。

| API | 时长与分辨率 | 参考素材 / 计费边界 |
|-----|--------------|---------------------|
| Kling 4.0 | 2026-10-28 API 全面开放；最长 30 秒，720p / 1080p；10-bit 4K 仍为即将提供 | 最多 10 关键帧；参考图最多 10、视频最多 5，合计最多 15 素材 |
| Kling 4.0 Flash | 2026-11-04 开放 API；3–20 秒、720p | 无参考视频 $0.094 / 输出秒；有参考视频 $0.063 / 计费秒 |
| Seedance 2.5 | ID `dreamina-seedance-2-5-260628`；4–30 秒（`-1` 为自动）；480p / 720p 8-bit、1080p 10-bit，不支持 4K | 最多 30 图 + 10 视频 + 10 音频，共 50 素材；按视频 Token 计费，不是固定秒价 |

- Kling 4.0 无参考视频输入：720p $0.157 / 秒、1080p $0.235 / 秒，15 秒 1080p 示例为 $3.525；有参考视频：分别 $0.094 / $0.141，计费秒数为 `max(输入视频时长 + 输出时长, 2 × 输出时长)`，Flash 有参考视频同样按该时长规则。
- Seedance 2.5 无视频输入：480p / 720p $10.70、1080p $11.70 / 百万 Token；有视频输入分别 $6.40 / $7.00，并计入参考视频和最低计费规则。官方 16:9、5 秒无视频输入示例为 $0.514 / $1.156 / $2.843，不能除以 5 后当所有尺寸的通用秒价；以返回 `usage.completion_tokens` 结算。
- Seedance 产品发布文章曾写 API 即将推出，当时的 ModelArk 文档已经有可用 API。不要用旧新闻覆盖那次记下的接口状态。扩展、编辑和首尾帧还受任务类型、比例和时长约束。

按秒计价和按 Token 计价不是同一个数。一种分辨率的示例不能除出来当成所有尺寸的秒价。

## 异步任务与验收 {#_8}

上传、校验、建任务、排队、存产物、再回调或查询。Java 入口和 worker 用 [消息队列](../../microservices/06-messaging/) 连起来，入口返回任务 ID，重试靠幂等记录去重。webhook 要按供应商的写法验签，并核对时间和防重放。重复和乱序事件都要能收下。

限制大小、声明的 MIME 和实际内容、解码资源和时长。抓取外部 URL 时要防 SSRF：校验的是将要连接的地址，重定向和再次解析可能落到回环、内网或云元数据。临时下载链接会过期，不能当永久引用。细节见 [安全与治理](../19-security-governance/)。

验收按任务分开：OCR 看字符和字段，ASR 看字错率、说话人和时间戳，视频看时间位置、跨帧、音画同步和内容安全。引用要能指回页码、区域或时间段，见 [评测与可观测](../17-evals-observability/)。

## 怎么选 {#mm-choice}

<span id="_9"></span>

| 方向 | 闭源 / 服务 | 开放权重 / 开源 | 选型要点 |
|------|-------------|-----------------|----------|
| 文档与 OCR | 旗舰多模态模型 | GLM-OCR、Qianfan-OCR | 版面复杂度、数据是否能出境 |
| 语音识别 | 各厂商 ASR API | Whisper 系列 | 中文与方言、流式延迟 |
| 实时语音 | GPT-Realtime-2.1 / GPT-Live 1、Gemini 3.8 Live | 级联式自建 | 延迟取决于实现、网络和任务，不是无条件更低 |
| 图像生成 | GPT-Image-2.6 | Qwen-Image-2.1、Diffusers 0.42.1 | 中文文字渲染、版权与标识 |
| 视频生成 | `gemini-omni-1.1-flash`、Veo 3.1 GA、Kling 4.0、Seedance 2.5 | Wan2.2、LTX-2.5、HunyuanVideo-1.5 | 时长、分辨率、成本与服务稳定性 |

> [!WARNING]
> 视频生成服务变化极快：OpenAI Sora 2 与 Videos API 已于 2026-09-24 关停；Google Veo 3.1 Preview 已于 2026-10-22 关停，替代为 `gemini-omni-1.1-flash` 或 Gemini Enterprise Agent Platform 上的 Veo 3.1 GA。Kling 4.0 已于 2026-10-28 全面开放 API，Seedance 2.5 的 ModelArk API 规格与价格也已核实，见下表；不要再沿用发布新闻中的「API 即将开放」。以上为 2026-11-05 的核对结果。2026-11-25 没有重开这些页，不把表内型号和价格称为当天的当前值。

## 常见误读 {#_3}

<span id="_10"></span>

- 所有图片都用最高细节：视觉 Token 和费用一起涨。
- 把 OCR 当 100%：金额和日期要再校验。
- 端到端语音一定更低延迟：它可能少掉级联的几段等待，仍取决于实现、网络和任务。
- 只盯模型、不看传输和打断。
- 用发布稿代替可调用的 API，或把一种示例价当成所有尺寸的秒价。
- 只做隐式标识：截图和转成 JPEG 后元数据会丢。
- 把 Java 或 AWT 的字节数说成 Pillow 的 2375。
- 忽略肖像和版权：生成真人或模仿特定风格前先确认授权。

## 可选核对 {#mm-check}

<span id="_11"></span>

1. 为什么只把生成标记写进文件元数据不够？转成 JPEG 之后标识会怎样？
2. 产品发布稿、已经可调用的 API，以及按秒计价和按 Token 计价，为什么不能合成一句「当前秒价」？

<details markdown><summary>参考答案</summary>

1. 元数据用户看不见，也会在截图和重新编码时丢掉。本页输出块写的是转存 JPEG 后标识为 False。还要有用户能看见的显式标识或水印。2026-11-25 没有重跑 Pillow 或 Java。
2. 发布稿可以写「即将开放」，接口文档可以已经是另一状态。Kling 的示例是按秒，Seedance 2.5 的章内记录是按视频 Token，一种 16:9、5 秒的示例不能除以 5 当成所有尺寸的秒价。这些数字是 2026-11-05 的快照，不是当天重核的当前价。

</details>

<span id="_13"></span>

## 资料索引 {#_12}

- [Hugging Face Diffusers 文档](https://huggingface.co/docs/diffusers/index) — 扩散模型库；2026-11-25 未运行
- [OpenAI Realtime API](https://developers.openai.com/api/docs/guides/realtime) — 实时语音；2026-11-25 未重开
- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live) — 实时多模态；2026-11-25 未重开
- [Whisper 论文](https://arxiv.org/abs/2212.04356) — 大规模弱监督语音识别
- [Qwen-Image](https://github.com/QwenLM/Qwen-Image) — 通义开源图像生成
- [人工智能生成合成内容标识办法](https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm) — 国家网信办等四部门发布
- [Kling API 更新](https://kling.ai/document-api/updates/api.md) — 4.0 / Flash 的章内记录；2026-11-25 未重开
- [Kling 视频价格](https://kling.ai/document-api/pricing/base/video.md) — 2026-11-05 记下的美元价格
- [Seedance 2.5 发布](https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5) — 2026-07-31 产品发布，不代表当时 API 已开放
- [BytePlus Seedance 2.5](https://docs.byteplus.com/docs/en/modelark/seedance-2-5.md) — 模型 ID 与素材限制的章内快照
- [BytePlus ModelArk 价格](https://docs.byteplus.com/docs/en/modelark/model-pricing.md) — Token 单价的章内快照
- [OpenAI Webhooks](https://platform.openai.com/docs/guides/webhooks) — 回调验签的接口示例；2026-11-25 未重开

---

← [上一节：推理与服务](../15-inference-serving/) · [返回 AI](../) · [下一节：评测与可观测](../17-evals-observability/) →
