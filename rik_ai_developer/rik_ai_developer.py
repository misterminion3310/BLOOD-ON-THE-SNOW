#!/usr/bin/env python3
"""RIK AI Developer for BLOOD-ON-THE-SNOW. Runs inside GitHub Actions."""
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
API_KEY = os.environ.get("XAI_API_KEY", "").strip()
MODEL = os.environ.get("XAI_MODEL", "grok-4.7").strip()
MAX_FILES = int(os.environ.get("RIK_MAX_FILES", "6"))
MAX_CHARS = int(os.environ.get("RIK_MAX_CONTEXT_CHARS", "110000"))

EXCLUDED_DIRS = {".git", ".github", "node_modules", "vendor", "dist", "build", "coverage", "__pycache__"}
ALLOWED_SUFFIXES = {".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".json", ".md", ".txt", ".xml", ".svg", ".yml", ".yaml", ".py"}
PROTECTED_NAMES = {".env", ".env.local", ".env.production", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"}

SYSTEM_PROMPT = r'''Ты — RIK AI Developer, опытный разработчик браузерной игры BLOOD ON THE SNOW.
Работаешь с уже существующим проектом, а не создаёшь новую игру с нуля.
Контекст игры из README: суровая зимняя криминальная survival-игра в Южно-Словенко; игрок проходит три улицы, сражается с врагами, оружие изнашивается, патроны и аптечки ограничены; двор открывается после зачистки. Игра должна работать в браузере на ПК, телефоне и с геймпадом.

ЦЕЛЬ: за один запуск выбрать ОДНО полезное, законченное улучшение, которое реально подходит текущему коду. Изучи переданные файлы и их связи. Не выдумывай отсутствующие функции и не ломай существующую архитектуру.

Правила:
- Сохраняй текущий стиль, механику, управление и совместимость ПК/телефон/геймпад.
- Не переписывай игру целиком. Делай небольшие, согласованные изменения.
- Не меняй название, сюжет, баланс или управление радикально без необходимости.
- Не добавляй внешние библиотеки, CDN, платные сервисы, аналитику, рекламу, трекеры или сетевые запросы.
- Не трогай секреты, настройки GitHub Actions, workflow, лицензии и lock-файлы.
- Не удаляй файлы. Не меняй README, если это не нужно для документации конкретной новой функции.
- Не создавай фиктивные заглушки. Не утверждай, что тестировал браузер, если это не так.
- Проверяй взаимосвязь HTML/CSS/JS, имена DOM-элементов, пути ресурсов и мобильную адаптацию.
- Если нет безопасного и действительно полезного изменения, верни пустой массив edits и объясни почему.
- Максимум 6 файлов за запуск. В JSON указывай ПОЛНОЕ новое содержимое каждого изменяемого файла.
- Не включай Markdown-ограждения вокруг JSON. Не добавляй текст вне JSON.

Верни строго JSON следующей формы:
{"summary":"краткое описание по-русски","edits":[{"path":"относительный/путь/файл.ext","content":"полное содержимое файла"}],"checks":["что проверить"]}
'''


def run(cmd, check=True):
    p = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
    if check and p.returncode:
        raise RuntimeError(f"Команда не выполнена: {' '.join(cmd)}\n{p.stdout}\n{p.stderr}")
    return p


def collect_files():
    items = []
    total = 0
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT)
        if any(part in EXCLUDED_DIRS for part in rel.parts):
            continue
        if path.name in PROTECTED_NAMES or path.suffix.lower() not in ALLOWED_SUFFIXES:
            continue
        try:
            data = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if len(data) > 45000:
            data = data[:45000] + "\n\n[ФАЙЛ ОБРЕЗАН ДЛЯ КОНТЕКСТА]"
        if total + len(data) > MAX_CHARS:
            continue
        items.append({"path": rel.as_posix(), "content": data})
        total += len(data)
    if not items:
        raise RuntimeError("Не найдено текстовых файлов проекта для анализа.")
    return items


def call_grok(files):
    if not API_KEY:
        raise RuntimeError("Не задан GitHub Secret XAI_API_KEY.")
    user_payload = {
        "project": "BLOOD-ON-THE-SNOW",
        "branch": os.environ.get("RIK_TARGET_BRANCH", "2.0"),
        "task": "Проанализируй текущий проект и выполни одно полезное улучшение. Учитывай весь переданный код.",
        "files": files,
    }
    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ],
        "temperature": 0.3,
        "max_tokens": 24000,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.x.ai/v1/chat/completions", data=body,
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=900) as response:
                result = json.loads(response.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:2000]
            if exc.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(2 ** (attempt + 1))
                continue
            raise RuntimeError(f"Ошибка xAI API HTTP {exc.code}: {detail}")
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt == 3:
                raise RuntimeError(f"Не удалось связаться с xAI API: {exc}")
            time.sleep(2 ** (attempt + 1))


def parse_json(raw):
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.I)
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end <= start:
        raise RuntimeError("Grok вернул ответ не в формате JSON.")
    return json.loads(raw[start:end + 1])


def safe_target(rel):
    if not isinstance(rel, str) or not rel.strip():
        raise ValueError("Пустой путь файла")
    p = Path(rel)
    if p.is_absolute() or ".." in p.parts or any(part in EXCLUDED_DIRS for part in p.parts):
        raise ValueError(f"Запрещённый путь: {rel}")
    if p.name in PROTECTED_NAMES or p.suffix.lower() not in ALLOWED_SUFFIXES:
        raise ValueError(f"Тип файла запрещён: {rel}")
    if p.parts and p.parts[0] == ".github":
        raise ValueError("Нельзя изменять конфигурацию GitHub Actions")
    target = (ROOT / p).resolve()
    if ROOT.resolve() not in target.parents:
        raise ValueError(f"Путь выходит за пределы репозитория: {rel}")
    return target


def apply_edits(result, original_paths):
    edits = result.get("edits", [])
    if not isinstance(edits, list):
        raise RuntimeError("Поле edits должно быть массивом.")
    if len(edits) > MAX_FILES:
        raise RuntimeError(f"Grok предложил изменить больше {MAX_FILES} файлов; остановка для безопасности.")
    changed = []
    for edit in edits:
        if not isinstance(edit, dict) or not isinstance(edit.get("content"), str):
            raise RuntimeError("Некорректная запись в edits.")
        rel = edit.get("path", "")
        target = safe_target(rel)
        if rel not in original_paths and not target.parent.exists():
            raise RuntimeError(f"Новая папка не существует: {rel}")
        if len(edit["content"]) > 120000:
            raise RuntimeError(f"Слишком большой файл: {rel}")
        target.parent.mkdir(parents=True, exist_ok=True)
        old = target.read_text(encoding="utf-8") if target.exists() else None
        if old == edit["content"]:
            continue
        target.write_text(edit["content"], encoding="utf-8", newline="\n")
        changed.append(rel)
    return changed


def run_checks(changed):
    errors = []
    html_files = [ROOT / p for p in changed if p.lower().endswith((".html", ".htm"))]
    for file in html_files:
        content = file.read_text(encoding="utf-8")
        if "<html" not in content.lower() or "</html>" not in content.lower():
            errors.append(f"{file.name}: не найдены основные теги html")
    js_files = [ROOT / p for p in changed if p.lower().endswith((".js", ".mjs", ".cjs"))]
    if js_files and subprocess.run(["node", "--version"], capture_output=True).returncode == 0:
        for file in js_files:
            p = subprocess.run(["node", "--check", str(file)], cwd=ROOT, text=True, capture_output=True)
            if p.returncode:
                errors.append(f"{file.name}: {p.stderr[:1500]}")
    py_files = [ROOT / p for p in changed if p.lower().endswith(".py")]
    for file in py_files:
        p = subprocess.run([sys.executable, "-m", "py_compile", str(file)], cwd=ROOT, text=True, capture_output=True)
        if p.returncode:
            errors.append(f"{file.name}: {p.stderr[:1500]}")
    if errors:
        raise RuntimeError("Проверки не пройдены; изменения отменяются:\n" + "\n".join(errors))


def main():
    print("RIK AI Developer: BLOOD-ON-THE-SNOW")
    print(f"Модель: {MODEL}")
    files = collect_files()
    print(f"Передано файлов Grok: {len(files)}")
    result = parse_json(call_grok(files))
    summary = str(result.get("summary", "Обновление проекта"))[:500]
    changed = apply_edits(result, {item["path"] for item in files})
    if not changed:
        print("Изменений нет. " + summary)
        return
    try:
        run_checks(changed)
    except Exception:
        run(["git", "checkout", "--", "."], check=False)
        # Remove only newly-created files from this run if present in git status.
        for rel in changed:
            if not (ROOT / rel).exists():
                continue
            tracked = run(["git", "ls-files", "--error-unmatch", rel], check=False)
            if tracked.returncode != 0:
                (ROOT / rel).unlink(missing_ok=True)
        raise
    run(["git", "config", "user.name", "RIK AI Developer"])
    run(["git", "config", "user.email", "rik-ai-developer@users.noreply.github.com"])
    run(["git", "add", "--"] + changed)
    diff = run(["git", "diff", "--cached", "--quiet"], check=False)
    if diff.returncode == 0:
        print("После проверки нет новых изменений для коммита.")
        return
    msg = "RIK AI: " + re.sub(r"[\r\n]+", " ", summary)[:65]
    run(["git", "commit", "-m", msg])
    run(["git", "push", "origin", os.environ.get("RIK_TARGET_BRANCH", "2.0")])
    print("Изменения отправлены напрямую в ветку.")
    print("Файлы: " + ", ".join(changed))
    print("Описание: " + summary)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ОШИБКА: {exc}", file=sys.stderr)
        sys.exit(1)
