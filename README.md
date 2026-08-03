

# 脑力小站 (Brain Power Station)

一个益智小游戏合集网站，包含多种经典和创新的 puzzles，致力于提供优质的在线游戏体验。

## 🎮 支持的游戏

| 游戏 | 说明 | 特色功能 |
|------|------|----------|
| **2048** | 经典数字合成游戏 | 彩色方块、计分系统 |
| **华容道** | 经典滑动块 puzzles | 步数统计、答案演示 |
| **记忆翻牌** | 记忆力训练游戏 | 多关卡难度、emoji 主题 |
| **扫雷** | 经典 Minesweeper | 三种难度、计时挑战 |
| **乘法表** | 教育类射击游戏 | 像素风格、宠物系统、答题对战 |
| **数织 (Nonogram)** | 逻辑拼图游戏 | 自动提示、进度保存 |
| **滑块拼图** | 数字推盘游戏 | 自动求解、最优路径显示 |
| **数独** | 经典数独 puzzle | 多难度级别、唯一解验证 |
| **猜词 (Wordle)** | 词汇猜谜游戏 | 每日挑战、键盘提示 |
| **象棋残局** | 中国象棋残局挑战 | 古谱残局、步法演示 |

## ✨ 核心特性

- **🎨 精美 UI**: 暗色/亮色主题一键切换
- **📱 响应式设计**: 完美支持桌面和移动设备
- **💾 本地存档**: 游戏进度自动保存
- **🔥 连续挑战**: 每日打卡记录 streak
- **📤 分享功能**: 一键分享成绩到社交平台
- **🔊 音效反馈**: 游戏音效增强沉浸感

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm / npm / yarn

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:5173` 即可开始游戏。

### 构建生产版本

```bash
pnpm build
```

构建产物位于 `dist` 目录，可部署到任意静态站点。

## 🛠️ 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **路由**: React Router (集成于框架)
- **状态管理**: React Context + Hooks
- **持久化**: localStorage

## 📁 项目结构

```
src/
├── app/              # 应用入口和布局
├── components/       # 公共组件 (GameShell, ShareButton 等)
├── games/            # 各游戏实现目录
│   ├── game2048/
│   ├── klotski/      # 华容道
│   ├── memory/       # 记忆翻牌
│   ├── minesweeper/  # 扫雷
│   ├── multiplication/ # 乘法表
│   ├── nonogram/     # 数织
│   ├── slidepuzzle/  # 滑块拼图
│   ├── sudoku/       # 数独
│   ├── wordle/       # 猜词
│   └── xiangqi/      # 象棋残局
├── lib/              # 工具函数
│   ├── dailySeed.ts  # 每日种子
│   ├── storage.ts    # 存储封装
│   └── streak.ts     # streak 记录
└── pages/            # 页面组件
    └── Home.tsx      # 游戏首页
```

## 🤝 参与贡献

欢迎提交 Issue 或 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingGame`)
3. 提交更改 (`git commit -m 'Add AmazingGame'`)
4. 推送到分支 (`git push origin feature/AmazingGame`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源。

## 📧 联系方式

- 项目地址: https://gitee.com/wangyidao/games
- 问题反馈: 请在 Gitee Issue 中提出

---

*祝您玩得开心，脑力常青！* 🧠✨