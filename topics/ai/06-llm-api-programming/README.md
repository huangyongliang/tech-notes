# LLM API 编程模式 {#llm-api-llm-api-programming}

> [AI](../) › LLM API 编程模式

不依赖框架，直接用官方 SDK 写 LLM 调用：消息结构、流式、结构化输出、函数调用、多轮工具循环、重试与成本控制。这是后面几章的共同底座，按 Python、Java、TypeScript 给出对应写法。

> 相关主题：[Java 并发](../../java/05-concurrency/) · [微服务容错](../../microservices/05-resilience/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

## 这一页补哪一块 {#_1}

本页处理六件必须按协议做的事：消息结构、流式拼接、Schema 约束、带上限的工具回填、超时重试，以及密钥只放在服务端。模型怎么选回 [模型全景](../04-model-landscape/)，提示和缓存顺序回 [提示词与上下文工程](../05-prompt-context/)，框架托管的循环回 [应用开发框架](../07-app-frameworks/)。

## 三种主流接口形态 {#_4}

<span id="_2"></span>

- OpenAI Responses API：`input` 可以是字符串或「条目列表」，`instructions` 放系统指令，结果用 `output_text` 读取；工具调用和工具结果都是 `input` / `output` 里的条目。
- Anthropic Messages API：`system` 单独传，`messages` 是 user / assistant 交替的列表，`max_tokens` 必填；工具调用以 `tool_use` 内容块出现，结果以 `tool_result` 块回填。
- Gemini API：`google-genai` SDK 的 `client.models.generate_content(model=, contents=, config=)`。
- OpenAI 兼容接口是国产模型的通用接入方式：改 `base_url` 和模型名即可；DeepSeek 同时兼容 Anthropic 格式。兼容只覆盖对方实现了的那一部分，不能默认 reasoning、缓存和 schema 全部等价。

> [!NOTE]
> 下面带「运行输出」的 Python 示例在编写时连接本地模拟服务运行（返回固定响应），用来验证 SDK 参数与循环逻辑；换成真实 API Key 后，模型的措辞会不同。标注「需要真实 API Key」的示例只做了参数校验。围栏里的模型 ID 是写作时的快照。2026-11-25 没有改这些 ID，也没有发送真实请求。

OpenAI 基础调用与结构化输出：

```python
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel

client = OpenAI(timeout=30, max_retries=2)   # 从环境变量 OPENAI_API_KEY 读取密钥

resp = client.responses.create(
    model="gpt-6-astra",
    instructions="用一句话回答，面向 Java 后端工程师。",
    input="什么是 KV Cache？",
    reasoning={"effort": "low"},
    max_output_tokens=300,
)
print(resp.output_text)
print("tokens:", resp.usage.input_tokens, resp.usage.output_tokens)


class Ticket(BaseModel):
    category: Literal["物流", "退款", "商品质量", "其他"]
    urgent: bool
    reason: str


parsed = client.responses.parse(
    model="gpt-6-astra",
    input="订单还没发货，我要退款。",
    text_format=Ticket,               # SDK 把 Pydantic 模型转换成严格 JSON Schema
)
ticket = parsed.output_parsed
print(type(ticket).__name__, ticket.category, ticket.urgent)
```

模拟服务的运行输出（不是真实模型的保证答复）：

```text
KV Cache 缓存已生成 Token 的键和值，避免重复计算。
tokens: 12 8
Ticket 退款 False
```

围栏里的 `reasoning={"effort": "low"}` 按写作时的文档写入。具体枚举以落地时的官方 SDK 为准。Changelog 在 2026-11-17 写明 GPT-6.2 改变了 Responses API 编辑对话前缀时如何保留推理，以及如何处理顶层 `instructions`。示例仍用 `gpt-6-astra` 和原来的调用形状，未按迁移指南重跑，所以不改这段代码。

Gemini 的写法（`google-genai` SDK）：

```python
# 需要真实 API Key：Gemini 调用，本机只做了参数校验
from google import genai
from google.genai import types

client = genai.Client()                            # 从环境变量 GEMINI_API_KEY 读取密钥
resp = client.models.generate_content(
    model="gemini-3.8-flash",
    contents="用一句话解释 RAG。",
    config=types.GenerateContentConfig(system_instruction="回答面向后端工程师。", max_output_tokens=200),
)
print(resp.text)
```

`gemini-3.8-flash` 在 2026-11-25 打开的模型页上仍是有效 ID，页面称它为上一代 Flash。这段代码只做了参数形状，没有运行输出，也没有换成 `gemini-4-carbon`。

## 流式输出 {#_5}

- 服务端用 SSE（Server-Sent Events）逐段推送事件；客户端按事件类型拼接文本增量，完成事件才带完整用量。
- 连接可能在用量事件之前断开。缺失的用量记为未知，不能按零计费。后端转发给浏览器时，Java 可以用虚拟线程处理大量长连接（见 [Java 并发](../../java/05-concurrency/)），前端用 `EventSource` 或 `fetch` 读取流。浏览器断开不等于上游已经停止计费。

```python
# 需要真实 API Key：流式输出，本机只做了参数校验
import anthropic
from openai import OpenAI

stream = OpenAI().responses.create(model="gpt-6-luna", input="写一首四行短诗", stream=True)
for event in stream:
    if event.type == "response.output_text.delta":
        print(event.delta, end="", flush=True)
    elif event.type == "response.completed":
        print("\n用量", event.response.usage.output_tokens)

with anthropic.Anthropic().messages.stream(
    model="claude-haiku-5-5",
    max_tokens=512,
    messages=[{"role": "user", "content": "写一首四行短诗"}],
) as s:
    for text in s.text_stream:
        print(text, end="", flush=True)
    print("\n用量", s.get_final_message().usage.output_tokens)
```

这段只做参数校验，没有运行输出，也没有真实 API Key。

## 函数调用与工具循环 {#_6}

```mermaid
flowchart LR
  A[用户问题] --> B[模型调用]
  B --> C{有工具调用}
  C -->|是| D[执行工具]
  D --> E[回填结果]
  E --> B
  C -->|否| F[最终回答]
```

- 工具 = 名称 + 描述 + JSON Schema 参数。描述写清「什么时候用、参数含义」，模型才会选对工具。
- 循环终止条件：模型不再请求工具，或达到步数上限。一定要设上限，防止死循环烧钱。
- 模型可能一次返回多个工具调用（并行调用），要逐个执行并按 `call_id` / `tool_use_id` 对应回填。漏掉模型自己发出的调用条目，下一轮就对不上。
- `strict: true` 让工具参数严格符合 schema；`tool_choice` 可以强制或禁止调用工具。schema 通过不等于业务上允许执行。

OpenAI Responses API 版本：

```python
import json

from openai import OpenAI

client = OpenAI()


def get_weather(city: str) -> dict:
    return {"city": city, "temp_c": 21}          # 真实项目里调用天气服务


TOOLS = [{
    "type": "function",
    "name": "get_weather",
    "description": "查询城市当前气温",
    "parameters": {
        "type": "object",
        "properties": {"city": {"type": "string", "description": "城市名"}},
        "required": ["city"],
        "additionalProperties": False,
    },
    "strict": True,
}]
REGISTRY = {"get_weather": get_weather}

items: list = [{"role": "user", "content": "北京现在多少度？"}]
for step in range(5):                              # 上限防止无限循环
    resp = client.responses.create(model="gpt-6-astra", input=items, tools=TOOLS)
    calls = [o for o in resp.output if o.type == "function_call"]
    if not calls:
        print(resp.output_text)
        break
    items += resp.output                           # 把模型的工具调用原样放回上下文
    for call in calls:
        result = REGISTRY[call.name](**json.loads(call.arguments))
        print(f"step {step}: {call.name}({call.arguments}) -> {result}")
        items.append({"type": "function_call_output", "call_id": call.call_id, "output": json.dumps(result)})
```

模拟服务的运行输出：

```text
step 0: get_weather({"city": "北京"}) -> {'city': '北京', 'temp_c': 21}
北京现在 21°C。
```

执行完工具后，要把模型返回的 `function_call` 和带同一 `call_id` 的 `function_call_output` 一起放回 `input`。只追加一条用户消息，模型看不到自己发起过哪一次调用。

Anthropic Messages API 版本：

```python
import json

import anthropic

client = anthropic.Anthropic()                     # 从环境变量 ANTHROPIC_API_KEY 读取密钥

TOOLS = [{
    "name": "get_weather",
    "description": "查询城市当前气温",
    "input_schema": {
        "type": "object",
        "properties": {"city": {"type": "string"}},
        "required": ["city"],
    },
}]

messages = [{"role": "user", "content": "北京现在多少度？"}]
for step in range(5):
    msg = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=2048,
        system="你是简洁的中文助手。",
        thinking={"type": "adaptive"},             # 最新模型使用自适应思考
        output_config={"effort": "low"},
        tools=TOOLS,
        messages=messages,
    )
    if msg.stop_reason != "tool_use":
        print("".join(b.text for b in msg.content if b.type == "text"))
        break
    messages.append({"role": "assistant", "content": msg.content})
    results = []
    for block in msg.content:
        if block.type == "tool_use":
            out = {"city": block.input["city"], "temp_c": 21}
            print(f"step {step}: {block.name}({block.input}) -> {out}")
            results.append({"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(out)})
    messages.append({"role": "user", "content": results})
```

模拟服务的运行输出：

```text
step 0: get_weather({'city': '北京'}) -> {'city': '北京', 'temp_c': 21}
北京现在 21°C。
```

围栏里的 `thinking={"type": "adaptive"}` 和 `output_config={"effort": "low"}` 是写作时按当时文档写入的，注释原文也留在围栏里。2026-11-25 打开的模型总览仍把当前所列模型描述为自适应思考，并由 effort 调节；同日的 effort 文档写明用 `output_config.effort`，并出现 `thinking: {"type": "adaptive"}`。Fable 5.2 的发布说明还写了前缀检查和思考块不能跨模型随意回放。落地前对照当前 Messages API。字段若已变更，只改说明；未重跑就不改这段代码。assistant 的 `tool_use` 块之后要紧跟 user 的 `tool_result`，并用同一个 `tool_use_id`。

## 结构化输出 {#_7}

- 让支持该能力的 API 用 JSON Schema 约束解码，通常比仅提示「请输出 JSON」更可靠；拒答、截断和协议错误仍须单独处理。
- Python 用 Pydantic、TypeScript 用 Zod、Java 用普通类或 record 描述结构，SDK 负责转成 schema 并解析结果。
- 上面 OpenAI 示例里的 `responses.parse(text_format=Ticket)` 就是结构化输出；Anthropic 对应 `messages.parse(output_format=Ticket)`：

```python
from typing import Literal

import anthropic
from pydantic import BaseModel


class Ticket(BaseModel):
    category: Literal["物流", "退款", "商品质量", "其他"]
    urgent: bool
    reason: str


client = anthropic.Anthropic()
msg = client.messages.parse(
    model="claude-haiku-5-5",
    max_tokens=512,
    messages=[{"role": "user", "content": "订单还没发货，我要退款。"}],
    output_format=Ticket,
)
print(msg.parsed_output)
```

模拟服务的运行输出：

```text
category='退款' urgent=False reason='未发货要求退款'
```

合法 JSON 不等于事实正确。拒答、截断和业务字段仍要单独判断，不能因为解析成功就执行退款或改订单。

## Java 与 TypeScript {#java-typescript}

依赖坐标保持写作时的快照：`com.openai:openai-java:4.101.0`（Maven Central 与官方 SDK 源码核对，2026-11-05）；Anthropic 对应 `com.anthropic:anthropic-java:3.6.0`。保存为 `TicketClassifier.java`；完整 imports 如下。编译状态：2026-11-06 在 JDK 21.0.12.1、Maven 3.8.7 上 `mvn -DskipTests compile` 通过；未运行程序，未发送 API 请求。2026-11-25 未重开这两个 Java 坐标的注册表，也不把这句话改写成更新的 JDK 已跑通。

```java
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.responses.ResponseCreateParams;
import com.openai.models.responses.StructuredResponseCreateParams;

public class TicketClassifier {

    public static class Ticket {
        public String category;
        public boolean urgent;
        public String reason;
    }

    public static void main(String[] args) {
        OpenAIClient client = OpenAIOkHttpClient.fromEnv();   // 读取 OPENAI_API_KEY、OPENAI_BASE_URL

        ResponseCreateParams params = ResponseCreateParams.builder()
                .model(System.getenv().getOrDefault("OPENAI_MODEL", "gpt-6-luna"))
                .input("用一句话解释 KV Cache")
                .build();
        client.responses().create(params).output().stream()
                .flatMap(item -> item.message().stream())
                .flatMap(message -> message.content().stream())
                .flatMap(content -> content.outputText().stream())
                .forEach(text -> System.out.println(text.text()));

        StructuredResponseCreateParams<Ticket> structured = ResponseCreateParams.builder()
                .model(System.getenv().getOrDefault("OPENAI_MODEL", "gpt-6-luna"))
                .input("订单还没发货，我要退款。")
                .text(Ticket.class)                              // 由类生成 JSON Schema
                .build();
        client.responses().create(structured).output().stream()
                .flatMap(item -> item.message().stream())
                .flatMap(message -> message.content().stream())
                .flatMap(content -> content.outputText().stream())
                .forEach(t -> System.out.println(t.category + " " + t.urgent));
    }
}
```

仅 JDK 示例：保存为 `JdkLlmClient.java`，目标 JDK 21，无 Maven 依赖，预期命令 `javac --release 21 JdkLlmClient.java`。编译状态：2026-11-06 `javac --release 21` 与 `mvn -DskipTests compile` 均通过；未运行程序，未调用付费 API。本例只演示普通 HTTP / 原始 JSON，不实现生产级重试、流式、响应体限额或 JSON 解析。

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

public class JdkLlmClient {
    public static void main(String[] args) throws Exception {
        String key = required("OPENAI_API_KEY");
        String model = System.getenv().getOrDefault("OPENAI_MODEL", "gpt-6-luna");
        // 受限模型标识允许安全插入本例 JSON；一般请求应使用 JSON 库序列化
        if (!model.matches("[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}")) {
            throw new IllegalArgumentException("模型标识格式不支持");
        }
        String body = """
                {"model":"%s","messages":[{"role":"user","content":"用一句话解释 KV Cache"}],"stream":false}
                """.formatted(model);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + key)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
        try (HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).build()) {
            HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() / 100 != 2) {
                throw new IllegalStateException("LLM HTTP 状态：" + response.statusCode());
            }
            System.out.println(response.body()); // 仅演示原始 JSON，生产日志不记录原文
        }
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("缺少环境变量：" + name);
        }
        return value;
    }
}
```

TypeScript 示例使用写作时的 Vercel AI SDK 7（`ai` 7.0.163），工具循环由 `stopWhen` 控制。下面的代码在编写时连接同一个模拟服务运行，输出 `北京现在 21°C。`，共 2 步。2026-11-25 未重开 `ai` 的注册表，不把 7.0.163 写成当日最新版。

```typescript
import { generateText, tool, isStepCount } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const weather = tool({
  description: '查询城市当前气温',
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, tempC: 21 }),
});

const { text, steps } = await generateText({
  model: openai('gpt-6-astra'),
  tools: { weather },
  stopWhen: isStepCount(5),        // 最多 5 步；旧名 stepCountIs 仍可用
  prompt: '北京现在多少度？',
});
console.log(text, steps.length);
```

## 工程化：超时、重试、限流、成本 {#_8}

- 超时与重试：官方 SDK 默认对连接错误、429、5xx 做指数退避重试，`timeout`、`max_retries` 可在客户端或单次请求上配置；业务层再加熔断与降级（见 [微服务容错](../../microservices/05-resilience/)）。SDK、网关和业务三层同时重试会放大请求。
- 限流：按供应商的 RPM / TPM 配额做客户端令牌桶，429 时尊重 `retry-after`。
- 成本记录：每次调用记录模型、输入 / 输出 / 缓存 Token、耗时，汇总到可观测平台（见 [评测与可观测](../17-evals-observability/)）。用量字段缺失时记未知。
- 降本：Prompt Caching（稳定前缀）、Batch API（离线任务通常半价）、小模型分流。半价是供应商规则，不是本页重新核过的价目。
- 统一网关：LiteLLM 等多模型代理统一鉴权、配额与日志；API Key 只放在服务端，绝不下发到浏览器或 App。本章没有重开 LiteLLM 的当前版本。

## 失败也是协议的一部分 {#_9}

- 原生 Structured Outputs 约束受支持的 JSON Schema 子集；仍需分别处理拒答、截断 / incomplete、网络错误、空内容和业务字段校验。合法 JSON 不代表事实正确，工具参数也必须重新授权。
- `strict`、JSON mode、函数调用和普通文本输出是不同契约；OpenAI-compatible 仅表示部分接口形态兼容，不能默认 Responses、reasoning、缓存、工具并行和 schema 全部等价。
- 流式接口先缓存工具参数碎片，等调用完成再解析 / 执行；不要对每个 chunk 执行工具。连接可能在 usage / 完成事件到达前中断，缺失用量记为未知并对账，不能按零计费。
- 区分连接超时、首字 / 空闲超时与总 deadline；下游取消应向上游传播，并限制缓冲区与排队长度。浏览器断开不等于模型或异步任务已停止计费。
- SDK、网关和服务重试叠加会放大请求；统一重试预算，尊重 `Retry-After`，指数退避加抖动，只重试适合的暂时错误。工具副作用用业务幂等键 / 去重记录，不能假设模型生成接口天然幂等。

## 接入已有微服务的职责边界 {#_10}

把本页客户端封装成出站适配器；入口沿用 [API 网关](../../microservices/02-api-gateway/) 的身份、限流和租户预算。地址 / 模型名由 [服务发现与配置](../../microservices/03-discovery-config/) 管理，密钥由服务端 secret 注入，不下发浏览器。Spring 适配、Resilience4j 与会话隔离集中在 [应用开发框架](../07-app-frameworks/)，避免每个业务控制器复制重试逻辑。

## 语言与接入方式怎么选 {#api-choice}

<span id="_11"></span>

| 语言 | 官方 SDK（2026-11-05 快照） | 结构化输出 | 适合 |
|------|---------------------------|------------|------|
| Python | `openai` 3.46.0、`anthropic` 2.6.0、`google-genai` 2.34.0 | Pydantic | 原型、数据处理、Agent |
| Java | `openai-java` 4.101.0、`anthropic-java` 3.6.0 | Java 类 / record | 已有 Spring 后端，见 [应用开发框架](../07-app-frameworks/) |
| TypeScript | `openai` 7.52.0、`@anthropic-ai/sdk` 1.6.0、AI SDK 7.0.163 | Zod | Web 全栈、流式 UI |
| Go | `openai-go` v3.95.0、`anthropic-sdk-go` v2.7.0 | struct + schema | 网关、高并发服务 |
| 多模型代理 | LiteLLM 1.108.1 | 透传 | 统一接入多家模型 |

> [!WARNING]
> 表内数字是 2026-11-05 的注册表快照，围栏依赖不跟着改，也不自动迁移 API。2026-11-25 打开的 PyPI 项目页标题为 `openai` 3.59.0、`anthropic` 2.14.0。`google-genai`、Java、JavaScript、Go 和 LiteLLM 的「当前」版本本批没有重开，不能把表里的数字或搜索摘录写成当日已核。
>
> Instructor 1.17.0 依赖 `jiter<0.15`，而当时的 `openai` 3.46.0 依赖 `jiter>=0.16`，两者在同一环境中无法一起安装；需要 Instructor 时要用它支持的旧版 `openai`，或直接用 SDK 自带的 `parse` 结构化输出。这个冲突按 2026-11-05 的记录保留，2026-11-25 未重开 Instructor。

## 常见误读 {#_3}

<span id="_12"></span>

- 不设步数上限的工具循环：模型反复调用同一工具时会无限消耗 Token。
- 只回填工具结果、不回填模型的工具调用条目：OpenAI 需要 `function_call` 与 `function_call_output` 成对出现，Anthropic 需要 assistant 的 `tool_use` 块后紧跟 user 的 `tool_result` 块。
- 在提示词里要求「输出 JSON」然后 `json.loads`：偶发的多余文字就会解析失败，应使用结构化输出。解析成功仍要做业务校验。
- 把 API Key 写进前端代码或移动端安装包：任何人都能提取并盗刷。
- 重试不加退避和上限：429 时立即重试会让限流更严重。
- 忽略 `max_tokens` / `max_output_tokens`：输出被截断时要检查结束原因（`stop_reason`、`status`），而不是当作完整答案。
- 把模拟服务的固定输出当成真实模型的保证答复，或把只做了参数校验的示例当成已经调用过 API。

## 可选核对 {#api-check}

<span id="_13"></span>

1. OpenAI 工具循环执行完工具后，为什么要把 `function_call` 与带同一 `call_id` 的 `function_call_output` 一起放回 `input`？
2. 为什么结构化输出仍不能代替拒答、截断和业务字段校验？

<details markdown><summary>参考答案</summary>

1. 下一轮模型要看到自己发起的调用和对应结果。两者用 `call_id` 配对。只发送工具结果，或重新开一段对话，模型对不上是哪一次调用。
2. Schema 约束的是正常完成时的 JSON 形状。拒答、截断、空内容和协议错误仍要单独分支。解析出的分类或金额还要按业务规则校验，不能因为类型正确就执行退款。

</details>

<span id="_15"></span>

## 资料索引 {#_14}

- [OpenAI Function calling](https://developers.openai.com/api/docs/guides/function-calling) — 函数调用与工具循环
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — JSON Schema 结构化输出
- [Anthropic Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) — Claude 工具调用
- [Anthropic Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming) — 流式事件格式
- [openai-java](https://github.com/openai/openai-java) — OpenAI 官方 Java SDK
- [Gemini API 文档](https://ai.google.dev/gemini-api/docs) — google-genai SDK 用法
- [OpenAI 结构化输出](https://platform.openai.com/docs/guides/structured-outputs) — schema 子集、拒答与 incomplete 处理
- [OpenAI 流式响应](https://platform.openai.com/docs/guides/streaming-responses) — 事件流与完成语义
- [OpenAI API changelog](https://developers.openai.com/api/docs/changelog) — 2026-11-17：GPT-6.2 与 Responses 的前缀推理、`instructions`
- [Anthropic effort](https://platform.claude.com/docs/en/build-with-claude/effort) — 2026-11-25 打开的 `output_config.effort` 说明
- [openai-java Maven 元数据](https://repo1.maven.org/maven2/com/openai/openai-java/maven-metadata.xml) — 2026-11-05 正式版 4.101.0；2026-11-25 未重开
- [JDK 21 HttpClient](https://docs.oracle.com/en/java/javase/21/docs/api/java.net.http/java/net/http/HttpClient.html) — 连接复用、超时与发送请求
- [Anthropic Python 版本](https://pypi.org/project/anthropic/) — 2026-11-05 快照 2.6.0；2026-11-25 打开的项目页标题为 2.14.0
- [OpenAI Python 版本](https://pypi.org/project/openai/) — 2026-11-05 快照 3.46.0；2026-11-25 打开的项目页标题为 3.59.0
- [OpenAI JS 版本](https://www.npmjs.com/package/openai) — 2026-11-05 快照 7.52.0；2026-11-25 未重开
- [Anthropic JS 版本](https://www.npmjs.com/package/@anthropic-ai/sdk) — 2026-11-05 快照 1.6.0；2026-11-25 未重开
- [LiteLLM 版本](https://pypi.org/project/litellm/) — 2026-11-05 快照 1.108.1；2026-11-25 未重开
- [Anthropic Java 发布记录](https://github.com/anthropics/anthropic-sdk-java/releases) — 2026-11-05 正式版 3.6.0；2026-11-25 未重开
- [Anthropic Go 发布记录](https://github.com/anthropics/anthropic-sdk-go/releases) — 2026-11-05 正式版 v2.7.0；2026-11-25 未重开
- [OpenAI Go 发布记录](https://github.com/openai/openai-go/releases/tag/v3.95.0) — v3.95.0 的官方发布证据；2026-11-25 未重开

---

← [上一节：提示词与上下文工程](../05-prompt-context/) · [返回 AI](../) · [下一节：应用开发框架](../07-app-frameworks/) →
