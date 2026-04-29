# Sona İşitme — Hearing Aid Shop Tycoon

A professional 2D tycoon game where you manage a specialized hearing aid clinic. Diagnose customers, recommend the right hearing solutions, and grow your business.

![Game Banner](https://via.placeholder.com/800x400?text=Sona+İşitme+Shop+Tycoon)

## 🎮 Overview

**Sona İşitme** (Hearing Aid Shop Tycoon) is a specialized management simulation built with TypeScript and Bun. Players step into the shoes of an audiologist and business owner, handling everything from patient consultation to advanced hearing aid fitting and shop customization.

## ✨ Features

- **Multi-Step Consultation System**:
  - **Phase 1: Audiogram Test**: Perform interactive hearing tests across various frequencies (250Hz to 8kHz) to map the patient's hearing loss.
  - **Phase 2: Recommendation**: Analyze the audiogram and recommend the perfect device based on loss level (Mild, Moderate, Severe, Profound, or Conductive).
- **Interactive Shop Environment**: 
  - Manage a waiting list of customers.
  - Interact with shop elements like plants (water, move, or remove them).
  - Control your "Doctor" avatar to follow or lead customers.
- **Product Variety**: Multiple hearing aid types including:
  - **BTE** (Behind-the-Ear)
  - **ITE** (In-the-Ear)
  - **RIC** (Receiver-in-Canal)
  - **CIC** (Completely-in-Canal)
  - **BCH** (Bone Conduction)
  - **SMART** (Premium AI-powered devices)
- **Business Management**: Track daily earnings, customer satisfaction, and unlock new technologies.
- **Persistence**: Save system powered by Dexie.js (IndexedDB).
- **Responsive Design**: Modern glassmorphic UI with landscape-optimized layouts and orientation warnings.

## 🛠 Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Rendering**: HTML5 Canvas API
- **Database**: [Dexie.js](https://dexie.org/)
- **Styling**: Vanilla CSS (Flexbox/Grid, Glassmorphism)
- **Fonts**: Outfit & Space Grotesk (Google Fonts)

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/merttopal7/2d-game.git
   cd 2d-game
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

### Running the Game

Start the development server:
```bash
bun dev
```

### Building for Production

```bash
bun run build
```

## 🕹 How to Play

1. **Reception**: Click on customers to start a consultation.
2. **Diagnosis**: Play tones and mark what the customer hears to generate an audiogram.
3. **Selection**: Choose the device that best matches the audiogram results.
4. **Efficiency**: Use the "Doctor Follow" and "Customer Follow" actions to move people efficiently.
5. **Shop Care**: Don't forget to water the plants!

## 📄 License

MIT License.

---

*Developed with ❤️ by the Sona İşitme Team.*
