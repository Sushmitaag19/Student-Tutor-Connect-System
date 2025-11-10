import numpy as np
from collections import defaultdict
from typing import List, Tuple, Dict, Any

RNG = np.random.default_rng(42)

SUBJECTS = np.array(['math', 'english', 'science', 'history', 'programming', 'art'])
LEVELS = np.array(['primary', 'middle', 'high', 'college'])
CITIES = np.array(['NYC', 'LA', 'SF', 'CHI', 'SEA'])
LEARNING_STYLES = np.array(['visual', 'auditory', 'kinesthetic', 'reading'])
TEACHING_STYLES = LEARNING_STYLES.copy()
INTERACTION_TYPES = np.array(['view', 'contact', 'book'])

DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
SLOTS = ['AM','PM']
NUM_TIME_SLOTS = len(DAYS) * len(SLOTS)


def random_timeslot_mask(avg_slots: int) -> int:
    k = max(1, int(RNG.poisson(lam=avg_slots)))
    idxs = RNG.choice(NUM_TIME_SLOTS, size=min(NUM_TIME_SLOTS, k), replace=False)
    mask = 0
    for i in idxs:
        mask |= (1 << i)
    return mask


def gen_students(n: int) -> List[Dict[str, Any]]:
    students = []
    for i in range(n):
        s = {
            'student_id': f's{i}',
            'preferred_subject': RNG.choice(SUBJECTS),
            'preferred_level': RNG.choice(LEVELS),
            'location': RNG.choice(CITIES),
            'availability': random_timeslot_mask(avg_slots=4),
            'learning_style': RNG.choice(LEARNING_STYLES),
        }
        students.append(s)
    return students


def gen_tutors(n: int) -> List[Dict[str, Any]]:
    tutors = []
    for i in range(n):
        t = {
            'tutor_id': f't{i}',
            'subject_specialization': RNG.choice(SUBJECTS),
            'teaching_level': RNG.choice(LEVELS),
            'tutor_location': RNG.choice(CITIES),
            'available_slots': random_timeslot_mask(avg_slots=5),
            'teaching_style': RNG.choice(TEACHING_STYLES),
        }
        tutors.append(t)
    return tutors


def time_overlap_mask(a_mask: int, b_mask: int) -> int:
    return 1 if (a_mask & b_mask) != 0 else 0


def style_similarity(learn: str, teach: str) -> float:
    # simple: exact match = 1.0, else 0.0
    return 1.0 if learn == teach else 0.0


def build_id_maps(students: List[Dict[str, Any]], tutors: List[Dict[str, Any]]):
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
    Returns X with columns:
    [subject_match, level_match, same_city, time_overlap, style_similarity]
    """
    X = np.zeros((len(pair_s_idx), 5), dtype=float)
    for i, (si, ti) in enumerate(zip(pair_s_idx, pair_t_idx)):
        s = students[int(si)]
        t = tutors[int(ti)]
        X[i, 0] = 1.0 if s['preferred_subject'] == t['subject_specialization'] else 0.0
        X[i, 1] = 1.0 if s['preferred_level'] == t['teaching_level'] else 0.0
        X[i, 2] = 1.0 if s['location'] == t['tutor_location'] else 0.0
        X[i, 3] = float(time_overlap_mask(s['availability'], t['available_slots']))
        X[i, 4] = style_similarity(s['learning_style'], t['teaching_style'])
    return X


def generate_interactions(students: List[Dict[str, Any]],
                          tutors: List[Dict[str, Any]],
                          sid_to_idx: Dict[str,int],
                          tid_to_idx: Dict[str,int]) -> List[Dict[str, Any]]:
    interactions = []
    nS, nT = len(students), len(tutors)

    # Precompute matrices for speed
    # We'll compute heuristic scores for each student-tutor pair using the same engineered features.
    # To keep it efficient, do it per-student without storing full NxM matrix.
    weights = np.array([1.2, 1.0, 0.8, 0.9, 0.6])

    for si in range(nS):
        # features for all tutors for student si
        pair_s = np.full(nT, si, dtype=int)
        pair_t = np.arange(nT, dtype=int)
        X = compute_pair_features(students, tutors, pair_s, pair_t)
        scores = X @ weights + RNG.normal(0, 0.3, size=nT)

        # choose a random number of positives per student based on scores
        num_pos = int(np.clip(RNG.poisson(lam=4), 1, 12))
        top_idx = np.argsort(-scores)[:num_pos]
        for ti in top_idx:
            prob = 1 / (1 + np.exp(-scores[ti]))
            # pick interaction type based on score/prob
            if prob > 0.8:
                itype = 'book'
            elif prob > 0.6:
                itype = 'contact'
            else:
                itype = 'view'
            interactions.append({
                'student_id': students[si]['student_id'],
                'tutor_id': tutors[int(ti)]['tutor_id'],
                'interaction_type': itype,
            })
    return interactions


# -------------------------------
# Logistic Regression (NumPy only)
# -------------------------------

class LogisticRegressionFromScratch:
    def __init__(self, lr=0.1, iterations=2000, l2=0.0):
        self.lr = lr
        self.iterations = iterations
        self.l2 = l2
        self.weights = None
        self.bias = 0.0

    @staticmethod
    def sigmoid(z):
        # numerical stability
        z = np.clip(z, -500, 500)
        return 1.0 / (1.0 + np.exp(-z))

    def fit(self, X: np.ndarray, y: np.ndarray):
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

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        return (self.predict_proba(X) > threshold).astype(int)


# -------------------------------
# Implicit Collaborative Filtering (item-item)
# -------------------------------

class ImplicitCollaborativeFiltering:
    def __init__(self): 
        self.similarity_matrix = None  # (n_items, n_items)
        self.sid_to_idx = None
        self.tid_to_idx = None
        self.idx_to_tid = None
        self.interaction_matrix = None  # (n_users, n_items)

    def build_interaction_matrix(self, interactions: List[Dict[str, Any]],
                                 sid_to_idx: Dict[str,int],
                                 tid_to_idx: Dict[str,int],
                                 nS: int, nT: int) -> np.ndarray:
        M = np.zeros((nS, nT), dtype=float)
        for inter in interactions:
            sidx = sid_to_idx[inter['student_id']]
            tidx = tid_to_idx[inter['tutor_id']]
            M[sidx, tidx] = 1.0  # implicit binary
        self.interaction_matrix = M
        self.sid_to_idx = sid_to_idx
        self.tid_to_idx = tid_to_idx
        self.idx_to_tid = {v: k for k, v in tid_to_idx.items()}
        return M

    def compute_tutor_similarities(self, interaction_matrix: np.ndarray):
        # item-item cosine similarity
        # items are columns
        A = interaction_matrix.astype(float)
        # Compute norms for each item
        item_norms = np.linalg.norm(A, axis=0)
        # To avoid div by zero, set zeros to eps
        eps = 1e-8
        item_norms = np.where(item_norms == 0.0, eps, item_norms)
        # Similarity = (A^T A) / (||i|| * ||j||)
        S = A.T @ A
        denom = np.outer(item_norms, item_norms)
        S = S / np.where(denom == 0, eps, denom)
        np.fill_diagonal(S, 0.0)  # remove self-similarity
        self.similarity_matrix = S
        return S

    def recommend_for_student(self, student_id: str, top_k: int = 5) -> List[str]:
        if self.similarity_matrix is None or self.interaction_matrix is None:
            raise ValueError("CF model not trained.")
        sidx = self.sid_to_idx[student_id]
        user_vector = self.interaction_matrix[sidx, :]  # (n_items,)
        # score for items = sum over items liked by user of sim(liked, item)
        scores = user_vector @ self.similarity_matrix  # (n_items,)
        # don't recommend seen items
        scores = np.where(user_vector > 0, -np.inf, scores)
        top_items = np.argpartition(-scores, kth=min(top_k, len(scores)-1))[:top_k]
        # sort top items by score desc
        top_items = top_items[np.argsort(-scores[top_items])]
        return [self.idx_to_tid[int(i)] for i in top_items]

    def scores_for_student(self, student_id: str) -> np.ndarray:
        # returns score vector for all items
        sidx = self.sid_to_idx[student_id]
        user_vector = self.interaction_matrix[sidx, :]
        scores = user_vector @ self.similarity_matrix
        # zero out seen items (set to 0 instead of -inf for hybrid scoring)
        scores = np.where(user_vector > 0, 0.0, scores)
        return scores


# -------------------------------
# Hybrid Recommender
# -------------------------------

class HybridTutorRecommender:
    def __init__(self, alpha: float = 0.5):
        self.lr_model = LogisticRegressionFromScratch()
        self.cf_model = ImplicitCollaborativeFiltering()
        self.alpha = alpha  # weight for LR vs CF
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
        # Compute LR probabilities for all tutors for a given student
        nT = len(self.tutors)
        pair_s = np.full(nT, student_idx, dtype=int)
        pair_t = np.arange(nT, dtype=int)
        X = compute_pair_features(self.students, self.tutors, pair_s, pair_t)
        return self.lr_model.predict_proba(X)

    def recommend(self, student_id: str, top_n: int = 5) -> List[Tuple[str, float]]:
        sidx = self.sid_to_idx[student_id]
        lr_scores = self.lr_scores_for_student(sidx)  # (n_items,)
        cf_scores = self.cf_model.scores_for_student(student_id)
        # normalize scores to [0,1]
        def normalize(v):
            v = v.astype(float)
            vmax = np.max(v) if np.max(v) > 0 else 1.0
            vmin = np.min(v)
            if vmax - vmin < 1e-12:
                return np.zeros_like(v)
            return (v - vmin) / (vmax - vmin)
        lr_n = normalize(lr_scores)
        cf_n = normalize(cf_scores)
        combined = self.alpha * lr_n + (1 - self.alpha) * cf_n
        # mask already seen items
        seen = self.cf_model.interaction_matrix[sidx, :] > 0
        combined = np.where(seen, -np.inf, combined)
        top_items = np.argpartition(-combined, kth=min(top_n, len(combined)-1))[:top_n]
        top_items = top_items[np.argsort(-combined[top_items])]
        return [(self.idx_to_tid[int(i)], float(combined[int(i)])) for i in top_items]


# -------------------------------
# Train/test split and dataset building for LR
# -------------------------------

def split_train_test(interactions: List[Dict[str, Any]], test_holdout_per_user: int = 1):
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
    # Build positive pairs
    pos_s_idx = []
    pos_t_idx = []
    for inter in interactions_pos:
        pos_s_idx.append(sid_to_idx[inter['student_id']])
        pos_t_idx.append(tid_to_idx[inter['tutor_id']])
    pos_s_idx = np.array(pos_s_idx, dtype=int)
    pos_t_idx = np.array(pos_t_idx, dtype=int)

    # Negative sampling: for each positive, sample 'neg_ratio' negatives for same student
    nS, nT = len(students), len(tutors)
    interacted = defaultdict(set)
    for s, t in zip(pos_s_idx, pos_t_idx):
        interacted[int(s)].add(int(t))

    neg_s_idx = []
    neg_t_idx = []
    for s in interacted.keys():
        pos_count = len(interacted[s])
        num_negs = int(max(1, neg_ratio * pos_count))
        # sample from non-interacted
        available = np.setdiff1d(np.arange(nT, dtype=int), np.array(list(interacted[s]), dtype=int), assume_unique=False)
        if len(available) == 0:
            continue
        choose = min(len(available), num_negs)
        sampled = RNG.choice(available, size=choose, replace=False)
        neg_s_idx.extend([s] * choose)
        neg_t_idx.extend(sampled.tolist())

    neg_s_idx = np.array(neg_s_idx, dtype=int)
    neg_t_idx = np.array(neg_t_idx, dtype=int)

    # Build X and y
    X_pos = compute_pair_features(students, tutors, pos_s_idx, pos_t_idx)
    X_neg = compute_pair_features(students, tutors, neg_s_idx, neg_t_idx)
    X = np.vstack([X_pos, X_neg])
    y = np.hstack([np.ones(len(X_pos)), np.zeros(len(X_neg))])

    # Also return pair indices for potential evaluation
    pairs = np.vstack([
        np.column_stack([pos_s_idx, pos_t_idx]),
        np.column_stack([neg_s_idx, neg_t_idx])
    ])
    return X, y, pairs[:,0], pairs[:,1]


# -------------------------------
# Evaluation metrics (NumPy only)
# -------------------------------

def evaluate_model(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    y_true = y_true.astype(int)
    y_pred = y_pred.astype(int)
    tp = np.sum((y_true == 1) & (y_pred == 1))
    tn = np.sum((y_true == 0) & (y_pred == 0))
    fp = np.sum((y_true == 0) & (y_pred == 1))
    fn = np.sum((y_true == 1) & (y_pred == 0))
    accuracy = (tp + tn) / max(1, (tp + tn + fp + fn))
    precision = tp / max(1, (tp + fp))
    recall = tp / max(1, (tp + fn))
    f1 = 2 * precision * recall / max(1e-12, (precision + recall)) if (precision + recall) > 0 else 0.0
    return {'accuracy': float(accuracy), 'precision': float(precision), 'recall': float(recall), 'f1': float(f1)}


def precision_at_k(recommended: List[str], relevant: List[str], k: int = 5) -> float:
    k = min(k, len(recommended))
    if k == 0:
        return 0.0
    recommended_k = recommended[:k]
    relevant_set = set(relevant)
    hits = sum(1 for item in recommended_k if item in relevant_set)
    return hits / k


# -------------------------------
# End-to-end pipeline
# -------------------------------

def main():
    # 1) Generate synthetic data
    n_students = 300
    n_tutors = 180
    students = gen_students(n_students)
    tutors = gen_tutors(n_tutors)

    sid_to_idx, tid_to_idx, idx_to_sid, idx_to_tid = build_id_maps(students, tutors)

    # 2) Generate implicit interactions
    interactions_all = generate_interactions(students, tutors, sid_to_idx, tid_to_idx)

    # 3) Train/test split (per-student)
    interactions_train, interactions_test = split_train_test(interactions_all, test_holdout_per_user=1)

    # 4) Build LR dataset (train)
    X_train, y_train, _, _ = sample_lr_dataset(students, tutors, interactions_train, sid_to_idx, tid_to_idx, neg_ratio=1.0)

    # 5) Train Hybrid (LR + CF)
    hybrid = HybridTutorRecommender(alpha=0.5)
    hybrid.fit(students, tutors, X_train, y_train, interactions_train)

    # 6) Evaluate LR on a balanced test set built from test positives + sampled negatives
    X_test, y_test, test_s_idx, test_t_idx = sample_lr_dataset(students, tutors, interactions_test, sid_to_idx, tid_to_idx, neg_ratio=1.0)
    y_pred = hybrid.lr_model.predict(X_test, threshold=0.5)
    lr_metrics = evaluate_model(y_test, y_pred)

    # 7) Evaluate CF and Hybrid with Precision@K using test holdouts
    # Build relevant items per user from test set
    relevant_by_user = defaultdict(list)
    for inter in interactions_test:
        relevant_by_user[inter['student_id']].append(inter['tutor_id'])

    # CF P@5
    cf_p5_list = []
    # Hybrid P@5
    hyb_p5_list = []

    students_with_test = [sid for sid, items in relevant_by_user.items() if len(items) > 0]
    for sid in students_with_test:
        cf_recs = hybrid.cf_model.recommend_for_student(sid, top_k=5)
        cf_p5 = precision_at_k(cf_recs, relevant_by_user[sid], k=5)
        cf_p5_list.append(cf_p5)

        hyb_recs = [tid for tid, _ in hybrid.recommend(sid, top_n=5)]
        hyb_p5 = precision_at_k(hyb_recs, relevant_by_user[sid], k=5)
        hyb_p5_list.append(hyb_p5)

    cf_p5_mean = float(np.mean(cf_p5_list)) if len(cf_p5_list) else 0.0
    hyb_p5_mean = float(np.mean(hyb_p5_list)) if len(hyb_p5_list) else 0.0

    # 8) Display results
    print("=== Logistic Regression (classification) ===")
    for k, v in lr_metrics.items():
        print(f"{k}: {v:.4f}")

    print("\n=== Ranking Precision@5 ===")
    print(f"CF P@5:   {cf_p5_mean:.4f}")
    print(f"Hybrid P@5: {hyb_p5_mean:.4f}")

    # 9) Show sample recommendations for a random student
    sample_sid = students[np.random.randint(0, len(students))]['student_id']
    recs_lr_only = []
    # LR-only ranking (for comparison)
    sidx = sid_to_idx[sample_sid]
    lr_scores = hybrid.lr_scores_for_student(sidx)
    # mask seen
    seen = hybrid.cf_model.interaction_matrix[sidx, :] > 0
    lr_scores = np.where(seen, -np.inf, lr_scores)
    top_lr = np.argpartition(-lr_scores, kth=4)[:5]
    top_lr = top_lr[np.argsort(-lr_scores[top_lr])]
    recs_lr_only = [idx_to_tid[int(i)] for i in top_lr]

    recs_cf = hybrid.cf_model.recommend_for_student(sample_sid, top_k=5)
    recs_hyb = [tid for tid, _ in hybrid.recommend(sample_sid, top_n=5)]

    print("\n=== Sample recommendations for", sample_sid, "===")
    print("LR-only:", recs_lr_only)
    print("CF-only:", recs_cf)
    print("Hybrid:", recs_hyb)


if __name__ == '__main__':
    main()
