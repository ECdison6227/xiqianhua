# 部署说明

游戏入口以 `/xiqianhua/` 为基础路径。静态文件是 `npm run build` 生成的 `dist/`；人物问答使用 Node 服务，默认监听 `127.0.0.1:3911`。Nginx 将 `/xiqianhua/api/` 转发到服务，其余请求交给静态目录。

服务器使用单独的 `xiqianhua` 服务用户和 systemd 服务。配置文件仅服务器可读；不应上传 `.env.local`、`.runtime/` 或服务会话记录到公开目录。当前服务器的服务名是 `xiqianhua`，静态目录为 `/var/www/xiqianhua/`，服务目录为 `/opt/xiqianhua/`。

部署后检查首页、`/xiqianhua/api/health`、静态图像、存档恢复及一次完整问答。不要把只返回健康状态视为模型生成验证。

修改基础路径时，同时修改 `vite.config.ts` 的 `base`、服务端前缀处理和代理路径。迁移到另一域名时，需要更新 `server/app.ts` 的允许主机名。
