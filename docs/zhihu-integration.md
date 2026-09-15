# 知乎 Hackathon 接入记录

- 应用 ID：741。
- 回调地址：https://edsionc.top/xiqianhua/auth/callback （登记值与请求值必须完全一致）。
- 游戏：https://edsionc.top/xiqianhua/
- 介绍视频：https://edsionc.top/xiqianhuav
- 官方 Skill：https://zhstatic.zhihu.com/skill/zhihu-hackathon-skill_v2026s2.zip
- 下载包 SHA-256：d7517cad343fe5eb6bd911c4fa3edc7b21dd665d43caad4e73438c1ef849f112
- 官方 CLI Skill 内包 SHA-256：be08e10bbd8f7c554456599e1bdf9e4a4f9216a7624d0b29218e9e4dc1c2f9f3

## 已完成

官方 Skill 已安装；用官方初始化器建立独立示例，在原游戏中接入相同协议。App Key 存在本机钥匙串及服务器私有环境，不进入源码、浏览器或交付包。游戏「关于」提供连接入口。回调支持 authorization_code 和 code，处理后移除地址栏授权参数。

服务器保存短期内存会话，Cookie 为 HttpOnly、Secure、SameSite=Lax。授权到期、断开连接或服务重启后清除本次登录。POST 接口拒绝异站来源。Nginx 对回调路径关闭访问日志。五项用户接口每项最多请求一条，前端只显示状态与条数。鉴权失败后停止其余请求，不退回开发者身份。

## 仍待真实验证

Access Secret 已通过官方 CLI 保存到本机钥匙串，并加入服务器私有环境 ZHIHU_ACCESS_SECRET。官方 auth status --verify 通过，me contents --type all --limit 1 成功读取一条记录，仅记录成功与数量，不保存用户内容。用户已完成真实授权并反馈：创作成功、关注成功、收藏夹列表暂未通过、近期收藏无记录。

旧版把收藏夹列表失败后的依赖查询误标为“无记录”，这一结果不能作为收藏夹内容为空的证据。已改为“未执行”，仅在收藏夹列表明确返回空数组时才显示无记录；无效响应继续报告错误，不转换为空数据。各项失败返回固定原因与安全的错误编号，不输出上游原文。运行日志仅记录状态、数量和错误类别，不记录用户内容、身份、Cookie 或令牌。收藏夹列表失败的实际原因仍需重新核验，不能把独立 CLI 的成功当作 OAuth 接口通过。

官方现阶段可能不回传 state。当前 allowMissingState=true 仅沿用官方临时联调模式；仍要求同一浏览器的未过期授权 Cookie，回传 state 时必须匹配，未回传则显示提示。正式上线前应按平台能力补齐完整回调校验。设为 false 可关闭缺失 state 的兼容。

## 旧回调登记兼容

推荐修改平台登记为专用回调。如果尚登记 https://edsionc.top/xiqianhua，可临时从 https://edsionc.top/xiqianhua/api/oauth/start?legacy=1 发起。授权和换取令牌时均使用相同的旧地址；直接打开游戏首页不等于完成授权。两种方式都需要 Access Secret，且必须由用户确认。

## 核验范围

30 项游戏与接口检查通过，其中 11 项覆盖登录与凭据：状态匹配、重复回调、Cookie 更新、旧回调、五项 API 边界、到期与重启、鉴权失败终止，以及失败依赖不误报为空、无效响应、错误信息脱敏和官方 CLI 钥匙串编码。自动检查使用模拟响应。独立官方示例 2 项测试及语法检查通过。凭据在线验证与最小本人内容请求通过；真实接口结果按用户反馈记录，收藏夹相关核验仍未全部通过。
