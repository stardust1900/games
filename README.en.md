# Brain Power Station

A collection website of brain-teasing mini-games, featuring various classic and innovative puzzles, dedicated to providing a high-quality online gaming experience.

## 🎮 Supported Games

| Game | Description | Features |
|------|------|----------|
| **2048** | Classic number merging game | Colorful tiles, scoring system |
| **Klotski** | Classic sliding block puzzle | Move counter, solution demo |
| **Memory Match** | Memory training game | Multiple difficulty levels, emoji themes |
| **Minesweeper** | Classic Minesweeper | Three difficulty modes, timed challenge |
| **Multiplication Table** | Educational shooting game | Pixel style, pet system, Q&A battle |
| **Nonogram** | Logic puzzle game | Auto hints, progress saving |
| **Sliding Puzzle** | Number sliding puzzle | Auto solve, optimal path display |
| **Sudoku** | Classic Sudoku puzzle | Multiple difficulty levels, unique solution validation |
| **Wordle** | Vocabulary guessing game | Daily challenge, keyboard hints |
| **Xiangqi Endgame** | Chinese Chess endgame challenge | Ancient puzzles, move demo |

## ✨ Core Features

- **🎨 Beautiful UI**: One-click switching between Dark/Light themes
- **📱 Responsive Design**: Fully supports desktop and mobile devices
- **💾 Local Saves**: Game progress automatically saved
- **🔥 Continuous Challenge**: Daily check-in records streak
- **📤 Sharing**: One-click share scores to social platforms
- **🔊 Sound Feedback**: Game sound effects enhance immersion

## 🚀 Quick Start

### Environment Requirements

- Node.js 18+
- pnpm / npm / yarn

### Install Dependencies

```bash
pnpm install
```

### Start Development Server

```bash
pnpm dev
```

Visit `http://localhost:5173` to start playing.

### Build Production Version

```bash
pnpm build
```

Build artifacts are located in the `dist` directory and can be deployed to any static site.

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router (Integrated within framework)
- **State Management**: React Context + Hooks
- **Persistence**: localStorage

## 📁 Project Structure

```
src/
├── app/              # App entry and layout
├── components/       # Common components (GameShell, ShareButton, etc.)
├── games/            # Directory for each game implementation
│   ├── game2048/
│   ├── klotski/      # Klotski
│   ├── memory/       # Memory Match
│   ├── minesweeper/  # Minesweeper
│   ├── multiplication/ # Multiplication Table
│   ├── nonogram/     # Nonogram
│   ├── slidepuzzle/  # Sliding Puzzle
│   ├── sudoku/       # Sudoku
│   ├── wordle/       # Wordle
│   └── xiangqi/      # Xiangqi Endgame
├── lib/              # Utility functions
│   ├── dailySeed.ts  # Daily seed
│   ├── storage.ts    # Storage wrapper
│   └── streak.ts     # Streak records
└── pages/            # Page components
    └── Home.tsx      # Game home page
```

## 🤝 Contributing

Feel free to submit Issues or Pull Requests!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingGame`)
3. Commit changes (`git commit -m 'Add AmazingGame'`)
4. Push to the branch (`git push origin feature/AmazingGame`)
5. Create a Pull Request

## 📄 License

This project is open source under the MIT License.

## 📧 Contact

- Project URL: https://gitee.com/wangyidao/games
- Issue Feedback: Please submit on Gitee Issues

---

*Enjoy the game, stay sharp!* 🧠✨