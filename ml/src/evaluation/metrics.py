from __future__ import annotations

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, log_loss, precision_score, recall_score


CLASS_LABELS = [0, 1, 2]
CLASS_NAMES = ["AwayWin", "Draw", "HomeWin"]


def multiclass_brier_score(y_true: np.ndarray, y_prob: np.ndarray) -> float:
    one_hot = np.eye(len(CLASS_LABELS))[y_true]
    return float(np.mean(np.sum((y_prob - one_hot) ** 2, axis=1)))


def evaluate_predictions(y_true: np.ndarray, y_prob: np.ndarray) -> dict[str, object]:
    y_prob = np.asarray(y_prob, dtype=float)
    y_prob = y_prob / y_prob.sum(axis=1, keepdims=True)
    y_pred = np.argmax(y_prob, axis=1)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "log_loss": float(log_loss(y_true, y_prob, labels=CLASS_LABELS)),
        "brier_score": multiclass_brier_score(y_true, y_prob),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=CLASS_LABELS).tolist(),
    }
