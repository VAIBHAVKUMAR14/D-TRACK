import sys
import traceback
from backend.main import run_full_pipeline, _state

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='cp1252')

_state['loaded'] = False
_state['error_count'] = 0

try:
    run_full_pipeline()
    print("SUCCESS")
except Exception as e:
    with open("crash.txt", "w", encoding="utf-8") as f:
        traceback.print_exc(file=f)
    print("CRASHED!")
