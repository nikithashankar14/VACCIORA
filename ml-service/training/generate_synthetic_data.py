"""
generate_synthetic_data.py
Vacciora Immunization Platform — ML Risk Model Bootstrap Dataset Generator

NOTE: This script generates synthetic bootstrap training data standing in for real
historical vaccination delay outcomes that don't exist yet on a new deployment.
Once real historical usage data accumulates, export genuine features and outcomes
to synthetic_training_data.csv and re-run train_model.py.
"""

import os
import numpy as np
import pandas as pd

def generate_dataset(num_samples=3000, random_seed=42):
    np.random.seed(random_seed)
    
    # Feature 1: pastDelayCount (0 to 6 past delayed doses)
    past_delay_count = np.random.poisson(lam=0.9, size=num_samples)
    past_delay_count = np.clip(past_delay_count, 0, 8)
    
    # Feature 2: avgDelayDays (0 to 45 days)
    # Higher for those with pastDelayCount > 0
    avg_delay_days = np.where(
        past_delay_count > 0,
        np.random.gamma(shape=2.0, scale=7.0, size=num_samples) + past_delay_count * 2.5,
        np.random.exponential(scale=1.5, size=num_samples)
    )
    avg_delay_days = np.clip(avg_delay_days, 0, 60).round(1)
    
    # Feature 3: missedAppointmentCount (0 to 5)
    missed_appointment_count = np.random.binomial(n=4, p=0.18, size=num_samples)
    
    # Feature 4: reminderAckRate (0.0 to 1.0)
    # Engagement rate: lower acknowledgement tends to correlate with delays
    reminder_ack_rate = np.random.beta(a=3.5, b=2.0, size=num_samples)
    reminder_ack_rate = np.clip(reminder_ack_rate, 0.0, 1.0).round(2)
    
    # Feature 5: distanceToCenterKm (0.5 km to 25 km)
    distance_to_center_km = np.random.gamma(shape=2.2, scale=2.8, size=num_samples)
    distance_to_center_km = np.clip(distance_to_center_km, 0.2, 35.0).round(1)
    
    # Feature 6: previousDoseGapDays (-5 to 45 days relative to schedule interval)
    previous_dose_gap_days = np.random.normal(loc=3.0, scale=8.0, size=num_samples) + (avg_delay_days * 0.4)
    previous_dose_gap_days = np.clip(previous_dose_gap_days, -10, 60).round(1)
    
    # Documented Latent Risk Function:
    # Linear logit formulation with realistic sociodemographic & behavioural weights
    # High past delays, missed appointments, far distance, and low ack rate increase risk.
    z = (
        - 1.8
        + 0.45 * past_delay_count
        + 0.045 * avg_delay_days
        + 0.65 * missed_appointment_count
        - 1.60 * reminder_ack_rate
        + 0.08 * distance_to_center_km
        + 0.025 * previous_dose_gap_days
        + np.random.normal(0, 0.4, size=num_samples) # Realistic noise
    )
    
    # Logistic probability of dose delay / non-compliance
    risk_prob = 1.0 / (1.0 + np.exp(-z))
    
    # Binary classification label: 1 = delayed (>14 days past due), 0 = on-time
    is_delayed = (risk_prob > 0.48).astype(int)
    
    df = pd.DataFrame({
        "pastDelayCount": past_delay_count,
        "avgDelayDays": avg_delay_days,
        "missedAppointmentCount": missed_appointment_count,
        "reminderAckRate": reminder_ack_rate,
        "distanceToCenterKm": distance_to_center_km,
        "previousDoseGapDays": previous_dose_gap_days,
        "latentRiskProbability": risk_prob.round(4),
        "isDelayed": is_delayed
    })
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, "synthetic_training_data.csv")
    df.to_csv(output_path, index=False)
    print(f"Generated {num_samples} synthetic training rows -> {output_path}")
    print(f"Class distribution: {df['isDelayed'].value_counts(normalize=True).to_dict()}")
    return output_path

if __name__ == "__main__":
    generate_dataset()
