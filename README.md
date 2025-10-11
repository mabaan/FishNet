# FishNet: Phishing Detection Using Browser Extensions

## Overview

FishNet is a lightweight browser extension designed to detect phishing websites in real time through a combination of heuristic rules, domain intelligence, and machine learning inference. The system integrates local detection with a secure cloud backend to identify suspicious pages, display clear warnings, and collect anonymized reports to improve detection quality.

The project also includes a human-centered usability study that evaluates user trust, clarity, and compliance with phishing warnings.

---

## Objectives

1. Develop a functional browser extension using Manifest V3 and TypeScript.
2. Implement cloud-based model inference for accurate phishing detection.
3. Follow OWASP extension security guidelines.
4. Evaluate user perception and behavior through a small-scale usability study.

---

## Technology Stack

**Frontend (Extension)**

* TypeScript
* React + Vite (for popup UI and build)
* Tailwind CSS (styling)
* Chrome Extension APIs (Manifest V3)

**Backend (Cloud API)**

* Flask (Python) or FastAPI for inference
* scikit-learn or TensorFlow for model development
* Google Cloud Run for hosting the API

**Machine Learning**

* Jupyter Notebook for model training and evaluation
* UCI Phishing Websites Dataset and PhiUSIIL Phishing URL Dataset (2024)

**Security and Testing**

* OWASP ZAP for vulnerability scanning
* Chrome Developer Tools and Lighthouse for debugging and performance testing

---

## Directory Structure

```plaintext
fishnet/
├── extension/
│   ├── src/
│   │   ├── background.ts
│   │   ├── content.ts
│   │   ├── popup/
│   │   │   ├── Popup.tsx
│   │   │   ├── Popup.css
│   │   │   └── index.tsx
│   │   ├── utils/
│   │   │   ├── heuristics.ts
│   │   │   ├── blacklist.ts
│   │   │   └── whois.ts
│   ├── public/
│   │   ├── icons/
│   │   │   ├── icon16.png
│   │   │   ├── icon48.png
│   │   │   └── icon128.png
│   │   └── manifest.json
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── models/
│   │   └── phishing_model.pkl
│   └── utils/
│       ├── preprocess.py
│       └── inference.py
│
├── ml/
│   ├── train_model.ipynb
│   └── phishing_dataset.csv
│
├── docs/
│   ├── proposal.pdf
│   ├── evaluation_plan.md
│   └── README.md
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## Directory Explanation

### **extension/**

Contains all files related to the Chrome browser extension.

* **src/**: Core logic and source code for the extension.

  * `background.ts`: Main service worker controlling extension events and message handling.
  * `content.ts`: Injected script for scanning page content and extracting features.
  * **popup/**: React-based popup interface displayed when the user interacts with the extension.

    * `Popup.tsx`: Main React component for the popup UI.
    * `Popup.css`: Styling for the popup interface.
    * `index.tsx`: Entry point that mounts the popup component.
  * **utils/**: Helper modules.

    * `heuristics.ts`: Implements local rule-based phishing checks.
    * `blacklist.ts`: Interfaces with cached blacklists and APIs like PhishTank.
    * `whois.ts`: Fetches domain intelligence and WHOIS-based signals.
* **public/**: Static assets such as icons and the manifest file.

  * `manifest.json`: Chrome Manifest V3 configuration file.
  * **icons/**: Icon set for the extension.
* `package.json`: Dependency definitions for the extension build.
* `tsconfig.json`: TypeScript compiler configuration.
* `vite.config.ts`: Build configuration using Vite and CRXJS plugin.

### **backend/**

Contains the server-side code used for model inference and API hosting.

* `app.py`: Flask or FastAPI entry point exposing endpoints for phishing prediction.
* `requirements.txt`: Python dependencies for backend and model inference.
* **models/**: Pre-trained machine learning models.

  * `phishing_model.pkl`: Serialized phishing detection model.
* **utils/**: Support scripts.

  * `preprocess.py`: Feature preprocessing and normalization.
  * `inference.py`: Model loading and prediction logic.

### **ml/**

Includes datasets and notebooks for machine learning training and testing.

* `train_model.ipynb`: Jupyter notebook for model experimentation and training.
* `phishing_dataset.csv`: Combined dataset used for model training.

### **docs/**

Contains project documentation and reports.

* `proposal.pdf`: Original project proposal submission.
* `evaluation_plan.md`: Human-centered study and technical evaluation details.
* `README.md`: Documentation for reports and academic deliverables.

### **Root Files**

* `.gitignore`: Specifies files to exclude from version control.
* `LICENSE`: License file for open-source or internal distribution.
* `README.md`: Primary documentation explaining the repository and structure.

---

## Getting Started

### Prerequisites

* Node.js v18 or later
* Python 3.10 or later
* Google Cloud SDK (for deployment)

### Setup

1. **Install frontend dependencies**

   ```bash
   cd extension
   npm install
   npm run dev
   ```

2. **Set up backend**

   ```bash
   cd ../backend
   pip install -r requirements.txt
   python app.py
   ```

3. **Load extension in Chrome**

   * Open Chrome and navigate to `chrome://extensions/`.
   * Enable **Developer Mode**.
   * Click **Load unpacked** and select the `extension/dist/` folder after building.

---

## Security Practices

* Follow OWASP recommendations for browser extensions.
* Avoid inline scripts and remote code execution.
* Use strict Content Security Policy (CSP).
* Do not store secrets or API keys client-side.
* All API communication must use HTTPS.

---

## License

This project is licensed under the MIT License unless otherwise stated.

---
