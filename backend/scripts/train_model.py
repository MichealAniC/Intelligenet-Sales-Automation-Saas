from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.append(os.getcwd())

from app.ml.training import train


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    dataset_path = repo_root / "dataset" / "B2B_Sales_Data.xlsx"
    artifacts_dir = repo_root / "backend" / "artifacts"
    result = train(dataset_path=dataset_path, artifacts_dir=artifacts_dir)
    print(result.model_path)
    print(result.metrics_path)
    print(result.metadata_path)


if __name__ == "__main__":
    main()
