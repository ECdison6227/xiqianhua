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

尚缺 Access Secret，它与 OAuth App Key 不同。应在 https://developer.zhihu.com/profile 生成，按官方 CLI 流程保存，并加入服务器私有环境 ZHIHU_ACCESS_SECRET。之后由用户亲自点击知乎授权页最终确认，再核验五项接口。不能将模拟检查记作真实授权成功。

官方现阶段可能不回传 state。当前 allowMissingState=true 仅沿用官方临时联调模式；仍要求同一浏览器的未过期授权 Cookie，回传 state 时必须匹配，未回传则显示提示。正式上线前应按平台能力补齐完整回调校验。设为 false 可关闭缺失 state 的兼容。

## 旧回调登记兼容

推荐修改平台登记为专用回调。如果尚登记 https://edsionc.top/xiqianhua，可临时从 https://edsionc.top/xiqianhua/api/oauth/start?legacy=1 发起。授权和换取令牌时均使用相同的旧地址；直接打开游戏首页不等于完成授权。两种方式都需要 Access Secret，且必须由用户确认。

## 核验范围

26 项游戏与接口检查通过，其中 7 项覆盖 OAuth 凭据缺失、状态匹配、重复回调、Cookie 更新、旧回调、五项 API 边界、到期与重启、鉴权失败终止。检查使用模拟响应。独立官方示例 2 项测试及语法检查通过，官方 doctor 的 readyForOAuth 为 false（缺 Access Secret）。
