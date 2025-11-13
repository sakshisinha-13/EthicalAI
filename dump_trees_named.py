# dump_trees_named.py
import joblib
import os

# loads pipeline and saved feature names from shap_explainer (created during training)
PIPELINE_PATH = "model/pipeline.joblib"
SHAP_PATH = "model/shap_explainer.joblib"

pipeline = joblib.load(PIPELINE_PATH)
shap_blob = joblib.load(SHAP_PATH)
feature_names = shap_blob["feature_names"]  # list of transformed feature names

# XGBoost booster
booster = pipeline.named_steps["model"].get_booster()

# write feature map file in XGBoost expected format: "index\tname\tq"
fmap_path = "model/feature_map.txt"
with open(fmap_path, "w", encoding="utf-8") as f:
    for i, name in enumerate(feature_names):
        f.write(f"{i}\t{name}\tq\n")

# dump model with feature map so dump shows actual names
out_path = "model/model_tree_named.txt"
booster.dump_model(out_path, fmap=fmap_path, with_stats=True)
print(f"Dumped trees with named features to: {out_path}")
