# CKB-UGMP IPFS / Spore DOB 存储实现说明

更新时间：2026-06-21

## 1. 设计目标

CKB-UGMP 当前采用“资源本体离链存储，链上保存可验证引用”的方式处理图片类 DOB。

核心目标是：

- 避免把大图片二进制直接写入 CKB，降低链上空间占用和铸造成本。
- 保留 Spore / DOB 的链上可追踪性，让链上 cell 能指向确定的资源。
- 使用标准 URI 形式 `ipfs://{cid}`，方便后续钱包、浏览器、DOB 渲染器或索引器统一解析。
- 让存储层可以替换，当前默认使用 IPFS / Pinata，但 metadata 结构不绑定 Pinata。

当前实现不是把 IPFS 作为 CKB 协议层的一部分，而是在 DOB metadata 中保存 IPFS 资源引用。这样可以作为 CKB 生态内图片、音频、模型等大资源的通用补充方案。

## 2. Pinata 上传流程

前端不直接请求 Pinata。原因是 `PINATA_JWT` 必须保存在服务端，不能暴露给浏览器。

当前上传流程如下：

1. 用户在工作台选择图片文件。
2. 浏览器把文件用 `multipart/form-data` 提交到服务端接口 `/api/uploads/pinata`。
3. 服务端校验文件：
   - 必须存在 `file` 字段。
   - MIME type 必须是 `image/*`。
   - 单文件大小不超过 10 MB。
4. 服务端读取环境变量 `PINATA_JWT`。
5. 服务端调用 Pinata API：`https://api.pinata.cloud/pinning/pinFileToIPFS`。
6. Pinata 返回 `IpfsHash`。
7. 服务端把结果整理为统一的 `UploadResult` 返回给前端。

对应代码位置：

- API route：`app/api/uploads/pinata/route.ts`
- Pinata wrapper：`lib/pinata.ts`

返回给前端的数据结构大致如下：

```json
{
  "storage": "ipfs",
  "cid": "QmXQG5m7zH43PU4zRtnzjxYPkPY1kMiDhicKJMpK1A9Dqx",
  "uri": "ipfs://QmXQG5m7zH43PU4zRtnzjxYPkPY1kMiDhicKJMpK1A9Dqx",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmXQG5m7zH43PU4zRtnzjxYPkPY1kMiDhicKJMpK1A9Dqx",
  "name": "image.jpg",
  "size": 13682,
  "mimeType": "image/jpeg"
}
```

这里需要区分两个地址：

- `uri` 是写入 DOB metadata 的规范资源引用，使用 `ipfs://` scheme。
- `gatewayUrl` 是给浏览器预览用的 HTTP 网关地址，不建议作为唯一链上记录。

## 3. CID 如何写入 Spore DOB metadata

上传成功后，应用会根据 `UploadResult` 生成 DOB metadata。

当前链上 metadata 使用最小字段：

```json
{
  "v": 0,
  "n": "image.jpg",
  "r": "ipfs://QmXQG5m7zH43PU4zRtnzjxYPkPY1kMiDhicKJMpK1A9Dqx",
  "m": "image/jpeg"
}
```

字段含义：

- `v`：metadata schema version，目前为 `0`。
- `n`：展示名称，通常使用上传文件名。
- `r`：resource URI，也就是 `ipfs://{cid}`。
- `m`：资源 MIME type，例如 `image/png`、`image/jpeg`。

生成逻辑在 `lib/dobMetadata.ts`：

```ts
return {
  v: 0,
  n: input.name,
  r: input.upload?.uri ?? input.externalUrl ?? "",
  m: input.upload?.mimeType,
};
```

铸造时，应用会把这段 JSON 编码为 UTF-8 bytes，并作为 Spore content 写入链上：

```ts
const content = ccc.bytesFrom(JSON.stringify(metadata), "utf8");
```

对应 Spore content type：

```text
application/json;dob=0
```

对应代码位置：

- metadata 构造：`lib/dobMetadata.ts`
- Spore 铸造：`lib/sporeMint.ts`

因此，链上保存的是“资源引用 + 基础展示信息”，不是图片本体。图片本体由 IPFS 网络和 Pinata pin 服务保存。

## 4. 为什么使用短 metadata

早期版本使用过较长的 metadata：

```json
{
  "standard": "dob/0",
  "name": "image.jpg",
  "description": "CKB-UGMP testnet mint draft",
  "resource": {
    "storage": "ipfs",
    "uri": "ipfs://...",
    "mimeType": "image/jpeg",
    "size": 13682
  },
  "traits": [
    { "key": "source", "value": "ckb-ugmp" },
    { "key": "network", "value": "ckb-testnet" }
  ],
  "createdAt": "2026-06-02T17:30:27.472Z"
}
```

这个结构可读性更强，但会增加 Spore content bytes，从而增加链上空间占用。

当前版本移除了以下字段：

- `description`
- `traits`
- `createdAt`
- `size`
- `storage`
- 嵌套的 `resource` 对象

保留的信息是渲染一个图片 DOB 最小需要的信息：版本、名称、资源 URI、MIME type。

以当前样例计算，metadata 从约 352 bytes 降到约 114 bytes，减少约 68%。这不是压缩图片，而是减少链上 JSON 体积。

## 5. 存储选项取舍

CKB-UGMP 目前将 IPFS 作为默认方案，但设计上保留了其他存储方式的空间。

### IPFS / Pinata

优点：

- 链上只保存短 URI，对于较大的资源，成本低。
- 不依赖中心化平台。
- Pinata 提供 pin 服务，能提高资源可用性。
- 其他网关、索引器或渲染器也能解析资源。

缺点：

- 浏览器通常不能直接打开 `ipfs://`，需要网关或支持 IPFS 的客户端。
- 如果没有 pin，资源可能随时间变得不可用。
- 网关可能很慢。

### 纯文本上链

适用场景：

- metadata 极小。
- 资源本身就是文本、JSON等。
- 需要最大程度保证内容随链永久可读。

优点：

- 内容直接在 CKB 上，不依赖外部存储服务。
- 可验证性和长期可用性最强。
- 对索引器和链上解析最直接。

缺点：

- 单位成本极其昂贵。

当前结论：适合极小文本、小 JSON，不适合作为图片类 DOB 的默认方案。

### 中心化平台 URL

适用场景：

- 快速原型。
- 项目方已有稳定 CDN 或对象存储。
- 对长期去中心化可用性要求不高。

优点：

- 实现简单。
- 浏览器兼容性好。
- 加载速度和缓存可控。

缺点：

- URL 指向的内容可以被替换、删除或失效。
- 长期可用性依赖平台或项目方。

## 6. 为什么有的 DOB 可以看到图片，有的不行

展示效果不一致通常不是单一原因，需要分层判断。

### 情况一：metadata 里没有可解析的资源 URI

如果 DOB 的 content 不是当前约定的 JSON，或者缺少 `r` / `resource.uri` 字段，渲染器就无法知道图片在哪里。

例如当前版本期望：

```json
{
  "r": "ipfs://Qm..."
}
```

旧格式也可以兼容：

```json
{
  "resource": {
    "uri": "ipfs://Qm..."
  }
}
```

如果资源地址只存在于项目私有字段、链下数据库或不可识别结构中，展示层就可能无法显示图片。

### 情况二：资源不是图片，或 MIME type 不明确

当前 MVP 主要支持图片展示。如果 DOB 指向的是文本、音频、视频、HTML、3D 模型或未知 MIME type，图片组件无法直接渲染。

当前建议是 metadata 中保留 `m` 字段，例如：

```json
{
  "m": "image/png"
}
```

渲染器可以用 MIME type 决定使用图片、文本、视频还是其他组件。

### 情况三：IPFS 资源没有被 pin 或网关无法访问

即使 metadata 中有正确的 `ipfs://{cid}`，浏览器展示时通常仍需要把它转换为 HTTP gateway URL：

```text
ipfs://Qm...
https://gateway.pinata.cloud/ipfs/Qm...
```

如果资源没有被 pin、Pinata 网关暂时不可用、公共网关限流、网关缓存未命中，图片也可能暂时无法显示。

这属于存储可用性问题，不是 Spore cell 本身丢失。

### 情况四：渲染器没有实现 IPFS URI 转换

有些 DOB 浏览器或钱包只支持 `https://...`，不支持 `ipfs://...`。这时链上记录是正确的，但渲染层没有把 `ipfs://{cid}` 转换成可访问的 gateway URL。

建议渲染器支持以下解析逻辑：

1. 读取 DOB content JSON。
2. 优先读取 `r` 字段。
3. 如果 `r` 以 `ipfs://` 开头，将 CID 转换为 configured gateway URL。
4. 如果 MIME type 是 `image/*`，用图片组件展示。
5. 如果网关失败，允许用户复制 CID 或切换 gateway。

### 情况五：链上 content type 或 DOB 格式不一致

当前 CKB-UGMP 使用：

```text
application/json;dob=0
```

如果其他 DOB 使用不同 content type、不同 JSON schema，或者直接把图片二进制写入 Spore content，通用展示器需要额外适配。

因此，“有的 DOB 能看到图片，有的不行”可能同时包含两类问题：

- 存储层问题：资源 URI 不存在、CID 不可访问、没有 pin。
- 渲染层问题：展示器不支持该 metadata schema、MIME type 或 `ipfs://` 转换。

## 7. 建议的生态约定

为了让 CKB 生态内不同应用、钱包、浏览器更容易渲染 IPFS 资源类 DOB，建议形成一个最小约定：

```json
{
  "v": 0,
  "n": "display-name.png",
  "r": "ipfs://{cid}",
  "m": "image/png"
}
```

最小要求：

- `r` 必须是可解析的资源 URI。
- `ipfs://` 应作为长期链上引用，而不是只保存某个 gateway HTTP URL。
- `m` 应尽量填写，帮助渲染器选择展示方式。
- 如果使用 IPFS，应保证资源至少由一个 pin 服务持续保存。
- 展示器应支持把 `ipfs://{cid}` 转换为可配置 gateway。

这个约定的重点不是定义复杂标准，而是给 CKB 上的 DOB 资源引用提供一个轻量、低成本、可互操作的默认路径。
