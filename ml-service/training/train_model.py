"""
train_model.py
Trains a GradientBoostingClassifier to predict risk of delayed or missed vaccination doses.
Saves model artifact to ml-service/model.pkl containing:
{
    "model": fitted_classifier,
    "feature_names": [...],
    "model_version": "v1.0.0-gbc-uip",
    "trained_at": ISO8601 string,
    "metrics": {...}
}
"""

import os
import datetime
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, roc_auc_score, precision_score, recall_score, f1_score

def train_and_save():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(current_dir, "synthetic_training_data.csv")
    
    if not os.path.exists(data_path):
        print("Data file not found. Generating synthetic bootstrap dataset first...")
        from generate_synthetic_data import generate_dataset
        generate_dataset()
        
    df = pd.read_csv(data_path)
    
    feature_cols = [
        "pastDelayCount",
        "avgDelayDays",
        "missedAppointmentCount",
        "reminderAckRate",
        "distanceToCenterKm",
        "previousDoseGapDays"
    ]
    
    X = df[feature_cols]
    y = df["isDelayed"]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    clf = GradientBoostingClassifier(
        n_estimators=120,
        learning_rate=0.08,
        max_depth=4,
        random_state=42
    )
    
    print(f"Training GradientBoostingClassifier on {len(X_train)} samples...")
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1]
    
    roc_auc = float(roc_auc_score(y_test, y_prob))
    precision = float(precision_score(y_test, y_pred))
    recall = float(recall_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred))
    
    print("\n--- Model Evaluation on Test Set ---")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save model artifact
    model_version = "v1.0.0-gbc-uip"
    artifact = {
        "model": clf,
        "feature_names": feature_cols,
        "model_version": model_version,
        "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "metrics": {
            "roc_auc": round(roc_auc, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4)
        }
    }
    
    output_dir = os.path.dirname(current_dir)
    target_path = os.path.join(output_dir, "model.pkl")
    joblib.dump(artifact, target_path)
    print(f"Saved fitted model artifact to {target_path}")
    return target_path

if __name__ == "__main__":
    train_and_save()
