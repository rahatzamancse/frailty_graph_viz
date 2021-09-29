import hashlib
import os
import subprocess
from tqdm import tqdm

def get_git_revision_hash(path: str) -> str:
    cwd = os.getcwd()
    os.chdir(path)
    hash = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode('ascii').strip()
    os.chdir(cwd)
    return hash


def md5_hash(path: str) -> str:
    return hashlib.md5(open(path, 'rb').read()).hexdigest()