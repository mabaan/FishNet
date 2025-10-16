import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import faiss
import pickle
import Levenshtein

def query_domain(suspicious_domain):
    # Load FAISS (vectors only)
    index = faiss.read_index('faiss_data/domain_index.faiss')
    
    # Load context/mapping
    with open('faiss_data/model_data.pkl', 'rb') as f:
        model_data = pickle.load(f)
    
    # Transform query using saved vectorizer
    q = model_data['vectorizer'].transform([suspicious_domain]).astype(np.float32).toarray()
    faiss.normalize_L2(q)
    
    # Search
    scores, indices = index.search(q, k=3)
    
    # Map results back to domain names
    results = []
    for i, (idx, score) in enumerate(zip(indices[0], scores[0])):
        domain_name = model_data['legit_domains'][idx] 
        results.append((domain_name, float(score)))
    
    results.sort(key=lambda x: x[1], reverse=True)
    return results

def get_USI_candidates(suspicious_domain, top_k=3):
    print("Suspicious domain:", suspicious_domain, "\n")
    matches = query_domain(suspicious_domain)
    candidates = [domain for domain, _ in matches]
    return candidates[0:top_k]


def get_url_similarity_index(src, candidates=[]):
    scores = {}
    for candidate in candidates:
        src_lower = src.lower()
        cand_lower = candidate.lower()

        # Compute Levenshtein ratio (0–1 similarity)
        ratio = Levenshtein.ratio(src_lower, cand_lower)

        # Convert ratio to PhiUSIIL scale (0–100)
        # The paper divides total score into 50 base + 50 weighted portion
        USI = 50 + 50 * ratio
        scores[candidate] = round(USI, 3)

    return scores

def classify_usi(usi_scores):
    # Pick the best (highest) USI score
    best_domain, best_score = max(usi_scores.items(), key=lambda x: x[1])

    # Apply PhiUSIIL-style thresholds
    if best_score >= 98:
        verdict = "LEGITIMATE"
    elif best_score >= 90:
        verdict = "PHISHING"
    elif best_score >= 80:
        verdict = "LIKELY_PHISHING"
    elif best_score >= 60:
        verdict = "SEND_TO_MODEL"
    else:
        verdict = "LEGITIMATE"

    print(f"Best match: {best_domain}")
    print(f"Best USI: {best_score}")
    print(f"Verdict: {verdict}\n")

    # Optionally return them for further logic
    return {
        "best_domain": best_domain,
        "best_usi": best_score,
        "verdict": verdict
    }

# ---- MAIN ----
suspicious = "amazon.com"

candidates = get_USI_candidates(suspicious)
usi_scores = get_url_similarity_index(suspicious, candidates)
final_result = classify_usi(usi_scores)

