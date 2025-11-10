import numpy as np
from collections import defaultdict
from typing import List, Tuple, Dict, Any
import time

# RNG is initialized without a fixed seed to ensure dynamic recommendations
RNG = np.random.default_rng()

# --- CONSTANTS ---
SUBJECTS = np.array(['math', 'english', 'science', 'history', 'programming', 'art'])
LEVELS = np.array(['primary', 'middle', 'high', 'college'])
CITIES = np.array(['NYC', 'LA', 'SF', 'CHI', 'SEA'])
LEARNING_STYLES = np.array(['visual', 'auditory', 'kinesthetic', 'reading'])
TEACHING_STYLES = LEARNING_STYLES.copy()
INTERACTION_TYPES = np.array(['view', 'contact', 'book'])

DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
SLOTS = ['AM','PM']
NUM_TIME_SLOTS = len(DAYS) * len(SLOTS)

# Vocabulary for TF-IDF simulation
VOCAB = ['patient', 'fun', 'structured', 'creative', 'deep', 'quick', 'results', 'flexible', 'expert', 'certified']


# --- DATA GENERATION FUNCTIONS ---

def random_timeslot_mask(avg_slots: int) -> int:
    """Generates a random bitmask for availability slots."""
    k = max(1, int(RNG.poisson(lam=avg_slots)))
    idxs = RNG.choice(NUM_TIME_SLOTS, size=min(NUM_TIME_SLOTS, k), replace=False)
    mask = 0
    for i in idxs:
        mask |= (1 << i)
    return mask


def gen_students(n: int) -> List[Dict[str, Any]]:
    """Generates synthetic student data including max_budget and profile_text."""
    students = []
    for i in range(n):
        s = {
            'student_id': f's{i}',
            'preferred_subject': RNG.choice(SUBJECTS),
            'preferred_level': RNG.choice(LEVELS),
            'location': RNG.choice(CITIES),
            'availability': random_timeslot_mask(avg_slots=4),
            'learning_style': RNG.choice(LEARNING_STYLES),
            'max_budget': RNG.choice([20, 30, 40, 50, 60]),
            'profile_text': " ".join(RNG.choice(VOCAB, size=RNG.integers(2, 5), replace=False)) # NEW TEXT FEATURE
        }
        students.append(s)
    return students


def gen_tutors(n: int) -> List[Dict[str, Any]]:
    """Generates synthetic tutor data including hourly_rate and profile_text."""
    tutors = []
    for i in range(n):
        t = {
            'tutor_id': f't{i}',
            'subject_specialization': RNG.choice(SUBJECTS),
            'teaching_level': RNG.choice(LEVELS),
            'tutor_location': RNG.choice(CITIES),
            'available_slots': random_timeslot_mask(avg_slots=5),
            'teaching_style': RNG.choice(TEACHING_STYLES),
            'hourly_rate': RNG.choice([25, 35, 45, 55, 65]),
            'profile_text': " ".join(RNG.choice(VOCAB, size=RNG.integers(3, 6), replace=False)) # NEW TEXT FEATURE
        }
        tutors.append(t)
    return tutors


def compute_tfidf_similarity(doc1: str, doc2: str) -> float:
    """
    Simulated TF-IDF vectorizer and Cosine Similarity calculation (no external libraries).
    Since we don't have the corpus IDF, this is a simplified Bag-of-Words similarity.
    """
    words1 = set(doc1.lower().split())
    words2 = set(doc2.lower().split())
    
    # Simple Jaccard similarity as a proxy for Cosine Similarity on sparse vectors
    intersection = len(words1.intersection(words2))
    union = len(words1.union(words2))
    
    # Return a score between 0.0 and 1.0
    return intersection / union if union > 0 else 0.0


# --- FEATURE COMPUTATION AND INTERACTION LOGIC ---

def time_overlap_mask(a_mask: int, b_mask: int) -> int:
    """Checks for time overlap between two availability masks."""
    return 1 if (a_mask & b_mask) != 0 else 0


def style_similarity(learn: str, teach: str) -> float:
    """Computes style similarity (simple binary match)."""
    return 1.0 if learn == teach else 0.0


def build_id_maps(students: List[Dict[str, Any]], tutors: List[Dict[str, Any]]):
    """Creates mappings between IDs and matrix indices."""
    sid_to_idx = {s['student_id']: i for i, s in enumerate(students)}
    tid_to_idx = {t['tutor_id']: i for i, t in enumerate(tutors)}
    idx_to_sid = {i: s['student_id'] for i, s in enumerate(students)}
    idx_to_tid = {i: t['tutor_id'] for i, t in enumerate(tutors)}
    return sid_to_idx, tid_to_idx, idx_to_sid, idx_to_tid


def compute_pair_features(students: List[Dict[str, Any]],
                          tutors: List[Dict[str, Any]],
                          pair_s_idx: np.ndarray,
                          pair_t_idx: np.ndarray) -> np.ndarray:
    """
    Computes an 11-feature vector for student-tutor pairs (includes TF-IDF score).
    Feature order: [subject(0), level(1), city(2), time(3), style(4), budget(5),
                    subject_enc(6), level_enc(7), city_enc(8), style_enc(9), TFIDF_SIMILARITY(10)]
    """
    n_pairs = len(pair_s_idx)
    
    # Create encodings for categorical features
    subject_map = {s: i for i, s in enumerate(SUBJECTS)}
    level_map = {l: i for i, l in enumerate(LEVELS)}
    city_map = {c: i for i, c in enumerate(CITIES)}
    style_map = {st: i for i, st in enumerate(LEARNING_STYLES)}
    
    X = np.zeros((n_pairs, 11), dtype=float) # INCREASED FROM 10 TO 11 FEATURES
    
    for i, (si, ti) in enumerate(zip(pair_s_idx, pair_t_idx)):
        s = students[int(si)]
        t = tutors[int(ti)]
        
        # Binary matches (Indices 0-5)
        X[i, 0] = 1.0 if s['preferred_subject'] == t['subject_specialization'] else 0.0
        X[i, 1] = 1.0 if s['preferred_level'] == t['teaching_level'] else 0.0
        X[i, 2] = 1.0 if s['location'] == t['tutor_location'] else 0.0
        X[i, 3] = float(time_overlap_mask(s['availability'], t['available_slots']))
        X[i, 4] = style_similarity(s['learning_style'], t['teaching_style'])
        X[i, 5] = 1.0 if s['max_budget'] >= t['hourly_rate'] else 0.0

        # Encoded categorical features (Indices 6-9)
        X[i, 6] = subject_map.get(s['preferred_subject'], 0) / len(SUBJECTS)
        X[i, 7] = level_map.get(s['preferred_level'], 0) / len(LEVELS)
        X[i, 8] = city_map.get(s['location'], 0) / len(CITIES)
        X[i, 9] = style_map.get(s['learning_style'], 0) / len(LEARNING_STYLES)
        
        # SNEAKY NEW TF-IDF SIMILARITY FEATURE (Index 10)
        X[i, 10] = compute_tfidf_similarity(s['profile_text'], t['profile_text'])
    
    return X


def generate_interactions(students: List[Dict[str, Any]],
                          tutors: List[Dict[str, Any]],
                          sid_to_idx: Dict[str,int],
                          tid_to_idx: Dict[str,int]) -> List[Dict[str, Any]]:
    """
    Generates synthetic interactions using prioritized feature weights.
    Weights are extended to 11 features.
    Priority: Subject (5.0) > Location (3.5) > Budget (3.0) > Style (2.5) > TFIDF (0.05)
    """
    interactions = []
    nS, nT = len(students), len(tutors)

    # Prioritized Weights: [Subject(0), Level(1), Location(2), Time(3), Style(4), Budget(5), Encoded(6-9), TFIDF(10)]
    # TFIDF is "sneaky" with a low weight of 0.05
    weights = np.array([5.0, 1.5, 3.5, 1.0, 2.5, 3.0, 0.1, 0.1, 0.1, 0.1, 0.05]) # 11 ELEMENTS

    for si in range(nS):
        pair_s = np.full(nT, si, dtype=int)
        pair_t = np.arange(nT, dtype=int)
        X = compute_pair_features(students, tutors, pair_s, pair_t)
        
        scores = X @ weights + RNG.normal(0, 1.5, size=nT)

        num_pos = int(np.clip(RNG.poisson(lam=3), 1, 8))
        
        top_idx = np.argsort(-scores)[:num_pos]
        for ti in top_idx:
            prob = 1 / (1 + np.exp(-scores[ti]))
            if prob > 0.75:
                itype = 'book'
            elif prob > 0.45:
                itype = 'contact'
            else:
                itype = 'view'
            interactions.append({
                'student_id': students[si]['student_id'],
                'tutor_id': tutors[int(ti)]['tutor_id'],
                'interaction_type': itype,
            })
    return interactions


# --- MACHINE LEARNING COMPONENTS

class LogisticRegressionFromScratch:
    """Simple Logistic Regression implementation using NumPy for Content-Based scoring."""
    def __init__(self, lr=0.1, iterations=2000, l2=0.01):
        self.lr = lr
        self.iterations = iterations
        self.l2 = l2
        self.weights = None
        self.bias = 0.0

    @staticmethod
    def sigmoid(z):
        z = np.clip(z, -500, 500)
        return 1.0 / (1.0 + np.exp(-z))

    def fit(self, X: np.ndarray, y: np.ndarray):
        # NOTE: This automatically handles the 11-feature input vector
        n, d = X.shape
        self.weights = np.zeros(d)
        self.bias = 0.0
        for _ in range(self.iterations):
            linear = X @ self.weights + self.bias
            y_pred = self.sigmoid(linear)
            error = y_pred - y
            dw = (X.T @ error) / n + self.l2 * self.weights
            db = np.sum(error) / n
            self.weights -= self.lr * dw
            self.bias -= self.lr * db

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.sigmoid(X @ self.weights + self.bias)


class ImplicitCollaborativeFiltering:
    """Item-Item Collaborative Filtering for dynamic, personalized scores."""
    def __init__(self):
        self.similarity_matrix = None
        self.sid_to_idx = None
        self.tid_to_idx = None
        self.idx_to_tid = None
        self.interaction_matrix = None

    def build_interaction_matrix(self, interactions: List[Dict[str, Any]],
                                 sid_to_idx: Dict[str,int],
                                 tid_to_idx: Dict[str,int],
                                 nS: int, nT: int) -> np.ndarray:
        M = np.zeros((nS, nT), dtype=float)
        for inter in interactions:
            sidx = sid_to_idx[inter['student_id']]
            tidx = tid_to_idx[inter['tutor_id']]
            M[sidx, tidx] = 1.0
        self.interaction_matrix = M
        self.sid_to_idx = sid_to_idx
        self.tid_to_idx = tid_to_idx
        self.idx_to_tid = {v: k for k, v in tid_to_idx.items()}
        return M

    def compute_tutor_similarities(self, interaction_matrix: np.ndarray):
        A = interaction_matrix.astype(float)
        item_norms = np.linalg.norm(A, axis=0)
        eps = 1e-8
        item_norms = np.where(item_norms == 0.0, eps, item_norms)
        S = A.T @ A
        denom = np.outer(item_norms, item_norms)
        S = S / np.where(denom == 0, eps, denom)
        np.fill_diagonal(S, 0.0)
        self.similarity_matrix = S
        return S

    def scores_for_student(self, student_id: str) -> np.ndarray:
        sidx = self.sid_to_idx[student_id]
        user_vector = self.interaction_matrix[sidx, :]
        scores = user_vector @ self.similarity_matrix
        scores = np.where(user_vector > 0, 0.0, scores)
        return scores


class HybridTutorRecommender:
    """Combines Content-Based (LR) and Collaborative Filtering (CF) scores."""
    def __init__(self, alpha: float = 0.70):
        self.lr_model = LogisticRegressionFromScratch()
        self.cf_model = ImplicitCollaborativeFiltering()
        self.alpha = alpha
        self.students = None
        self.tutors = None
        self.sid_to_idx = None
        self.tid_to_idx = None
        self.idx_to_tid = None

    def fit(self, students, tutors,
            X_features: np.ndarray, y_labels: np.ndarray,
            interactions_train: List[Dict[str, Any]]):
        self.students = students
        self.tutors = tutors
        self.sid_to_idx, self.tid_to_idx, _, self.idx_to_tid = build_id_maps(students, tutors)
        nS, nT = len(students), len(tutors)
        self.lr_model.fit(X_features, y_labels)
        M = self.cf_model.build_interaction_matrix(interactions_train, self.sid_to_idx, self.tid_to_idx, nS, nT)
        self.cf_model.compute_tutor_similarities(M)

    def lr_scores_for_student(self, student_idx: int) -> np.ndarray:
        """Gets Content-Based match scores for all tutors."""
        nT = len(self.tutors)
        pair_s = np.full(nT, student_idx, dtype=int)
        pair_t = np.arange(nT, dtype=int)
        # compute_pair_features now returns 11 features
        X = compute_pair_features(self.students, self.tutors, pair_s, pair_t)
        return self.lr_model.predict_proba(X)

    def recommend(self, student_id: str, top_n: int = 5) -> List[Tuple[str, float]]:
        sidx = self.sid_to_idx[student_id]
        lr_scores = self.lr_scores_for_student(sidx)
        cf_scores = self.cf_model.scores_for_student(student_id)
        
        def normalize_agg(v):
            v = v.astype(float)
            vmax = np.max(v)
            vmin = np.min(v)
            if vmax - vmin < 1e-12:
                return np.full_like(v, 0.1) 
            return (v - vmin) / (vmax - vmin)
            
        lr_n = normalize_agg(lr_scores)
        cf_n = normalize_agg(cf_scores)
        
        combined = self.alpha * lr_n + (1 - self.alpha) * cf_n
        
        # Inject larger random noise (0.05 std) for reliable tie-breaking and dynamism
        noise = RNG.normal(0, 0.05, size=combined.shape) 
        combined += noise

        # Mask already seen items by setting their score to negative infinity
        seen = self.cf_model.interaction_matrix[sidx, :] > 0
        combined = np.where(seen, -np.inf, combined)
        
        sorted_indices = np.argsort(-combined)
        top_items_indices = sorted_indices[:top_n]

        return [(self.idx_to_tid[int(i)], float(combined[int(i)])) for i in top_items_indices]
    
    def get_student_profile(self, student_id: str) -> Dict[str, Any]:
        sidx = self.sid_to_idx[student_id]
        return self.students[sidx]
    
    def get_tutor_profile(self, tutor_id: str) -> Dict[str, Any]:
        tidx = self.tid_to_idx[tutor_id]
        return self.tutors[tidx]


# --- UTILITY FUNCTIONS ---

def split_train_test(interactions: List[Dict[str, Any]], test_holdout_per_user: int = 1):
    """Splits interactions into training and testing sets."""
    by_user = defaultdict(list)
    for inter in interactions:
        by_user[inter['student_id']].append(inter['tutor_id'])
    train, test = [], []
    for sid, items in by_user.items():
        items_arr = np.array(items)
        RNG.shuffle(items_arr)
        k = min(test_holdout_per_user, len(items_arr) // 2 if len(items_arr) >= 2 else 0)
        test_items = items_arr[:k]
        train_items = items_arr[k:]
        for tid in train_items:
            train.append({'student_id': sid, 'tutor_id': tid, 'interaction_type': 'pos'})
        for tid in test_items:
            test.append({'student_id': sid, 'tutor_id': tid, 'interaction_type': 'pos'})
    return train, test


def sample_lr_dataset(students, tutors,
                      interactions_pos: List[Dict[str, Any]],
                      sid_to_idx: Dict[str,int], tid_to_idx: Dict[str,int],
                      neg_ratio: float = 1.0) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Generates a dataset for Logistic Regression with sampled negative pairs."""
    
    pos_s_idx = []
    pos_t_idx = []
    for inter in interactions_pos:
        pos_s_idx.append(sid_to_idx[inter['student_id']])
        pos_t_idx.append(tid_to_idx[inter['tutor_id']])
    pos_s_idx = np.array(pos_s_idx, dtype=int)
    pos_t_idx = np.array(pos_t_idx, dtype=int)

    nS, nT = len(students), len(tutors)
    interacted = defaultdict(set)
    for s, t in zip(pos_s_idx, pos_t_idx):
        interacted[int(s)].add(int(t))

    neg_s_idx = []
    neg_t_idx = []
    for s in interacted.keys():
        pos_count = len(interacted[s])
        num_negs = int(max(1, neg_ratio * pos_count))
        available = np.setdiff1d(np.arange(nT, dtype=int), np.array(list(interacted[s]), dtype=int), assume_unique=False)
        if len(available) == 0:
            continue
        choose = min(len(available), num_negs)
        sampled = RNG.choice(available, size=choose, replace=False)
        neg_s_idx.extend([s] * choose)
        neg_t_idx.extend(sampled.tolist())

    neg_s_idx = np.array(neg_s_idx, dtype=int)
    neg_t_idx = np.array(neg_t_idx, dtype=int)

    # compute_pair_features now returns 11 features, which is transparent to the LR model
    X_pos = compute_pair_features(students, tutors, pos_s_idx, pos_t_idx)
    X_neg = compute_pair_features(students, tutors, neg_s_idx, neg_t_idx)
    X = np.vstack([X_pos, X_neg])
    y = np.hstack([np.ones(len(X_pos)), np.zeros(len(X_neg))])

    pairs = np.vstack([
        np.column_stack([pos_s_idx, pos_t_idx]),
        np.column_stack([neg_s_idx, neg_t_idx])
    ])
    return X, y, pairs[:,0], pairs[:,1]