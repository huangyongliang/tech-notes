# 跨越源边界 {#crossing-boundary}

> [Web](../) › 跨越源边界

渲染和请求处理接到一起时，框架只能声明自己踩在源的哪一层。它不能把浏览器的边界删掉。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#boundary-scope}

[浏览器里的源](../origin/) 已经定义三元组、默认可读的范围，以及 CORS 是按次放行。本页不重抄那些定义。这里只把框架里常见的动作对到那几层上：封装过的 `fetch`、表单提交、Cookie，以及服务器先写出的 HTML。

[界面与渲染模型](../02-rendering/) 管状态如何变成视图。[请求处理与中间件](../03-request-handling/) 管已经到达应用的请求如何变成响应。认证协议怎么落地，见 [安全](../../microservices/11-security/)。本页只保留和源、CORS 交叉的那几条，不写成 OAuth 教程。

## 框架动作踩在哪一层 {#boundary-actions}

脚本默认可读的范围由源决定。CORS 是服务器声明「这一次可以把响应交给哪个源的脚本」。框架配置 CORS，仍然是在做这一次放行，不是把同源策略关掉。

表单提交通常是一次导航式的写：浏览器带着表单去请求，响应用来替换文档。提交页面里的脚本并没有因此拿到响应正文。`fetch` 才把响应对象交给发起它的脚本；跨源时，能不能读正文仍看 CORS。

框架若把两种都叫「提交」，就要写清有没有把跨源正文交给脚本。只是导航，源的读限制没有被打开。封装成 `fetch` 却没有 CORS 允许，脚本仍然读不到正文。封装改变不了这条默认。

## 带上 Cookie 不是变成同源 {#boundary-cookie}

Cookie 用域和路径，另加 `SameSite` 决定跨站时带不带。Fetch 把凭证模式分成不带、仅同源、以及包含凭证。带上凭证的跨源请求，仍然是跨源：脚本能不能读响应，还要服务器明确允许，并且允许时不能再用通配来源去搭配凭证。

所以「框架默认带 Cookie」只说明请求可能附上了凭证。它不说明两个 URL 同源，也不说明登录因此是安全的。源和 Cookie 不是同一个三元组，origin 章已经分开。认证协议本身见 [安全](../../microservices/11-security/)。

## 第一份 HTML 从哪来 {#boundary-ssr}

服务端渲染改变的是第一份 HTML 从哪来：服务器先写出文档，浏览器再在这份文档上恢复事件和状态。这个恢复常被叫作水合。它是「状态在哪接上」的约定，不是源的合并。

服务器持有的证书仍只证明传输对端，不证明页面可以读另一个源。水合发生在已经载入的这份文档里。文档的源没有因为 HTML 来自服务器就扩大。

## 同域转发没有取消上游 {#boundary-bff}

BFF 或同域反向代理让浏览器只请求自己的源，再由己方服务器去访问上游。浏览器到 BFF 仍是一个源：脚本读到的是这个源的响应。BFF 到上游是服务器发出的调用，不受浏览器同源策略的同一套限制，信任落在 BFF 上。

这不是「没有跨源问题了」。上游是谁、BFF 愿意代它做什么，变成了 BFF 的责任。入口上的网关和这里的差别见 [API 网关](../../microservices/02-api-gateway/)：网关常站在多个服务前面；BFF 在这里特指浏览器只看见己方源、由己方再去访问上游。两条都没有改写浏览器里的源。

页面在 `https://shop.example`，API 在 `https://api.shop.example`：

| 走法 | 脚本可读性 | Cookie | 信任落在哪 |
|------|------------|--------|------------|
| 浏览器直连 API，靠 CORS | 主机不同，默认读不到正文。只有该次响应允许时，脚本才读得到 | 跨站是否附上，看 `SameSite` 和凭证模式。附上也不变成同源 | 浏览器执行源和 CORS；API 自己决定放不放行 |
| 同域 BFF 转发 | 脚本读的是 `shop.example` 的响应，这次读取是同源的 | 可以是 `shop.example` 的第一方 Cookie。上游看不到浏览器的那张源比较 | 浏览器只信任到 BFF。BFF 再决定如何调用上游 |

第二种没有让 `api.shop.example` 变成页面的源。它只是让脚本不必直接读那个源。

## 常见误读 {#boundary-misreadings}

- 「开了 CORS，同源策略就关闭了。」框架里的 CORS 配置仍是按次放行。没被允许的读取，正文还是不交给脚本。
- 「SSR 之后就没有源的问题了。」服务器写出第一份 HTML，只改变第一字节从哪来、状态在哪恢复。文档的源还在，证书也不变成读另一个源的许可。
- 「同域代理了，上游是谁都无所谓。」浏览器不再直接读上游，信任改落在代理上。上游仍是代理要去调用的另一边。
- 「框架默认带 Cookie，所以已经安全登录。」带上凭证不是同源，也不是一次完整的认证协议。它只影响这张请求附不附 Cookie。

## 可选核对 {#boundary-check}

两层调用已经分开。这两问只核对边界还在不在。

1. 页面把跨源 `fetch` 的 CORS 开关打开了。同源策略是否因此关闭？
2. 浏览器只请求 `https://shop.example`，由它的服务器再调用 `https://api.shop.example`。脚本读到的响应是哪个源的？上游还有没有自己的信任边界？

<details markdown><summary>参考答案</summary>

1. 没有。CORS 放行的是某一次读取。其他源、其他响应，默认仍然不把正文交给脚本。
2. 脚本读到的是 `shop.example` 的同源响应。上游仍要由这台服务器决定怎么调用、信任到哪。同域代理没有把上游并进页面的源。

</details>

## 资料索引 {#boundary-sources}

- [HTML Living Standard：Origin](https://html.spec.whatwg.org/multipage/origin.html#origin) — 源的定义。本页不重抄，只把框架动作映射到这一定义上。
- [MDN：Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy) — 默认可读范围、表单和嵌入属于哪一类。origin 章已引，这里用来对上「导航式的写」和「交给脚本的读」。
- [Fetch：credentials mode](https://fetch.spec.whatwg.org/#concept-request-credentials-mode) — 请求可以不带凭证、只在同源时带，或明确包含凭证。包含凭证并不改变源的比较。
- [MDN：Set-Cookie / SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesite) — 跨站时 Cookie 带不带，是 Cookie 的规则，不是源的三元组。
- [React：hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot) — 概念来源：在服务器已经生成的 HTML 上恢复客户端组件。本页不是该库教程，也不把水合写成取消源。
- [浏览器里的源](../origin/) — 三元组、CORS 和 Cookie 的分界。本页必读的前提。
- [界面与渲染模型](../02-rendering/) — 状态如何变成视图。
- [请求处理与中间件](../03-request-handling/) — 请求到达应用之后如何变成响应。
- [计算机网络](../../cs-basics/05-networking/) — 报文和 TLS。证书不扩大源。
- [API 网关](../../microservices/02-api-gateway/) — 入口和这里的同域转发不是同一条边界。
- [安全](../../microservices/11-security/) — OAuth2 / OIDC 的落地。本页只保留与源交叉的那几条。

---

← [上一节：请求处理与中间件](../03-request-handling/) · [返回 Web](../)
