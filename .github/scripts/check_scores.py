"""Preserve test failures and expose useful diagnostics in the public check summary."""
import subprocess
import sys

commands = [
    ['node', 'tests/smoke.cjs', 'http://127.0.0.1:8000'],
    ['node', 'tests/scoring_versions.cjs', 'http://127.0.0.1:8000'],
    [sys.executable, 'tests/excel_scores.py'],
]
for command in commands:
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    print(result.stdout, flush=True)
    if result.returncode:
        detail = result.stdout[-5000:].replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
        print('::error title=Worksheet scoring check failed::' + ' '.join(command) + ': ' + detail, flush=True)
        sys.exit(result.returncode)
