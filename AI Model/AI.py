import pandas as pd

import joblib
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix,classification_report,accuracy_score
from sklearn.model_selection import train_test_split

MODEL_FILENAME = "car_service_classifier.pkl"
LEGACY_MODEL_FILENAME = "AI_modelv1.pkl"

# 1) Load dataset
df = pd.read_csv("AI_dataset.csv")

# 2) Separate input and output
X = df["text"]
y = df["label"]
X_train,X_test,y_train,y_test = train_test_split(X,y,random_state=42,test_size=0.2)

# 3) Build pipeline
model = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english", ngram_range=(1, 2))),
    ("clf", LogisticRegression(max_iter=1000, random_state=42))
])

# 4) Train model
model.fit(X_train,y_train)
y_pred = model.predict(X_test)
print(accuracy_score(y_test,y_pred))
print(confusion_matrix(y_test,y_pred))
print(classification_report(y_test,y_pred))
