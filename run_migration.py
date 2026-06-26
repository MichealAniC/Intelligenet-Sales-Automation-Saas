import os
import subprocess
import sys

venv_python = os.path.join(os.path.dirname(__file__), "..", ".venv", "Scripts", "python.exe")
backend_dir = os.path.join(os.path.dirname(__file__), "backend")

result = subprocess.run(
    [venv_python, "-c", "import alembic.config; alembic.config.main(argv=['upgrade', 'head'])"],
    cwd=backend_dir,
    text=True,
    capture_output=True
)

print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
sys.exit(result.returncode)