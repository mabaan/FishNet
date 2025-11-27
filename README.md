<h1 align="center">
FishNet: Phishing Detection Using Browser Extensions
</h1>
<div align="center">
<img src="https://github.com/user-attachments/assets/b9ae163c-8094-46a4-b2ba-1ca184ceb2eb" width=250>
</div>

## Overview

FishNet is a lightweight Chrome browser extension that detects phishing websites in real time using a two-stage detection system: URL Suspicion Index (USI) algorithm with FAISS-based domain similarity matching, backed by a machine learning classifier for suspicious URLs. The extension automatically checks pages on load and displays simple binary verdicts (Safe/Phishing) to users with detailed analysis available on demand.

The system includes a Flask backend for USI calculation and ML inference, plus a user feedback mechanism to report misclassifications for future model improvements.

---

## Objectives

1. Build a functional Chrome extension using Manifest V3 with automatic phishing detection.
2. Implement USI algorithm using FAISS vector database for fast domain similarity checks.
3. Deploy ANN model with high accuracy for suspicious URL classification.
4. Provide simple, user-friendly interface with binary Safe/Phishing verdicts.
5. Enable user feedback reporting for continuous model improvement.

---

## Technology Stack

**Frontend (Extension)**

* Vanilla JavaScript (Chrome Manifest V3)
* HTML/CSS for popup UI
* Chrome Extension APIs (background service worker, content scripts)

**Backend (Local API)**

* Flask (Python) running on localhost:5000
* scikit-learn (Logistic Regression model)
* FAISS (Facebook AI Similarity Search) for domain vector database
* Joblib for model serialization

**Machine Learning**

* Jupyter Notebook for model training and evaluation
* PhiUSIIL Phishing URL Dataset (2024)
* Logistic Regression classifier (99.66% accuracy)
* StandardScaler for feature normalization
* 19 extracted features including URL structure, domain characteristics, and page content analysis

**Detection System**

* USI Algorithm: Weighted character-by-character domain similarity scoring
* FAISS Index: 1M legitimate domains for typosquatting detection
* Threshold-based classification

---

## System Architecture

### **Detection Flow**

1. User navigates to a URL
2. Extension service worker (`background.js`) captures the URL
3. Backend calculates USI score using FAISS domain similarity
4. Decision based on threshold:
5. Extension displays binary Safe/Phishing verdict to user
6. User can view detailed analysis and report misclassifications

### **Extension Components**

* `background.js`: Service worker that monitors page loads, sends URLs to backend, receives classification results, and manages popup display. Only triggers popup for non-legitimate sites.
* `content.js`: Extracts 19 features from web pages including URL structure (length, domain, TLD, subdomains, special characters), security indicators (HTTPS), and page content analysis (title, favicon, forms, Bank/Pay/Crypto keywords).
* `popup.html` / `popup.js`: Minimal UI showing Safe/Phishing verdict, URL being analyzed, collapsible details panel with risk score and matched domain, and report button for user feedback.
* `manifest.json`: Chrome Manifest V3 configuration with permissions for activeTab, storage, and localhost:5000 API access.

### **Backend Components**

* `flask_server.py`: Flask REST API with three endpoints:
  - `/check_usi`: Calculate USI score and return classification
  - `/classify`: ML model inference for suspicious URLs
  - `/report`: Save user feedback to JSON for retraining
* `worker.py`: USI algorithm implementation using FAISS vector search with weighted character-by-character similarity scoring and position-based decay.
* `evaluate_model.py`: Model evaluation showing confusion matrix, classification report, 99.66% accuracy, 99.49% precision, 99.93% recall.
* `evaluate_usi.py`: USI algorithm testing against known phishing/legitimate patterns, measuring typosquatting detection accuracy.

### **Machine Learning**

* `model.ipynb`: Training pipeline using PhiUSIIL dataset with StandardScaler normalization and Logistic Regression classifier.
* 19 features extracted: URLLength, DomainLength, IsDomainIP, TLDLength, NoOfSubDomain, NoOfLettersInURL, NoOfDegitsInURL, NoOfEqualsInURL, NoOfQMarkInURL, NoOfAmpersandInURL, IsHTTPS, HasTitle, HasFavicon, HasSubmitButton, HasHiddenFields, HasPasswordField, Bank, Pay, Crypto.
* Model achieves 99.66% accuracy with strong performance on both phishing and legitimate URLs.

---

## Getting Started

### Prerequisites

* Python 3.10 or later
* Chrome browser
* Git (for cloning repository)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/mabaan/FishNet.git
   cd FishNet
   ```

2. **Set up Python virtual environment**

   ```bash
   python -m venv .venv
   source .venv/Scripts/activate  # Windows
   # source .venv/bin/activate    # Linux/Mac
   ```

3. **Install backend dependencies**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Start Flask server**

   ```bash
   python flask_server.py
   ```
   
   Server will run on `http://localhost:5000`

5. **Load extension in Chrome**

   * Open Chrome and navigate to `chrome://extensions/`
   * Enable **Developer Mode** (top right toggle)
   * Click **Load unpacked**
   * Select the `extension/` folder from the repository
   * Extension icon should appear in toolbar

### Usage

1. Ensure Flask backend is running on localhost:5000
2. Navigate to any website in Chrome
3. Extension automatically checks the URL in background
4. If suspicious, popup opens showing Safe/Phishing verdict
5. Click extension icon anytime to see current page analysis
6. Use "Report Incorrect Classification" button to provide feedback

### Evaluation

**Test ML Model Performance:**
```bash
cd backend
python evaluate_model.py
```

**Test USI Algorithm:**
```bash
cd backend
python evaluate_usi.py
```

---

## Features

* **Two-Stage Detection**: Fast USI algorithm filters most URLs, ML model handles edge cases
* **Real-Time Checking**: Automatic background monitoring of page loads
* **User-Friendly Interface**: Simple Safe/Phishing binary verdicts without technical jargon
* **Detailed Analysis**: Collapsible panel shows risk score and matched domain for interested users
* **User Feedback**: Report button saves misclassifications for model retraining
* **High Accuracy**: 99.66% ML model accuracy with comprehensive feature extraction
* **Local Backend**: Runs on localhost for privacy and low latency
* **Comprehensive Keywords**: 28 bank terms, 29 payment terms, 38 crypto terms for content analysis

---

## Performance Metrics

**ML Model (Logistic Regression):**
- Accuracy: 99.66%
- Precision: 99.49%
- Recall: 99.93%
- F1 Score: 99.71%

**Confusion Matrix:**
- True Negatives: 19,985
- False Positives: 139
- False Negatives: 20
- True Positives: 27,015

**USI Algorithm:**
- 65.22% accuracy on typosquatting test cases
- Fast FAISS-based similarity search
- Effective at catching obvious domain spoofing

---

## Future Improvements

* Deploy backend to cloud for broader accessibility
* Use a language model to create more detailed and situation specific texts
* Expand FAISS database with more recent domains
* Implement active learning pipeline using reported misclassifications
* Add multilingual support for international phishing detection
* A/B test different UI designs for user trust and compliance

---

## License

This project is licensed under the MIT License.

---
