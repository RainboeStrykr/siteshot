<p align="center">
  <img src="app/public/media/transparent-icon.png" width="120" alt="Siteshot Logo" />
</p>

<h1 align="center">Siteshot</h1>

<p align="center">
  <strong>Capture. Refine. Share.</strong><br>
  Turn any screenshot into a presentation-ready visual in seconds.
</p>

<p align="center">
  <a href="https://siteshot.vercel.app"><b>Live Demo</b></a> •
  <a href="https://github.com/RainboeStrykr/siteshot#-features"><b>Features</b></a> •
  <a href="https://github.com/RainboeStrykr/siteshot#-getting-started"><b>Getting Started</b></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue.svg?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF.svg?style=flat-square&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38B2AC.svg?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License" />
</p>

---

## 📸 About Siteshot

Most screenshots aren’t meant to be shared; they’re messy, inconsistent, and hard to present. SiteShot fixes that.

Instead of just capturing screens, SiteShot lets you transform them into polished visuals in seconds. We started with a simple website screenshot tool. But the real problem wasn’t capturing screens; it was making them presentable. So we rebuilt everything around that.

Siteshot is a powerful web application designed to help developers, designers, and creators elevate their screenshots. Instead of sharing raw, boring screen captures, Siteshot lets you instantly add beautiful backgrounds, realistic drop shadows, rounded corners, and macOS-style window controls to your images.


## ✨ Features

- 🎨 **Beautiful Backgrounds**: Choose from solid colors, smooth gradients, or upload your own background image.
- 📐 **Granular Control**: Adjust padding, inset radius, image scaling, and alignment to get the perfect crop.
- 💡 **Dynamic Shadows & Glows**: Add highly configurable drop shadows and ambient glows that adapt to your image's colours.
- 📱 **Presentation Ready**: Instantly make any standard screenshot look like a professional mockup.
- ⚡ **Local & Fast**: No logins required. No cloud storage limits. Everything happens right in your browser.
- 🎬 **Cinematic Landing Page**: Features a stunning, GSAP-powered landing page with scroll animations and dynamic elements.

## 🛠 Tech Stack

The application has been unified into a sleek **Vite Monorepo** architecture:

- **Frontend Framework**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/)
- **Animations**: [GSAP](https://gsap.com/) & [Framer Motion](https://www.framer.com/motion/)
- **UI Components**: Radix UI / Shadcn UI primitives
- **Routing**: React Router DOM

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RainboeStrykr/siteshot.git
   cd siteshot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3002` to see the landing page, or go straight to the editor at `http://localhost:3002/editor`.

## 📁 Project Structure

```text
siteshot/
├── app/
│   ├── public/        # Static assets (images, videos, fonts)
│   ├── src/
│   │   ├── landing/   # Landing page components & sections
│   │   └── ...        # Core screenshot editor components
│   ├── vite.config.js # Vite build configuration
│   └── package.json   # Frontend dependencies
├── api/               # Vercel Serverless Functions
└── package.json       # Root scripts
```

## 🤝 Contributing

Contributions are always welcome! If you have ideas for new features, backgrounds, or improvements, feel free to open an issue or submit a pull request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<p align="center">
  <i>Made with ❤️ by Abhiraj</i>
</p>
