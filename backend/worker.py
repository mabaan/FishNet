# worker.py
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import faiss
import pickle
from urllib.parse import urlparse
import Levenshtein


def extract_domain(url_or_domain):
    # If it doesn't have a scheme, add one temporarily for parsing
    if not url_or_domain.startswith(('http://', 'https://')):
        url_or_domain = 'http://' + url_or_domain
    
    try:
        parsed = urlparse(url_or_domain)
        domain = parsed.hostname if parsed.hostname else parsed.netloc
        return domain if domain else url_or_domain
    except:
        # Fallback: return as-is if parsing fails
        return url_or_domain.replace('http://', '').replace('https://', '').split('/')[0]


def query_domain(suspicious_domain):
    suspicious_domain = extract_domain(suspicious_domain)

    # Load FAISS index
    index = faiss.read_index('../faiss_data/domain_index.faiss')

    # Load domain list + vectorizer
    with open('../faiss_data/model_data.pkl', 'rb') as f:
        model_data = pickle.load(f)

    # Vectorize query
    q = model_data['vectorizer'].transform([suspicious_domain]).astype(np.float32).toarray()
    faiss.normalize_L2(q)

    # FAISS search
    scores, indices = index.search(q, k=3)

    results = []
    for i, (idx, score) in enumerate(zip(indices[0], scores[0])):
        domain_name = model_data['legit_domains'][idx]
        results.append((domain_name, float(score)))

    results.sort(key=lambda x: x[1], reverse=True)
    return results


def get_USI_candidates(suspicious_domain, top_k=3):
    suspicious_domain = extract_domain(suspicious_domain)
    matches = query_domain(suspicious_domain)

    # Use Levenshtein filtering
    filtered = []
    for domain, _ in matches:
        ratio = Levenshtein.ratio(suspicious_domain, domain)
        if ratio >= 0.60:  # Tune if needed
            filtered.append(domain)

    # Fallback if filter removed all
    if not filtered:
        filtered = [d for d, _ in matches]

    return filtered[:top_k]


def calculate_weighted_usi(src_domain, target_domain):
    src = src_domain.lower().replace('www.', '')
    target = target_domain.lower().replace('www.', '')

    max_length = max(len(src), len(target))
    base_similarity_per_char = 50.0 / max_length if max_length > 0 else 0

    weighted_similarity_pool = 50.0
    total_possible_weight = 0

    # Positional weights
    position_weights = []
    for i in range(max_length):
        weight = 1.0 / (1 + 0.1 * i)
        position_weights.append(weight)
        total_possible_weight += weight

    # Normalize position weights
    if total_possible_weight > 0:
        position_weights = [
            w * weighted_similarity_pool / total_possible_weight
            for w in position_weights
        ]

    # Character-by-character matching
    i = 0
    total_similarity = 0
    src_chars = list(src)
    target_chars = list(target)

    while i < len(src_chars) and i < len(target_chars):
        if src_chars[i] == target_chars[i]:
            total_similarity += position_weights[i] if i < len(position_weights) else 0
            i += 1
        else:
            # Remove mismatch based on longer string
            if len(src_chars) > len(target_chars):
                del src_chars[i]
            elif len(target_chars) > len(src_chars):
                del target_chars[i]
            else:
                i += 1

    base_score = base_similarity_per_char * max_length
    usi_score = base_score + total_similarity

    return round(max(0, min(100, usi_score)), 3)


def get_url_similarity_index(src, candidates=[]):
    src_domain = extract_domain(src)
    scores = {}

    for candidate in candidates:
        usi_score = calculate_weighted_usi(src_domain, candidate)
        scores[candidate] = usi_score

    return scores


def classify_usi(usi_scores):
    best_domain, best_score = max(usi_scores.items(), key=lambda x: x[1])

    # Exact match (100%) or very close match (99-98%)
    if best_score >= 98:
        verdict = "LEGITIMATE"
        reason = "Exact match to verified domain"
    # High similarity but not exact - could be regional variant OR typosquatting
    # Score 96-97.9 is risky zone - needs careful threshold
    elif best_score >= 97:
        verdict = "LEGITIMATE"
        reason = "Legitimate regional variant"
    # 90-96.9: High similarity but likely typosquatting (single char changes)
    elif best_score >= 90:
        verdict = "PHISHING"
        reason = f"Suspicious similarity to {best_domain} - likely typosquatting or impersonation"
    # 70-89.9: Clear phishing attempts (hyphens, extra words)
    elif best_score >= 70:
        verdict = "PHISHING"
        reason = f"Suspicious similarity to {best_domain} - likely impersonation attempt"
    # 55-69.9: Moderate similarity - possible attack
    elif best_score >= 55:
        verdict = "LIKELY_PHISHING"
        reason = f"Moderate similarity to {best_domain} - possible typosquatting"
    # <55: Low similarity - send to ML model for feature-based analysis
    else:
        verdict = "SEND_TO_MODEL"
        reason = "Requires advanced analysis"

    print(f"Best match: {best_domain}")
    print(f"Best USI: {best_score}")
    print(f"Verdict: {verdict}\n")

    return {
        "best_domain": best_domain,
        "best_usi": best_score,
        "verdict": verdict,
        "reason": reason
    }


# ---- MAIN ----
if __name__ == "__main__":
    suspicious = "paypal.com"

    print("\n" + "="*50)
    candidates = get_USI_candidates(suspicious)
    usi_scores = get_url_similarity_index(suspicious, candidates)
    final_result = classify_usi(usi_scores)
